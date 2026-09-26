import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { eventOtpChallenges, eventOtpLimits } from "../drizzle/schema";
import { getDb } from "./db";
import { normalizeSaudiMobilePhone } from "./lib/phone";

const TTL = 10 * 60_000;
export const otpEnabled = () => process.env.EVENTS_OTP_ENABLED === "true";
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const invalid = () => new TRPCError({ code: "UNAUTHORIZED", message: "رمز التحقق غير صحيح أو انتهت صلاحيته. أعد المحاولة أو اطلب رمزًا جديدًا." });
export function otpPhone(value: string) {
  const phone = normalizeSaudiMobilePhone(value);
  if (!phone.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "أدخل رقم جوال سعودي صحيحًا." });
  return phone.e164;
}
function configuredKey() {
  const key = process.env.AUTHENTICA_API_KEY?.trim();
  if (!otpEnabled() || !key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "التحقق بالجوال غير متاح حاليًا. تواصل مع منظم الفعالية." });
  return key;
}
// Provider bodies and headers must never be returned to the browser or logged.
export async function authenticaRequest(action: "send-otp" | "verify-otp", body: Record<string, string>) {
  const key = configuredKey();
  try {
    const response = await fetch(`https://api.authentica.sa/api/v2/${action}`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-Authorization": key },
      body: JSON.stringify(body),
    });
    if (action === "verify-otp" && [400, 422].includes(response.status)) return false;
    if (!response.ok) throw new Error("provider unavailable");
    const data = await response.json();
    // Fail closed: an HTTP 200 alone is never proof of ownership.
    return action === "verify-otp" ? data?.verified === true : data?.success === true;
  } catch {
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر الاتصال بخدمة التحقق. حاول مرة أخرى بعد قليل." });
  }
}
async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر بدء التحقق حاليًا." });
  return db;
}

// Persisted, locked counters apply across restarts and multiple server instances.
// Trust req.ip only after the hosting proxy has been configured in Express.
export async function sendEventOtp(rawPhone: string, ip: string) {
  configuredKey();
  const phone = otpPhone(rawPhone), phoneHash = hash(phone);
  const token = crypto.randomBytes(32).toString("base64url"), tokenHash = hash(token);
  const db = await database(), now = new Date();
  await db.transaction(async tx => {
    const hour = Math.floor(now.getTime() / 3_600_000), day = Math.floor(now.getTime() / 86_400_000);
    const limits: Array<[string, number, number]> = [
      [`global:${day}`, 5000, 0], [`ip:${hash(ip)}:${hour}`, 1000, 0], [`phone:${phoneHash}:${hour}`, 5, 60_000],
    ];
    for (const [key, maximum, cooldown] of limits) {
      const bucket = hash(key);
      await tx.insert(eventOtpLimits).values({ bucket, count: 0, lastAt: new Date("2000-01-01T00:00:00Z") }).onDuplicateKeyUpdate({ set: { bucket } });
      const [row] = await tx.select().from(eventOtpLimits).where(eq(eventOtpLimits.bucket, bucket)).for("update");
      if (row.count >= maximum || now.getTime() - row.lastAt.getTime() < cooldown) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "انتظر قليلًا قبل طلب رمز آخر. عدد المحاولات محدود." });
      }
      await tx.update(eventOtpLimits).set({ count: row.count + 1, lastAt: now }).where(eq(eventOtpLimits.bucket, bucket));
    }
    // One active challenge per phone; resending invalidates older browser challenges.
    const value = { tokenHash, expiresAt: new Date(now.getTime() + TTL), attempts: 0, state: "sending" };
    await tx.insert(eventOtpChallenges).values({ phoneHash, ...value, expiresAt: new Date("2000-01-01T00:00:00Z") }).onDuplicateKeyUpdate({ set: { phoneHash } });
    const [previous] = await tx.select().from(eventOtpChallenges).where(eq(eventOtpChallenges.phoneHash, phoneHash)).for("update");
    if (previous.expiresAt.getTime() - TTL + 60_000 > now.getTime()) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "انتظر دقيقة قبل طلب رمز آخر." });
    }
    await tx.update(eventOtpChallenges).set(value).where(eq(eventOtpChallenges.phoneHash, phoneHash));
  });
  let sent = false;
  try { sent = await authenticaRequest("send-otp", { method: "sms", phone }); }
  finally {
    await db.update(eventOtpChallenges).set({ state: sent ? "pending" : "failed" })
      .where(and(eq(eventOtpChallenges.phoneHash, phoneHash), eq(eventOtpChallenges.tokenHash, tokenHash)));
  }
  if (!sent) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "لم يتم إرسال الرمز. حاول لاحقًا." });
  return { challengeToken: token, retryAfterSeconds: 60, expiresInSeconds: TTL / 1000 };
}

export async function verifyEventOtp(rawPhone: string, token: string, code: string) {
  configuredKey();
  const phone = otpPhone(rawPhone), phoneHash = hash(phone), tokenHash = hash(token);
  const db = await database();
  await db.transaction(async tx => {
    const [row] = await tx.select().from(eventOtpChallenges).where(eq(eventOtpChallenges.phoneHash, phoneHash)).for("update");
    if (!row || row.tokenHash !== tokenHash || row.expiresAt.getTime() <= Date.now() || row.attempts >= 5 || row.state !== "pending") throw invalid();
    await tx.update(eventOtpChallenges).set({ attempts: row.attempts + 1, state: "verifying" }).where(eq(eventOtpChallenges.phoneHash, phoneHash));
  });
  let verified = false;
  try { verified = await authenticaRequest("verify-otp", { phone, otp: code }); }
  finally {
    await db.update(eventOtpChallenges).set({ state: verified ? "verified" : "pending" })
      .where(and(eq(eventOtpChallenges.phoneHash, phoneHash), eq(eventOtpChallenges.tokenHash, tokenHash)));
  }
  if (!verified) throw invalid();
  return { verified: true as const };
}

export async function consumeEventOtp(rawPhone: string, token?: string) {
  if (!otpEnabled()) return;
  configuredKey();
  if (!token) throw invalid();
  const db = await database(), phoneHash = hash(otpPhone(rawPhone)), tokenHash = hash(token);
  await db.transaction(async tx => {
    const [row] = await tx.select().from(eventOtpChallenges).where(eq(eventOtpChallenges.phoneHash, phoneHash)).for("update");
    if (!row || row.tokenHash !== tokenHash || row.state !== "verified" || row.expiresAt.getTime() <= Date.now()) throw invalid();
    await tx.update(eventOtpChallenges).set({ state: "consumed" }).where(eq(eventOtpChallenges.phoneHash, phoneHash));
  });
}
