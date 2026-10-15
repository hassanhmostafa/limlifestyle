import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn(), getEventReadingByRecordNo: vi.fn() }));
vi.mock("./storage", () => ({ storageGet: vi.fn(), storagePut: vi.fn() }));

import { getDb, getEventReadingByRecordNo } from "./db";
import { storagePut } from "./storage";
import {
  encryptArchiveBytes,
  readEmbeddedArchivedReportSnapshot,
  retryArchivedReportSnapshot,
  storeParticipantReportPdf,
} from "./eventReportArchive";

const pdf = Buffer.from("%PDF-1.4\nsynthetic");
const expected = { archiveId: "84c7f12c-1c25-472f-b8c2-f7b2a55f5a5b", reportRevision: 3, snapshotSha256: "a".repeat(64) };
const baseArchive = {
  id: 7, archiveId: expected.archiveId, sessionId: 51, reportRevision: 3,
  snapshotSha256: expected.snapshotSha256, originEligible: 1, pdfStatus: "pending",
  snapshotStatus: "archived", snapshotKey: "private/snapshot", snapshotPayload: null,
};

function mockDb(rows: unknown[][]) {
  const select = vi.fn(() => {
    const result = rows.shift() ?? [];
    const chain: any = { from: () => chain, where: () => chain, orderBy: () => chain, limit: () => Promise.resolve(result) };
    return chain;
  });
  const update = vi.fn(() => {
    const chain: any = { set: () => chain, where: () => Promise.resolve(undefined) };
    return chain;
  });
  vi.mocked(getDb).mockResolvedValue({ select, update } as never);
  return { select, update };
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.EVENT_REPORT_ARCHIVE_KEY = "k".repeat(64);
});
afterEach(() => { delete process.env.EVENT_REPORT_ARCHIVE_KEY; });

describe("immutable participant report archive lifecycle", () => {
  it("rejects a stale revision before it can write an original PDF", async () => {
    mockDb([[{ approvedAt: new Date(), revision: 4 }]]);
    await expect(storeParticipantReportPdf(51, pdf, expected)).rejects.toThrow("stale");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("keeps a repeated original upload immutable and does not rewrite storage", async () => {
    mockDb([[{ approvedAt: new Date(), revision: 3 }], [{ ...baseArchive, pdfStatus: "archived" }]]);
    const result = await storeParticipantReportPdf(51, pdf, expected);
    expect(result.pdfStatus).toBe("archived");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("does not overwrite a PDF that another concurrent request has already claimed", async () => {
    mockDb([[{ approvedAt: new Date(), revision: 3 }], [{ ...baseArchive, pdfStatus: "uploading", pdfKey: "private/in-flight" }]]);
    const result = await storeParticipantReportPdf(51, pdf, expected);
    expect(result.pdfStatus).toBe("uploading");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects historical archives that were not approved for original capture", async () => {
    mockDb([[{ approvedAt: new Date(), revision: 3 }], [{ ...baseArchive, originEligible: 0 }]]);
    await expect(storeParticipantReportPdf(51, pdf, expected)).rejects.toThrow("historical");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("retries a failed snapshot from retained ciphertext without rereading the visit", async () => {
    const context = { archiveId: baseArchive.archiveId, sessionId: 51, reportRevision: 3, kind: "snapshot" as const };
    const plain = Buffer.from(JSON.stringify({ schemaVersion: 1, synthetic: true }));
    const encrypted = encryptArchiveBytes(plain, context).toString("base64");
    mockDb([[{ ...baseArchive, snapshotStatus: "failed", snapshotPayload: encrypted }], [{ ...baseArchive, snapshotStatus: "archived", snapshotPayload: encrypted }]]);
    vi.mocked(storagePut).mockResolvedValue({ key: "private/snapshot", url: "/private/snapshot" });
    const result = await retryArchivedReportSnapshot(baseArchive.archiveId);
    expect(result.snapshotStatus).toBe("archived");
    expect(storagePut).toHaveBeenCalledTimes(1);
    expect(getEventReadingByRecordNo).not.toHaveBeenCalled();
  });

  it("uses the frozen embedded DTO for no-AI regenerated reports", () => {
    const context = { archiveId: baseArchive.archiveId, sessionId: 51, reportRevision: 3, kind: "snapshot" as const };
    const snapshot = { schemaVersion: 1, participant: { code: "V-51" }, lifestyleReport: null, care: { advice: "frozen advice" } };
    const encrypted = encryptArchiveBytes(Buffer.from(JSON.stringify(snapshot)), context).toString("base64");
    const crypto = require("node:crypto");
    const decoded = readEmbeddedArchivedReportSnapshot({ ...context, snapshotPayload: encrypted, snapshotSha256: crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") });
    expect(decoded?.care.advice).toBe("frozen advice");
    expect(decoded?.lifestyleReport).toBeNull();
  });
});
