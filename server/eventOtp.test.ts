import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { authenticaRequest, consumeEventOtp, otpPhone, sendEventOtp, verifyEventOtp } from "./eventOtp";
import { getDb } from "./db";
vi.mock("./db", () => ({ getDb: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("EVENTS_OTP_ENABLED", "true");
  vi.stubEnv("AUTHENTICA_API_KEY", "test-only-key");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe("Authentica boundary", () => {
  it("normalizes Saudi numbers and rejects other destinations", () => {
    expect(otpPhone("0501234567")).toBe("+966501234567");
    expect(otpPhone("00966501234567")).toBe("+966501234567");
    expect(() => otpPhone("+12025550101")).toThrow();
  });
  it("sends SMS with a server-only key and no redirects", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true })));
    expect(await authenticaRequest("send-otp", { phone: "+966501234567", method: "sms" })).toBe(true);
    expect(fetch).toHaveBeenCalledWith("https://api.authentica.sa/api/v2/send-otp", expect.objectContaining({
      redirect: "error", headers: expect.objectContaining({ "X-Authorization": "test-only-key" }),
      body: JSON.stringify({ phone: "+966501234567", method: "sms" }),
    }));
  });
  it.each([{ verified: true }, { verified: false }, { success: true }, { verified: "true" }, {}])("only accepts explicit verified:true (%j)", async response => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(response)));
    expect(await authenticaRequest("verify-otp", { phone: "+966501234567", otp: "123456" })).toBe(response.verified === true);
  });
  it("treats provider rejection as an invalid code", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 422 }));
    expect(await authenticaRequest("verify-otp", {})).toBe(false);
  });
  it.each([401, 429, 500])("redacts provider failure %s", async status => {
    vi.mocked(fetch).mockResolvedValue(new Response("test-only-key internal detail", { status }));
    await expect(authenticaRequest("send-otp", {})).rejects.toThrow("تعذر الاتصال");
  });
  it("fails closed if enabled without a key", async () => {
    vi.stubEnv("AUTHENTICA_API_KEY", "");
    await expect(authenticaRequest("send-otp", {})).rejects.toThrow("غير متاح");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not accept missing proof when enabled", async () => {
    await expect(consumeEventOtp("0501234567")).rejects.toThrow("رمز التحقق");
  });
  it("keeps the existing journey when explicitly not enabled", async () => {
    vi.stubEnv("EVENTS_OTP_ENABLED", "false");
    await expect(consumeEventOtp("0501234567")).resolves.toBeUndefined();
    expect(getDb).not.toHaveBeenCalled();
  });
});

