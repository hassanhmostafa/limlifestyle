import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getEventParticipantSession,
  getUserById,
  getUserReadings,
  upsertEventParticipantSession,
} from "../db";
import { toMachineUserId } from "../lib/phone";

const EVENT_CODE = "lim-events";

const answerValue = z.union([z.string().max(500), z.number().finite(), z.array(z.string().max(120)).max(20)]);

/**
 * Event check-in and results view. The session stores event-form responses only.
 * X18 readings remain solely in health_readings and are always read by the
 * authenticated LIM participant ID.
 */
export const eventsRouter = router({
  mySession: protectedProcedure.query(async ({ ctx }) => {
    const [session, user] = await Promise.all([
      getEventParticipantSession(ctx.user.id, EVENT_CODE),
      getUserById(ctx.user.id),
    ]);
    return {
      session,
      machineUserId: user?.phone ? toMachineUserId(user.phone) : null,
    };
  }),

  checkIn: protectedProcedure
    .input(z.object({
      displayName: z.string().trim().min(1).max(255),
      age: z.number().int().min(0).max(130),
      sex: z.enum(["male", "female"]),
      city: z.string().trim().max(128).optional(),
      consent: z.literal(true),
      answers: z.record(z.string().max(80), answerValue).default({}),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user?.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A valid Saudi mobile number is required before event check-in.",
        });
      }
      const machineUserId = toMachineUserId(user.phone);
      if (!machineUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A valid Saudi mobile number is required before event check-in.",
        });
      }

      const session = await upsertEventParticipantSession({
        userId: ctx.user.id,
        eventCode: EVENT_CODE,
        displayName: input.displayName,
        age: input.age,
        sex: input.sex,
        city: input.city || null,
        consent: "true",
        answers: input.answers,
      });

      return { session, machineUserId };
    }),

  /** Returns only this logged-in participant's physical X18 readings. */
  myResults: protectedProcedure.query(async ({ ctx }) => {
    const [session, readings] = await Promise.all([
      getEventParticipantSession(ctx.user.id, EVENT_CODE),
      getUserReadings(ctx.user.id),
    ]);
    return {
      session,
      readings: readings.filter((reading) => reading.source === "x18"),
    };
  }),
});
