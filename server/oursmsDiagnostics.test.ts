import { afterEach, describe, it, expect, vi } from "vitest";
import { getOurSmsDiagnostics } from "./lib/oursmsDiagnostics";
afterEach(() => vi.unstubAllEnvs());
describe("OurSMS runtime diagnostics", () => {
  it("reports missing configuration without network access", async () => {
    vi.stubEnv("OURSMS_API_KEY", "");
    const f = vi.fn();
    const d = await getOurSmsDiagnostics(f);
    expect(d.keyPresent).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("uses a read-only authenticated endpoint and never reads the body", async () => {
    vi.stubEnv("OURSMS_API_KEY", "secret-key");
    vi.stubEnv("OURSMS_SENDER_ID", "LIM");
    vi.stubEnv("EVENTS_OTP_SECRET", "s".repeat(32));
    const json = vi.fn(),
      text = vi.fn();
    const f = vi.fn().mockResolvedValue({ status: 200, json, text });
    const d = await getOurSmsDiagnostics(f);
    expect(f).toHaveBeenCalledWith(
      "https://api.oursms.com/billing/credits",
      expect.objectContaining({
        redirect: "error",
        headers: expect.objectContaining({
          Authorization: "Bearer secret-key",
        }),
      })
    );
    expect(d.balanceReachable).toBe(true);
    expect(d.senderConfigured).toBe(true);
    expect(JSON.stringify(d)).not.toContain("secret-key");
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
  });
});
