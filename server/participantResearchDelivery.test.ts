import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decodeResearchPdf,
  preparedResearchMetadata,
} from "./participantResearchDelivery";
const bytes = Buffer.from("%PDF-1.4\nprepared approved report\n%%EOF"),
  hash = createHash("sha256").update(bytes).digest("hex");
const context: any = {
  archive: {
    archiveId: "11111111-1111-4111-8111-111111111111",
    reportRevision: 7,
    eventCode: "lim-events",
    originEligible: true,
    pdfSha256: hash,
    pdfBytes: bytes.length,
    snapshotSha256: "a".repeat(64),
  },
  snapshot: { metadata: { templateVersion: "lim-a4-2026-10-15" } },
};
describe("prepared report relay identity", () => {
  it("retains captured identity and bytes for a prepared original", () => {
    expect(decodeResearchPdf(bytes.toString("base64"))).toEqual(bytes);
    const m = preparedResearchMetadata(context, bytes, false);
    expect(m.archiveId).toBe(context.archive.archiveId);
    expect(m.pdfSha256).toBe(hash);
    expect(m.artifactKind).toBeUndefined();
    expect(m.originalArchiveId).toBeUndefined();
  });
  it("never calls a different browser render the stored original", () => {
    expect(() =>
      preparedResearchMetadata(
        context,
        Buffer.concat([bytes, Buffer.from("new render")]),
        false
      )
    ).toThrow();
  });
  it("gives one reissued approval a stable separate identity with provenance", () => {
    const a = preparedResearchMetadata(context, bytes, true),
      b = preparedResearchMetadata(
        context,
        Buffer.concat([bytes, Buffer.from("second render")]),
        true
      );
    expect(a.archiveId).toBe(`${context.archive.archiveId}.reissued`);
    expect(b.archiveId).toBe(a.archiveId);
    expect(b.pdfSha256).not.toBe(a.pdfSha256);
    expect(a.artifactKind).toBe("reissued");
    expect(a.originalArchiveId).toBe(context.archive.archiveId);
    expect(a.originalPdfSha256).toBe(hash);
    expect(a.approvedSnapshotSha256).toBe("a".repeat(64));
  });
  it("rejects malformed and noncanonical PDF input", () => {
    expect(() => decodeResearchPdf("%%%%")).toThrow();
    expect(() =>
      decodeResearchPdf(Buffer.from("not a PDF").toString("base64"))
    ).toThrow();
    expect(() => decodeResearchPdf(bytes.toString("base64") + "=")).toThrow();
  });
});
