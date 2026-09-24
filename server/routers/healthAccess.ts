import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getClinicianParticipants,
  getParticipantClinicians,
  getUserById,
  getUserByPhone,
  getUserReadings,
  grantClinicianHealthAccess,
  hasClinicianHealthAccess,
  revokeClinicianHealthAccess,
} from "../db";
import { normalizeSaudiMobilePhone } from "../lib/phone";
import { toEventHealthReading } from "../lib/eventHealth";

function requireClinician(role: string) {
  if (role !== "expert") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Clinician access is required." });
  }
}

/**
 * Consent-managed access: a participant explicitly grants an expert account
 * access, may view their grants, and may revoke one at any time.
 */
export const healthAccessRouter = router({
  grant: protectedProcedure
    .input(z.object({ clinicianPhone: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const normalized = normalizeSaudiMobilePhone(input.clinicianPhone);
      if (!normalized.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid Saudi clinician phone number." });

      const clinician = await getUserByPhone(normalized.e164);
      if (!clinician || clinician.role !== "expert") {
        throw new TRPCError({ code: "NOT_FOUND", message: "No approved clinician matches this mobile number." });
      }
      await grantClinicianHealthAccess(ctx.user.id, clinician.id);
      return { success: true, clinician: { id: clinician.id, name: clinician.name, specialty: clinician.specialty } };
    }),

  revoke: protectedProcedure
    .input(z.object({ clinicianUserId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await revokeClinicianHealthAccess(ctx.user.id, input.clinicianUserId);
      return { success: true };
    }),

  myClinicians: protectedProcedure.query(async ({ ctx }) => {
    return getParticipantClinicians(ctx.user.id);
  }),

  myParticipants: protectedProcedure.query(async ({ ctx }) => {
    requireClinician(ctx.user.role);
    return getClinicianParticipants(ctx.user.id);
  }),

  participantReadings: protectedProcedure
    .input(z.object({ participantUserId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      requireClinician(ctx.user.role);
      if (!(await hasClinicianHealthAccess(ctx.user.id, input.participantUserId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This participant has not authorized access to their results." });
      }
      const participant = await getUserById(input.participantUserId);
      if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participant not found." });
      const readings = await getUserReadings(input.participantUserId);
      return {
        participant: { id: participant.id, name: participant.name, phone: participant.phone },
        readings: readings.map(toEventHealthReading),
      };
    }),
});
