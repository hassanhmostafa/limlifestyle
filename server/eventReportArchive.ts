import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  eventCare,
  eventParticipantSessions,
  eventReportArchives,
} from "../drizzle/schema";
import { getDb, getEventReadingByRecordNo } from "./db";
import { storageGet, storagePut } from "./storage";
import { lifestyleReport } from "../shared/eventLifestyleInsights";

export const EVENT_REPORT_ARCHIVE_ENCRYPTION_VERSION = "aes-256-gcm-hkdf-v1";
export const EVENT_REPORT_ARCHIVE_MAX_PDF_BYTES = 10 * 1024 * 1024;
const ARCHIVE_KEY_CONTEXT = "lim-event-report-archive-v1";

type ArchiveStatus = "pending" | "archived" | "failed";
export type EventReportSnapshot = {
  schemaVersion: 1;
  archivedAt: string;
  eventCode: string;
  reportRevision: number;
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

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function reportReading(reading: any): EventReportSnapshot["readings"][number] {
  return {
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
      await db.update(eventReportArchives).set({ snapshotPayload: null, snapshotStatus: "archived", lastError: null }).where(eq(eventReportArchives.id, saved!.id));
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

export async function readArchivedReportSnapshot(archiveId: string) {
  const db = await database();
  const [archive] = await db
    .select()
    .from(eventReportArchives)
    .where(eq(eventReportArchives.archiveId, archiveId))
    .limit(1);
  if (!archive || archive.snapshotStatus !== "archived") return undefined;
  const { url } = await storageGet(archive.snapshotKey);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Archived report snapshot could not be fetched.");
  const bytes = Buffer.from(await response.arrayBuffer());
  const plain = decryptArchiveBytes(bytes, {
    archiveId: archive.archiveId,
    sessionId: archive.sessionId,
    reportRevision: archive.reportRevision,
    kind: "snapshot",
  });
  if (sha256(plain) !== archive.snapshotSha256)
    throw new Error("Archived report snapshot integrity check failed.");
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
    await db.update(eventReportArchives).set({ snapshotPayload: null, snapshotStatus: "archived", lastError: null }).where(eq(eventReportArchives.id, archive.id));
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
  const [archive] = await db
    .select()
    .from(eventReportArchives)
    .where(and(eq(eventReportArchives.sessionId, sessionId), eq(eventReportArchives.archiveId, expected.archiveId), eq(eventReportArchives.reportRevision, expected.reportRevision), eq(eventReportArchives.snapshotSha256, expected.snapshotSha256)))
    .limit(1);
  if (!archive) throw new Error("The prepared report is stale; prepare the current final report again.");
  if (!archive.originEligible) throw new Error("This historical report has no original PDF capture.");
  if (archive.pdfStatus === "archived") return archive;

  const key = `private/event-report-archive/v1/${crypto.randomUUID()}.bin`;
  const hash = sha256(bytes);
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
  await db
    .update(eventReportArchives)
    .set({
      pdfKey: key,
      pdfSha256: hash,
      pdfBytes: bytes.length,
      pdfStatus: "archived" as ArchiveStatus,
      pdfArchivedAt: new Date(),
      lastError: null,
    })
    .where(and(eq(eventReportArchives.id, archive.id), eq(eventReportArchives.pdfStatus, "pending")));
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

export async function eventReportArchiveForSession(sessionId: number) {
  const db = await database();
  const [archive] = await db.select().from(eventReportArchives)
    .where(eq(eventReportArchives.sessionId, sessionId))
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
