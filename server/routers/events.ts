import { otpEnabled, sendEventOtp, verifyEventOtp, consumeEventOtp } from "../eventOtp";
import { requireOpenEvent } from "../eventAdminDb";
import crypto from "crypto";
import { listTracks, requireTrack, selectRegistrationTrack } from "../eventTracksDb";
import { readCare } from "../eventCareDb";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  createEventParticipantSession,
  createMachinePhoneUser,
  getEventReadingByRecordNo,
  getEventParticipantSessionByTokenHash,
  getUserById,
  getUserByPhone,
  updateEventParticipantSession,
} from "../db";
import { hashApiKey } from "../lib/apiSecurity";
import { createEventTestMeasurement } from "../lib/eventTestMeasurement";
import { createEventTestUploadKey } from "../lib/eventTestUpload";
import { normalizeSaudiMobilePhone, toMachineUserId } from "../lib/phone";

const EVENT_CODE = "lim-events";
const eventTokenInput = z.object({ accessToken: z.string().min(32).max(256) });
const answerValue = z.union([
  z.string().max(500),
  z.number().finite(),
  z.array(z.string().max(120)).max(20),
]);
const answersSchema = z.record(z.string().max(80), answerValue);

function tokenHash(accessToken: string) {
  return hashApiKey(accessToken);
}

function createPublicEventToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function createEventCode() {
  return `LIM-${Date.now().toString().slice(-6)}-${crypto.randomInt(10, 100)}`;
}

async function requireEventSession(accessToken: string) {
  const session = await getEventParticipantSessionByTokenHash(tokenHash(accessToken));
  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "This event session is unavailable. Start a new event journey.",
    });
  }
  return session;
}

/**
 * Standalone LIM Events APIs. These procedures do not require the main LIM
 * website login. An opaque event session token protects the browser session;
 * the X18 upload stays on the one shared LIM backend and stores one physical
 * reading in health_readings for both products to use.
 */
