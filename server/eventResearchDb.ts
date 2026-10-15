import { and, desc, eq, gt, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  eventResearchers as researchers,
  eventResearchGrants as grants,
  eventResearchSessions as sessions,
  eventResearchAudit as audit,
  eventReportArchives,
  eventProfiles,
  eventParticipantSessions as visits,
  eventCare,
  users,
} from "../drizzle/schema";
import { getDb, getEventReadingByRecordNo } from "./db";
import { EVENT_CODE } from "./eventCareDb";
import { researchRecord } from "./lib/eventResearchData";
import { readEmbeddedArchivedReportSnapshot } from "./eventReportArchive";
// Keep the historical row shape compatible with deployments where the
// additive archive privilege was introduced after existing researcher rows.
export type Researcher = typeof researchers.$inferSelect & { reportArchiveAccess: number };
export type ResearchPermissions = {
  allEvents: boolean;
  eventCodes: string[];
  includeIdentity: boolean;
  reportArchiveAccess: boolean;
};

export type ResearchFilters = { from?: string; to?: string; code?: string; identity?: string };
export function saudiResearchDayBounds(day: string) {
  return {
    start: new Date(`${day}T00:00:00.000+03:00`),
    end: new Date(`${day}T23:59:59.999+03:00`),
  };
}

/** Saudi-calendar bounds keep portal and report dates aligned at UTC+03:00. */
export function validateResearchFilters(filters: ResearchFilters) {
  if (filters.from && filters.to && filters.from > filters.to)
    throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساويًا له" });
}

/** Accepts the stored session code plus stable participant P-125/P00125 and visit V00003 forms. */
export function researchCodeCondition(code?: string) {
  const value = code?.trim();
  if (!value) return undefined;
  const participantHyphen = sql<string>`concat('P-', ${visits.userId})`;
  const participantPadded = sql<string>`concat('P', lpad(${visits.userId}, 5, '0'))`;
  const visitPadded = sql<string>`concat('V', lpad(${visits.id}, 5, '0'))`;
  return or(
    like(visits.code, `%${value}%`),
    like(participantHyphen, `%${value}%`),
    like(participantPadded, `%${value}%`),
    like(visitPadded, `%${value}%`)
  );
}

function scopedResearchConditions(filters: ResearchFilters) {
  validateResearchFilters(filters);
  return [
    filters.from ? gte(visits.createdAt, saudiResearchDayBounds(filters.from).start) : undefined,
    filters.to ? lte(visits.createdAt, saudiResearchDayBounds(filters.to).end) : undefined,
    researchCodeCondition(filters.code),
    filters.identity ? or(like(visits.displayName, `%${filters.identity}%`), like(users.phone, `%${filters.identity}%`)) : undefined,
  ].filter(Boolean) as any[];
}

