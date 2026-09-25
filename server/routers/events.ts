import crypto from "crypto";
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
  createSession: publicProcedure
    .input(z.object({
      firstName: z.string().trim().max(255).optional(),
      age: z.number().int().min(18).max(120),
      sex: z.enum(["male", "female"]),
      phone: z.string().trim().min(8).max(32),
      city: z.string().trim().max(128).optional(),
      consent: z.literal(true),
    }))
    .mutation(async ({ input }) => {
      const normalizedPhone = normalizeSaudiMobilePhone(input.phone);
      if (!normalizedPhone.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid Saudi mobile number." });
      }

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
        displayName: input.firstName || null,
        age: input.age,
        sex: input.sex,
        city: input.city || null,
        consent: "true",
        answers: {},
        status: "checked_in",
      });
      if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to save the event session." });

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
    return {
      code: session.code,
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
      const updated = await updateEventParticipantSession(tokenHash(input.accessToken), { answers: input.answers });
      if (!updated || updated.id !== session.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to save lifestyle answers." });
      return { success: true, answers: updated.answers ?? {} };
    }),

  /** Marks the consultation as complete only after the current session has a result. */
  completeConsultation: publicProcedure
    .input(eventTokenInput)
    .mutation(async ({ input }) => {
      const session = await requireEventSession(input.accessToken);
      if (!session.latestRecordNo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A body measurement is required before completing the consultation." });
      }
      const completedAt = session.consultationCompletedAt ?? new Date();
      const updated = await updateEventParticipantSession(tokenHash(input.accessToken), {
        consultationCompletedAt: completedAt,
      });
      if (!updated || updated.id !== session.id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to complete the consultation." });
      }
      return { success: true, consultationCompletedAt: updated.consultationCompletedAt };
    }),

  /** Marks the report as read after its consultation milestone is complete. */
  completeReport: publicProcedure
    .input(eventTokenInput)
    .mutation(async ({ input }) => {
      const session = await requireEventSession(input.accessToken);
      if (!session.latestRecordNo || !session.consultationCompletedAt) {
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
