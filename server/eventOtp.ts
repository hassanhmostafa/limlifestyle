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
// Never log provider bodies, request headers, phone numbers or OTP codes.
function providerFailure(action: string, category: string, httpStatus?: number): never {
  console.warn("[Events OTP] Provider failure", { action, category, ...(httpStatus ? { httpStatus } : {}) });
  const messages: Record<string, string> = {
    AUTH: httpStatus === 401
      ? "خدمة الرسائل رفضت مفتاح الربط في الخادم المنشور."
      : "خدمة الرسائل رفضت صلاحية الإرسال لهذا التطبيق.",
    LIMIT: "خدمة الرسائل مشغولة أو وصلت لحد الإرسال. حاول بعد قليل.",
    REQUEST: "تعذر إرسال الرمز. يلزم مراجعة إعدادات الرسائل لدى منظم الفعالية.",
    CREDIT: "خدمة الرسائل غير متاحة حاليًا. تواصل مع منظم الفعالية.",
    TIMEOUT: "تأخر رد خدمة الرسائل. حاول مرة أخرى بعد قليل.",
    NETWORK: "تعذر الاتصال بخدمة الرسائل. حاول مرة أخرى بعد قليل.",
    PROVIDER: "خدمة الرسائل غير متاحة حاليًا. حاول مرة أخرى بعد قليل.",
    RESPONSE: "تعذر تأكيد رد خدمة الرسائل. تواصل مع منظم الفعالية.",
  };
  const diagnostic = `OTP-${category}${httpStatus ? `-${httpStatus}` : ""}`;
  throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: `${messages[category]} (${diagnostic})` });
}
export async function authenticaRequest(action: "send-otp" | "verify-otp", body: Record<string, string>) {
  const key = configuredKey();
  let response: Response;
  try {
    response = await fetch(`https://api.authentica.sa/api/v2/${action}`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-Authorization": key },
      body: JSON.stringify(body),
    });
  } catch (error) {
    providerFailure(action, error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "TIMEOUT" : "NETWORK");
  }
  if (action === "verify-otp" && [400, 422].includes(response.status)) return false;
  if (!response.ok) {
    const category = [401, 403].includes(response.status) ? "AUTH" : response.status === 429 ? "LIMIT"
      : response.status === 402 ? "CREDIT" : [400, 422].includes(response.status) ? "REQUEST" : "PROVIDER";
    providerFailure(action, category, response.status);
  }
  let data: unknown;
  try { data = await response.json(); }
  catch { providerFailure(action, "RESPONSE", response.status); }
  if (!data || typeof data !== "object" || Array.isArray(data)) providerFailure(action, "RESPONSE", response.status);
  const result = data as Record<string, unknown>;
  if (action === "send-otp") {
    if (result.success === true) return true;
    providerFailure(action, "RESPONSE", response.status);
  }
  // Current official docs return {status:true}; old official examples used
  // {verified:true}. An explicit status always takes precedence, including false.
  if (typeof result.status === "boolean") return result.status;
  if ("status" in result) providerFailure(action, "RESPONSE", response.status);
  if (typeof result.verified === "boolean") return result.verified;
  providerFailure(action, "RESPONSE", response.status);
}
async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "تعذر بدء التحقق حاليًا." });
  return db;
}

/** Database-driver details must never be returned to an Events participant. */
async function runOtpPersistence<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    console.error("[Events OTP] Challenge persistence failed", error);
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "تعذر بدء التحقق بالجوال حاليًا. حاول مرة أخرى بعد قليل.",
    });
  }
}

// Persisted, locked counters apply across restarts and multiple server instances.
// Trust req.ip only after the hosting proxy has been configured in Express.
export async function sendEventOtp(rawPhone: string, ip: string) {
  configuredKey();
  const phone = otpPhone(rawPhone), phoneHash = hash(phone);
  const token = crypto.randomBytes(32).toString("base64url"), tokenHash = hash(token);
  const db = await database(), now = new Date();
  await runOtpPersistence(() => db.transaction(async tx => {
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
  }));
  let sent = false;
  try { sent = await authenticaRequest("send-otp", { method: "sms", phone }); }
  finally {
    await runOtpPersistence(() => db.update(eventOtpChallenges).set({ state: sent ? "pending" : "failed" })
      .where(and(eq(eventOtpChallenges.phoneHash, phoneHash), eq(eventOtpChallenges.tokenHash, tokenHash))));
  }
  if (!sent) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "لم يتم إرسال الرمز. حاول لاحقًا." });
  return { challengeToken: token, retryAfterSeconds: 60, expiresInSeconds: TTL / 1000 };
}

export async function verifyEventOtp(rawPhone: string, token: string, code: string) {
  configuredKey();
  const phone = otpPhone(rawPhone), phoneHash = hash(phone), tokenHash = hash(token);
  const db = await database();
  await runOtpPersistence(() => db.transaction(async tx => {
    const [row] = await tx.select().from(eventOtpChallenges).where(eq(eventOtpChallenges.phoneHash, phoneHash)).for("update");
    if (!row || row.tokenHash !== tokenHash || row.expiresAt.getTime() <= Date.now() || row.attempts >= 5 || row.state !== "pending") throw invalid();
    await tx.update(eventOtpChallenges).set({ attempts: row.attempts + 1, state: "verifying" }).where(eq(eventOtpChallenges.phoneHash, phoneHash));
  }));
  let verified = false;
  try { verified = await authenticaRequest("verify-otp", { phone, otp: code }); }
  finally {
    await runOtpPersistence(() => db.update(eventOtpChallenges).set({ state: verified ? "verified" : "pending" })
      .where(and(eq(eventOtpChallenges.phoneHash, phoneHash), eq(eventOtpChallenges.tokenHash, tokenHash))));
  }
  if (!verified) throw invalid();
  return { verified: true as const };
}

export async function consumeEventOtp(rawPhone: string, token?: string) {
  configuredKey();
  if (!token) throw invalid();
  const db = await database(), phoneHash = hash(otpPhone(rawPhone)), tokenHash = hash(token);
  await runOtpPersistence(() => db.transaction(async tx => {
    const [row] = await tx.select().from(eventOtpChallenges).where(eq(eventOtpChallenges.phoneHash, phoneHash)).for("update");
    if (!row || row.tokenHash !== tokenHash || row.state !== "verified" || row.expiresAt.getTime() <= Date.now()) throw invalid();
    await tx.update(eventOtpChallenges).set({ state: "consumed" }).where(eq(eventOtpChallenges.phoneHash, phoneHash));
  }));
}
