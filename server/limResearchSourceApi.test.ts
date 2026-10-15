import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  LIM_RESEARCH_SOURCE_LIST_PATH,
  LIM_RESEARCH_SOURCE_RESPONSE_CONTRACT,
  createLimResearchSourceHandlers,
  limResearchSourceCanonicalRequest,
  limResearchSourceCanonicalResponse,
  limResearchSourceConfig,
} from "./limResearchSourceApi";

const signingKey = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
const eventCode = "lim-research-qa-20261015";
const keyId = "lim_research_source_qa";
const fixedNow = new Date("2026-10-15T20:00:00.000Z");
const timestamp = Math.floor(fixedNow.getTime() / 1_000);
const nonce = "11111111-1111-4111-8111-111111111111";
const archiveId = "22222222-2222-4222-8222-222222222222";
const sha = "a".repeat(64);
const environment = {
  LIM_RESEARCH_SOURCE_ENABLED: "true",
  LIM_RESEARCH_SOURCE_KEY_ID: keyId,
  LIM_RESEARCH_SOURCE_HMAC_SECRET_BASE64: signingKey.toString("base64"),
  LIM_RESEARCH_SOURCE_EVENT_CODE: eventCode,
};

function b64(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function hmac(message: string) {
  return crypto.createHmac("sha256", signingKey).update(message, "utf8").digest("hex");
}

function request(path: string, metadata: unknown, query: Record<string, string | string[]> = {}) {
  const metadataBase64Url = b64(metadata);
  const canonical = limResearchSourceCanonicalRequest({ method: "GET", path, keyId, timestamp, nonce, metadataBase64Url });
  const headers: Record<string, string> = {
    "x-lim-source-key-id": keyId,
    "x-lim-source-timestamp": String(timestamp),
    "x-lim-source-nonce": nonce,
    "x-lim-source-metadata": metadataBase64Url,
    "x-lim-source-signature": hmac(canonical),
  };
  return {
    query,
    params: { archiveId },
    get: (name: string) => headers[name.toLowerCase()],
  } as any;
}

function response() {
  const sent: { status?: number; body?: Buffer; headers: Record<string, string> } = { headers: {} };
  const res = {
    status: (status: number) => { sent.status = status; return res; },
    setHeader: (name: string, value: string) => { sent.headers[name.toLowerCase()] = value; return res; },
    send: (body: Buffer) => { sent.body = Buffer.from(body); return res; },
    json: (body: unknown) => { sent.body = Buffer.from(JSON.stringify(body), "utf8"); return res; },
  };
  return { res: res as any, sent };
}

function listMetadata(cursor?: string, limit?: number) {
  return {
    contractVersion: 1,
    purpose: "discover",
    eventCode,
    ...(cursor === undefined ? {} : { cursor }),
    ...(limit === undefined ? {} : { limit }),
  };
}

function pdfMetadata() {
  return {
    contractVersion: 1,
    purpose: "read-original-pdf",
    eventCode,
    archiveId,
    revision: 3,
    pdfSha256: sha,
  };
}

function createHandlersFixture() {
  const listPage = vi.fn().mockResolvedValue({
    archives: [{
      id: 17, archiveId, eventCode, reportRevision: 3,
      pdfSha256: sha, pdfBytes: 31, pdfArchivedAt: new Date("2026-10-15T19:50:00.000Z"),
    }],
    nextCursor: null,
  });
  const readSnapshot = vi.fn().mockResolvedValue({
    archive: { archiveId, reportRevision: 3 },
    snapshot: { metadata: { templateVersion: "lim-a4-r3" } },
  });
  const pdf = Buffer.from("%PDF-1.4\nsource synthetic QA\n%%EOF");
  const readPdf = vi.fn().mockResolvedValue({
    archive: { archiveId, eventCode, reportRevision: 3, pdfSha256: sha, pdfBytes: pdf.length },
    pdf,
  });
  return {
    listPage,
    readPdf,
    readSnapshot,
    handlers: createLimResearchSourceHandlers({ env: environment, now: () => fixedNow, listPage: listPage as never, readPdf: readPdf as never, readSnapshot: readSnapshot as never }),
  };
}

describe("restricted LIM Research source contract", () => {
  it("fails closed unless the explicit QA source configuration is complete", () => {
    expect(limResearchSourceConfig({})).toBeUndefined();
    expect(limResearchSourceConfig({ ...environment, LIM_RESEARCH_SOURCE_ENABLED: "false" })).toBeUndefined();
    expect(limResearchSourceConfig({ ...environment, LIM_RESEARCH_SOURCE_KEY_ID: "bad key" })).toBeUndefined();
    expect(limResearchSourceConfig({ ...environment, LIM_RESEARCH_SOURCE_HMAC_SECRET_BASE64: Buffer.from("short").toString("base64") })).toBeUndefined();
  });

  it("returns generic not-found without touching archive dependencies while source access is disabled", async () => {
    const listPage = vi.fn();
    const disabled = createLimResearchSourceHandlers({ env: {}, now: () => fixedNow, listPage: listPage as never });
    const { res, sent } = response();
    await disabled.list(request(LIM_RESEARCH_SOURCE_LIST_PATH, listMetadata()), res);
    expect(sent.status).toBe(404);
    expect(sent.body?.toString("utf8")).toBe('{"error":"not_found"}');
    expect(listPage).not.toHaveBeenCalled();
  });

  it("returns only the signed QA-scoped discovery envelope and binds cursor/limit to signed metadata", async () => {
    const { handlers, listPage } = createHandlersFixture();
    const { res, sent } = response();
    await handlers.list(request(LIM_RESEARCH_SOURCE_LIST_PATH, listMetadata(undefined, 25), { limit: "25" }), res);

    expect(sent.status).toBe(200);
    expect(JSON.parse(sent.body!.toString("utf8"))).toEqual({
      contractVersion: 1,
      eventCode,
      items: [{ archiveId, revision: 3, eventCode, templateVersion: "lim-a4-r3", pdfSha256: sha, size: 31, archivedAt: "2026-10-15T19:50:00.000Z" }],
      nextCursor: null,
    });
    expect(listPage).toHaveBeenCalledWith(eventCode, 0, 25);
    expect(sent.headers["x-lim-source-metadata"]).toBe(b64({ contractVersion: 1, purpose: "discover", eventCode }));
    const canonical = limResearchSourceCanonicalResponse({ requestNonce: nonce, status: 200, metadataBase64Url: sent.headers["x-lim-source-metadata"], rawBody: sent.body! });
    expect(sent.headers["x-lim-response-signature"]).toBe(hmac(canonical));
  });

  it("rejects unsigned/replayed query variants, duplicate query keys, and arbitrary event scopes", async () => {
    const { handlers, listPage } = createHandlersFixture();
    const unsignedQuery = response();
    await handlers.list(request(LIM_RESEARCH_SOURCE_LIST_PATH, listMetadata(undefined, 25), { limit: "26" }), unsignedQuery.res);
    expect(unsignedQuery.sent.status).toBe(404);

    const duplicateQuery = response();
    await handlers.list(request(LIM_RESEARCH_SOURCE_LIST_PATH, listMetadata(undefined, 25), { limit: ["25", "25"] }), duplicateQuery.res);
    expect(duplicateQuery.sent.status).toBe(404);

    const foreignEvent = response();
    await handlers.list(request(LIM_RESEARCH_SOURCE_LIST_PATH, { ...listMetadata(), eventCode: "other" }), foreignEvent.res);
    expect(foreignEvent.sent.status).toBe(404);
    expect(listPage).not.toHaveBeenCalled();
  });

  it("returns PDF raw bytes only after revision/hash/event validation and signs raw bytes", async () => {
    const { handlers, readPdf } = createHandlersFixture();
    const { res, sent } = response();
    const path = `/api/integrations/lim/archives/${archiveId}/original.pdf`;
    await handlers.pdf(request(path, pdfMetadata()), res);

    expect(sent.status).toBe(200);
    expect(sent.headers["content-type"]).toBe("application/pdf");
    expect(sent.body?.subarray(0, 5).toString()).toBe("%PDF-");
    expect(readPdf).toHaveBeenCalledWith(archiveId);
    const responseMetadata = JSON.parse(Buffer.from(sent.headers["x-lim-source-metadata"], "base64url").toString("utf8"));
    expect(responseMetadata).toMatchObject({ archiveId, revision: 3, eventCode, templateVersion: "lim-a4-r3", pdfSha256: sha, size: sent.body?.length });
    const canonical = limResearchSourceCanonicalResponse({ requestNonce: nonce, status: 200, metadataBase64Url: sent.headers["x-lim-source-metadata"], rawBody: sent.body! });
    expect(sent.headers["x-lim-response-signature"]).toBe(hmac(canonical));
  });

  it("rejects a PDF request with query parameters or a revision/hash mismatch before sending bytes", async () => {
    const { handlers, readPdf } = createHandlersFixture();
    const path = `/api/integrations/lim/archives/${archiveId}/original.pdf`;
    const queryAttempt = response();
    await handlers.pdf(request(path, pdfMetadata(), { ignored: "1" }), queryAttempt.res);
    expect(queryAttempt.sent.status).toBe(404);

    const mismatch = response();
    await handlers.pdf(request(path, { ...pdfMetadata(), revision: 4 }), mismatch.res);
    expect(mismatch.sent.status).toBe(404);
    expect(readPdf).toHaveBeenCalledTimes(1);
  });

  it("pins the source response HMAC prefix", () => {
    expect(LIM_RESEARCH_SOURCE_RESPONSE_CONTRACT).toBe("LIM_RESEARCH_SOURCE_RESPONSE_V1");
  });
});
