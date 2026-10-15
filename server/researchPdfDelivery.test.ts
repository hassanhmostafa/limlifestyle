import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  RESEARCH_PDF_DELIVERY_CONTRACT,
  RESEARCH_PDF_DELIVERY_PATH,
  deliverArchivedResearchPdf,
  researchPdfDeliveryCanonicalMetadata,
  researchPdfDeliveryCanonicalRequest,
  researchPdfDeliveryConfig,
  researchPdfDeliveryMetadataBase64Url,
  researchPdfDeliverySignature,
  type ResearchPdfDeliveryMetadata,
} from "./researchPdfDelivery";

const bytes = Buffer.from("%PDF-1.4\nsynthetic Research delivery only\n%%EOF");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
const signingKey = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");
const metadata: ResearchPdfDeliveryMetadata = {
  contractVersion: 1,
  sourceSystem: "lim-lifestyle",
  archiveId: "0c1ae2e9-b4b8-4e2d-8210-5a2c695d19fb",
  revision: 7,
  eventCode: "research-fixture-event",
  templateVersion: "lim-a4-test-2026-10-15",
  size: bytes.length,
  pdfSha256: sha256,
};
const enabledEnv = {
  LIM_RESEARCH_PDF_DELIVERY_ENABLED: "true",
  LIM_RESEARCH_PDF_DELIVERY_URL: "https://research.invalid/api/integrations/lim/reports",
  LIM_RESEARCH_KEY_ID: "lim_research_test_01",
  LIM_RESEARCH_HMAC_KEY_BASE64: signingKey.toString("base64"),
  LIM_RESEARCH_PDF_DELIVERY_TIMEOUT_MS: "900",
};
const fixedNow = new Date("2026-10-15T19:44:00.000Z");
const fixedTimestamp = Math.floor(fixedNow.getTime() / 1_000);
const fixedNonce = "11111111-1111-4111-8111-111111111111";

function archivedPdf() {
  return {
    archive: {
      archiveId: metadata.archiveId,
      reportRevision: metadata.revision,
      pdfSha256: metadata.pdfSha256,
      pdfBytes: metadata.size,
      pdfStatus: "archived",
      eventCode: metadata.eventCode,
    },
    pdf: bytes,
  } as any;
}

function archivedSnapshot() {
  return {
    snapshot: { metadata: { templateVersion: metadata.templateVersion } },
  } as any;
}

describe("independent Research PDF delivery contract v1", () => {
  it("is disabled unless the exact TLS endpoint, ASCII key id, and 32-byte decoded key are configured", async () => {
    const readPdf = vi.fn();
    expect(researchPdfDeliveryConfig({})).toBeUndefined();
    await expect(deliverArchivedResearchPdf(metadata.archiveId, { env: {}, readPdf })).resolves.toEqual({
      attempted: false,
      delivered: false,
      reason: "disabled",
    });
    expect(readPdf).not.toHaveBeenCalled();
    expect(researchPdfDeliveryConfig({ ...enabledEnv, LIM_RESEARCH_PDF_DELIVERY_URL: "http://research.invalid/api/integrations/lim/reports" })).toBeUndefined();
    expect(researchPdfDeliveryConfig({ ...enabledEnv, LIM_RESEARCH_PDF_DELIVERY_URL: "https://research.invalid/not-the-contract-path" })).toBeUndefined();
    expect(researchPdfDeliveryConfig({ ...enabledEnv, LIM_RESEARCH_KEY_ID: "invalid key id" })).toBeUndefined();
    expect(researchPdfDeliveryConfig({ ...enabledEnv, LIM_RESEARCH_HMAC_KEY_BASE64: Buffer.from("short").toString("base64") })).toBeUndefined();
  });

  it("posts exactly the archived bytes and the final LF-free canonical HMAC headers", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 })) as unknown as typeof fetch;
    const result = await deliverArchivedResearchPdf(metadata.archiveId, {
      env: enabledEnv,
      fetchImpl,
      readPdf: vi.fn().mockResolvedValue(archivedPdf()),
      readSnapshot: vi.fn().mockResolvedValue(archivedSnapshot()),
      now: () => fixedNow,
      nonce: () => fixedNonce,
    });

    expect(result).toEqual({ attempted: true, delivered: true, responseStatus: 202 });
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    const metadataJson = '{"contractVersion":1,"sourceSystem":"lim-lifestyle","archiveId":"0c1ae2e9-b4b8-4e2d-8210-5a2c695d19fb","revision":7,"eventCode":"research-fixture-event","templateVersion":"lim-a4-test-2026-10-15","size":47,"pdfSha256":"' + sha256 + '"}';
    const metadataBase64Url = Buffer.from(metadataJson, "utf8").toString("base64url");
    const canonical = [
      "LIM_RESEARCH_REQUEST_V1", "POST", "/api/integrations/lim/reports",
      "lim_research_test_01", String(fixedTimestamp), fixedNonce, metadataBase64Url, sha256,
    ].join("\n");

    expect(url).toBe(enabledEnv.LIM_RESEARCH_PDF_DELIVERY_URL);
    expect(Buffer.from(init?.body as Uint8Array)).toEqual(bytes);
    expect(init?.headers).toEqual({
      "Content-Type": "application/pdf",
      "X-LIM-Key-Id": "lim_research_test_01",
      "X-LIM-Timestamp": String(fixedTimestamp),
      "X-LIM-Nonce": fixedNonce,
      "X-LIM-Metadata": metadataBase64Url,
      "X-LIM-Signature": crypto.createHmac("sha256", signingKey).update(canonical, "utf8").digest("hex"),
    });
    expect(researchPdfDeliveryCanonicalMetadata(metadata)).toBe(metadataJson);
    expect(researchPdfDeliveryMetadataBase64Url(metadata)).toBe(metadataBase64Url);
    expect(researchPdfDeliveryCanonicalRequest({ keyId: "lim_research_test_01", timestamp: fixedTimestamp, nonce: fixedNonce, metadataBase64Url, pdfSha256: sha256 })).toBe(canonical);
    expect(researchPdfDeliverySignature(canonical, signingKey)).toBe(crypto.createHmac("sha256", signingKey).update(canonical, "utf8").digest("hex"));
    expect(canonical.endsWith("\n")).toBe(false);
  });

  it("never sends altered bytes or an unarchived PDF", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, {
      env: enabledEnv, fetchImpl,
      readPdf: vi.fn().mockResolvedValue({ ...archivedPdf(), pdf: Buffer.from("%PDF-1.4\naltered") }),
      readSnapshot: vi.fn().mockResolvedValue(archivedSnapshot()),
    })).rejects.toThrow("integrity");
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(deliverArchivedResearchPdf(metadata.archiveId, {
      env: enabledEnv, fetchImpl,
      readPdf: vi.fn().mockResolvedValue({ ...archivedPdf(), archive: { ...archivedPdf().archive, pdfStatus: "uploading" } }),
      readSnapshot: vi.fn(),
    })).resolves.toEqual({ attempted: false, delivered: false, reason: "not_archived" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("pins the final protocol and route constants", () => {
    expect(RESEARCH_PDF_DELIVERY_CONTRACT).toBe("LIM_RESEARCH_REQUEST_V1");
    expect(RESEARCH_PDF_DELIVERY_PATH).toBe("/api/integrations/lim/reports");
  });
});
