import crypto from "crypto";

/**
 * Creates the opaque shared LIM fleet credential. Store only its SHA-256 hash
 * in the database; show the plaintext key only while configuring devices.
 */
export function createDeviceApiKey(): string {
  // 16 random alpha-numeric characters = ~95 bits of entropy. This is much
  // easier to enter in the X18 configuration UI while remaining far beyond
  // practical online guessing resistance for the shared fleet credential.
  const suffix = crypto.randomBytes(24).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `lim_x18_${suffix}`;
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey, "utf8").digest("hex");
}

/** Uses a constant-time comparison to avoid exposing partial key matches. */
export function apiKeysMatch(providedKey: string | undefined, storedHash: string | null | undefined): boolean {
  if (!providedKey || !storedHash) return false;
  const expected = Buffer.from(storedHash, "hex");
  const received = Buffer.from(hashApiKey(providedKey), "hex");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

/**
 * Preferred: X-LIM-Device-Key header. The X18 settings UI may support only a
 * URL, so `?apiKey=` is accepted as a compatibility fallback.
 */
export function readDeviceApiKey(req: { headers?: Record<string, unknown>; query?: Record<string, unknown>; body?: Record<string, unknown> }): string | undefined {
  const headerValue = req.headers?.["x-lim-device-key"] ?? req.headers?.["X-LIM-Device-Key"];
  if (typeof headerValue === "string" && headerValue.trim()) return headerValue.trim();

  const authorization = req.headers?.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim() || undefined;
  }

  const queryValue = req.query?.apiKey;
  if (typeof queryValue === "string" && queryValue.trim()) return queryValue.trim();

  const bodyValue = req.body?.apiKey;
  if (typeof bodyValue === "string" && bodyValue.trim()) return bodyValue.trim();

  return undefined;
}

export function readBearerToken(req: { headers?: Record<string, unknown> }): string | undefined {
  const authorization = req.headers?.authorization;
  if (typeof authorization !== "string") return undefined;
  const [scheme, token] = authorization.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
}

export const EVENT_ACCESS_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
