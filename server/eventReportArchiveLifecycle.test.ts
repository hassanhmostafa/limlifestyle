import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn(), getEventReadingByRecordNo: vi.fn() }));
vi.mock("./storage", () => ({ storageGet: vi.fn(), storagePut: vi.fn() }));

import { getDb, getEventReadingByRecordNo } from "./db";
import { storageGet, storagePut } from "./storage";
import {
  archivedReportPdfReconciliationPage,
  encryptArchiveBytes,
  EVENT_REPORT_PDF_CLAIM_LEASE_MS,
  isPdfClaimLeaseExpired,
  readArchivedReportPdf,
  readEmbeddedArchivedReportSnapshot,
  recoverRequestedEventReportArchive,
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
const CURRENT = Symbol("current archive");

function mockDb(rows: unknown[][]) {
  const select = vi.fn(() => {
    const next = rows.shift() ?? [];
    const result = next === (CURRENT as unknown) ? [currentArchive] : next;
    const candidate = Array.isArray(result) ? result[0] as any : undefined;
    if (candidate?.archiveId) currentArchive = candidate;
    const chain: any = { from: () => chain, innerJoin: () => chain, where: () => chain, orderBy: () => chain, limit: () => Promise.resolve(result) };
    return chain;
  });
  let currentArchive: any;
  const updates: Record<string, unknown>[] = [];
  const update = vi.fn(() => {
    const chain: any = { set: (patch: Record<string, unknown>) => {
      updates.push(patch);
      if (currentArchive) Object.assign(currentArchive, patch);
      return chain;
    }, where: () => Promise.resolve(undefined) };
    return chain;
  });
  const insert = vi.fn(() => ({ values: () => ({ $returningId: async () => [{ id: 88 }] }) }));
  vi.mocked(getDb).mockResolvedValue({ select, update, insert } as never);
  return { select, update, updates };
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
    const { updates } = mockDb([[{ approvedAt: new Date(), revision: 3 }], [{ ...baseArchive, pdfStatus: "uploading", pdfKey: "private/in-flight", pdfLeaseExpiresAt: new Date(Date.now() + 60_000) }]]);
    const result = await storeParticipantReportPdf(51, pdf, expected);
    expect(result.pdfStatus).toBe("uploading");
    expect(storagePut).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("reclaims only an expired crashed PDF claim and issues a bounded new lease", async () => {
    const expired = { ...baseArchive, pdfStatus: "uploading", pdfKey: "private/stale", pdfLeaseExpiresAt: new Date(Date.now() - 1_000) };
    const { updates } = mockDb([[{ approvedAt: new Date(), revision: 3 }], [expired], CURRENT, CURRENT]);
    vi.mocked(storagePut).mockResolvedValue({ key: "private/pdf", url: "/private/pdf" });
    const result = await storeParticipantReportPdf(51, pdf, expected);
    expect(updates[0]).toMatchObject({ pdfStatus: "uploading", pdfClaimToken: expect.stringMatching(/^[a-f0-9-]{36}$/) });
    expect((updates[0].pdfLeaseExpiresAt as Date).getTime()).toBeGreaterThan(Date.now() + EVENT_REPORT_PDF_CLAIM_LEASE_MS - 5_000);
    expect(result.pdfStatus).toBe("archived");
    expect(storagePut).toHaveBeenCalledTimes(1);
  });

  it("treats missing and elapsed claim leases as recoverable but preserves live claims", () => {
    expect(isPdfClaimLeaseExpired(null)).toBe(true);
    expect(isPdfClaimLeaseExpired(new Date(Date.now() - 1))).toBe(true);
    expect(isPdfClaimLeaseExpired(new Date(Date.now() + 1_000))).toBe(false);
  });

  it("rejects historical archives that were not approved for original capture", async () => {
    mockDb([[{ approvedAt: new Date(), revision: 3 }], [{ ...baseArchive, originEligible: 0 }]]);
    await expect(storeParticipantReportPdf(51, pdf, expected)).rejects.toThrow("historical");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("recovers a failed initial snapshot only for the exact requested approval revision", async () => {
    const care = { sessionId: 51, approvedAt: new Date(), approvedRecordNo: "R1", revision: 3, archiveRequestedRevision: 3, consultationMode: "physician", advice: "approved", measurements: {}, nursingCompletedAt: null, doctorName: null };
    const session = { id: 51, userId: 7, eventCode: "lim-events", code: "P-051", displayName: "Synthetic", age: 30, sex: "male", createdAt: new Date(), questionnaireIds: [], answers: {} };
    const archived = { ...baseArchive, id: 88, eventCode: "lim-events", snapshotPayload: "ciphertext", snapshotStatus: "failed" };
    mockDb([[care], [{ session, care }], [], [archived], [archived]]);
    vi.mocked(getEventReadingByRecordNo).mockResolvedValue([]);
    vi.mocked(storagePut).mockRejectedValue(new Error("object unavailable"));
    await expect(recoverRequestedEventReportArchive(51, 3)).resolves.toMatchObject({ id: 88, snapshotStatus: "failed" });
    expect(getEventReadingByRecordNo).toHaveBeenCalledWith(7, "R1");
  });

  it("never creates a new original snapshot for a legacy approval without intent", async () => {
    mockDb([[{ sessionId: 51, approvedAt: new Date(), revision: 3, archiveRequestedRevision: null }]]);
    await expect(recoverRequestedEventReportArchive(51, 3)).resolves.toBeUndefined();
    expect(getEventReadingByRecordNo).not.toHaveBeenCalled();
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

  it("reads an original PDF by its immutable archiveId even when it belongs to an older revision", async () => {
    const crypto = require("node:crypto");
    const original = Buffer.from("%PDF-1.4\nsynthetic older revision");
    const older = {
      ...baseArchive,
      archiveId: "11111111-1111-4111-8111-111111111111",
      reportRevision: 2,
      pdfStatus: "archived",
      pdfKey: "private/older-revision.bin",
      pdfBytes: original.length,
      pdfSha256: crypto.createHash("sha256").update(original).digest("hex"),
    };
    // The newer revision is intentionally not queried: lookup is by archiveId,
    // not a "latest revision" selector.
    mockDb([[older]]);
    const ciphertext = encryptArchiveBytes(original, {
      archiveId: older.archiveId,
      sessionId: older.sessionId,
      reportRevision: older.reportRevision,
      kind: "pdf",
    });
    vi.mocked(storageGet).mockResolvedValue({ key: older.pdfKey, url: "https://storage.invalid/older" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(ciphertext)));

    await expect(readArchivedReportPdf(older.archiveId)).resolves.toMatchObject({
      archive: { archiveId: older.archiveId, reportRevision: 2 },
      pdf: original,
    });
    expect(storageGet).toHaveBeenCalledWith(older.pdfKey);
  });

  it("keeps every archived revision as a separate reconciliation candidate", async () => {
    const rows = [
      { id: 41, archiveId: "11111111-1111-4111-8111-111111111111", eventCode: "test", reportRevision: 1, pdfSha256: "a".repeat(64), pdfBytes: 101, pdfArchivedAt: new Date() },
      { id: 42, archiveId: "22222222-2222-4222-8222-222222222222", eventCode: "test", reportRevision: 2, pdfSha256: "b".repeat(64), pdfBytes: 102, pdfArchivedAt: new Date() },
      { id: 43, archiveId: "33333333-3333-4333-8333-333333333333", eventCode: "test", reportRevision: 3, pdfSha256: "c".repeat(64), pdfBytes: 103, pdfArchivedAt: new Date() },
    ];
    mockDb([rows]);
    const page = await archivedReportPdfReconciliationPage("test", 40, 2);
    expect(page.archives.map(row => [row.archiveId, row.reportRevision])).toEqual([
      ["11111111-1111-4111-8111-111111111111", 1],
      ["22222222-2222-4222-8222-222222222222", 2],
    ]);
    expect(page.nextCursor).toBe(42);
  });
});
