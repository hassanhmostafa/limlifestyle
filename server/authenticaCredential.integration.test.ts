import { describe, expect, it } from "vitest";

/**
 * Intentionally opt-in: this calls Authentica's non-sending balance endpoint.
 * Run with AUTHENTICA_CREDENTIAL_TEST=true and an injected server credential.
 * It never logs, snapshots, or returns the key or the balance response body.
 */
const enabled = process.env.AUTHENTICA_CREDENTIAL_TEST === "true";

describe.runIf(enabled)("Authentica production credential", () => {
  it("is accepted by the non-sending balance endpoint", async () => {
    const key = process.env.AUTHENTICA_API_KEY?.trim();
    expect(key).toBeTruthy();

    const response = await fetch("https://api.authentica.sa/api/v2/balance", {
      headers: {
        "X-Authorization": key!,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    // The body can include account data and must never be read or logged here.
    expect(response.status).toBe(200);
  });
});

describe.skipIf(enabled)("Authentica production credential", () => {
  it("runs only when explicitly enabled for a secure credential check", () => {});
});
