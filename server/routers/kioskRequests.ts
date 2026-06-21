/**
 * Kiosk Requests tRPC router.
 * Authenticated users can submit requests to create or delete kiosks.
 * Admins review requests via the admin router.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createKioskRequest, getUserKioskRequests } from "../db";

export const kioskRequestsRouter = router({
  /**
   * Submit a request to create a new kiosk.
   * Frontend: trpc.kioskRequests.requestCreate.useMutation()
   */
  requestCreate: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      location: z.string().min(1),
      address: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { message, ...kioskDetails } = input;
      return createKioskRequest({
        userId: ctx.user.id,
        type: "create",
        status: "pending",
        payload: kioskDetails as Record<string, unknown>,
        message: message ?? null,
      });
    }),

  /**
   * Submit a request to delete an existing kiosk.
   * Frontend: trpc.kioskRequests.requestDelete.useMutation()
   */
  requestDelete: protectedProcedure
    .input(z.object({
      kioskId: z.string(),
      kioskName: z.string(),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createKioskRequest({
        userId: ctx.user.id,
        type: "delete",
        status: "pending",
        payload: { kioskId: input.kioskId, kioskName: input.kioskName } as Record<string, unknown>,
        message: input.message ?? null,
      });
    }),

  /**
   * Get all requests submitted by the current user.
   * Frontend: trpc.kioskRequests.myRequests.useQuery()
   */
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return getUserKioskRequests(ctx.user.id);
  }),
});