// Single-row DB adapter exercises challenge transitions; MySQL lock/rollback
// behavior still needs staging validation against the deployed database.
function challengeDatabase(row: Record<string, unknown> | undefined) {
  const state = row;
  const tx = {
    select: () => ({ from: () => ({ where: () => ({ for: async () => state ? [{ ...state }] : [] }) }) }),
    update: () => ({ set: (changes: Record<string, unknown>) => ({ where: async () => Object.assign(state || {}, changes) }) }),
  };
  const database = { ...tx, transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  vi.mocked(getDb).mockResolvedValue(database as never);
  return state;
}
import { createHash } from "node:crypto";
const token = "a".repeat(43);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const pending = () => ({ tokenHash: digest(token), expiresAt: new Date(Date.now() + 600000), state: "pending", attempts: 0 });
describe("challenge ownership and lifecycle", () => {
  it("verifies then consumes exactly once", async () => {
    const row = challengeDatabase(pending())!;
    vi.mocked(fetch).mockResolvedValue(new Response('{"verified":true}'));
    await verifyEventOtp("0501234567", token, "123456");
    expect(row.state).toBe("verified");
    expect(row.attempts).toBe(1);
    await consumeEventOtp("0501234567", token);
    expect(row.state).toBe("consumed");
    await expect(consumeEventOtp("0501234567", token)).rejects.toThrow();
  });
  it.each([
    { state: "pending" }, { state: "consumed" }, { state: "verifying" },
    { expiresAt: new Date(0) }, { tokenHash: digest("different token") },
  ])("rejects unusable registration proof %j", async override => {
    challengeDatabase({ ...pending(), state: "verified", ...override });
    await expect(consumeEventOtp("0501234567", token)).rejects.toThrow();
  });
  it.each([{ attempts: 5 }, { state: "verifying" }, { expiresAt: new Date(0) }, { tokenHash: digest("other") }])("blocks invalid verification before contacting provider %j", async override => {
    challengeDatabase({ ...pending(), ...override });
    await expect(verifyEventOtp("0501234567", token, "123456")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("counts wrong attempts and stops the sixth attempt", async () => {
    const row = challengeDatabase(pending())!;
    vi.mocked(fetch).mockImplementation(async () => new Response('{"verified":false}'));
    for (let i = 0; i < 6; i++) await expect(verifyEventOtp("0501234567", token, "000000")).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(row.attempts).toBe(5);
    expect(row.state).toBe("pending");
  });
  it("a network failure never verifies a challenge and permits retry", async () => {
    const row = challengeDatabase(pending())!;
    vi.mocked(fetch).mockRejectedValue(new Error("network secret"));
    await expect(verifyEventOtp("0501234567", token, "123456")).rejects.toThrow("تعذر الاتصال");
    expect(row.state).toBe("pending");
  });
});

import { eventOtpChallenges, eventOtpLimits } from "../drizzle/schema";
function sendDatabase() {
  const buckets = new Map<string, any>();
  let challenge: any, bucket: string;
  const tx = {
    insert: (table: unknown) => ({ values: (value: any) => ({ onDuplicateKeyUpdate: async ({ set }: any) => {
      if (table === eventOtpLimits) { bucket = value.bucket; if (!buckets.has(bucket)) buckets.set(bucket, { ...value }); }
      else { challenge = challenge ? { ...challenge, ...set } : { ...value }; }
    } }) }),
    select: () => ({ from: (table: unknown) => ({ where: () => ({ for: async () => [{ ...(table === eventOtpChallenges ? challenge : buckets.get(bucket)) }] }) }) }),
    update: (table: unknown) => ({ set: (value: any) => ({ where: async () => Object.assign(table === eventOtpChallenges ? challenge : buckets.get(bucket), value) }) }),
  };
  vi.mocked(getDb).mockResolvedValue({ ...tx, transaction: async (fn: any) => fn(tx) } as never);
  return { challenge: () => challenge, buckets };
}
describe("persistent send limits", () => {
  afterEach(() => vi.useRealTimers());
  it("enforces the resend cooldown across an hourly bucket boundary", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-26T10:59:50Z'));
    const state = sendDatabase();
    vi.mocked(fetch).mockImplementation(async () => new Response('{"success":true}'));
    const result = await sendEventOtp('0501234567', 'test-ip');
    expect(result.challengeToken.length).toBeGreaterThanOrEqual(32);
    expect(state.challenge().tokenHash).not.toBe(result.challengeToken);
    vi.setSystemTime(new Date('2026-09-26T11:00:05Z'));
    await expect(sendEventOtp('0501234567', 'test-ip')).rejects.toThrow('دقيقة');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("limits a phone to five sends per hour and changes challenge on resend", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
    sendDatabase();
    vi.mocked(fetch).mockImplementation(async () => new Response('{"success":true}'));
    const tokens = new Set<string>();
    for (let i = 0; i < 5; i++) {
      tokens.add((await sendEventOtp('0501234567', 'test-ip')).challengeToken);
      vi.setSystemTime(Date.now() + 61000);
    }
    expect(tokens.size).toBe(5);
    await expect(sendEventOtp('0501234567', 'test-ip')).rejects.toThrow('عدد المحاولات');
    expect(fetch).toHaveBeenCalledTimes(5);
  });
  it("invalidates the challenge when the provider cannot send", async () => {
    const state = sendDatabase();
    vi.mocked(fetch).mockRejectedValue(new Error('unavailable'));
    await expect(sendEventOtp('0501234567', 'test-ip')).rejects.toThrow('تعذر الاتصال');
    expect(state.challenge().state).toBe('failed');
  });
});
