/**
 * Expert Requests tRPC router.
 * Users can apply to become health experts on the platform.
 * Expert admins and super admins review and approve/reject applications.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, expertAdminProcedure, router } from "../_core/trpc";
import {
  createExpertRequest,
  getUserExpertRequest,
  listExpertRequests,
  updateExpertRequest,
  getDb as getDatabase,
} from "../db";

export const expertRequestsRouter = router({
  /**
   * Submit a new expert registration request.
   * Any authenticated user can apply (unless they already have a pending/approved request).
   * Frontend: trpc.expertRequests.submit.useMutation()
   */
  submit: protectedProcedure
    .input(z.object({
      specialty: z.string().min(2).max(128),
      credentials: z.string().min(5).max(512),
      bio: z.string().min(10).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check for existing pending or approved request
      const existing = await getUserExpertRequest(ctx.user.id);
      if (existing && (existing.status === "pending" || existing.status === "approved")) {
        throw new TRPCError({
          code: "CONFLICT",
          message: existing.status === "approved"
            ? "You are already registered as an expert."
            : "You already have a pending expert registration request.",
        });
      }

      await createExpertRequest({
        userId: ctx.user.id,
        specialty: input.specialty,
        credentials: input.credentials,
        bio: input.bio,
        status: "pending",
      });

      return { success: true };
    }),

  /**
   * Get the current user's most recent expert request.
   * Frontend: trpc.expertRequests.myRequest.useQuery()
   */
  myRequest: protectedProcedure.query(async ({ ctx }) => {
    return getUserExpertRequest(ctx.user.id);
  }),

  /**
   * List all expert requests (expert admin + super admin only).
   * Frontend: trpc.expertRequests.list.useQuery()
   */
  list: expertAdminProcedure.query(async () => {
    return listExpertRequests();
  }),

  /**
   * Approve an expert request — promotes user to expert role.
   * Frontend: trpc.expertRequests.approve.useMutation()
   */
  approve: expertAdminProcedure
    .input(z.object({
      requestId: z.number(),
      adminNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const requests = await listExpertRequests();
      const req = requests.find(r => r.id === input.requestId);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (req.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Request is no longer pending" });
      }

      // Mark request as approved
      await updateExpertRequest(input.requestId, "approved", input.adminNote, ctx.user.id);

      // Promote user to expert role and update specialty/bio
      const database = await getDatabase();
      if (database) {
        const { users } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await database
          .update(users)
          .set({ role: "expert", specialty: req.specialty, bio: req.bio, updatedAt: new Date() })
          .where(eq(users.id, req.userId));
      }

      return { success: true };
    }),

  /**
   * Reject an expert request.
   * Frontend: trpc.expertRequests.reject.useMutation()
   */
  reject: expertAdminProcedure
    .input(z.object({
      requestId: z.number(),
      adminNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const requests = await listExpertRequests();
      const req = requests.find(r => r.id === input.requestId);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (req.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Request is no longer pending" });
      }

      await updateExpertRequest(input.requestId, "rejected", input.adminNote, ctx.user.id);
      return { success: true };
    }),
});
