import crypto from "node:crypto";
import {
  archivedReportPdfReconciliationPage,
  readArchivedReportPdf,
  readArchivedReportSnapshot,
} from "./eventReportArchive";

export const RESEARCH_PDF_DELIVERY_CONTRACT = "LIM_RESEARCH_REQUEST_V1";
export const RESEARCH_PDF_DELIVERY_PATH = "/api/integrations/lim/reports";
export const RESEARCH_PDF_DELIVERY_MAX_BYTES = 15 * 1024 * 1024;
export const RESEARCH_PDF_ACK_CONTRACT = "LIM_RESEARCH_ACK_V1";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 10_000;
const MAX_ACK_BYTES = 16 * 1024;

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

export type ResearchPdfDeliveryAck = {
  contractVersion: 1;
  receiptId: string;
  archiveId: string;
  revision: number;
  pdfSha256: string;
  status: "archived";
  duplicate: boolean;
};

export type ResearchPdfDeliveryResult =
  | { attempted: false; delivered: false; reason: "disabled" | "not_archived" }
  | { attempted: true; delivered: true; responseStatus: 200 | 202; receiptId: string; duplicate: boolean };

type DeliveryConfig = {
  url: string;
  keyId: string;
  /** Decoded binary HMAC key; its base64 transport representation is never used as text. */
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

type ReconciliationDependencies = {
  listPage?: (eventCode: string, afterId?: number, limit?: number) => ReturnType<typeof archivedReportPdfReconciliationPage>;
  deliver?: typeof deliverArchivedResearchPdf;
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
  if (env.LIM_RESEARCH_DELIVERY_ENABLED !== "true") return undefined;
  const urlValue = env.LIM_RESEARCH_ENDPOINT?.trim();
  const keyId = env.LIM_RESEARCH_KEY_ID?.trim();
  const signingKey = decodedHmacKey(env.LIM_RESEARCH_HMAC_SECRET_BASE64);
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

/** ACK signature input has no terminal LF and covers the raw JSON response bytes. */
export function researchPdfDeliveryCanonicalAck(requestNonce: string, rawResponseBytes: Uint8Array) {
  return [
    RESEARCH_PDF_ACK_CONTRACT,
    requestNonce,
    bytesSha256(rawResponseBytes),
  ].join("\n");
}

/** Lowercase hexadecimal HMAC-SHA-256, keyed with decoded base64 key bytes. */
export function researchPdfDeliverySignature(canonicalMessage: string, signingKey: Buffer) {
  return crypto.createHmac("sha256", signingKey).update(canonicalMessage, "utf8").digest("hex");
}

function bytesSha256(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validUuidV4(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function matchingAck(value: unknown, metadata: ResearchPdfDeliveryMetadata): value is ResearchPdfDeliveryAck {
  if (!value || typeof value !== "object") return false;
  const expectedKeys = ["archiveId", "contractVersion", "duplicate", "pdfSha256", "receiptId", "revision", "status"];
  if (Object.keys(value).sort().join(",") !== expectedKeys.join(",")) return false;
  const ack = value as Partial<ResearchPdfDeliveryAck>;
  return ack.contractVersion === 1
    && typeof ack.receiptId === "string" && validUuid(ack.receiptId)
    && ack.archiveId === metadata.archiveId
    && ack.revision === metadata.revision
    && ack.pdfSha256 === metadata.pdfSha256
    && ack.status === "archived"
    && typeof ack.duplicate === "boolean";
}

async function verifiedResearchAck(
  response: Response,
  metadata: ResearchPdfDeliveryMetadata,
  requestNonce: string,
  signingKey: Buffer,
): Promise<ResearchPdfDeliveryAck> {
  if (response.status !== 200 && response.status !== 202)
    throw new Error(`Research delivery rejected the archived PDF (${response.status}).`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) throw new Error("Research delivery ACK content type is invalid.");
  const rawBytes = Buffer.from(await response.arrayBuffer());
  if (!rawBytes.length || rawBytes.length > MAX_ACK_BYTES) throw new Error("Research delivery ACK size is invalid.");
  const signature = response.headers.get("x-lim-response-signature");
  const expected = researchPdfDeliverySignature(
    researchPdfDeliveryCanonicalAck(requestNonce, rawBytes),
    signingKey,
  );
  const actualBytes = signature ? Buffer.from(signature, "utf8") : Buffer.alloc(0);
  const expectedBytes = Buffer.from(expected, "utf8");
  if (!/^[0-9a-f]{64}$/.test(signature ?? "") || actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes))
    throw new Error("Research delivery ACK signature is invalid.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBytes.toString("utf8"));
  } catch {
    throw new Error("Research delivery ACK JSON is invalid.");
  }
  if (!matchingAck(parsed, metadata)) throw new Error("Research delivery ACK identity does not match the archived PDF.");
  // A fresh durable ingest returns 202; only a matching duplicate returns 200.
  if ((response.status === 202 && parsed.duplicate) || (response.status === 200 && !parsed.duplicate))
    throw new Error("Research delivery ACK status does not match duplicate state.");
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
    redirect: "error",
    signal: AbortSignal.timeout(config.timeoutMs),
    headers: {
      "Content-Type": "application/pdf",
      // The ACK HMAC covers the exact body bytes. Do not accept a transport
      // transformation that would make those bytes ambiguous at either end.
      "Accept-Encoding": "identity",
      "X-LIM-Key-Id": config.keyId,
      "X-LIM-Timestamp": String(timestamp),
      "X-LIM-Nonce": nonce,
      "X-LIM-Metadata": metadataBase64Url,
      "X-LIM-Signature": researchPdfDeliverySignature(canonicalRequest, config.signingKey),
    },
    body: pdf,
  });
  const ack = await verifiedResearchAck(response, metadata, nonce, config.signingKey);
  const responseStatus: 200 | 202 = response.status === 200 ? 200 : 202;
  return { attempted: true, delivered: true, responseStatus, receiptId: ack.receiptId, duplicate: ack.duplicate };
}

/**
 * Read-only reconciliation primitive for an independently provisioned worker.
 * It scans only archived LIM PDF metadata, delivers each opaque archive ID, and
 * returns aggregate counts. It never records a cursor, receipt, or retry state
 * in LIM: a durable outbox is intentionally not simulated in process memory.
 */
export async function reconcileArchivedResearchPdfs(
  input: { eventCode: string; afterId?: number; limit?: number },
  dependencies: ReconciliationDependencies = {},
) {
  const listPage = dependencies.listPage ?? archivedReportPdfReconciliationPage;
  const deliver = dependencies.deliver ?? deliverArchivedResearchPdf;
  const page = await listPage(input.eventCode, input.afterId, input.limit);
  let delivered = 0;
  let skipped = 0;
  let failed = 0;
  for (const archive of page.archives) {
    try {
      const outcome = await deliver(archive.archiveId);
      if (outcome.delivered) delivered++;
      else skipped++;
    } catch {
      // A caller-provisioned independent queue/worker owns retry scheduling.
      // Do not leak archive IDs or receiver details through worker logs.
      failed++;
    }
  }
  return {
    scanned: page.archives.length,
    delivered,
    skipped,
    failed,
    nextCursor: page.nextCursor,
  };
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
