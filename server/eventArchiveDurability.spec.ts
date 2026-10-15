import crypto from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./db", () => ({ getDb: vi.fn(), getEventReadingByRecordNo: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn(), storageGet: vi.fn() }));
import { getDb, getEventReadingByRecordNo } from "./db";
import { storagePut, storageGet } from "./storage";
import { encryptArchiveBytes, decryptArchiveBytes, readArchivedReportSnapshot, retryArchivedReportSnapshot, storeParticipantReportPdf, EVENT_REPORT_ARCHIVE_MAX_PDF_BYTES } from "./eventReportArchive";

const originalKey = process.env.EVENT_REPORT_ARCHIVE_KEY;
const pdf = Buffer.from("%PDF-1.4\n% synthetic test only\n%%EOF");
const expected = { archiveId: "f5bd7241-3047-49e1-9db9-6574ebf9ce4a", reportRevision: 2, snapshotSha256: "a".repeat(64) };
let row: any;
let selectResults: any[][];
const care = { sessionId: 17, revision: 2, approvedAt: new Date("2026-10-15T08:00:00Z") };

beforeEach(() => {
  vi.resetAllMocks();
  process.env.EVENT_REPORT_ARCHIVE_KEY = "synthetic-only-test-key-".repeat(3);
  row = { id: 4, sessionId: 17, ...expected, originEligible: 1, pdfStatus: "pending", snapshotStatus: "failed", snapshotKey: "synthetic/snapshot.bin" };
  selectResults = [];
  const db = {
    select: vi.fn(() => {
      const query: any = {};
      for (const method of ["from", "where", "orderBy"]) query[method] = () => query;
      query.limit = async () => selectResults.shift() ?? [row];
      return query;
    }),
    update: vi.fn(() => ({ set: (patch: any) => ({ where: async () => { Object.assign(row, patch); } }) })),
  };
  vi.mocked(getDb).mockResolvedValue(db as any);
  vi.mocked(storagePut).mockResolvedValue({ key: "synthetic/object.bin", url: "https://invalid.example/ciphertext" });
});
afterEach(() => {
  if (originalKey === undefined) delete process.env.EVENT_REPORT_ARCHIVE_KEY;
  else process.env.EVENT_REPORT_ARCHIVE_KEY = originalKey;
});

describe("original report durability and revision boundaries", () => {
  it("rejects malformed or oversized PDFs before accessing storage or the database", async () => {
    await expect(storeParticipantReportPdf(17, Buffer.from("not a PDF"), expected)).rejects.toThrow(/Invalid/);
    const oversized = Buffer.alloc(EVENT_REPORT_ARCHIVE_MAX_PDF_BYTES + 1);
    pdf.copy(oversized);
    await expect(storeParticipantReportPdf(17, oversized, expected)).rejects.toThrow(/Invalid/);
    expect(getDb).not.toHaveBeenCalled();
    expect(storagePut).not.toHaveBeenCalled();
  });
  it("rejects an old approval revision before any object upload", async () => {
    selectResults.push([care]);
    await expect(storeParticipantReportPdf(17, pdf, { ...expected, reportRevision: 1 })).rejects.toThrow(/stale/);
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects an archive/hash binding that has no matching owned snapshot", async () => {
    selectResults.push([care], []);
    await expect(storeParticipantReportPdf(17, pdf, { ...expected, snapshotSha256: "b".repeat(64) })).rejects.toThrow(/stale/);
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("never replaces an already captured original with a repeated different upload", async () => {
    row.pdfStatus = "archived";
    row.pdfSha256 = "original-hash";
    selectResults.push([care], [row], [care], [row]);
    await storeParticipantReportPdf(17, pdf, expected);
    const again = await storeParticipantReportPdf(17, Buffer.from("%PDF-1.4\ndifferent synthetic bytes"), expected);
    expect(again.pdfSha256).toBe("original-hash");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("does not accept a newly generated file as a historical original", async () => {
    row.originEligible = 0;
    selectResults.push([care], [row]);
    await expect(storeParticipantReportPdf(17, pdf, expected)).rejects.toThrow(/historical/);
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("records failed PDF storage and retries the same prepared bytes successfully", async () => {
    selectResults.push([care], [row]);
    vi.mocked(storagePut).mockRejectedValueOnce(new Error("synthetic outage"));
    await expect(storeParticipantReportPdf(17, pdf, expected)).rejects.toThrow(/Retry/);
    expect(row.pdfStatus).toBe("failed");
    selectResults.push([care], [row]);
    const saved = await storeParticipantReportPdf(17, pdf, expected);
    expect(saved.pdfStatus).toBe("archived");
    expect(saved.pdfSha256).toBe(crypto.createHash("sha256").update(pdf).digest("hex"));
    const encrypted = Buffer.from(vi.mocked(storagePut).mock.calls[1][1] as Buffer);
    expect(decryptArchiveBytes(encrypted, { ...expected, sessionId: 17, kind: "pdf" })).toEqual(pdf);
  });

  it("retries snapshot storage using the identical saved ciphertext without visiting live inputs", async () => {
    const ciphertext = Buffer.from("synthetic already encrypted immutable payload");
    row.snapshotPayload = ciphertext.toString("base64");
    vi.mocked(storagePut).mockRejectedValueOnce(new Error("synthetic outage"));
    await retryArchivedReportSnapshot(expected.archiveId);
    expect(row.snapshotStatus).toBe("failed");
    await retryArchivedReportSnapshot(expected.archiveId);
    expect(row.snapshotStatus).toBe("archived");
    expect(Buffer.from(vi.mocked(storagePut).mock.calls[0][1] as Buffer)).toEqual(ciphertext);
    expect(Buffer.from(vi.mocked(storagePut).mock.calls[1][1] as Buffer)).toEqual(ciphertext);
    expect(getEventReadingByRecordNo).not.toHaveBeenCalled();
  });

  it("can read the frozen DTO from the DB during storage outage without recalculating scores", async () => {
    const plain = Buffer.from(JSON.stringify({ schemaVersion: 1, lifestyleReport: { score: { overall: 51 } }, care: { advice: "saved synthetic advice" } }));
    row.snapshotSha256 = crypto.createHash("sha256").update(plain).digest("hex");
    row.snapshotPayload = encryptArchiveBytes(plain, { ...expected, sessionId: 17, kind: "snapshot" }).toString("base64");
    const saved = await readArchivedReportSnapshot(expected.archiveId);
    expect(saved?.snapshot.lifestyleReport?.score.overall).toBe(51);
    expect(saved?.snapshot.care.advice).toBe("saved synthetic advice");
    expect(storageGet).not.toHaveBeenCalled();
    expect(getEventReadingByRecordNo).not.toHaveBeenCalled();
  });
});
