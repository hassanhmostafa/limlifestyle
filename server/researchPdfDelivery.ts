import crypto from "node:crypto";
import {
  readArchivedReportPdf,
  readArchivedReportSnapshot,
} from "./eventReportArchive";

export const RESEARCH_PDF_DELIVERY_CONTRACT = "LIM_RESEARCH_REQUEST_V1";
export const RESEARCH_PDF_DELIVERY_PATH = "/api/integrations/lim/reports";
export const RESEARCH_PDF_DELIVERY_MAX_BYTES = 15 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 10_000;

/** Exact JSON object signed after UTF-8 + unpadded base64url encoding. */
export type ResearchPdfDeliveryMetadata = {
  contractVersion: 1;
  sourceSystem: "lim-lifestyle";
  archiveId: string;
  revision: number;
  eventCode: string;
  templateVersion: string;
  size: number;
  pdfSha256: string;
  participantReference?: string;
  assessmentReference?: string;
};

export type ResearchPdfDeliveryResult =
  | { attempted: false; delivered: false; reason: "disabled" | "not_archived" }
  | { attempted: true; delivered: true; responseStatus: number };

type DeliveryConfig = {
  url: string;
  keyId: string;
  /** Decoded binary HMAC key; the base64 transport representation is never used as text. */
  signingKey: Buffer;
  timeoutMs: number;
};

type DeliveryDependencies = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  readPdf?: typeof readArchivedReportPdf;
  readSnapshot?: typeof readArchivedReportSnapshot;
  now?: () => Date;
  nonce?: () => string;
};

function decodedHmacKey(value: string | undefined) {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return undefined;
  const decoded = Buffer.from(value, "base64");
  // Reject non-canonical/ambiguous encodings; at least 32 random bytes are required.
  if (decoded.length < 32 || decoded.toString("base64") !== value) return undefined;
  return decoded;
}

/**
 * Deliberately disabled until the independent Research endpoint and protected
 * server-only credentials are configured. It has no client import, no Research
 * database access, and no fallback to Research or LIM operational records.
 */
export function researchPdfDeliveryConfig(env: NodeJS.ProcessEnv = process.env): DeliveryConfig | undefined {
  if (env.LIM_RESEARCH_PDF_DELIVERY_ENABLED !== "true") return undefined;
  const urlValue = env.LIM_RESEARCH_PDF_DELIVERY_URL?.trim();
  const keyId = env.LIM_RESEARCH_KEY_ID?.trim();
  const signingKey = decodedHmacKey(env.LIM_RESEARCH_HMAC_KEY_BASE64);
  if (!urlValue || !keyId || !signingKey || !/^[A-Za-z0-9_-]{1,64}$/.test(keyId)) return undefined;

  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return undefined;
  }
  // The final receiver contract permits only this TLS endpoint; query/hash
  // values are rejected so they cannot silently alter the signed route.
  if (url.protocol !== "https:" || url.pathname !== RESEARCH_PDF_DELIVERY_PATH || url.search || url.hash) return undefined;

  const requestedTimeout = Number(env.LIM_RESEARCH_PDF_DELIVERY_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(500, Math.min(MAX_TIMEOUT_MS, Math.trunc(requestedTimeout)))
    : DEFAULT_TIMEOUT_MS;
  return { url: url.toString(), keyId, signingKey, timeoutMs };
}

/** Property insertion order below is the final wire order for JSON.stringify. */
export function researchPdfDeliveryCanonicalMetadata(metadata: ResearchPdfDeliveryMetadata) {
  return JSON.stringify({
    contractVersion: metadata.contractVersion,
    sourceSystem: metadata.sourceSystem,
    archiveId: metadata.archiveId,
    revision: metadata.revision,
    eventCode: metadata.eventCode,
    templateVersion: metadata.templateVersion,
    size: metadata.size,
    pdfSha256: metadata.pdfSha256,
    ...(metadata.participantReference === undefined ? {} : { participantReference: metadata.participantReference }),
    ...(metadata.assessmentReference === undefined ? {} : { assessmentReference: metadata.assessmentReference }),
  });
}

export function researchPdfDeliveryMetadataBase64Url(metadata: ResearchPdfDeliveryMetadata) {
  return Buffer.from(researchPdfDeliveryCanonicalMetadata(metadata), "utf8").toString("base64url");
}

/** The final LF-separated request string has no terminal LF. */
export function researchPdfDeliveryCanonicalRequest(input: {
  keyId: string;
  timestamp: number;
  nonce: string;
  metadataBase64Url: string;
  pdfSha256: string;
}) {
  return [
    RESEARCH_PDF_DELIVERY_CONTRACT,
    "POST",
    RESEARCH_PDF_DELIVERY_PATH,
    input.keyId,
    String(input.timestamp),
    input.nonce,
    input.metadataBase64Url,
    input.pdfSha256,
  ].join("\n");
}

