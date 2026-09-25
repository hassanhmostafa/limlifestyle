import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  createEventParticipantSession,
  createMachinePhoneUser,
  getEventParticipantSessionByTokenHash,
  getUserById,
  getUserByPhone,
  getUserReadings,
  updateEventParticipantSession,
} from "../db";
import { hashApiKey } from "../lib/apiSecurity";
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

  /** Result retrieval is scoped solely to the opaque event session token. */
  results: publicProcedure.input(eventTokenInput).query(async ({ input }) => {
    const session = await requireEventSession(input.accessToken);
    const readings = await getUserReadings(session.userId);
    return {
      session: {
        code: session.code,
        status: session.status,
        latestRecordNo: session.latestRecordNo,
      },
      readings: readings.filter((reading) => reading.source === "x18"),
    };
  }),
});
