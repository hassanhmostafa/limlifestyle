import { and, eq, gt, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { eventProfiles, eventParticipantSessions as visits, eventCare, users } from '../drizzle/schema';
import { getDb, getEventReadingByRecordNo } from './db';
import { EVENT_CODE } from './eventCareDb';
export const defaultEventProfile = { eventCode: EVENT_CODE, name: 'فعالية ليم', startsOn: null, endsOn: null, location: '', organizer: '', poster: null, questionnaireIds: ['lifestyle'], closed: 0 };
async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({code:'INTERNAL_SERVER_ERROR', message:'قاعدة البيانات غير متاحة'});
  return db;
}
export async function readEventProfile() {
  const db = await database();
  const [row] = await db.select().from(eventProfiles).where(eq(eventProfiles.eventCode, EVENT_CODE));
  return row ?? defaultEventProfile;
}
export async function updateEventProfile(patch: Partial<typeof eventProfiles.$inferInsert>) {
  const db = await database();
  // Each editor only changes its own fields; poster/status cannot be overwritten by a stale form.
  await db.insert(eventProfiles).values({...defaultEventProfile, ...patch, eventCode:EVENT_CODE})
    .onDuplicateKeyUpdate({set:patch});
}
export async function requireOpenEvent() {
  const profile = await readEventProfile();
  if (profile.closed) throw new TRPCError({code:'FORBIDDEN', message:'انتهى التسجيل في هذه الفعالية. تبقى تقارير المشاركين السابقين متاحة.'});
  return profile;
}
export async function eventReportSummary() {
  const db = await database();
  const [row] = await db.select({
    visits: sql<number>`count(*)`,
    participants: sql<number>`count(distinct ${visits.userId})`,
    measured: sql<number>`coalesce(sum(case when ${visits.latestRecordNo} is not null then 1 else 0 end),0)`,
    nursing: sql<number>`coalesce(sum(case when ${eventCare.nursingCompletedAt} is not null then 1 else 0 end),0)`,
    approved: sql<number>`coalesce(sum(case when ${eventCare.approvedAt} is not null then 1 else 0 end),0)`,
    finished: sql<number>`coalesce(sum(case when ${visits.reportCompletedAt} is not null then 1 else 0 end),0)`,
  }).from(visits).leftJoin(eventCare,eq(eventCare.sessionId,visits.id)).where(eq(visits.eventCode,EVENT_CODE));
  return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,Number(v)])) as Record<keyof typeof row,number>;
}
export async function eventReportPage(after: number, limit: number) {
  const db = await database();
  const rows = await db.select({id:visits.id, code:visits.code, name:visits.displayName, phone:users.phone, age:visits.age, sex:visits.sex,
    trackId:visits.trackId, createdAt:visits.createdAt, recordNo:visits.latestRecordNo,
    answers:visits.answers, nursingCompletedAt:eventCare.nursingCompletedAt, measurements:eventCare.measurements,
    nurseNotes:eventCare.nurseNotes, approvedAt:eventCare.approvedAt, advice:eventCare.advice, doctorName:eventCare.doctorName,
    userId:visits.userId,
  }).from(visits).leftJoin(users,eq(users.id,visits.userId)).leftJoin(eventCare,eq(eventCare.sessionId,visits.id))
    .where(and(eq(visits.eventCode,EVENT_CODE),gt(visits.id,after))).orderBy(visits.id).limit(limit+1);
  const page = rows.slice(0,limit);
  const records = await Promise.all(page.map(async ({userId,...r})=>({...r,
    // Export only completed care, not drafts.
    advice:r.approvedAt?r.advice:null, doctorName:r.approvedAt?r.doctorName:null,
    measurements:r.nursingCompletedAt?r.measurements:{}, nurseNotes:r.nursingCompletedAt?r.nurseNotes:null,
    readings:r.recordNo?await getEventReadingByRecordNo(userId,r.recordNo):[],
  })));
  return {records,nextCursor:rows.length>limit?page.at(-1)!.id:null};
}