async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "قاعدة البيانات غير متاحة",
    });
  return db;
}
export async function researchEvents() {
  const db = await database();
  const [profiles, codes, counts] = await Promise.all([
    db
      .select({
        eventCode: eventProfiles.eventCode,
        name: eventProfiles.name,
        startsOn: eventProfiles.startsOn,
        endsOn: eventProfiles.endsOn,
        organizer: eventProfiles.organizer,
      })
      .from(eventProfiles),
    db.selectDistinct({ eventCode: visits.eventCode }).from(visits),
    db.select({ eventCode: visits.eventCode, total: sql<number>`count(*)`, completed: sql<number>`sum(case when ${visits.reportCompletedAt} is not null then 1 else 0 end)` }).from(visits).groupBy(visits.eventCode),
  ]);
  const map = new Map(profiles.map(p => [p.eventCode, p]));
  for (const c of [...codes, { eventCode: EVENT_CODE }])
    if (!map.has(c.eventCode))
      map.set(c.eventCode, {
        eventCode: c.eventCode,
        name: c.eventCode,
        startsOn: null,
        endsOn: null,
        organizer: "",
      });
  const countMap = new Map(counts.map(row => [row.eventCode, { total: Number(row.total), completed: Number(row.completed ?? 0) }]));
  return Array.from(map.values()).map(event => ({ ...event, ...(countMap.get(event.eventCode) ?? { total: 0, completed: 0 }) })).sort((a, b) =>
    a.eventCode.localeCompare(b.eventCode)
  );
}
export async function validateResearchPermissions(p: ResearchPermissions) {
  const known = new Set((await researchEvents()).map(e => e.eventCode));
  if (
    (!p.allEvents && !p.eventCodes.length) ||
    p.eventCodes.some(c => !known.has(c))
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "اختر فعالية موجودة واحدة على الأقل أو جميع الفعاليات",
    });
}
export async function listResearchers() {
  const db = await database();
  const rows = await db
    .select({
      id: researchers.id,
      name: researchers.name,
      username: researchers.username,
      active: researchers.active,
      allEvents: researchers.allEvents,
      includeIdentity: researchers.includeIdentity,
      reportArchiveAccess: researchers.reportArchiveAccess,
    })
    .from(researchers)
    .orderBy(researchers.id);
  const access = await db.select().from(grants);
  return rows.map(r => ({
    ...r,
    // Identified research exports are disabled until a separate, explicit
    // participant research-consent grant is implemented.
    includeIdentity: 0,
    eventCodes: access
      .filter(g => g.researcherId === r.id)
      .map(g => g.eventCode),
  }));
}
export async function saveResearcher(
  input: ResearchPermissions & {
    id?: number;
    name: string;
    username: string;
    active: boolean;
  },
  codeHash: string | undefined,
  actorId: number
) {
  await validateResearchPermissions(input);
  const db = await database();
  try {
    return await db.transaction(async tx => {
      const { id, eventCodes, ...rest } = input;
      const data = {
        name: rest.name,
        username: rest.username,
        active: Number(rest.active),
        allEvents: Number(rest.allEvents),
        includeIdentity: 0,
        reportArchiveAccess: Number(rest.reportArchiveAccess),
      };
      let researcherId = id;
      if (researcherId) {
        const [r] = await tx
          .select({ id: researchers.id })
          .from(researchers)
          .where(eq(researchers.id, researcherId))
          .for("update");
        if (!r)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "الباحث غير موجود",
          });
        await tx
          .update(researchers)
          .set({
            ...data,
            credentialVersion: sql`${researchers.credentialVersion}+1`,
          })
          .where(eq(researchers.id, researcherId));
        await tx.delete(grants).where(eq(grants.researcherId, researcherId));
      } else {
        if (!codeHash) throw new Error("Missing generated credential");
        const [r] = await tx
          .insert(researchers)
          .values({ ...data, codeHash })
          .$returningId();
        researcherId = r.id;
      }
      if (!input.allEvents && eventCodes.length)
        await tx
          .insert(grants)
          .values(
            eventCodes.map(eventCode => ({
              researcherId: researcherId!,
              eventCode,
            }))
          );
      await tx
        .insert(audit)
        .values({
          actorId,
          action: id ? "admin_permissions" : "admin_create",
          rowCount: researcherId!,
        });
      return { id: researcherId! };
    });
  } catch (e) {
    if (
      (e as any)?.code === "ER_DUP_ENTRY" ||
      (e as any)?.cause?.code === "ER_DUP_ENTRY"
    )
      throw new TRPCError({
        code: "CONFLICT",
        message: "اسم المستخدم مستخدم بالفعل",
      });
    throw e;
  }
}
export async function rotateResearchCode(
  id: number,
  codeHash: string,
  actorId: number
) {
  const db = await database();
  await db.transaction(async tx => {
    const [r] = await tx
      .select({ id: researchers.id })
      .from(researchers)
      .where(eq(researchers.id, id))
      .for("update");
    if (!r)
      throw new TRPCError({ code: "NOT_FOUND", message: "الباحث غير موجود" });
    await tx
      .update(researchers)
      .set({
        codeHash,
        credentialVersion: sql`${researchers.credentialVersion}+1`,
      })
      .where(eq(researchers.id, id));
    await tx
      .insert(audit)
      .values({ actorId, action: "admin_rotate_code", rowCount: id });
  });
}
export async function researcherByCredential(
  username: string,
  codeHash: string
) {
  const db = await database();
  const [row] = await db
    .select()
    .from(researchers)
    .where(
      and(
        eq(researchers.username, username),
        eq(researchers.codeHash, codeHash),
        eq(researchers.active, 1)
      )
    );
  return row;
}
export async function createResearchSession(
  r: Researcher,
  tokenHash: string,
  expiresAt: Date
) {
  const db = await database();
  await db
    .insert(sessions)
    .values({
      researcherId: r.id,
      credentialVersion: r.credentialVersion,
      tokenHash,
      expiresAt,
    });
}
export async function researcherBySession(tokenHash: string) {
  const db = await database();
  const [r] = await db
    .select({ researcher: researchers })
    .from(sessions)
    .innerJoin(researchers, eq(researchers.id, sessions.researcherId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
        eq(researchers.active, 1),
        eq(sessions.credentialVersion, researchers.credentialVersion)
      )
    );
  // Drizzle's nested relation inference can lag behind additive columns; the
  // database row is the same researchers table used by the direct lookups.
  return r?.researcher as Researcher | undefined;
}
export async function endResearchSession(tokenHash: string) {
  const db = await database();
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
export async function allowedResearchEvents(r: Researcher) {
  const events = await researchEvents();
  if (r.allEvents === 1) return events;
  const db = await database();
  const rows = await db
    .select({ eventCode: grants.eventCode })
    .from(grants)
    .where(eq(grants.researcherId, r.id));
  const allowed = new Set(rows.map(g => g.eventCode));
  return events.filter(e => allowed.has(e.eventCode));
}
export async function requireResearchEvent(r: Researcher, eventCode: string) {
  if (!(await allowedResearchEvents(r)).some(e => e.eventCode === eventCode))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ليست لديك صلاحية لهذه الفعالية",
    });
}

