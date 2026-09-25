import crypto from "crypto";
import { ENV } from "../_core/env";

const PREFIX = "lim_event_test";
const VERSION = "v1";
const MAX_TTL_MS = 5 * 60 * 1000;

type TestUploadClaim = {
  userId: number;
  phone: string;
  recordNo: string;
  deviceNo: string;
  expiresAt: number;
};

function signingSecret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for the temporary Events upload credential.");
  return ENV.cookieSecret;
}

function signingValue(claim: TestUploadClaim) {
  return [VERSION, claim.userId, claim.phone, claim.recordNo, claim.deviceNo, claim.expiresAt].join("|");
}

function signature(claim: TestUploadClaim) {
  return crypto.createHmac("sha256", signingSecret()).update(signingValue(claim)).digest("base64url");
}

/**
 * A short-lived, per-result test credential. It is accepted only for a test
 * device and only for the exact phone/record number issued to this event
 * browser session. It never replaces the fleet API key used by real devices.
 */
export function createEventTestUploadKey(input: Omit<TestUploadClaim, "expiresAt">) {
  const claim: TestUploadClaim = {
    ...input,
    expiresAt: Date.now() + MAX_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(claim)).toString("base64url");
  return `${PREFIX}.${encoded}.${signature(claim)}`;
}

export function verifyEventTestUploadKey(apiKey: string | undefined, expected: Omit<TestUploadClaim, "expiresAt">) {
  if (!apiKey) return false;
  const [prefix, encoded, receivedSignature, ...rest] = apiKey.split(".");
  if (prefix !== PREFIX || !encoded || !receivedSignature || rest.length > 0) return false;

  try {
    const claim = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TestUploadClaim;
    if (
      !Number.isInteger(claim.userId)
      || typeof claim.phone !== "string"
      || typeof claim.recordNo !== "string"
      || typeof claim.deviceNo !== "string"
      || typeof claim.expiresAt !== "number"
      || claim.expiresAt < Date.now()
      || claim.expiresAt > Date.now() + MAX_TTL_MS
      || claim.userId !== expected.userId
      || claim.phone !== expected.phone
      || claim.recordNo !== expected.recordNo
      || claim.deviceNo !== expected.deviceNo
    ) return false;

    const calculated = signature(claim);
    return crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(calculated));
  } catch {
    return false;
  }
}
