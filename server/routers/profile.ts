import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserById, getUserByPhone, updateUserProfile } from "../db";
import { normalizeSaudiMobilePhone } from "../lib/phone";

export const profileRouter = router({
  /**
   * Get the current user's full profile including gender and birthDate.
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    if (!user) throw new Error("User not found");
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      gender: user.gender ?? null,
      birthDate: user.birthDate ?? null,
    };
  }),

  /**
   * Update the current user's profile (name, gender, birthDate).
   */
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        phone: z.string().min(1).optional(),
        gender: z.enum(["male", "female"]).nullable().optional(),
        birthDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let phone = input.phone;
      if (phone !== undefined) {
        const normalized = normalizeSaudiMobilePhone(phone);
        if (!normalized.ok) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid Saudi mobile number, for example 05XXXXXXXX." });
        }
        phone = normalized.e164;
        const existing = await getUserByPhone(phone);
        if (existing && existing.id !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "This phone number is already linked to another account." });
        }
      }

      const updated = await updateUserProfile(ctx.user.id, { ...input, phone });
      if (!updated) throw new Error("Failed to update profile");
      return {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        gender: updated.gender ?? null,
        birthDate: updated.birthDate ?? null,
      };
    }),
});
