import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  deliverArchivedResearchPdf,
  researchPdfDeliveryCanonicalMetadata,
  researchPdfDeliveryCanonicalReceipt,
  researchPdfDeliveryConfig,
  researchPdfDeliveryIdempotencyKey,
  researchPdfDeliveryReceiptSignature,
  researchPdfDeliverySignature,
  type ResearchPdfDeliveryMetadata,
} from "./researchPdfDelivery";

const bytes = Buffer.from("%PDF-1.4\nsynthetic Research delivery only\n%%EOF");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
const metadata: ResearchPdfDeliveryMetadata = {
  archiveId: "0c1ae2e9-b4b8-4e2d-8210-5a2c695d19fb",
  reportRevision: 7,
  pdfSha256: sha256,
  eventCode: "research-fixture-event",
  templateVersion: "lim-a4-test-2026-10-15",
  pdfBytes: bytes.length,
};
const enabledEnv = {
  LIM_RESEARCH_PDF_DELIVERY_ENABLED: "true",
  LIM_RESEARCH_PDF_DELIVERY_URL: "https://research.invalid/internal/imports/original-pdf",
  LIM_RESEARCH_PDF_DELIVERY_HMAC_SECRET: "s".repeat(48),
  LIM_RESEARCH_PDF_DELIVERY_TIMEOUT_MS: "900",
};

function archivedPdf() {
  return {
    archive: {
      archiveId: metadata.archiveId,
      reportRevision: metadata.reportRevision,
      pdfSha256: metadata.pdfSha256,
      pdfBytes: metadata.pdfBytes,
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

function acceptedReceipt() {
  return { ...metadata, accepted: true as const, importId: "research-import-synthetic-001" };
}

function acceptedResponse() {
  const receipt = acceptedReceipt();
  return new Response(JSON.stringify(receipt), {
    status: 202,
    headers: {
      "content-type": "application/json",
      "x-lim-research-receipt-signature": researchPdfDeliveryReceiptSignature(
        receipt,
        enabledEnv.LIM_RESEARCH_PDF_DELIVERY_HMAC_SECRET,
      ),
    },
  });
}

describe("independent Research PDF delivery contract", () => {
  it("is disabled unless an explicit TLS endpoint and server secret are configured", async () => {
    const readPdf = vi.fn();
    expect(researchPdfDeliveryConfig({})).toBeUndefined();
    await expect(deliverArchivedResearchPdf(metadata.archiveId, { env: {}, readPdf })).resolves.toEqual({
      attempted: false,
      delivered: false,
      reason: "disabled",
    });
    expect(readPdf).not.toHaveBeenCalled();
    expect(researchPdfDeliveryConfig({
      ...enabledEnv,
      LIM_RESEARCH_PDF_DELIVERY_URL: "http://research.invalid/plain-text",
    })).toBeUndefined();
  });

  it("posts exactly the archived bytes with hash-bound metadata, HMAC, and a stable idempotency key", async () => {
    const fetchImpl = vi.fn(async () => acceptedResponse()) as unknown as typeof fetch;
    const result = await deliverArchivedResearchPdf(metadata.archiveId, {
      env: enabledEnv,
      fetchImpl,
      readPdf: vi.fn().mockResolvedValue(archivedPdf()),
      readSnapshot: vi.fn().mockResolvedValue(archivedSnapshot()),
    });

    expect(result).toEqual({
      attempted: true,
      delivered: true,
      idempotencyKey: researchPdfDeliveryIdempotencyKey(metadata),
      responseStatus: 202,
      importId: "research-import-synthetic-001",
    });
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    expect(url).toBe(enabledEnv.LIM_RESEARCH_PDF_DELIVERY_URL);
    expect(Buffer.from(init?.body as Uint8Array)).toEqual(bytes);
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/pdf",
      "Accept": "application/json",
      "Idempotency-Key": researchPdfDeliveryIdempotencyKey(metadata),
      "X-LIM-Research-Archive-Id": metadata.archiveId,
      "X-LIM-Research-Report-Revision": "7",
      "X-LIM-Research-PDF-SHA256": metadata.pdfSha256,
      "X-LIM-Research-Event-Code": metadata.eventCode,
      "X-LIM-Research-Template-Version": metadata.templateVersion,
      "X-LIM-Research-PDF-Bytes": String(bytes.length),
      "X-LIM-Research-Signature": researchPdfDeliverySignature(metadata, enabledEnv.LIM_RESEARCH_PDF_DELIVERY_HMAC_SECRET),
    });
  });

  it("accepts only a signed JSON receipt with the exact original metadata", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ...acceptedReceipt(), pdfSha256: "0".repeat(64),
    }), {
      status: 202,
      headers: { "content-type": "application/json", "x-lim-research-receipt-signature": "invalid" },
    })) as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, {
      env: enabledEnv, fetchImpl,
      readPdf: vi.fn().mockResolvedValue(archivedPdf()),
      readSnapshot: vi.fn().mockResolvedValue(archivedSnapshot()),
    })).rejects.toThrow("receipt");
  });

  it("never sends altered bytes or an unarchived PDF to Research", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, {
      env: enabledEnv,
      fetchImpl,
      readPdf: vi.fn().mockResolvedValue({ ...archivedPdf(), pdf: Buffer.from("%PDF-1.4\naltered") }),
      readSnapshot: vi.fn().mockResolvedValue(archivedSnapshot()),
    })).rejects.toThrow("integrity");
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(deliverArchivedResearchPdf(metadata.archiveId, {
      env: enabledEnv,
      fetchImpl,
      readPdf: vi.fn().mockResolvedValue({ ...archivedPdf(), archive: { ...archivedPdf().archive, pdfStatus: "uploading" } }),
      readSnapshot: vi.fn(),
    })).resolves.toEqual({ attempted: false, delivered: false, reason: "not_archived" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("binds repeated accepted deliveries to the same canonical identity without sharing a secret", () => {
    expect(researchPdfDeliveryIdempotencyKey(metadata)).toBe(
      `${metadata.archiveId}:7:${metadata.pdfSha256}`,
    );
    expect(researchPdfDeliveryCanonicalMetadata(metadata)).toContain('"version":"1"');
    expect(researchPdfDeliverySignature(metadata, "s".repeat(48))).toBe(
      researchPdfDeliverySignature({ ...metadata }, "s".repeat(48)),
    );
    expect(researchPdfDeliverySignature(metadata, "s".repeat(48))).not.toBe(
      researchPdfDeliverySignature({ ...metadata, reportRevision: 8 }, "s".repeat(48)),
    );
    const receipt = acceptedReceipt();
    expect(researchPdfDeliveryCanonicalReceipt(receipt)).toBe(
      '{"accepted":true,"archiveId":"0c1ae2e9-b4b8-4e2d-8210-5a2c695d19fb","eventCode":"research-fixture-event","importId":"research-import-synthetic-001","pdfBytes":47,"pdfSha256":"' + sha256 + '","reportRevision":7,"templateVersion":"lim-a4-test-2026-10-15","version":"1"}',
    );
  });
});