/** Lowercase hexadecimal HMAC-SHA-256, keyed with decoded base64 key bytes. */
export function researchPdfDeliverySignature(canonicalRequest: string, signingKey: Buffer) {
  return crypto.createHmac("sha256", signingKey).update(canonicalRequest, "utf8").digest("hex");
}

function bytesSha256(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function validUuidV4(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Sends a previously archived, integrity-checked original PDF to the independent
 * Research service. Callers must catch errors: Research availability cannot
 * change the LIM participant report, archive state, sharing, or completion flow.
 */
export async function deliverArchivedResearchPdf(
  archiveId: string,
  dependencies: DeliveryDependencies = {}
): Promise<ResearchPdfDeliveryResult> {
  const config = researchPdfDeliveryConfig(dependencies.env);
  if (!config) return { attempted: false, delivered: false, reason: "disabled" };

  const readPdf = dependencies.readPdf ?? readArchivedReportPdf;
  const readSnapshot = dependencies.readSnapshot ?? readArchivedReportSnapshot;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const report = await readPdf(archiveId);
  if (!report || report.archive.pdfStatus !== "archived" || !report.archive.pdfSha256) {
    return { attempted: false, delivered: false, reason: "not_archived" };
  }

  // The source archive reader has already verified the encrypted object SHA.
  // Recalculate before crossing the project boundary, without reading any
  // participant/session table or any Research database.
  const pdf = Buffer.from(report.pdf);
  if (pdf.length > RESEARCH_PDF_DELIVERY_MAX_BYTES) throw new Error("Research delivery PDF exceeds the contract size limit.");
  if (bytesSha256(pdf) !== report.archive.pdfSha256) throw new Error("Research delivery source PDF integrity check failed.");
  if (report.archive.pdfBytes !== null && report.archive.pdfBytes !== undefined && Number(report.archive.pdfBytes) !== pdf.length)
    throw new Error("Research delivery source PDF size check failed.");

  const snapshot = await readSnapshot(archiveId);
  // Template provenance is frozen with the approved report. Do not substitute
  // the current renderer version when the original snapshot lacks it.
  const templateVersion = snapshot?.snapshot.metadata?.templateVersion;
  if (!templateVersion) throw new Error("Research delivery template provenance is unavailable.");

  const metadata: ResearchPdfDeliveryMetadata = {
    contractVersion: 1,
    sourceSystem: "lim-lifestyle",
    archiveId: report.archive.archiveId,
    revision: report.archive.reportRevision,
    eventCode: report.archive.eventCode,
    templateVersion,
    size: pdf.length,
    pdfSha256: report.archive.pdfSha256,
  };
  const metadataBase64Url = researchPdfDeliveryMetadataBase64Url(metadata);
  const timestamp = Math.floor((dependencies.now?.() ?? new Date()).getTime() / 1_000);
  const nonce = dependencies.nonce?.() ?? crypto.randomUUID();
  if (!validUuidV4(nonce)) throw new Error("Research delivery nonce is invalid.");
  const canonicalRequest = researchPdfDeliveryCanonicalRequest({
    keyId: config.keyId,
    timestamp,
    nonce,
    metadataBase64Url,
    pdfSha256: metadata.pdfSha256,
  });

  const response = await fetchImpl(config.url, {
    method: "POST",
    signal: AbortSignal.timeout(config.timeoutMs),
    headers: {
      "Content-Type": "application/pdf",
      "X-LIM-Key-Id": config.keyId,
      "X-LIM-Timestamp": String(timestamp),
      "X-LIM-Nonce": nonce,
      "X-LIM-Metadata": metadataBase64Url,
      "X-LIM-Signature": researchPdfDeliverySignature(canonicalRequest, config.signingKey),
    },
    body: pdf,
  });
  // Research receipt format is intentionally not enforced until the receiver
  // publishes its final receipt contract. A non-2xx is a failed handoff.
  if (!response.ok) throw new Error(`Research delivery rejected the archived PDF (${response.status}).`);
  return { attempted: true, delivered: true, responseStatus: response.status };
}

/**
 * Best-effort bridge only. It intentionally stores no promise or retry state in
 * process memory; durable retries belong to the independent Research receiver
 * or a separately provisioned queue, never LIM's operational database.
 */
export function scheduleArchivedResearchPdfDelivery(archiveId: string) {
  if (!researchPdfDeliveryConfig()) return;
  void deliverArchivedResearchPdf(archiveId).catch(() => {
    // Never include an archive id, PDF content, response body, or secrets in logs.
    console.warn("[Research delivery] Archived PDF handoff failed after LIM archival.");
  });
}
