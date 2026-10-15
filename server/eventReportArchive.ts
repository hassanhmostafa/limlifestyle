import crypto from "node:crypto";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import {
  eventCare,
  eventParticipantSessions,
  eventReportArchives,
} from "../drizzle/schema";
import { getDb, getEventReadingByRecordNo } from "./db";
import { storageGet, storagePut } from "./storage";
import { lifestyleReport } from "../shared/eventLifestyleInsights";
import { EVENT_REPORT_TEMPLATE_VERSION, EVENT_REPORT_SCORING_VERSION, type EventReportMetadata } from "../shared/eventReportArchive";

export const EVENT_REPORT_ARCHIVE_ENCRYPTION_VERSION = "aes-256-gcm-hkdf-v1";
export const EVENT_REPORT_ARCHIVE_MAX_PDF_BYTES = 10 * 1024 * 1024;
export const EVENT_REPORT_PDF_CLAIM_LEASE_MS = 5 * 60 * 1000;
const ARCHIVE_KEY_CONTEXT = "lim-event-report-archive-v1";

type ArchiveStatus = "pending" | "uploading" | "archived" | "failed";
export type EventReportSnapshot = {
  schemaVersion: 1;
  archivedAt: string;
  eventCode: string;
  reportRevision: number;
  metadata?: EventReportMetadata;
  participant: {
    code: string;
    firstName: string | null;
    age: number | null;
    sex: "male" | "female" | null;
  };
  lifestyleEnabled: boolean;
  lifestyleReport: ReturnType<typeof lifestyleReport> | null;
  answers: Record<string, string | number | string[]>;
  readings: Array<{
    id?: number;
    source: string;
    recordedAt: string | null;
    weight: string | number | null;
    height: string | number | null;
    bmi: string | number | null;
    sbp: number | null;
    dbp: number | null;
    hr: number | null;
    temperature: string | number | null;
    machineMetrics: Record<string, string>;
  }>;
  care: {
    consultationMode: "physician" | "automatic";
    advice: string;
    doctorName: string | null;
    nursingCompletedAt: string | null;
    measurements: Record<string, Record<string, string>>;
    nurseNotes: string | null;
    approvedAt: string;
    approvedRecordNo: string;
  };
};

function archiveKey() {
  const secret = process.env.EVENT_REPORT_ARCHIVE_KEY || process.env.JWT_SECRET || "";
  if (secret.length < 32)
    throw new Error("Event report archive encryption key is unavailable.");
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.from(ARCHIVE_KEY_CONTEXT, "utf8"),
      Buffer.from("encryption-key", "utf8"),
      32
    )
  );
}

function archiveAad(archiveId: string, sessionId: number, reportRevision: number, kind: "snapshot" | "pdf") {
  return Buffer.from(`${ARCHIVE_KEY_CONTEXT}:${kind}:${archiveId}:${sessionId}:${reportRevision}`, "utf8");
}

