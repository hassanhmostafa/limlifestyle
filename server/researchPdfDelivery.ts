import crypto from "node:crypto";
import {
  readArchivedReportPdf,
  readArchivedReportSnapshot,
} from "./eventReportArchive";

export const RESEARCH_PDF_DELIVERY_VERSION = "1";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 10_000;

export type ResearchPdfDeliveryMetadata = {
  archiveId: string;
  reportRevision: number;
  pdfSha256: string;
  eventCode: string;
  templateVersion: string;
  pdfBytes: number;
};

/** The receiver must persist this receipt before returning HTTP 2xx. */
export type ResearchPdfDeliveryReceipt = ResearchPdfDeliveryMetadata & {
  accepted: true;
  importId: string;
};

export type ResearchPdfDeliveryResult =
  | { attempted: false; delivered: false; reason: "disabled" | "not_archived" }
  | { attempted: true; delivered: true; idempotencyKey: string; responseStatus: number; importId: string };

type DeliveryConfig = {
  url: string;
  hmacSecret: string;
  timeoutMs: number;
};

type DeliveryDependencies = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  readPdf?: typeof readArchivedReportPdf;
  readSnapshot?: typeof readArchivedReportSnapshot;
};

/**
 * Deliberately disabled until the independent Research receiver contract and
 * protected server-to-server credentials are configured. This module has no
 * client import, no database query other than an already archived LIM object,
 * and no fallback to Research or LIM operational records.
 */
export function researchPdfDeliveryConfig(env: NodeJS.ProcessEnv = process.env): DeliveryConfig | undefined {
  if (env.LIM_RESEARCH_PDF_DELIVERY_ENABLED !== "true") return undefined;
  const urlValue = env.LIM_RESEARCH_PDF_DELIVERY_URL?.trim();
  const hmacSecret = env.LIM_RESEARCH_PDF_DELIVERY_HMAC_SECRET;
  if (!urlValue || !hmacSecret || hmacSecret.length < 32) return undefined;

  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return undefined;
  }
  // Research PDFs must never be posted to a clear-text or browser-local URL.
  if (url.protocol !== "https:") return undefined;

  const requestedTimeout = Number(env.LIM_RESEARCH_PDF_DELIVERY_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(500, Math.min(MAX_TIMEOUT_MS, Math.trunc(requestedTimeout)))
    : DEFAULT_TIMEOUT_MS;
  return { url: url.toString(), hmacSecret, timeoutMs };
}

export function researchPdfDeliveryIdempotencyKey(metadata: ResearchPdfDeliveryMetadata) {
  return `${metadata.archiveId}:${metadata.reportRevision}:${metadata.pdfSha256}`;
}

/** Stable, binary-independent message covered by the HMAC and receiver idempotency. */
export function researchPdfDeliveryCanonicalMetadata(metadata: ResearchPdfDeliveryMetadata) {
  return JSON.stringify({
    archiveId: metadata.archiveId,
    eventCode: metadata.eventCode,
    pdfBytes: metadata.pdfBytes,
    pdfSha256: metadata.pdfSha256,
    reportRevision: metadata.reportRevision,
    templateVersion: metadata.templateVersion,
    version: RESEARCH_PDF_DELIVERY_VERSION,
  });
}

export function researchPdfDeliverySignature(metadata: ResearchPdfDeliveryMetadata, hmacSecret: string) {
  return hmacBase64Url(researchPdfDeliveryCanonicalMetadata(metadata), hmacSecret);
}

/** Stable, receiver-issued acknowledgement covered by the same server-only secret. */
export function researchPdfDeliveryCanonicalReceipt(receipt: ResearchPdfDeliveryReceipt) {
  return JSON.stringify({
    accepted: receipt.accepted,
    archiveId: receipt.archiveId,
    eventCode: receipt.eventCode,
    importId: receipt.importId,
    pdfBytes: receipt.pdfBytes,
    pdfSha256: receipt.pdfSha256,
    reportRevision: receipt.reportRevision,
    templateVersion: receipt.templateVersion,
    version: RESEARCH_PDF_DELIVERY_VERSION,
  });
}

export function researchPdfDeliveryReceiptSignature(receipt: ResearchPdfDeliveryReceipt, hmacSecret: string) {
  return hmacBase64Url(researchPdfDeliveryCanonicalReceipt(receipt), hmacSecret);
}

