import { and, desc, eq } from "drizzle-orm";
import {
  eventCare,
  eventSettings,
  eventParticipantSessions,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { TRPCError } from "@trpc/server";
import {
  EVENT_AUTOMATIC_RECOMMENDATION_MAX_ATTEMPTS,
  type EventConsultationMode,
} from "../shared/eventConsultation";

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
  return row ?? {
    eventCode: EVENT_CODE,
    nursingEnabled: 0,
    testIds: [],
    consultationMode: "physician" as const,
  };
}

export async function writeSettings(
  nursingEnabled: boolean,
  testIds: string[],
  consultationMode: EventConsultationMode
) {
  const db = await database();
  const data = { nursingEnabled: Number(nursingEnabled), testIds, consultationMode };
  await db
    .insert(eventSettings)
    .values({ eventCode: EVENT_CODE, ...data })
    .onDuplicateKeyUpdate({ set: data });
}

/** Snapshot care configuration at registration. Existing visits are never rewritten. */
export async function createCareSnapshot(sessionId: number) {
  const db = await database();
  const settings = await readSettings();
  await db
    .insert(eventCare)
    .values({
      sessionId,
      nursingEnabled: settings.nursingEnabled,
      testIds: settings.testIds,
      consultationMode: settings.consultationMode,
      measurements: {},
    })
    .onDuplicateKeyUpdate({ set: { sessionId } });
  const [created] = await db
    .select()
    .from(eventCare)
    .where(eq(eventCare.sessionId, sessionId));
  return created;
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

/** Legacy visits without a snapshot get a snapshot once, then keep it. */
export async function readCare(sessionId: number) {
  const db = await database();
  const [existing] = await db
    .select()
    .from(eventCare)
    .where(eq(eventCare.sessionId, sessionId));
  return existing ?? createCareSnapshot(sessionId);
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

export type AutomaticRecommendationClaim =
  | { state: "not_applicable" | "already_generated" | "retry_limit" | "waiting_for_nursing" }
  | {
      state: "claimed";
      session: typeof eventParticipantSessions.$inferSelect;
      care: typeof eventCare.$inferSelect;
    };

/** Atomically reserves one automatic recommendation attempt for a visit. */
export async function claimAutomaticRecommendationGeneration(
  sessionId: number
): Promise<AutomaticRecommendationClaim> {
  const db = await database();
  return db.transaction(async tx => {
    const [session] = await tx
      .select()
      .from(eventParticipantSessions)
      .where(and(eq(eventParticipantSessions.id, sessionId), eq(eventParticipantSessions.eventCode, EVENT_CODE)))
      .for("update");
    const [care] = await tx
      .select()
      .from(eventCare)
      .where(eq(eventCare.sessionId, sessionId))
      .for("update");
    if (!session || !care || care.consultationMode !== "automatic") return { state: "not_applicable" };
    if (!session.latestRecordNo || !care.nursingEnabled || !care.nursingCompletedAt) return { state: "waiting_for_nursing" };
    if (care.approvedAt || care.autoGenerationState === "generated") return { state: "already_generated" };
    if (care.autoGenerationState === "generating" || care.autoGenerationAttempts >= EVENT_AUTOMATIC_RECOMMENDATION_MAX_ATTEMPTS) return { state: "retry_limit" };
    await tx
      .update(eventCare)
      .set({
        autoGenerationState: "generating",
        autoGenerationAttempts: care.autoGenerationAttempts + 1,
        autoGenerationError: null,
      })
      .where(eq(eventCare.sessionId, sessionId));
    return { state: "claimed", session, care: { ...care, autoGenerationAttempts: care.autoGenerationAttempts + 1 } };
  });
}

export async function completeAutomaticRecommendationGeneration(
  sessionId: number,
  data: { advice: string; recommendationMeta: Record<string, unknown>; model: string | null }
) {
  const db = await database();
  const approvedAt = new Date();
  await db.transaction(async tx => {
    await tx
      .update(eventCare)
      .set({
        advice: data.advice,
        doctorUserId: null,
        doctorStaffId: null,
        doctorName: null,
        approvedAt,
        recommendationMeta: data.recommendationMeta,
        autoGenerationState: "generated",
        autoGenerationError: null,
        autoGeneratedAt: approvedAt,
        autoModel: data.model,
      })
      .where(eq(eventCare.sessionId, sessionId));
    await tx
      .update(eventParticipantSessions)
      .set({ consultationCompletedAt: approvedAt, updatedAt: approvedAt })
      .where(eq(eventParticipantSessions.id, sessionId));
  });
}

export async function failAutomaticRecommendationGeneration(sessionId: number, message: string) {
  const db = await database();
  await db
    .update(eventCare)
    .set({ autoGenerationState: "failed", autoGenerationError: message.slice(0, 255) })
    .where(eq(eventCare.sessionId, sessionId));
}
