import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { sendOurSms, otpDigest, consumeEventOtp, otpPhone, sendEventOtp, verifyEventOtp } from "./eventOtp";
import { getDb } from "./db";
vi.mock("./db", () => ({ getDb: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("EVENTS_OTP_ENABLED", "true");
  vi.stubEnv("OURSMS_API_KEY", "test-only-key");
  vi.stubEnv("OURSMS_SENDER_ID", "RAWZ OTP");
  vi.stubEnv("OURSMS_TEMPLATE_ID", "MGtF_xgC");
  vi.stubEnv("EVENTS_OTP_SECRET", "test-only-secret-at-least-32-characters");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe("OurSMS boundary", () => {
 it("sends the original LIM text without requiring the obsolete template ID",async()=>{
  vi.stubEnv('OURSMS_TEMPLATE_ID','');
  vi.mocked(fetch).mockResolvedValue(new Response('{}'));
  await sendOurSms('+966501234567','0007');
  const request=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(request).toEqual({src:'RAWZ OTP',dests:['966501234567'],body:'رمز التحقق في ليم: 0007. صالح لمدة 10 دقائق. لا تشارك الرمز مع أحد.'});
 });

 it("normalizes Saudi numbers and rejects other destinations",()=>{
  expect(otpPhone("0501234567")).toBe("+966501234567");expect(()=>otpPhone("+12025550101")).toThrow();
 });
 it("uses Bearer and the configured sender with no redirects",async()=>{
  vi.mocked(fetch).mockResolvedValue(new Response('{}'));
  await sendOurSms('+966501234567','0123');
  expect(fetch).toHaveBeenCalledWith('https://api.oursms.com/msgs/sms',expect.objectContaining({redirect:'error',headers:expect.objectContaining({Authorization:'Bearer test-only-key'})}));
  const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(body).toEqual({src:'RAWZ OTP',dests:['966501234567'],body:'رمز التحقق في ليم: 0123. صالح لمدة 10 دقائق. لا تشارك الرمز مع أحد.'});
 });

 it("decodes percent-encoded spaces in a sender ID only for the provider request",async()=>{
  vi.stubEnv('OURSMS_SENDER_ID','RAWZ%20OTP');
  vi.mocked(fetch).mockResolvedValue(new Response('{}'));
  await sendOurSms('+966501234567','0123');
  const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(body.src).toBe('RAWZ OTP');
  expect(JSON.stringify(vi.mocked(fetch).mock.calls)).not.toContain('RAWZ%20OTP');
 });
 it("fails closed for an invalid percent-encoded sender ID",async()=>{
  vi.stubEnv('OURSMS_SENDER_ID','LIM%bad');
  await expect(sendOurSms('+966501234567','0123')).rejects.toThrow('OTP-SENDER');
  expect(fetch).not.toHaveBeenCalled();
 });
 it.each(['OURSMS_API_KEY','OURSMS_SENDER_ID','EVENTS_OTP_SECRET'])('fails closed with missing %s',async key=>{

  vi.stubEnv(key,'');await expect(sendEventOtp('0501234567','ip')).rejects.toThrow('OTP-CONFIG');expect(fetch).not.toHaveBeenCalled();
 });
 it('blocks missing proof and disabled OTP',async()=>{
  await expect(consumeEventOtp('0501234567')).rejects.toThrow('رمز التحقق');
  vi.stubEnv('EVENTS_OTP_ENABLED','false');await expect(consumeEventOtp('0501234567')).rejects.toThrow('غير متاح');
 });
 it.each([[401,'AUTH'],[403,'AUTH'],[429,'LIMIT'],[402,'CREDIT'],[422,'REQUEST'],[500,'PROVIDER']] as const)('redacts HTTP %s',async(status,category)=>{
  const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
  vi.mocked(fetch).mockResolvedValue(new Response('secret code phone key',{status}));
  await expect(sendOurSms('+966501234567','1234')).rejects.toThrow(`OTP-${category}-${status}`);
  expect(JSON.stringify(log.mock.calls)).not.toContain('secret');log.mockRestore();
 });
 it.each(['not json','{"success":false}','{"error":"secret"}'])('rejects malformed or explicitly failed body %s',async body=>{
  vi.mocked(fetch).mockResolvedValue(new Response(body));await expect(sendOurSms('+966501234567','1234')).rejects.toThrow('OTP-RESPONSE');
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
const pending = () => ({ tokenHash: digest(token), expiresAt: new Date(Date.now() + 600000), state: "pending", attempts: 0, codeHash: otpDigest(digest("+966501234567"),digest(token),"1234") });
describe("challenge ownership and lifecycle", () => {
  it("accepts a leading-zero four-digit code", async () => {
    const row = challengeDatabase({...pending(), codeHash: otpDigest(digest("+966501234567"), digest(token), "0123")})!;
    await verifyEventOtp("0501234567", token, "0123");
    expect(row.state).toBe("verified");
  });
  it("rejects an old six-digit challenge even with a matching digest", async () => {
    const row = challengeDatabase({...pending(), codeHash: otpDigest(digest("+966501234567"), digest(token), "123456")})!;
    await expect(verifyEventOtp("0501234567", token, "123456")).rejects.toThrow();
    expect(row.state).toBe("pending");
  });
  it("verifies then consumes exactly once", async () => {
    const row = challengeDatabase(pending())!;
    vi.mocked(fetch).mockResolvedValue(new Response('{"verified":true}'));
    await verifyEventOtp("0501234567", token, "1234");
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
    await expect(verifyEventOtp("0501234567", token, "1234")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("counts wrong attempts and stops the sixth attempt", async () => {
    const row = challengeDatabase(pending())!;
    vi.mocked(fetch).mockImplementation(async () => new Response('{"verified":false}'));
    for (let i = 0; i < 6; i++) await expect(verifyEventOtp("0501234567", token, "0000")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    expect(row.attempts).toBe(5);
    expect(row.state).toBe("pending");
  });
  it("binds the code to the phone and current browser challenge",async()=>{
    challengeDatabase(pending());
    await expect(verifyEventOtp('0509999999',token,'1234')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects pre-migration Authentica challenges",async()=>{
    challengeDatabase({...pending(),codeHash:null});
    await expect(verifyEventOtp('0501234567',token,'1234')).rejects.toThrow();
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
  it("redacts database driver errors before they reach a participant", async () => {
    vi.mocked(getDb).mockResolvedValue({
      transaction: async () => { throw new Error("Failed query: insert into event_otp_limits"); },
    } as never);

    await expect(sendEventOtp("0501234567", "test-ip"))
      .rejects.toThrow("تعذر بدء التحقق بالجوال");
  });
  it("enforces the resend cooldown across an hourly bucket boundary", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-26T10:59:50Z'));
    const state = sendDatabase();
    vi.mocked(fetch).mockImplementation(async () => new Response('{"success":true}'));
    const result = await sendEventOtp('0501234567', 'test-ip');
    expect(result.challengeToken.length).toBeGreaterThanOrEqual(32);
    expect(state.challenge().tokenHash).not.toBe(result.challengeToken);
    const sentCode = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).body.match(/\d{4}/)[0];
    expect(sentCode).toMatch(/^\d{4}$/);
    expect(state.challenge().codeHash).toBe(otpDigest(digest("+966501234567"), digest(result.challengeToken), sentCode));
    expect(JSON.stringify(result)).not.toContain(sentCode);
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
    await expect(sendEventOtp('0501234567', 'test-ip')).rejects.toThrow('OTP-NETWORK');
    expect(state.challenge().state).toBe('failed');
  });
});
