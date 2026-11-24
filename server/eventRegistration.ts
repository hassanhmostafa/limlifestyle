import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, lte } from "drizzle-orm";
import { eventOtpLimits, eventRegistrationRequests as requests } from "../drizzle/schema";
import { getDb } from "./db";
import { hashApiKey } from "./lib/apiSecurity";
import { otpPhone } from "./eventOtp";

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
  return db;
}

const activeFor = (phone: string, trackId: number) =>
  and(eq(requests.phoneHash, hashApiKey(phone)), eq(requests.trackId, trackId), gt(requests.expiresAt, new Date()));

export async function request(value: string, trackId: number, ip: string) {
  const phone = otpPhone(value);
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const db = await database();
  await db.transaction(async tx => {
    const hour = Math.floor(now.getTime() / 3_600_000);
    for (const [key, maximum] of [[`ip:${ip}`, 500], [`phone:${phone}`, 6]] as const) {
      const bucket = hashApiKey(`event-registration:${key}:${hour}`);
      await tx.insert(eventOtpLimits).values({ bucket, count: 0, lastAt: now })
        .onDuplicateKeyUpdate({ set: { bucket } });
      const [limit] = await tx.select().from(eventOtpLimits).where(eq(eventOtpLimits.bucket, bucket)).for("update");
      if (limit.count >= maximum) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      await tx.update(eventOtpLimits).set({ count: limit.count + 1, lastAt: now }).where(eq(eventOtpLimits.bucket, bucket));
    }
    await tx.delete(requests).where(and(eq(requests.phoneHash, hashApiKey(phone)), eq(requests.trackId, trackId), lte(requests.expiresAt, now)));
    await tx.insert(requests).values({
      tokenHash: hashApiKey(token), phoneHash: hashApiKey(phone), trackId,
      expiresAt: new Date(now.getTime() + 15 * 60_000),
    });
  });
  return { token };
}

export async function status(token: string) {
  const db = await database();
  const [row] = await db.select({ approved: requests.approved }).from(requests)
    .where(and(eq(requests.tokenHash, hashApiKey(token)), gt(requests.expiresAt, new Date())));
  return { approved: row?.approved === 1, expired: !row };
}

export async function find(value: string, trackId: number) {
  const phone = otpPhone(value);
  const db = await database();
  const rows = await db.select({ requestId: requests.tokenHash }).from(requests)
    .where(and(activeFor(phone, trackId), eq(requests.approved, 0))).limit(2);
  if (rows.length > 1) throw new TRPCError({
    code: "CONFLICT",
    message: "يوجد أكثر من طلب لهذا الرقم. انتظر انتهاء الطلبات السابقة ثم أعد المحاولة.",
  });
  if (!rows.length) throw new TRPCError({
    code: "NOT_FOUND",
    message: "لا يوجد طلب تسجيل بانتظار التفعيل لهذا الرقم في مسارك.",
  });
  return { ...rows[0], phone };
}

export async function approve(value: string, trackId: number, requestId: string) {
  const db = await database();
  const [result] = await db.update(requests).set({ approved: 1 })
    .where(and(activeFor(otpPhone(value), trackId), eq(requests.tokenHash, requestId), eq(requests.approved, 0)));
  if (result.affectedRows !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "طلب التسجيل لم يعد متاحًا." });
  return { success: true };
}

export async function consume(phone: string, trackId: number, token: string) {
  const db = await database();
  const [result] = await db.delete(requests)
    .where(and(activeFor(phone, trackId), eq(requests.tokenHash, hashApiKey(token)), eq(requests.approved, 1)));
  if (result.affectedRows !== 1) throw new TRPCError({ code: "FORBIDDEN", message: "طلب التسجيل بانتظار التفعيل أو انتهت صلاحيته." });
}
