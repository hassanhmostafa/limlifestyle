import crypto from "crypto";
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
export const EVENT_AUTOMATIC_RECOMMENDATION_LEASE_MS = 90_000;

async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "قاعدة البيانات غير متاحة",
    });
  return db;
}

const conflict = () =>
  new TRPCError({
    code: "CONFLICT",
    message: "تم تعديل الزيارة بواسطة عضو آخر. حدّث الصفحة؛ تم الاحتفاظ بتعديلاتك المحلية.",
  });

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
      revision: 1,
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

/** Legacy visits without a snapshot get one snapshot once, then keep it. */
export async function readCare(sessionId: number) {
  const db = await database();
  const [existing] = await db
    .select()
    .from(eventCare)
    .where(eq(eventCare.sessionId, sessionId));
  return existing ?? createCareSnapshot(sessionId);
}

type CarePatch = Partial<typeof eventCare.$inferInsert>;

/**
 * Optimistically updates staff-visible care. A stale editor receives CONFLICT
 * and the client keeps its local text/measurements intact for review.
 */
export async function updateCare(
  sessionId: number,
  patch: CarePatch,
  approve: boolean,
  trackId: number,
  expectedRevision: number
) {
  const db = await database();
  return db.transaction(async tx => {
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
    if (!current || current.revision !== expectedRevision) throw conflict();
    if (current.approvedAt || (patch.measurements && current.nursingCompletedAt)) {
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
    const revision = current.revision + 1;
    await tx
      .update(eventCare)
      .set({ ...patch, revision })
      .where(
        and(
          eq(eventCare.sessionId, sessionId),
          eq(eventCare.revision, expectedRevision)
        )
      );
    if (approve)
      await tx
        .update(eventParticipantSessions)
        .set({ consultationCompletedAt: patch.approvedAt, updatedAt: new Date() })
        .where(eq(eventParticipantSessions.id, sessionId));
    return { ...current, ...patch, revision };
  });
}

export type AutomaticRecommendationClaim =
  | {
      state:
        | "not_applicable"
        | "already_generated"
        | "retry_limit"
        | "waiting_for_nursing"
        | "busy"
        | "input_changed";
    }
  | {
      state: "claimed";
      attemptToken: string;
      session: typeof eventParticipantSessions.$inferSelect;
      care: typeof eventCare.$inferSelect;
      fingerprint: string;
    };

/**
 * Claims a time-bounded worker lease. The caller supplies a fingerprint of the
 * minimized input it read; the transaction rejects a changed care revision or
 * record number so an old LLM result can never publish over newer data.
 */
export async function claimAutomaticRecommendationGeneration(
  sessionId: number,
  input: { fingerprint: string; inputRevision: number; recordNo: string }
): Promise<AutomaticRecommendationClaim> {
  const db = await database();
  return db.transaction(async tx => {
    const [session] = await tx
      .select()
      .from(eventParticipantSessions)
      .where(
        and(
          eq(eventParticipantSessions.id, sessionId),
          eq(eventParticipantSessions.eventCode, EVENT_CODE)
        )
      )
      .for("update");
    const [care] = await tx
      .select()
      .from(eventCare)
      .where(eq(eventCare.sessionId, sessionId))
      .for("update");
    if (!session || !care || care.consultationMode !== "automatic")
      return { state: "not_applicable" };
    if (!session.latestRecordNo || (care.nursingEnabled && !care.nursingCompletedAt))
      return { state: "waiting_for_nursing" };
    if (care.approvedAt || care.autoGenerationState === "generated")
      return { state: "already_generated" };
    if (
      session.latestRecordNo !== input.recordNo ||
      care.revision !== input.inputRevision
    )
      return { state: "input_changed" };

    const now = new Date();
    const leaseExpiresAt = care.autoGenerationLeaseExpiresAt;
    if (
      care.autoGenerationState === "generating" &&
      leaseExpiresAt &&
      leaseExpiresAt.getTime() > now.getTime()
    )
      return { state: "busy" };

    // A materially new record/input earns a fresh bounded attempt budget. A
    // retry of the exact same input does not silently reset a failed cap.
    const priorFingerprint = care.autoGenerationFingerprint;
    const attempts =
      priorFingerprint && priorFingerprint !== input.fingerprint
        ? 0
        : care.autoGenerationAttempts;
    if (attempts >= EVENT_AUTOMATIC_RECOMMENDATION_MAX_ATTEMPTS)
      return { state: "retry_limit" };

    const attemptToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(now.getTime() + EVENT_AUTOMATIC_RECOMMENDATION_LEASE_MS);
    const revision = care.revision + 1;
    await tx
      .update(eventCare)
      .set({
        revision,
        autoGenerationState: "generating",
        autoGenerationAttempts: attempts + 1,
        autoGenerationError: null,
        autoGenerationAttemptToken: attemptToken,
        autoGenerationStartedAt: now,
        autoGenerationLeaseExpiresAt: expiresAt,
        autoGenerationFingerprint: input.fingerprint,
        autoGenerationInputRevision: input.inputRevision,
        autoGenerationRecordNo: input.recordNo,
      })
      .where(
        and(
          eq(eventCare.sessionId, sessionId),
          eq(eventCare.revision, input.inputRevision)
        )
      );
    return {
      state: "claimed",
      attemptToken,
      session,
      care: {
        ...care,
        revision,
        autoGenerationAttempts: attempts + 1,
        autoGenerationState: "generating",
        autoGenerationAttemptToken: attemptToken,
        autoGenerationStartedAt: now,
        autoGenerationLeaseExpiresAt: expiresAt,
        autoGenerationFingerprint: input.fingerprint,
        autoGenerationInputRevision: input.inputRevision,
        autoGenerationRecordNo: input.recordNo,
      },
      fingerprint: input.fingerprint,
    };
  });
}

export async function completeAutomaticRecommendationGeneration(
  sessionId: number,
  attempt: {
    token: string;
    fingerprint: string;
    inputRevision: number;
    recordNo: string;
  },
  data: { advice: string; recommendationMeta: Record<string, unknown>; model: string | null }
) {
  const db = await database();
  return db.transaction(async tx => {
    const [session] = await tx
      .select()
      .from(eventParticipantSessions)
      .where(eq(eventParticipantSessions.id, sessionId))
      .for("update");
    const [care] = await tx
      .select()
      .from(eventCare)
      .where(eq(eventCare.sessionId, sessionId))
      .for("update");
    const now = new Date();
    if (
      !session ||
      !care ||
      session.latestRecordNo !== attempt.recordNo ||
      care.autoGenerationState !== "generating" ||
      care.autoGenerationAttemptToken !== attempt.token ||
      care.autoGenerationFingerprint !== attempt.fingerprint ||
      care.autoGenerationInputRevision !== attempt.inputRevision ||
      !care.autoGenerationLeaseExpiresAt ||
      care.autoGenerationLeaseExpiresAt.getTime() <= now.getTime()
    )
      return false;

    const approvedAt = now;
    await tx
      .update(eventCare)
      .set({
        revision: care.revision + 1,
        advice: data.advice,
        doctorUserId: null,
        doctorStaffId: null,
        doctorName: null,
        approvedAt,
        approvedRecordNo: attempt.recordNo,
        recommendationMeta: data.recommendationMeta,
        autoGenerationState: "generated",
        autoGenerationError: null,
        autoGeneratedAt: approvedAt,
        autoModel: data.model,
        autoGenerationAttemptToken: null,
        autoGenerationLeaseExpiresAt: null,
      })
      .where(
        and(
          eq(eventCare.sessionId, sessionId),
          eq(eventCare.autoGenerationAttemptToken, attempt.token)
        )
      );
    await tx
      .update(eventParticipantSessions)
      .set({ consultationCompletedAt: approvedAt, updatedAt: approvedAt })
      .where(eq(eventParticipantSessions.id, sessionId));
    return true;
  });
}

export async function failAutomaticRecommendationGeneration(
  sessionId: number,
  attemptToken: string,
  message: string
) {
  const db = await database();
  return db.transaction(async tx => {
    const [care] = await tx
      .select()
      .from(eventCare)
      .where(eq(eventCare.sessionId, sessionId))
      .for("update");
    if (
      !care ||
      care.autoGenerationState !== "generating" ||
      care.autoGenerationAttemptToken !== attemptToken
    )
      return false;
    await tx
      .update(eventCare)
      .set({
        revision: care.revision + 1,
        autoGenerationState: "failed",
        autoGenerationError: message.slice(0, 255),
        autoGenerationAttemptToken: null,
        autoGenerationLeaseExpiresAt: null,
      })
      .where(
        and(
          eq(eventCare.sessionId, sessionId),
          eq(eventCare.autoGenerationAttemptToken, attemptToken)
        )
      );
    return true;
  });
}
