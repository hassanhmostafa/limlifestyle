import crypto from "node:crypto";
import type { Request, Response } from "express";
import {
  archivedReportPdfReconciliationPage,
  readArchivedReportPdf,
  readArchivedReportSnapshot,
} from "./eventReportArchive";

export const LIM_RESEARCH_SOURCE_CONTRACT = "LIM_RESEARCH_SOURCE_V1";
export const LIM_RESEARCH_SOURCE_RESPONSE_CONTRACT = "LIM_RESEARCH_SOURCE_RESPONSE_V1";
export const LIM_RESEARCH_SOURCE_LIST_PATH = "/api/integrations/lim/archives";
export const LIM_RESEARCH_SOURCE_PDF_PATH_PREFIX = "/api/integrations/lim/archives/";
export const LIM_RESEARCH_SOURCE_MAX_PAGE_SIZE = 50;
export const LIM_RESEARCH_SOURCE_MAX_RESPONSE_BYTES = 15 * 1024 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 300;

type SourceConfig = {
  keyId: string;
  signingKey: Buffer;
  eventCode: string;
};

export type LimResearchSourceItem = {
  archiveId: string;
  revision: number;
  eventCode: string;
  templateVersion: string;
  pdfSha256: string;
  size: number;
  archivedAt: string | null;
};

type ListRequestMetadata = {
  contractVersion: 1;
  purpose: "discover";
  eventCode: string;
  cursor?: string;
  limit?: number;
};

type PdfRequestMetadata = {
  contractVersion: 1;
  purpose: "read-original-pdf";
  eventCode: string;
  archiveId: string;
  revision: number;
  pdfSha256: string;
};

type SourceRequestMetadata = ListRequestMetadata | PdfRequestMetadata;

type SourceResponseMetadata =
  | { contractVersion: 1; purpose: "discover"; eventCode: string }
  | { contractVersion: 1; purpose: "read-original-pdf"; eventCode: string; archiveId: string; revision: number; templateVersion: string; size: number; pdfSha256: string };

type SourceDependencies = {
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  listPage?: (eventCode: string, afterId?: number, limit?: number) => ReturnType<typeof archivedReportPdfReconciliationPage>;
  readPdf?: typeof readArchivedReportPdf;
  readSnapshot?: typeof readArchivedReportSnapshot;
};

function decodedHmacKey(value: string | undefined) {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return undefined;
  const decoded = Buffer.from(value, "base64");
  if (decoded.length < 32 || decoded.toString("base64") !== value) return undefined;
  return decoded;
}

/** Disabled by default; no endpoint is mounted until the source-access review is approved. */
export function limResearchSourceConfig(env: NodeJS.ProcessEnv = process.env): SourceConfig | undefined {
  if (env.LIM_RESEARCH_SOURCE_ENABLED !== "true") return undefined;
  const keyId = env.LIM_RESEARCH_SOURCE_KEY_ID?.trim();
  const eventCode = env.LIM_RESEARCH_SOURCE_EVENT_CODE?.trim();
  const signingKey = decodedHmacKey(env.LIM_RESEARCH_SOURCE_HMAC_SECRET_BASE64);
  if (!keyId || !eventCode || !signingKey || !/^[A-Za-z0-9_-]{1,64}$/.test(keyId)) return undefined;
  return { keyId, eventCode, signingKey };
}

