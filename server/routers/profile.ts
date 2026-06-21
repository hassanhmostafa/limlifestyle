import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserById, updateUserProfile } from "../db";

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
        gender: z.enum(["male", "female"]).nullable().optional(),
        birthDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await updateUserProfile(ctx.user.id, input);
      if (!updated) throw new Error("Failed to update profile");
      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        gender: updated.gender ?? null,
        birthDate: updated.birthDate ?? null,
      };
    }),
});
