import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  RESEARCH_PDF_ACK_CONTRACT,
  RESEARCH_PDF_DELIVERY_CONTRACT,
  RESEARCH_PDF_DELIVERY_PATH,
  deliverArchivedResearchPdf,
  reconcileArchivedResearchPdfs,
  researchPdfDeliveryCanonicalAck,
  researchPdfDeliveryCanonicalMetadata,
  researchPdfDeliveryCanonicalRequest,
  researchPdfDeliveryConfig,
  researchPdfDeliveryMetadataBase64Url,
  researchPdfDeliverySignature,
  type ResearchPdfDeliveryAck,
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
  LIM_RESEARCH_DELIVERY_ENABLED: "true",
  LIM_RESEARCH_ENDPOINT: "https://research.invalid/api/integrations/lim/reports",
  LIM_RESEARCH_KEY_ID: "lim_research_test_01",
  LIM_RESEARCH_HMAC_SECRET_BASE64: signingKey.toString("base64"),
  LIM_RESEARCH_PDF_DELIVERY_TIMEOUT_MS: "900",
};
const fixedNow = new Date("2026-10-15T19:44:00.000Z");
const fixedTimestamp = Math.floor(fixedNow.getTime() / 1_000);
const fixedNonce = "11111111-1111-4111-8111-111111111111";
const receiptId = "22222222-2222-4222-8222-222222222222";

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

function signedAck(duplicate = false, patch: Partial<ResearchPdfDeliveryAck> = {}) {
  const ack: ResearchPdfDeliveryAck = {
    contractVersion: 1,
    receiptId,
    archiveId: metadata.archiveId,
    revision: metadata.revision,
    pdfSha256: metadata.pdfSha256,
    status: "archived",
    duplicate,
    ...patch,
  };
  const raw = Buffer.from(JSON.stringify(ack), "utf8");
  return {
    raw,
    response: new Response(raw, {
      status: duplicate ? 200 : 202,
      headers: {
        "content-type": "application/json",
        "x-lim-response-signature": researchPdfDeliverySignature(
          researchPdfDeliveryCanonicalAck(fixedNonce, raw),
          signingKey,
        ),
      },
    }),
  };
}