/** Archive access is a distinct, default-off privilege above structured research data. */
export async function requireReportArchiveAccess(r: Researcher, eventCode: string) {
  if (r.reportArchiveAccess !== 1)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ليست لديك صلاحية لعرض أرشيف التقارير",
    });
  await requireResearchEvent(r, eventCode);
}

export async function reportArchivePage(
  r: Researcher,
  eventCode: string,
  after: number,
  limit: number
) {
  await requireReportArchiveAccess(r, eventCode);
  const db = await database();
  const rows = await db
    .select({
      id: eventReportArchives.id,
      archiveId: eventReportArchives.archiveId,
      eventCode: eventReportArchives.eventCode,
      sessionId: eventReportArchives.sessionId,
      participantCode: visits.code,
      reportRevision: eventReportArchives.reportRevision,
      snapshotStatus: eventReportArchives.snapshotStatus,
      pdfStatus: eventReportArchives.pdfStatus,
      pdfBytes: eventReportArchives.pdfBytes,
      archivedAt: eventReportArchives.archivedAt,
      retentionUntil: eventReportArchives.retentionUntil,
    })
    .from(eventReportArchives)
    .innerJoin(visits, eq(visits.id, eventReportArchives.sessionId))
    .where(
      and(
        eq(eventReportArchives.eventCode, eventCode),
        gt(eventReportArchives.id, after)
      )
    )
    .orderBy(eventReportArchives.id)
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  await db.insert(audit).values({
    actorId: r.id,
    action: "archive_list",
    eventCode,
    rowCount: page.length,
  });
  return { archives: page, nextCursor: rows.length > limit ? page.at(-1)!.id : null };
}

