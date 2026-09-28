import { describe, expect, it } from "vitest";
import { getAuthenticaDiagnostics } from "./lib/authenticaDiagnostics";

describe("Authentica runtime diagnostics", () => {
  it("returns a safe one-way key comparison and successful provider status", async () => {
    const key = `$2y$10$${"a".repeat(53)}`;
    const diagnostic = await getAuthenticaDiagnostics(
      async () => new Response(JSON.stringify({ data: { balance: 100 } }), { status: 200 }),
      key,
    );

    expect(diagnostic).toMatchObject({
      keyPresent: true,
      keyLength: key.length,
      keyFormat: "bcrypt",
      balanceHttpStatus: 200,
      balanceReachable: true,
      transport: "ok",
    });
    expect(diagnostic.keyFingerprint).toMatch(/^sha256:[a-f0-9]{12}$/);
    expect(JSON.stringify(diagnostic)).not.toContain(key);
  });

  it("classifies an Authentica rejection without reading its response body", async () => {
    const diagnostic = await getAuthenticaDiagnostics(
      async () => new Response("private provider detail", { status: 401 }),
      "not-a-real-key",
    );

    expect(diagnostic).toMatchObject({
      keyFormat: "other",
      balanceHttpStatus: 401,
      balanceReachable: false,
      transport: "ok",
    });
  });

  it("does not attempt a request when no credential exists", async () => {
    const diagnostic = await getAuthenticaDiagnostics(
      async () => {
        throw new Error("must not fetch");
      },
      "",
    );
    expect(diagnostic).toEqual({
      keyPresent: false,
      keyLength: 0,
      keyFormat: "missing",
      keyFingerprint: null,
      balanceHttpStatus: null,
      balanceReachable: false,
      transport: "not_configured",
    });
  });
});