function deliveryDependencies(fetchImpl: typeof fetch) {
  return {
    env: enabledEnv,
    fetchImpl,
    readPdf: vi.fn().mockResolvedValue(archivedPdf()),
    readSnapshot: vi.fn().mockResolvedValue(archivedSnapshot()),
    now: () => fixedNow,
    nonce: () => fixedNonce,
  };
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
    expect(researchPdfDeliveryConfig({ ...enabledEnv, LIM_RESEARCH_ENDPOINT: "http://research.invalid/api/integrations/lim/reports" })).toBeUndefined();
    expect(researchPdfDeliveryConfig({ ...enabledEnv, LIM_RESEARCH_ENDPOINT: "https://research.invalid/not-the-contract-path" })).toBeUndefined();
    expect(researchPdfDeliveryConfig({ ...enabledEnv, LIM_RESEARCH_KEY_ID: "invalid key id" })).toBeUndefined();
    expect(researchPdfDeliveryConfig({ ...enabledEnv, LIM_RESEARCH_HMAC_SECRET_BASE64: Buffer.from("short").toString("base64") })).toBeUndefined();
  });

  it("posts exact original bytes with the final LF-free canonical HMAC request and verifies a raw signed HTTP 202 ACK", async () => {
    const { response } = signedAck(false);
    const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch;
    const result = await deliverArchivedResearchPdf(metadata.archiveId, deliveryDependencies(fetchImpl));

    expect(result).toEqual({ attempted: true, delivered: true, responseStatus: 202, receiptId, duplicate: false });
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    const metadataJson = '{"contractVersion":1,"sourceSystem":"lim-lifestyle","archiveId":"0c1ae2e9-b4b8-4e2d-8210-5a2c695d19fb","revision":7,"eventCode":"research-fixture-event","templateVersion":"lim-a4-test-2026-10-15","size":47,"pdfSha256":"' + sha256 + '"}';
    const metadataBase64Url = Buffer.from(metadataJson, "utf8").toString("base64url");
    const canonical = [
      "LIM_RESEARCH_REQUEST_V1", "POST", "/api/integrations/lim/reports",
      "lim_research_test_01", String(fixedTimestamp), fixedNonce, metadataBase64Url, sha256,
    ].join("\n");

    expect(url).toBe(enabledEnv.LIM_RESEARCH_ENDPOINT);
    expect(Buffer.from(init?.body as Uint8Array)).toEqual(bytes);
    expect(init?.redirect).toBe("error");
    expect(init?.headers).toEqual({
      "Content-Type": "application/pdf",
      "Accept-Encoding": "identity",
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

  it("accepts a matching duplicate HTTP 200 ACK and no other 2xx semantics", async () => {
    const { response } = signedAck(true);
    const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, deliveryDependencies(fetchImpl))).resolves.toEqual({
      attempted: true, delivered: true, responseStatus: 200, receiptId, duplicate: true,
    });
  });

  it("rejects a mismatched, altered, unsigned, redirected, or semantically invalid ACK", async () => {
    const badIdentity = signedAck(false, { archiveId: "33333333-3333-4333-8333-333333333333" });
    const fetchIdentity = vi.fn(async () => badIdentity.response) as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, deliveryDependencies(fetchIdentity))).rejects.toThrow("identity");

    const extraField = signedAck(false);
    const extraRaw = Buffer.from(`${extraField.raw.toString("utf8").slice(0, -1)},"extra":true}`, "utf8");
    const extraResponse = new Response(extraRaw, {
      status: 202,
      headers: {
        "content-type": "application/json",
        "x-lim-response-signature": researchPdfDeliverySignature(researchPdfDeliveryCanonicalAck(fixedNonce, extraRaw), signingKey),
      },
    });
    const fetchExtra = vi.fn(async () => extraResponse) as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, deliveryDependencies(fetchExtra))).rejects.toThrow("identity");

    const raw = Buffer.from(JSON.stringify({ ...signedAck(false).raw.toString("utf8"), extra: "not-real" }));
    const alteredResponse = new Response(raw, {
      status: 202,
      headers: { "content-type": "application/json", "x-lim-response-signature": "0".repeat(64) },
    });
    const fetchSignature = vi.fn(async () => alteredResponse) as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, deliveryDependencies(fetchSignature))).rejects.toThrow("signature");

    const wrongDuplicate = signedAck(true);
    const wrongStatus = new Response(wrongDuplicate.raw, {
      status: 202,
      headers: {
        "content-type": "application/json",
        "x-lim-response-signature": researchPdfDeliverySignature(researchPdfDeliveryCanonicalAck(fixedNonce, wrongDuplicate.raw), signingKey),
      },
    });
    const fetchSemantics = vi.fn(async () => wrongStatus) as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, deliveryDependencies(fetchSemantics))).rejects.toThrow("duplicate");
  });

  it("never sends altered bytes or an unarchived PDF", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(deliverArchivedResearchPdf(metadata.archiveId, {
      ...deliveryDependencies(fetchImpl),
      readPdf: vi.fn().mockResolvedValue({ ...archivedPdf(), pdf: Buffer.from("%PDF-1.4\naltered") }),
    })).rejects.toThrow("integrity");
    expect(fetchImpl).not.toHaveBeenCalled();

    await expect(deliverArchivedResearchPdf(metadata.archiveId, {
      ...deliveryDependencies(fetchImpl),
      readPdf: vi.fn().mockResolvedValue({ ...archivedPdf(), archive: { ...archivedPdf().archive, pdfStatus: "uploading" } }),
    })).resolves.toEqual({ attempted: false, delivered: false, reason: "not_archived" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reconciles an opaque archived-PDF page without retaining a LIM retry cursor or payload", async () => {
    const listPage = vi.fn().mockResolvedValue({
      archives: [
        { id: 41, archiveId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        { id: 42, archiveId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        { id: 43, archiveId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      ],
      nextCursor: 43,
    });
    const deliver = vi.fn()
      .mockResolvedValueOnce({ attempted: true, delivered: true, responseStatus: 202, receiptId, duplicate: false })
      .mockResolvedValueOnce({ attempted: false, delivered: false, reason: "disabled" })
      .mockRejectedValueOnce(new Error("synthetic receiver unavailable"));

    await expect(reconcileArchivedResearchPdfs({ afterId: 40, limit: 3 }, {
      listPage: listPage as never,
      deliver: deliver as never,
    })).resolves.toEqual({ scanned: 3, delivered: 1, skipped: 1, failed: 1, nextCursor: 43 });
    expect(listPage).toHaveBeenCalledWith(40, 3);
    expect(deliver).toHaveBeenNthCalledWith(1, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(deliver).toHaveBeenNthCalledWith(2, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(deliver).toHaveBeenNthCalledWith(3, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  });

  it("pins the final protocol and raw ACK canonical prefix", () => {
    expect(RESEARCH_PDF_DELIVERY_CONTRACT).toBe("LIM_RESEARCH_REQUEST_V1");
    expect(RESEARCH_PDF_DELIVERY_PATH).toBe("/api/integrations/lim/reports");
    expect(RESEARCH_PDF_ACK_CONTRACT).toBe("LIM_RESEARCH_ACK_V1");
    expect(researchPdfDeliveryCanonicalAck(fixedNonce, Buffer.from("{}"))).toBe(
      "LIM_RESEARCH_ACK_V1\n11111111-1111-4111-8111-111111111111\n" + crypto.createHash("sha256").update("{}").digest("hex"),
    );
  });
});