export async function authorizeReportArchive(r: Researcher, archiveId: string) {
  const db = await database();
  const [archive] = await db
    .select()
    .from(eventReportArchives)
    .where(eq(eventReportArchives.archiveId, archiveId))
    .limit(1);
  if (!archive)
    throw new TRPCError({ code: "NOT_FOUND", message: "أرشيف التقرير غير موجود" });
  await requireReportArchiveAccess(r, archive.eventCode);
  return archive;
}

export async function auditReportArchiveAccess(
  r: Researcher,
  eventCode: string,
  action: "archive_snapshot" | "archive_pdf",
  rowCount = 1
) {
  const db = await database();
  await db.insert(audit).values({ actorId: r.id, action, eventCode, rowCount });
}

export async function researchPage(
  r: Researcher,
  eventCode: string,
  after: number,
  limit: number,
  purpose: "view" | "export",
  filters: { from?: string; to?: string; code?: string; identity?: string } = {}
) {
  // Scope is enforced here as well as at the router; never filter a global result on the client.
  await requireResearchEvent(r, eventCode);
  const db = await database();
  if (filters.identity && r.reportArchiveAccess !== 1) throw new TRPCError({ code: "FORBIDDEN", message: "البحث بالاسم أو الجوال يتطلب صلاحية أرشيف التقارير" });
  const conditions = scopedResearchConditions(filters);
  const rows = await db
    .select({
      id: visits.id,
      eventCode: visits.eventCode,
      userId: visits.userId,
      code: visits.code,
      name: visits.displayName,
      phone: users.phone,
      age: visits.age,
      sex: visits.sex,
      city: visits.city,
      trackId: visits.trackId,
      createdAt: visits.createdAt,
      answers: visits.answers,
      questionnaireIds: visits.questionnaireIds,
      recordNo: visits.latestRecordNo,
      consultationCompletedAt: visits.consultationCompletedAt,
      reportCompletedAt: visits.reportCompletedAt,
      measurements: eventCare.measurements,
      testIds: eventCare.testIds,
      nurseNotes: eventCare.nurseNotes,
      nursingCompletedAt: eventCare.nursingCompletedAt,
      advice: eventCare.advice,
      doctorName: eventCare.doctorName,
      approvedAt: eventCare.approvedAt,
      revision: eventCare.revision,
      archiveId: eventReportArchives.archiveId,
      archiveSessionId: eventReportArchives.sessionId,
      snapshotPayload: eventReportArchives.snapshotPayload,
      snapshotSha256: eventReportArchives.snapshotSha256,
    })
    .from(visits)
    .leftJoin(users, eq(users.id, visits.userId))
    .leftJoin(eventCare, eq(eventCare.sessionId, visits.id))
    .leftJoin(eventReportArchives, and(eq(eventReportArchives.sessionId, visits.id), eq(eventReportArchives.reportRevision, eventCare.revision)))
    .where(
      and(
        eq(visits.eventCode, eventCode),
        eq(visits.consent, "true"),
        gt(visits.id, after),
        ...conditions
      )
    )
    .orderBy(visits.id)
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const records = await Promise.all(
    page.map(async row => {
      const frozen = row.archiveId ? readEmbeddedArchivedReportSnapshot({ archiveId: row.archiveId, sessionId: row.archiveSessionId!, reportRevision: row.revision!, snapshotPayload: row.snapshotPayload, snapshotSha256: row.snapshotSha256! }) : undefined;
      return researchRecord(row, row.recordNo ? await getEventReadingByRecordNo(row.userId, row.recordNo) : [], {
        ...(frozen ? { frozenLifestyleReport: frozen.lifestyleReport ?? null, frozenMetadata: frozen.metadata ?? null } : {}),
        finalAdvice: r.reportArchiveAccess === 1 && row.approvedAt ? frozen?.care.advice ?? row.advice ?? null : null,
        archiveId: row.archiveId ?? null,
      });
    })
  );
  // Failure to record access must prevent returning data.
  await db
    .insert(audit)
    .values({
      actorId: r.id,
      action: purpose,
      eventCode,
      rowCount: records.length,
    });
  return { records, nextCursor: rows.length > limit ? page.at(-1)!.id : null };
}