export const eventsRouter = router({
  otpStatus: publicProcedure.query(() => ({ enabled: otpEnabled() })),
  sendOtp: publicProcedure.input(z.object({ phone: z.string().min(8).max(32) })).mutation(async ({ input, ctx }) => {
    await requireOpenEvent();
    return sendEventOtp(input.phone, ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown");
  }),
  verifyOtp: publicProcedure.input(z.object({ phone: z.string().min(8).max(32), challengeToken: z.string().min(32).max(128), code: z.string().regex(/^\d{4,8}$/) })).mutation(async ({ input }) => {
    await requireOpenEvent();
    return verifyEventOtp(input.phone, input.challengeToken, input.code);
  }),
  tracks: publicProcedure.query(async () => (await listTracks(true)).map(t => ({ id: t.id, name: t.name }))),
  createSession: publicProcedure
    .input(z.object({
      firstName: z.string().trim().max(255).optional(),
      age: z.number().int().min(18).max(120),
      sex: z.enum(["male", "female"]),
      phone: z.string().trim().min(8).max(32),
      city: z.string().trim().max(128).optional(),
      consent: z.literal(true),
      otpChallengeToken: z.string().min(32).max(128).optional(),
      trackId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input }) => {
      const profile = await requireOpenEvent();
      const track = await selectRegistrationTrack(input.trackId);
      const normalizedPhone = normalizeSaudiMobilePhone(input.phone);
      if (!normalizedPhone.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid Saudi mobile number." });
      }

      await consumeEventOtp(normalizedPhone.e164, input.otpChallengeToken);

      // The event website is independent from main-app sign-in, but it still
      // allocates the same internal LIM participant record. A later main-app
      // registration with this number activates the already-linked account.
      let user = await getUserByPhone(normalizedPhone.e164);
      if (!user) {
        user = await createMachinePhoneUser({
          phone: normalizedPhone.e164,
          name: input.firstName || null,
        });
      }
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create the event participant." });

      const accessToken = createPublicEventToken();
      const session = await createEventParticipantSession({
        userId: user.id,
        accessTokenHash: tokenHash(accessToken),
        code: createEventCode(),
        eventCode: EVENT_CODE,
        trackId: track.id,
        questionnaireIds: profile.questionnaireIds,
        displayName: input.firstName || null,
        age: input.age,
        sex: input.sex,
        city: input.city || null,
        consent: "true",
        answers: {},
        status: "checked_in",
      });
      if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to save the event session." });

      await readCare(session.id);
      return {
        accessToken,
        session: {
          code: session.code,
          firstName: session.displayName,
          age: session.age,
          sex: session.sex,
          phone: normalizedPhone.national,
          city: session.city,
          status: session.status,
          answers: session.answers ?? {},
        },
        // This is exactly what the physical X18 should receive in userID/ID.
        deviceUserId: toMachineUserId(normalizedPhone.e164),
      };
    }),

  getSession: publicProcedure.input(eventTokenInput).query(async ({ input }) => {
    const session = await requireEventSession(input.accessToken);
    const user = await getUserById(session.userId);
    const track = session.trackId ? await requireTrack(session.trackId, false) : null;
    return {
      code: session.code,
      trackId: session.trackId,
      questionnaireIds: session.questionnaireIds ?? ["lifestyle"],
      trackName: track?.name ?? null,
      firstName: session.displayName,
      age: session.age,
      sex: session.sex,
      city: session.city,
      status: session.status,
      answers: session.answers ?? {},
      latestRecordNo: session.latestRecordNo,
      consultationCompletedAt: session.consultationCompletedAt,
      reportCompletedAt: session.reportCompletedAt,
      deviceUserId: user?.phone ? toMachineUserId(user.phone) : null,
    };
  }),

  saveLifestyle: publicProcedure
    .input(eventTokenInput.extend({ answers: answersSchema }))
    .mutation(async ({ input }) => {
      const session = await requireEventSession(input.accessToken);
      if (!(session.questionnaireIds ?? ["lifestyle"]).includes("lifestyle")) throw new TRPCError({code:"BAD_REQUEST", message:"الاستبيان غير مفعّل لهذه الزيارة"});
      const updated = await updateEventParticipantSession(tokenHash(input.accessToken), { answers: input.answers });
      if (!updated || updated.id !== session.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to save lifestyle answers." });
      return { success: true, answers: updated.answers ?? {} };
    }),

  // Retained for old clients; only the assigned doctor may approve via eventTeam.
  completeConsultation: publicProcedure.input(eventTokenInput).mutation(() => {
    throw new TRPCError({ code: "FORBIDDEN", message: "يعتمد الطبيب الاستشارة من صفحة الفريق" });
  }),
  care: publicProcedure.input(eventTokenInput).query(async ({ input }) => {
    const session = await requireEventSession(input.accessToken);
    const care = await readCare(session.id);
    return {
      nursingEnabled: Boolean(care.nursingEnabled),
      nursingCompletedAt: care.nursingCompletedAt,
      approvedAt: care.approvedAt,
      // Draft advice never leaves the staff workspace.
      advice: care.approvedAt ? care.advice : null,
      doctorName: care.approvedAt ? care.doctorName : null,
      measurements: care.nursingCompletedAt ? care.measurements : {},
      nurseNotes: care.nursingCompletedAt ? care.nurseNotes : null,
    };
  }),

  /** Marks the report as read after its consultation milestone is complete. */
  completeReport: publicProcedure
    .input(eventTokenInput)
    .mutation(async ({ input }) => {
      const session = await requireEventSession(input.accessToken);
      const care = await readCare(session.id);
      if (!session.latestRecordNo || !care.approvedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Complete the consultation before finishing the report." });
      }
      const completedAt = session.reportCompletedAt ?? new Date();
      const updated = await updateEventParticipantSession(tokenHash(input.accessToken), {
        reportCompletedAt: completedAt,
      });
      if (!updated || updated.id !== session.id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to finish the report." });
      }
      return { success: true, reportCompletedAt: updated.reportCompletedAt };
    }),

  /**
   * Builds a complete X18-like payload for the QR step. The browser posts this
   * payload to the very same `/api/kiosk/data?apiKey=…` URL used by hardware,
   * so test mode exercises the real HTTP parser, auth gate, identity resolution,
   * merge/save logic, and event-result linkage.
   */
  generateTestMeasurement: publicProcedure
    .input(eventTokenInput)
    .mutation(async ({ input }) => {
      const session = await requireEventSession(input.accessToken);
      const user = await getUserById(session.userId);
      if (!user?.phone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A valid participant phone number is required for the test upload." });
      }
      const generated = createEventTestMeasurement();
      const deviceNo = "EVENTS_TEST";
      const measureTime = new Date().toISOString();
      const payload = {
        deviceNo,
        unitName: "LIM Events test sender",
        deviceModel: "LIM-EVENTS-TEST",
        datas: [{
          userID: toMachineUserId(user.phone),
          recordNo: generated.recordNo,
          name: session.displayName ?? undefined,
          age: session.age ? String(session.age) : undefined,
          sex: session.sex === "male" ? "1" : session.sex === "female" ? "2" : undefined,
          measureTime,
          ...generated.machineMetrics,
        }],
      };
      const apiKey = createEventTestUploadKey({
        userId: user.id,
        phone: user.phone,
        recordNo: generated.recordNo,
        deviceNo,
      });
      return { apiKey, payload, recordNo: generated.recordNo, expiresInSeconds: 300 };
    }),

  /**
   * Result retrieval is scoped to the opaque event token and the measurement
   * that arrived for this particular event session. Older LIM measurements
   * must never make a freshly started event journey look complete.
   */
  results: publicProcedure.input(eventTokenInput).query(async ({ input }) => {
    const session = await requireEventSession(input.accessToken);
    if (!session.latestRecordNo) {
      return {
        session: {
          code: session.code,
          status: session.status,
          latestRecordNo: null,
        },
        readings: [],
      };
    }
    const readings = await getEventReadingByRecordNo(session.userId, session.latestRecordNo);
    return {
      session: {
        code: session.code,
        status: session.status,
        latestRecordNo: session.latestRecordNo,
      },
      readings,
    };
  }),
});
