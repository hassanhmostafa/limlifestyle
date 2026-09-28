import { describe, expect, it } from "vitest";

/**
 * Intentionally opt-in: this calls OurSMS's non-sending balance endpoint.
 * Run with OURSMS_CREDENTIAL_TEST=true and an injected server credential.
 * It never logs, snapshots, or returns the key or the balance response body.
 */
const enabled = process.env.OURSMS_CREDENTIAL_TEST === "true";

describe.runIf(enabled)("OurSMS production credential", () => {
  it("is accepted by the non-sending balance endpoint", async () => {
    const key = process.env.OURSMS_API_KEY?.trim();
    expect(key).toBeTruthy();

    const response = await fetch("https://api.oursms.com/billing/credits", {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    // The body can include account data and must never be read or logged here.
    expect(response.status).toBe(200);
  });
});

describe.skipIf(enabled)("OurSMS production credential", () => {
  it("runs only when explicitly enabled for a secure credential check", () => {});
});
