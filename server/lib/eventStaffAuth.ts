import crypto from "crypto";
import { parse } from "cookie";
import { TRPCError } from "@trpc/server";
import type { Request } from "express";
import { getSessionCookieOptions } from "../_core/cookies";
export const STAFF_COOKIE = "lim_event_staff";
export const STAFF_SESSION_TTL = 8 * 60 * 60 * 1000;
export function createStaffCode() {
  // 96 random bits, grouped for copying/typing. Never derived from phone or role.
  return `LIM-${crypto.randomBytes(12).toString("hex").toUpperCase().match(/.{6}/g)!.join("-")}`;
}
export function normalizeStaffCode(code: string) {
  return code.trim().toUpperCase().replace(/[\s-]/g, "");
}
export function readStaffToken(req: Pick<Request, "headers">) {
  const token = parse(req.headers.cookie ?? "")[STAFF_COOKIE];
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function staffCookieOptions(req: Request) {
  return { ...getSessionCookieOptions(req), sameSite: "lax" as const };
}
// Bounded, per-process supplementary limiter. Credentials themselves have 96-bit entropy.
const attempts = new Map<string, { count: number; until: number }>();
export function checkStaffLoginRate(ip: string, now = Date.now()) {
  attempts.forEach((value, key) => {
    if (value.until <= now) attempts.delete(key);
  });
  const entry = attempts.get(ip);
  if ((entry?.count ?? 0) >= 20 || (!entry && attempts.size >= 10000))
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "محاولات دخول كثيرة؛ حاول بعد عشر دقائق",
    });
  attempts.set(ip, {
    count: (entry?.count ?? 0) + 1,
    until: entry?.until ?? now + 600000,
  });
}
