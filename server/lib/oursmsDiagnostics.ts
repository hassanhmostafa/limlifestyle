import crypto from "node:crypto";
/** Read-only diagnostics from the actual server runtime. Never return credentials. */
export async function getOurSmsDiagnostics(fetcher: typeof fetch = fetch) {
  const key = process.env.OURSMS_API_KEY?.trim();
  const base = {
    provider: "OurSMS",
    enabled: process.env.EVENTS_OTP_ENABLED === "true",
    keyPresent: Boolean(key),
    keyLength: key?.length ?? 0,
    keyFingerprint: key
      ? "sha256:" +
        crypto.createHash("sha256").update(key).digest("hex").slice(0, 12)
      : null,
    senderConfigured: Boolean(process.env.OURSMS_SENDER_ID?.trim()),
    secretConfigured: (process.env.EVENTS_OTP_SECRET?.length ?? 0) >= 32,
  };
  if (!key)
    return {
      ...base,
      balanceHttpStatus: null,
      balanceReachable: false,
      transport: "not_configured",
    };
  try {
    const r = await fetcher("https://api.oursms.com/billing/credits", {
      redirect: "error",
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    return {
      ...base,
      balanceHttpStatus: r.status,
      balanceReachable: r.status === 200,
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