function hmacBase64Url(message: string, hmacSecret: string) {
  return crypto
    .createHmac("sha256", hmacSecret)
    .update(message, "utf8")
    .digest("base64url");
}

function bytesSha256(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function receiptMatchesMetadata(value: unknown, metadata: ResearchPdfDeliveryMetadata): value is ResearchPdfDeliveryReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<ResearchPdfDeliveryReceipt>;
  return receipt.accepted === true
    && typeof receipt.importId === "string" && receipt.importId.length > 0 && receipt.importId.length <= 160
    && receipt.archiveId === metadata.archiveId
    && receipt.reportRevision === metadata.reportRevision
    && receipt.pdfSha256 === metadata.pdfSha256
    && receipt.eventCode === metadata.eventCode
    && receipt.templateVersion === metadata.templateVersion
    && receipt.pdfBytes === metadata.pdfBytes;
}

async function verifiedResearchReceipt(response: Response, metadata: ResearchPdfDeliveryMetadata, hmacSecret: string, timeoutMs: number) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) throw new Error("Research delivery receipt content type is invalid.");
  const parsed = await new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Research delivery receipt timed out.")), timeoutMs);
    void response.json().then(resolve, reject).finally(() => clearTimeout(timer));
  });
  if (!receiptMatchesMetadata(parsed, metadata)) throw new Error("Research delivery receipt does not match the archived PDF.");
  const signature = response.headers.get("x-lim-research-receipt-signature");
  const expected = researchPdfDeliveryReceiptSignature(parsed, hmacSecret);
  const actualBytes = signature ? Buffer.from(signature) : Buffer.alloc(0);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes))
    throw new Error("Research delivery receipt signature is invalid.");
  return parsed;
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
  // Recalculate here before crossing the project boundary as a defense-in-depth
  // check, without reading any participant/session table.
  const pdf = Buffer.from(report.pdf);
  if (bytesSha256(pdf) !== report.archive.pdfSha256) {
    throw new Error("Research delivery source PDF integrity check failed.");
  }
  if (report.archive.pdfBytes !== null && report.archive.pdfBytes !== undefined && Number(report.archive.pdfBytes) !== pdf.length) {
    throw new Error("Research delivery source PDF size check failed.");
  }

  const snapshot = await readSnapshot(archiveId);
  // Template provenance is frozen with the approved report. Do not substitute
  // the current renderer version when the original snapshot lacks it.
  const templateVersion = snapshot?.snapshot.metadata?.templateVersion;
  if (!templateVersion) throw new Error("Research delivery template provenance is unavailable.");

  const metadata: ResearchPdfDeliveryMetadata = {
    archiveId: report.archive.archiveId,
    reportRevision: report.archive.reportRevision,
    pdfSha256: report.archive.pdfSha256,
    eventCode: report.archive.eventCode,
    templateVersion,
    pdfBytes: pdf.length,
  };
  const idempotencyKey = researchPdfDeliveryIdempotencyKey(metadata);
  const response = await fetchImpl(config.url, {
    method: "POST",
    signal: AbortSignal.timeout(config.timeoutMs),
    headers: {
      "Content-Type": "application/pdf",
      "Accept": "application/json",
      "Content-Length": String(pdf.length),
      "Idempotency-Key": idempotencyKey,
      "X-LIM-Research-Delivery-Version": RESEARCH_PDF_DELIVERY_VERSION,
      "X-LIM-Research-Archive-Id": metadata.archiveId,
      "X-LIM-Research-Report-Revision": String(metadata.reportRevision),
      "X-LIM-Research-PDF-SHA256": metadata.pdfSha256,
      "X-LIM-Research-Event-Code": metadata.eventCode,
      "X-LIM-Research-Template-Version": metadata.templateVersion,
      "X-LIM-Research-PDF-Bytes": String(metadata.pdfBytes),
      "X-LIM-Research-Signature": researchPdfDeliverySignature(metadata, config.hmacSecret),
    },
    body: pdf,
  });
  if (!response.ok) throw new Error(`Research delivery rejected the archived PDF (${response.status}).`);
  const receipt = await verifiedResearchReceipt(response, metadata, config.hmacSecret, config.timeoutMs);
  return { attempted: true, delivered: true, idempotencyKey, responseStatus: response.status, importId: receipt.importId };
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
