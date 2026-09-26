import { and, desc, eq } from "drizzle-orm";
import {
  eventCare,
  eventSettings,
  eventParticipantSessions,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { TRPCError } from "@trpc/server";

export const EVENT_CODE = "lim-events";
async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "قاعدة البيانات غير متاحة",
    });
  return db;
}
export async function readSettings() {
  const db = await database();
  const [row] = await db
    .select()
    .from(eventSettings)
    .where(eq(eventSettings.eventCode, EVENT_CODE));
  return row ?? { eventCode: EVENT_CODE, nursingEnabled: 0, testIds: [] };
}
export async function writeSettings(
  nursingEnabled: boolean,
  testIds: string[]
) {
  const db = await database();
  const data = { nursingEnabled: Number(nursingEnabled), testIds };
  await db
    .insert(eventSettings)
    .values({ eventCode: EVENT_CODE, ...data })
    .onDuplicateKeyUpdate({ set: data });
}
export async function findSession(
  query: { phone: string } | { code: string } | { id: number },
  trackId: number
) {
  const db = await database();
  const [row] = await db
    .select({ session: eventParticipantSessions, phone: users.phone })
    .from(eventParticipantSessions)
    .innerJoin(users, eq(users.id, eventParticipantSessions.userId))
    .where(
      and(
        eq(eventParticipantSessions.eventCode, EVENT_CODE),
        eq(eventParticipantSessions.trackId, trackId),
        "phone" in query
          ? eq(users.phone, query.phone)
          : "code" in query
            ? eq(eventParticipantSessions.code, query.code)
            : eq(eventParticipantSessions.id, query.id)
      )
    )
    .orderBy(
      desc(eventParticipantSessions.createdAt),
      desc(eventParticipantSessions.id)
    )
    .limit(1);
  return row;
}
export async function readCare(sessionId: number) {
  const db = await database();
  const [existing] = await db
    .select()
    .from(eventCare)
    .where(eq(eventCare.sessionId, sessionId));
  if (existing) return existing;
  const settings = await readSettings();
  await db
    .insert(eventCare)
    .values({
      sessionId,
      nursingEnabled: settings.nursingEnabled,
      testIds: settings.testIds,
      measurements: {},
    })
    .onDuplicateKeyUpdate({ set: { sessionId } });
  const [created] = await db
    .select()
    .from(eventCare)
    .where(eq(eventCare.sessionId, sessionId));
  return created;
}
type CarePatch = Partial<typeof eventCare.$inferInsert>;
export async function updateCare(
  sessionId: number,
  patch: CarePatch,
  approve: boolean,
  trackId: number
) {
  const db = await database();
  // Lock and validate the current row, not the client's snapshot.
  await db.transaction(async tx => {
    const [visit] = await tx
      .select({ id: eventParticipantSessions.id })
      .from(eventParticipantSessions)
      .where(
        and(
          eq(eventParticipantSessions.id, sessionId),
          eq(eventParticipantSessions.eventCode, EVENT_CODE),
          eq(eventParticipantSessions.trackId, trackId)
        )
      )
      .for("update");
    if (!visit)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "الزيارة غير متاحة في مسارك",
      });
    const [current] = await tx
      .select()
      .from(eventCare)
      .where(eq(eventCare.sessionId, sessionId))
      .for("update");
    if (
      !current ||
      current.approvedAt ||
      (patch.measurements && current.nursingCompletedAt)
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "تم اعتماد السجل بالفعل؛ حدّث الصفحة",
      });
    }
    if (approve && current.nursingEnabled && !current.nursingCompletedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "أكمل محطة التمريض أولًا",
      });
    }
    await tx
      .update(eventCare)
      .set(patch)
      .where(eq(eventCare.sessionId, sessionId));
    if (approve)
      await tx
        .update(eventParticipantSessions)
        .set({ consultationCompletedAt: patch.approvedAt })
        .where(eq(eventParticipantSessions.id, sessionId));
  });
}