/** A bounded server-side export. Default behavior deliberately retains repeat visits. */
export async function researchExport(
  r: Researcher,
  eventCodes: string[],
  latestPerParticipant: boolean,
  filters: { from?: string; to?: string; code?: string; identity?: string } = {}
) {
  const selected = Array.from(new Set(eventCodes));
  if (!selected.length || selected.length > 50)
    throw new TRPCError({ code: "BAD_REQUEST", message: "اختر من 1 إلى 50 فعالية" });
  await Promise.all(selected.map(eventCode => requireResearchEvent(r, eventCode)));
  const db = await database();
  if (filters.identity && r.reportArchiveAccess !== 1) throw new TRPCError({ code: "FORBIDDEN", message: "البحث بالاسم أو الجوال يتطلب صلاحية أرشيف التقارير" });
  const conditions = scopedResearchConditions(filters);
  const rows = await db
    .select({
      id: visits.id,
      eventCode: visits.eventCode,
      userId: visits.userId,
      code: visits.code,
      age: visits.age,
      sex: visits.sex,
      city: visits.city,
      trackId: visits.trackId,
      createdAt: visits.createdAt,
      answers: visits.answers,
      questionnaireIds: visits.questionnaireIds,
      recordNo: visits.latestRecordNo,
      consultationCompletedAt: visits.consultationCompletedAt,
      reportCompletedAt: visits.reportCompletedAt,
      measurements: eventCare.measurements,
      testIds: eventCare.testIds,
      nursingCompletedAt: eventCare.nursingCompletedAt,
      approvedAt: eventCare.approvedAt,
      advice: eventCare.advice,
      revision: eventCare.revision,
      archiveId: eventReportArchives.archiveId,
      archiveSessionId: eventReportArchives.sessionId,
      snapshotPayload: eventReportArchives.snapshotPayload,
      snapshotSha256: eventReportArchives.snapshotSha256,
    })
    .from(visits)
    .leftJoin(users, eq(users.id, visits.userId))
    .leftJoin(eventCare, eq(eventCare.sessionId, visits.id))
    .leftJoin(eventReportArchives, and(eq(eventReportArchives.sessionId, visits.id), eq(eventReportArchives.reportRevision, eventCare.revision)))
    .where(and(inArray(visits.eventCode, selected), eq(visits.consent, "true"), ...conditions))
    .orderBy(desc(visits.createdAt), desc(visits.id))
    .limit(10_001);
  if (rows.length > 10_000)
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "يتجاوز التصدير 10,000 زيارة. ضيّق نطاق الفعاليات أو استخدم أحدث زيارة فقط." });
  const kept = latestPerParticipant
    ? rows.filter((row, index, all) => all.findIndex(other => other.userId === row.userId) === index)
    : rows;
  const records = await Promise.all(
    kept.map(async row => {
      const frozen = row.archiveId ? readEmbeddedArchivedReportSnapshot({ archiveId: row.archiveId, sessionId: row.archiveSessionId!, reportRevision: row.revision!, snapshotPayload: row.snapshotPayload, snapshotSha256: row.snapshotSha256! }) : undefined;
      return researchRecord(row, row.recordNo ? await getEventReadingByRecordNo(row.userId, row.recordNo) : [], {
        ...(frozen ? { frozenLifestyleReport: frozen.lifestyleReport ?? null, frozenMetadata: frozen.metadata ?? null } : {}),
        finalAdvice: r.reportArchiveAccess === 1 && row.approvedAt ? frozen?.care.advice ?? row.advice ?? null : null,
        archiveId: row.archiveId ?? null,
      });
    })
  );
  await Promise.all(selected.map(eventCode => db.insert(audit).values({
    actorId: r.id,
    action: "export",
    eventCode,
    rowCount: records.filter(record => record.eventCode === eventCode).length,
  })));
  return records;
}
