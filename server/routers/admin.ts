/**
 * Admin tRPC router.
 * All procedures require the caller to be authenticated AND have role = "admin".
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, superAdminProcedure as superAdmin } from "../_core/trpc";
import {
  getAllKiosksAdmin,
  createKiosk,
  updateKiosk,
  deleteKiosk,
  getAllUsers,
  searchUsers,
  updateUserRole,
  getAllKioskRequests,
  countPendingKioskRequests,
  updateKioskRequestStatus,
  getKioskBookings,
  updateBookingStatus,
  promoteToAdmin,
  listExperts,
  getDb,
} from "../db";
import { nanoid } from "nanoid";

// Middleware that enforces admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const kioskInputSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  address: z.string().min(1),
  latitude: z.string(),
  longitude: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
  rating: z.string().optional(),
  isActive: z.enum(["true", "false"]).default("true"),
  hours: z
    .array(z.object({ day: z.string(), open: z.string(), close: z.string() }))
    .optional(),
  services: z.array(z.string()).optional(),
});

export const adminRouter = router({
  /**
   * List ALL kiosks including inactive ones.
   * Frontend: trpc.admin.listKiosks.useQuery()
   */
  listKiosks: adminProcedure.query(async () => {
    return getAllKiosksAdmin();
  }),

  /**
   * Create a new kiosk.
   * Frontend: trpc.admin.createKiosk.useMutation()
   */
  createKiosk: adminProcedure.input(kioskInputSchema).mutation(async ({ input }) => {
    const id = `kiosk-${nanoid(8)}`;
    return createKiosk({ ...input, id });
  }),

  /**
   * Update an existing kiosk.
   * Frontend: trpc.admin.updateKiosk.useMutation()
   */
  updateKiosk: adminProcedure
    .input(z.object({ id: z.string(), data: kioskInputSchema.partial() }))
    .mutation(async ({ input }) => {
      return updateKiosk(input.id, input.data);
    }),

  /**
   * Toggle a kiosk active/inactive (soft delete).
   * Frontend: trpc.admin.toggleKiosk.useMutation()
   */
  toggleKiosk: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.enum(["true", "false"]) }))
    .mutation(async ({ input }) => {
      return updateKiosk(input.id, { isActive: input.isActive });
    }),

  /**
   * Permanently delete a kiosk by ID.
   * Frontend: trpc.admin.deleteKiosk.useMutation()
   */
  deleteKiosk: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteKiosk(input.id);
      return { success: true };
    }),

  /**
   * List all registered users (for management).
   * Frontend: trpc.admin.listUsers.useQuery()
   */
  listUsers: adminProcedure.query(async () => {
    return getAllUsers();
  }),

  /**
   * Search users by name or email (for owner assignment combobox).
   * Frontend: trpc.admin.searchUsers.useQuery({ query })
   */
  searchUsers: adminProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      if (!input.query.trim()) return [];
      return searchUsers(input.query);
    }),

  /**
   * Assign a kiosk owner: sets kiosk.ownerId and promotes user to kiosk_owner role.
   * Pass ownerId = null to unassign.
   * Frontend: trpc.admin.assignKioskOwner.useMutation()
   */
  assignKioskOwner: adminProcedure
    .input(z.object({ kioskId: z.string(), ownerId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      await updateKiosk(input.kioskId, { ownerId: input.ownerId ?? undefined });
      if (input.ownerId !== null) {
        // kiosk_owner role removed
      }
      return { success: true };
    }),

  /**
   * Update a user's role directly.
   * Frontend: trpc.admin.updateUserRole.useMutation()
   */
  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "expert", "admin"]) }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // ── Kiosk Requests ────────────────────────────────────────────────────────

  /**
   * List all kiosk requests (pending, approved, rejected).
   * Frontend: trpc.admin.listKioskRequests.useQuery()
   */
  listKioskRequests: adminProcedure.query(async () => {
    return getAllKioskRequests();
  }),

  /**
   * Count pending kiosk requests (for nav badge).
   * Frontend: trpc.admin.pendingRequestCount.useQuery()
   */
  pendingRequestCount: adminProcedure.query(async () => {
    return countPendingKioskRequests();
  }),

  /**
   * Approve a kiosk request. For 'create' requests, also creates the kiosk.
   * Frontend: trpc.admin.approveKioskRequest.useMutation()
   */
  approveKioskRequest: adminProcedure
    .input(z.object({ requestId: z.number(), adminNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const requests = await getAllKioskRequests();
      const req = requests.find(r => r.id === input.requestId);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });

      // For create requests, auto-create the kiosk from the payload
      // and assign the requester as the owner, promoting them to kiosk_owner role
      if (req.type === "create") {
        const payload = req.payload as Record<string, unknown>;
        const id = `kiosk-${nanoid(8)}`;
        await createKiosk({
          id,
          name: String(payload.name ?? "New Kiosk"),
          location: String(payload.location ?? ""),
          address: String(payload.address ?? ""),
          latitude: String(payload.latitude ?? "21.4858"),
          longitude: String(payload.longitude ?? "39.1925"),
          phone: payload.phone ? String(payload.phone) : undefined,
          email: payload.email ? String(payload.email) : undefined,
          hours: (payload.hours as { day: string; open: string; close: string }[]) ?? [],
          services: (payload.services as string[]) ?? [],
          isActive: "true",
          ownerId: req.userId,  // requester becomes the owner
        });
        // Promote requester to kiosk_owner role if they are a plain user
        // kiosk_owner role removed
      } else if (req.type === "delete") {
        const payload = req.payload as Record<string, unknown>;
        if (payload.kioskId) {
          await deleteKiosk(String(payload.kioskId));
        }
      }

      await updateKioskRequestStatus(input.requestId, "approved", ctx.user.id, input.adminNote);
      return { success: true };
    }),

  /**
   * Reject a kiosk request.
   * Frontend: trpc.admin.rejectKioskRequest.useMutation()
   */
  rejectKioskRequest: adminProcedure
    .input(z.object({ requestId: z.number(), adminNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const requests = await getAllKioskRequests();
      const req = requests.find(r => r.id === input.requestId);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
      await updateKioskRequestStatus(input.requestId, "rejected", ctx.user.id, input.adminNote);
      return { success: true };
    }),

  // ── Bookings (admin/owner view) ───────────────────────────────────────────

  /**
   * Get all bookings for a specific kiosk.
   * Frontend: trpc.admin.getKioskBookings.useQuery({ kioskId })
   */
  getKioskBookings: adminProcedure
    .input(z.object({ kioskId: z.string() }))
    .query(async ({ input }) => {
      return getKioskBookings(input.kioskId);
    }),

  /**
   * Update a booking status (admin can mark complete or cancel).
   * Frontend: trpc.admin.updateBookingStatus.useMutation()
   */
  updateBookingStatus: adminProcedure
    .input(z.object({ bookingId: z.number(), status: z.enum(["confirmed", "cancelled", "completed"]) }))
    .mutation(async ({ input }) => {
      await updateBookingStatus(input.bookingId, input.status);
      return { success: true };
    }),

  // ── Admin Management (super admin only) ──────────────────────────────────
  /**
   * Promote a user to admin with a specific adminType.
   * Only super admins can do this.
   * Frontend: trpc.admin.promoteToAdmin.useMutation()
   */
  promoteToAdmin: superAdmin
    .input(z.object({
      userId: z.number(),
      adminType: z.enum(["kiosk", "expert", "super"]),
    }))
    .mutation(async ({ input }) => {
      await promoteToAdmin(input.userId, input.adminType);
      return { success: true };
    }),

  /**
   * Update the adminType of an existing admin user.
   * Only super admins can call this.
   * Frontend: trpc.admin.updateAdminType.useMutation()
   */
  updateAdminType: superAdmin
    .input(z.object({
      userId: z.number(),
      adminType: z.enum(["kiosk", "expert", "super"]),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await database
        .update(users)
        .set({ adminType: input.adminType, updatedAt: new Date() })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  /**
   * List all approved experts.
   * Frontend: trpc.admin.listExperts.useQuery()
   */
  listExperts: adminProcedure.query(async () => {
    return listExperts();
  }),

  /**
   * Update a user's role (extended to include expert).
   * Overrides the existing updateUserRole to support expert role.
   * Frontend: trpc.admin.updateUserRoleExtended.useMutation()
   */
  updateUserRoleExtended: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "expert", "admin"]) }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),
});