/** Packs IV + authentication tag + ciphertext; the object is opaque without the server secret. */
export function encryptArchiveBytes(
  bytes: Buffer,
  context: { archiveId: string; sessionId: number; reportRevision: number; kind: "snapshot" | "pdf" }
) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", archiveKey(), iv);
  cipher.setAAD(archiveAad(context.archiveId, context.sessionId, context.reportRevision, context.kind));
  return Buffer.concat([iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
}

export function decryptArchiveBytes(
  bytes: Buffer,
  context: { archiveId: string; sessionId: number; reportRevision: number; kind: "snapshot" | "pdf" }
) {
  if (bytes.length < 29) throw new Error("Archived report object is invalid.");
  const iv = bytes.subarray(0, 12);
  const tag = bytes.subarray(bytes.length - 16);
  const ciphertext = bytes.subarray(12, bytes.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", archiveKey(), iv);
  decipher.setAAD(archiveAad(context.archiveId, context.sessionId, context.reportRevision, context.kind));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function sha256(bytes: Buffer) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function isPdfClaimLeaseExpired(value: Date | null | undefined, now = new Date()) {
  return !value || value.getTime() <= now.getTime();
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function reportReading(reading: any): EventReportSnapshot["readings"][number] {
  return {
    id: reading.id,
    source: String(reading.source),
    recordedAt: iso(reading.recordedAt),
    weight: reading.weight ?? null,
    height: reading.height ?? null,
    bmi: reading.bmi ?? null,
    sbp: reading.sbp ?? null,
    dbp: reading.dbp ?? null,
    hr: reading.hr ?? null,
    temperature: reading.temperature ?? null,
    // Report rendering uses the device metric map. Do not include device notes,
    // submitted name/phone, device ID or other non-report fields in this snapshot.
    machineMetrics: (reading.machineMetrics ?? {}) as Record<string, string>,
  };
}

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

/**
 * Creates the immutable approval snapshot. `originEligible` is accepted only
 * for a newly approved revision that recorded explicit archival intent; legacy
 * approvals never gain an original-PDF capture retroactively.
 */
export async function archiveApprovedEventReportSnapshot(sessionId: number, originEligible = false) {
  const db = await database();
  const [joined] = await db
    .select({ session: eventParticipantSessions, care: eventCare })
    .from(eventParticipantSessions)
    .innerJoin(eventCare, eq(eventCare.sessionId, eventParticipantSessions.id))
    .where(eq(eventParticipantSessions.id, sessionId))
    .limit(1);
  if (!joined?.care.approvedAt || !joined.care.approvedRecordNo)
    throw new Error("Only an approved final report can be archived.");

  const { session, care } = joined;
  // Drizzle's nullable SQL field type is not narrowed through the joined-row
  // guard above, so freeze the approved values once for this immutable snapshot.
  const approvedAt = care.approvedAt!;
  const approvedRecordNo = care.approvedRecordNo!;
  const reportRevision = care.revision;
  if (originEligible && care.archiveRequestedRevision !== reportRevision)
    throw new Error("This approved report was not marked for original archive capture.");
  const [existing] = await db
    .select()
    .from(eventReportArchives)
    .where(
      and(
        eq(eventReportArchives.sessionId, session.id),
        eq(eventReportArchives.reportRevision, reportRevision)
      )
    )
    .limit(1);
  if (existing) return existing;

  const readings = await getEventReadingByRecordNo(session.userId, approvedRecordNo);
  const snapshot: EventReportSnapshot = {
    schemaVersion: 1,
    archivedAt: new Date().toISOString(),
    eventCode: session.eventCode,
    reportRevision,
    metadata: {
      participantId: `P-${session.userId}`,
      visitId: session.id,
      visitDate: session.createdAt.toISOString(),
      reportRevision,
      questionnaireVersion: (session.questionnaireIds ?? ["lifestyle"]).includes("lifestyle")
        ? String(session.answers?._questionnaireVersion ?? "legacy") : "none",
      scoringVersion: EVENT_REPORT_SCORING_VERSION,
      templateVersion: EVENT_REPORT_TEMPLATE_VERSION,
    },
    participant: {
      code: session.code,
      firstName: session.displayName,
      age: session.age,
      sex: session.sex,
    },
    lifestyleEnabled: (session.questionnaireIds ?? ["lifestyle"]).includes("lifestyle"),
    lifestyleReport: (session.questionnaireIds ?? ["lifestyle"]).includes("lifestyle") ? lifestyleReport(session.answers ?? {}) : null,
    answers: session.answers ?? {},
    readings: readings.map(reportReading),
    care: {
      consultationMode: care.consultationMode,
      advice: care.advice ?? "",
      doctorName: care.doctorName,
      nursingCompletedAt: iso(care.nursingCompletedAt),
      measurements: care.measurements ?? {},
      nurseNotes: care.nurseNotes,
      approvedAt: approvedAt.toISOString(),
      approvedRecordNo,
    },
  };
  const archiveId = crypto.randomUUID();
  const plaintext = Buffer.from(JSON.stringify(snapshot), "utf8");
  const snapshotKey = `private/event-report-archive/v1/${crypto.randomUUID()}.bin`;
  const encryptedPayload = encryptArchiveBytes(plaintext, { archiveId, sessionId: session.id, reportRevision, kind: "snapshot" });
  try {
    const [inserted] = await db
      .insert(eventReportArchives)
      .values({
        archiveId,
        sessionId: session.id,
        eventCode: session.eventCode,
        reportRevision,
        snapshotKey,
        snapshotPayload: encryptedPayload.toString("base64"),
        snapshotSha256: sha256(plaintext),
        snapshotStatus: "pending",
        originEligible: originEligible ? 1 : 0,
        pdfStatus: "pending",
        encryptionVersion: EVENT_REPORT_ARCHIVE_ENCRYPTION_VERSION,
        // There is no automated deletion policy. Retention is managed separately.
        retentionUntil: null,
      })
      .$returningId();
    const [saved] = await db
      .select()
      .from(eventReportArchives)
      .where(eq(eventReportArchives.id, inserted.id))
      .limit(1);
    try {
      await storagePut(snapshotKey, encryptedPayload, "application/octet-stream");
      await db.update(eventReportArchives).set({ snapshotStatus: "archived", lastError: null }).where(eq(eventReportArchives.id, saved!.id));
    } catch {
      await db.update(eventReportArchives).set({ snapshotStatus: "failed", lastError: "snapshot-storage-failed" }).where(eq(eventReportArchives.id, saved!.id));
    }
    const [finished] = await db.select().from(eventReportArchives).where(eq(eventReportArchives.id, saved!.id)).limit(1);
    return finished!;
  } catch (error: any) {
    // A parallel finalization can claim the immutable archive first. Its
    // ciphertext remains authoritative; an orphan encrypted object has no URL.
    if (error?.code === "ER_DUP_ENTRY" || error?.cause?.code === "ER_DUP_ENTRY") {
      const [duplicate] = await db
        .select()
        .from(eventReportArchives)
        .where(
          and(
            eq(eventReportArchives.sessionId, session.id),
            eq(eventReportArchives.reportRevision, reportRevision)
          )
        )
        .limit(1);
      if (duplicate) return duplicate;
    }
    throw error;
  }
}

/** Recover an approval-time archive only when its revision-bound intent survived a crash. */
export async function recoverRequestedEventReportArchive(sessionId: number, reportRevision: number) {
  const db = await database();
  const [care] = await db.select().from(eventCare).where(eq(eventCare.sessionId, sessionId)).limit(1);
  if (!care?.approvedAt || care.revision !== reportRevision || care.archiveRequestedRevision !== reportRevision)
    return undefined;
  return archiveApprovedEventReportSnapshot(sessionId, true);
}

/** Decodes only an already-joined encrypted DTO; never fetches object storage. */
export function readEmbeddedArchivedReportSnapshot(archive: { archiveId: string; sessionId: number; reportRevision: number; snapshotPayload: string | null; snapshotSha256: string }) {
  if (!archive.snapshotPayload) return undefined;
  const plain = decryptArchiveBytes(Buffer.from(archive.snapshotPayload, "base64"), { archiveId: archive.archiveId, sessionId: archive.sessionId, reportRevision: archive.reportRevision, kind: "snapshot" });
  if (sha256(plain) !== archive.snapshotSha256) throw new Error("Archived report snapshot integrity check failed.");
  return JSON.parse(plain.toString("utf8")) as EventReportSnapshot;
}

export async function readArchivedReportSnapshot(archiveId: string) {
  const db = await database();
  const [archive] = await db
    .select()
    .from(eventReportArchives)
    .where(eq(eventReportArchives.archiveId, archiveId))
    .limit(1);
  if (!archive) return undefined;
  const embedded = readEmbeddedArchivedReportSnapshot(archive);
  if (embedded) return { archive, snapshot: embedded };
  if (archive.snapshotStatus !== "archived") return undefined;
  const { url } = await storageGet(archive.snapshotKey);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Archived report snapshot could not be fetched.");
  const plain = decryptArchiveBytes(Buffer.from(await response.arrayBuffer()), { archiveId: archive.archiveId, sessionId: archive.sessionId, reportRevision: archive.reportRevision, kind: "snapshot" });
  if (sha256(plain) !== archive.snapshotSha256) throw new Error("Archived report snapshot integrity check failed.");
  return { archive, snapshot: JSON.parse(plain.toString("utf8")) as EventReportSnapshot };
}

/** Retries only the encrypted DTO saved at approval; it never rereads visit data. */
export async function retryArchivedReportSnapshot(archiveId: string) {
  const db = await database();
  const [archive] = await db.select().from(eventReportArchives).where(eq(eventReportArchives.archiveId, archiveId)).limit(1);
  if (!archive) throw new Error("Archived report was not found.");
  if (archive.snapshotStatus === "archived") return archive;
  if (!archive.snapshotPayload) throw new Error("The immutable snapshot payload is unavailable.");
  try {
    await storagePut(archive.snapshotKey, Buffer.from(archive.snapshotPayload, "base64"), "application/octet-stream");
    await db.update(eventReportArchives).set({ snapshotStatus: "archived", lastError: null }).where(eq(eventReportArchives.id, archive.id));
  } catch {
    await db.update(eventReportArchives).set({ snapshotStatus: "failed", lastError: "snapshot-storage-failed" }).where(eq(eventReportArchives.id, archive.id));
  }
  const [updated] = await db.select().from(eventReportArchives).where(eq(eventReportArchives.id, archive.id)).limit(1);
  return updated!;
}

export async function storeParticipantReportPdf(sessionId: number, pdf: Uint8Array, expected: { archiveId: string; reportRevision: number; snapshotSha256: string }) {
  const bytes = Buffer.from(pdf);
  if (!bytes.length || bytes.length > EVENT_REPORT_ARCHIVE_MAX_PDF_BYTES || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
    throw new Error("Invalid final report PDF.");
  const db = await database();
  const [approvedCare] = await db.select().from(eventCare)
    .where(eq(eventCare.sessionId, sessionId)).limit(1);
  if (!approvedCare?.approvedAt || approvedCare.revision !== expected.reportRevision)
    throw new Error("The prepared report is stale; prepare the current final report again.");
  const [archive] = await db
    .select()
    .from(eventReportArchives)
    .where(and(eq(eventReportArchives.sessionId, sessionId), eq(eventReportArchives.archiveId, expected.archiveId), eq(eventReportArchives.reportRevision, expected.reportRevision), eq(eventReportArchives.snapshotSha256, expected.snapshotSha256)))
    .limit(1);
  if (!archive) throw new Error("The prepared report is stale; prepare the current final report again.");
  if (!archive.originEligible) throw new Error("This historical report has no original PDF capture.");
  if (archive.pdfStatus === "archived") return archive;
  if (archive.pdfStatus === "uploading" && !isPdfClaimLeaseExpired(archive.pdfLeaseExpiresAt)) return archive;

  const key = `private/event-report-archive/v1/${crypto.randomUUID()}.bin`;
  const hash = sha256(bytes);
  const claimToken = crypto.randomUUID();
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + EVENT_REPORT_PDF_CLAIM_LEASE_MS);
  // Claim the archive row before writing object storage. The unique temporary
  // key lets a concurrent upload prove it owns this capture, rather than
  // allowing two browser retries to race and create multiple originals.
  await db
    .update(eventReportArchives)
    .set({
      pdfKey: key,
      pdfSha256: hash,
      pdfBytes: bytes.length,
      pdfStatus: "uploading",
      pdfClaimToken: claimToken,
      pdfLeaseExpiresAt: leaseExpiresAt,
      lastError: null,
    })
    .where(and(
      eq(eventReportArchives.id, archive.id),
      or(
        sql`${eventReportArchives.pdfStatus} in ('pending', 'failed')`,
        and(
          eq(eventReportArchives.pdfStatus, "uploading"),
          or(isNull(eventReportArchives.pdfLeaseExpiresAt), lte(eventReportArchives.pdfLeaseExpiresAt, now))
        )
      )
    ));
  const [claimed] = await db.select().from(eventReportArchives).where(eq(eventReportArchives.id, archive.id)).limit(1);
  if (!claimed || claimed.pdfClaimToken !== claimToken || claimed.pdfKey !== key || claimed.pdfStatus !== "uploading") return claimed ?? archive;
  try {
    await storagePut(
      key,
      encryptArchiveBytes(bytes, {
        archiveId: archive.archiveId,
        sessionId,
        reportRevision: archive.reportRevision,
        kind: "pdf",
      }),
      "application/octet-stream"
    );
  } catch {
    await db.update(eventReportArchives).set({ pdfStatus: "failed", pdfClaimToken: null, pdfLeaseExpiresAt: null, lastError: "pdf-storage-failed" })
      .where(and(eq(eventReportArchives.id, archive.id), eq(eventReportArchives.pdfKey, key), eq(eventReportArchives.pdfClaimToken, claimToken), eq(eventReportArchives.pdfStatus, "uploading")));
    throw new Error("The original PDF could not be stored. Retry the same prepared file.");
  }
  await db
    .update(eventReportArchives)
    .set({
      pdfStatus: "archived" as ArchiveStatus,
      pdfArchivedAt: new Date(),
      pdfClaimToken: null,
      pdfLeaseExpiresAt: null,
      lastError: null,
    })
    .where(and(
      eq(eventReportArchives.id, archive.id),
      eq(eventReportArchives.pdfKey, key),
      eq(eventReportArchives.pdfClaimToken, claimToken),
      eq(eventReportArchives.pdfStatus, "uploading"),
      gte(eventReportArchives.pdfLeaseExpiresAt, new Date())
    ));
  const [saved] = await db.select().from(eventReportArchives).where(eq(eventReportArchives.id, archive.id)).limit(1);
  return saved!;
}

export async function readArchivedReportPdf(archiveId: string) {
  const db = await database();
  const [archive] = await db.select().from(eventReportArchives).where(eq(eventReportArchives.archiveId, archiveId)).limit(1);
  if (!archive || archive.pdfStatus !== "archived" || !archive.pdfKey || !archive.pdfSha256) return undefined;
  const { url } = await storageGet(archive.pdfKey);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Archived report PDF could not be fetched.");
  const bytes = Buffer.from(await response.arrayBuffer());
  const plain = decryptArchiveBytes(bytes, {
    archiveId: archive.archiveId,
    sessionId: archive.sessionId,
    reportRevision: archive.reportRevision,
    kind: "pdf",
  });
  if (sha256(plain) !== archive.pdfSha256)
    throw new Error("Archived report PDF integrity check failed.");
  return { archive, pdf: plain };
}

export async function eventReportArchiveForSession(sessionId: number, reportRevision?: number) {
  const db = await database();
  const [archive] = await db.select().from(eventReportArchives)
    .where(and(eq(eventReportArchives.sessionId, sessionId), reportRevision === undefined ? undefined : eq(eventReportArchives.reportRevision, reportRevision)))
    .orderBy(sql`${eventReportArchives.reportRevision} desc`).limit(1);
  return archive;
}

export async function archiveSummary() {
  const db = await database();
  const rows = await db
    .select({ pdfStatus: eventReportArchives.pdfStatus, count: sql<number>`count(*)` })
    .from(eventReportArchives)
    .groupBy(eventReportArchives.pdfStatus);
  return rows.reduce<Record<string, number>>((summary, row) => {
    summary[row.pdfStatus] = Number(row.count);
    return summary;
  }, {});
}