function sha256(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function hmacHex(message: string, key: Buffer) {
  return crypto.createHmac("sha256", key).update(message, "utf8").digest("hex");
}

function validUuidV4(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function equalHex(actual: string | undefined, expected: string) {
  if (!actual || !/^[0-9a-f]{64}$/.test(actual)) return false;
  const left = Buffer.from(actual, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function decodeBase64UrlJson(value: string | undefined): unknown {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

/** Canonical request deliberately binds path, method, purpose metadata, key ID, timestamp and nonce. */
export function limResearchSourceCanonicalRequest(input: {
  method: "GET";
  path: string;
  keyId: string;
  timestamp: number;
  nonce: string;
  metadataBase64Url: string;
}) {
  return [
    LIM_RESEARCH_SOURCE_CONTRACT,
    input.method,
    input.path,
    input.keyId,
    String(input.timestamp),
    input.nonce,
    input.metadataBase64Url,
  ].join("\n");
}

/** Response signature covers exact raw bytes plus request nonce/status/metadata. */
export function limResearchSourceCanonicalResponse(input: {
  requestNonce: string;
  status: number;
  metadataBase64Url: string;
  rawBody: Uint8Array;
}) {
  return [
    LIM_RESEARCH_SOURCE_RESPONSE_CONTRACT,
    input.requestNonce,
    String(input.status),
    input.metadataBase64Url,
    sha256(input.rawBody),
  ].join("\n");
}

function decodeCursor(value: string | undefined, eventCode: string) {
  if (!value) return 0;
  const decoded = decodeBase64UrlJson(value) as { version?: unknown; eventCode?: unknown; afterId?: unknown } | undefined;
  const afterId = decoded?.afterId;
  if (!decoded || decoded.version !== 1 || decoded.eventCode !== eventCode || !Number.isInteger(afterId) || typeof afterId !== "number" || afterId < 0)
    throw new Error("invalid-cursor");
  return afterId;
}

function encodeCursor(eventCode: string, afterId: number | null) {
  return afterId === null ? null : base64UrlJson({ version: 1, eventCode, afterId });
}

function validListMetadata(value: unknown, eventCode: string): value is ListRequestMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as Partial<ListRequestMetadata>;
  const keys = Object.keys(metadata).sort().join(",");
  const permitted = ["contractVersion,eventCode,purpose", "contractVersion,cursor,eventCode,purpose", "contractVersion,eventCode,limit,purpose", "contractVersion,cursor,eventCode,limit,purpose"];
  return permitted.includes(keys)
    && metadata.contractVersion === 1
    && metadata.purpose === "discover"
    && metadata.eventCode === eventCode
    && (metadata.cursor === undefined || typeof metadata.cursor === "string")
    && (metadata.limit === undefined || (Number.isInteger(metadata.limit) && metadata.limit >= 1 && metadata.limit <= LIM_RESEARCH_SOURCE_MAX_PAGE_SIZE));
}

function validPdfMetadata(value: unknown, eventCode: string, archiveId: string): value is PdfRequestMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as Partial<PdfRequestMetadata>;
  return Object.keys(metadata).sort().join(",") === "archiveId,contractVersion,eventCode,pdfSha256,purpose,revision"
    && metadata.contractVersion === 1
    && metadata.purpose === "read-original-pdf"
    && metadata.eventCode === eventCode
    && metadata.archiveId === archiveId
    && typeof metadata.revision === "number" && Number.isInteger(metadata.revision) && metadata.revision >= 1
    && typeof metadata.pdfSha256 === "string" && /^[0-9a-f]{64}$/.test(metadata.pdfSha256);
}

/** The canonical path intentionally excludes query; metadata therefore binds it exactly. */
function listQueryMatchesSignedMetadata(req: Request, metadata: ListRequestMetadata) {
  const query = req.query ?? {};
  const keys = Object.keys(query).sort();
  if (keys.some(key => key !== "cursor" && key !== "limit")) return false;
  const cursor = query.cursor;
  const limit = query.limit;
  if ((cursor !== undefined && typeof cursor !== "string") || (limit !== undefined && typeof limit !== "string")) return false;
  if ((metadata.cursor === undefined) !== (cursor === undefined)) return false;
  if (metadata.cursor !== undefined && cursor !== metadata.cursor) return false;
  if ((metadata.limit === undefined) !== (limit === undefined)) return false;
  return metadata.limit === undefined || limit === String(metadata.limit);
}

function hasNoQuery(req: Request) {
  return Object.keys(req.query ?? {}).length === 0;
}

function requestAuth(req: Request, path: string, config: SourceConfig, now: Date) {
  const keyId = req.get("x-lim-source-key-id") ?? "";
  const timestampText = req.get("x-lim-source-timestamp") ?? "";
  const timestamp = Number(timestampText);
  const nonce = req.get("x-lim-source-nonce") ?? "";
  const metadataBase64Url = req.get("x-lim-source-metadata") ?? "";
  const signature = req.get("x-lim-source-signature");
  if (keyId !== config.keyId || !Number.isInteger(timestamp) || Math.abs(Math.floor(now.getTime() / 1_000) - timestamp) > MAX_CLOCK_SKEW_SECONDS || !validUuidV4(nonce))
    return undefined;
  const canonical = limResearchSourceCanonicalRequest({ method: "GET", path, keyId, timestamp, nonce, metadataBase64Url });
  if (!equalHex(signature, hmacHex(canonical, config.signingKey))) return undefined;
  return { nonce, metadata: decodeBase64UrlJson(metadataBase64Url) };
}

function signedResponse(res: Response, requestNonce: string, status: number, metadata: SourceResponseMetadata, body: Buffer, key: Buffer, contentType: string) {
  const metadataBase64Url = base64UrlJson(metadata);
  const signature = hmacHex(limResearchSourceCanonicalResponse({ requestNonce, status, metadataBase64Url, rawBody: body }), key);
  res.status(status)
    .setHeader("Content-Type", contentType)
    .setHeader("Cache-Control", "no-store")
    .setHeader("X-LIM-Source-Metadata", metadataBase64Url)
    .setHeader("X-LIM-Response-Signature", signature)
    .send(body);
}

function reject(res: Response) {
  // Do not distinguish disabled, wrong event, malformed metadata or bad auth.
  res.status(404).json({ error: "not_found" });
}

export function createLimResearchSourceHandlers(dependencies: SourceDependencies = {}) {
  const now = dependencies.now ?? (() => new Date());
  const listPage = dependencies.listPage ?? archivedReportPdfReconciliationPage;
  const readPdf = dependencies.readPdf ?? readArchivedReportPdf;
  const readSnapshot = dependencies.readSnapshot ?? readArchivedReportSnapshot;

  return {
    list: async (req: Request, res: Response) => {
      const config = limResearchSourceConfig(dependencies.env);
      if (!config) return reject(res);
      const auth = requestAuth(req, LIM_RESEARCH_SOURCE_LIST_PATH, config, now());
      if (!auth || !validListMetadata(auth.metadata, config.eventCode)) return reject(res);
      try {
        const metadata = auth.metadata;
        if (!listQueryMatchesSignedMetadata(req, metadata)) return reject(res);
        const afterId = decodeCursor(metadata.cursor, config.eventCode);
        const limit = metadata.limit ?? LIM_RESEARCH_SOURCE_MAX_PAGE_SIZE;
        const page = await listPage(config.eventCode, afterId, limit);
        const items: LimResearchSourceItem[] = [];
        for (const archive of page.archives) {
          if (!archive.pdfSha256 || archive.pdfBytes === null || archive.pdfBytes === undefined) throw new Error("archive-metadata-unavailable");
          const frozen = await readSnapshot(archive.archiveId);
          const templateVersion = frozen?.snapshot.metadata?.templateVersion;
          if (!frozen || frozen.archive.reportRevision !== archive.reportRevision || !templateVersion) throw new Error("archive-provenance-unavailable");
          items.push({
            archiveId: archive.archiveId,
            revision: archive.reportRevision,
            eventCode: archive.eventCode,
            templateVersion,
            pdfSha256: archive.pdfSha256,
            size: Number(archive.pdfBytes),
            archivedAt: archive.pdfArchivedAt?.toISOString() ?? null,
          });
        }
        const body = Buffer.from(JSON.stringify({ contractVersion: 1, eventCode: config.eventCode, items, nextCursor: encodeCursor(config.eventCode, page.nextCursor) }), "utf8");
        signedResponse(res, auth.nonce, 200, { contractVersion: 1, purpose: "discover", eventCode: config.eventCode }, body, config.signingKey, "application/json");
      } catch {
        res.status(503).json({ error: "source_unavailable" });
      }
    },
    pdf: async (req: Request, res: Response) => {
      const config = limResearchSourceConfig(dependencies.env);
      const archiveId = String(req.params.archiveId ?? "");
      const path = `${LIM_RESEARCH_SOURCE_PDF_PATH_PREFIX}${encodeURIComponent(archiveId)}/original.pdf`;
      if (!config || !/^[0-9a-f-]{36}$/i.test(archiveId)) return reject(res);
      const auth = requestAuth(req, path, config, now());
      if (!auth || !hasNoQuery(req) || !validPdfMetadata(auth.metadata, config.eventCode, archiveId)) return reject(res);
      try {
        const result = await readPdf(archiveId);
        if (!result || result.archive.eventCode !== config.eventCode || !result.archive.pdfSha256 || result.archive.pdfBytes === null) return reject(res);
        const frozen = await readSnapshot(archiveId);
        const templateVersion = frozen?.snapshot.metadata?.templateVersion;
        const requested = auth.metadata;
        if (!frozen || !templateVersion || result.archive.reportRevision !== requested.revision || result.archive.pdfSha256 !== requested.pdfSha256 || result.pdf.length !== Number(result.archive.pdfBytes) || result.pdf.length > LIM_RESEARCH_SOURCE_MAX_RESPONSE_BYTES)
          return reject(res);
        signedResponse(res, auth.nonce, 200, {
          contractVersion: 1,
          purpose: "read-original-pdf",
          eventCode: config.eventCode,
          archiveId,
          revision: result.archive.reportRevision,
          templateVersion,
          size: result.pdf.length,
          pdfSha256: result.archive.pdfSha256,
        }, Buffer.from(result.pdf), config.signingKey, "application/pdf");
      } catch {
        res.status(503).json({ error: "source_unavailable" });
      }
    },
  };
}
