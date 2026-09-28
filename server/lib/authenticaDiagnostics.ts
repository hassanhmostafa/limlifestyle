import crypto from "node:crypto";

export type AuthenticaDiagnostics = {
  keyPresent: boolean;
  keyLength: number;
  keyFormat: "bcrypt" | "other" | "missing";
  /** A short one-way comparison value; never the API key itself. */
  keyFingerprint: string | null;
  balanceHttpStatus: number | null;
  balanceReachable: boolean;
  transport: "ok" | "network_error" | "not_configured";
};

function fingerprint(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

/**
 * Server-only, non-sending credential inspection.
 * It never reads or exposes Authentica's response body, account balance, or key.
 */
export async function getAuthenticaDiagnostics(
  fetcher: typeof fetch = fetch,
  injectedKey?: string,
): Promise<AuthenticaDiagnostics> {
  const key = injectedKey === undefined ? process.env.AUTHENTICA_API_KEY?.trim() : injectedKey.trim();
  if (!key) {
    return {
      keyPresent: false,
      keyLength: 0,
      keyFormat: "missing",
      keyFingerprint: null,
      balanceHttpStatus: null,
      balanceReachable: false,
      transport: "not_configured",
    };
  }

  const keyFormat = /^\$2[aby]\$\d{2}\$.{53}$/.test(key) ? "bcrypt" : "other";
  const base = {
    keyPresent: true,
    keyLength: key.length,
    keyFormat,
    keyFingerprint: `sha256:${fingerprint(key)}`,
  } as const;

  try {
    const response = await fetcher("https://api.authentica.sa/api/v2/balance", {
      headers: { "X-Authorization": key, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    return {
      ...base,
      balanceHttpStatus: response.status,
      balanceReachable: response.ok,
      transport: "ok",
    };
  } catch {
    return {
      ...base,
      balanceHttpStatus: null,
      balanceReachable: false,
      transport: "network_error",
    };
  }
}
