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
   * Search users by name or email.
   * Frontend: trpc.admin.searchUsers.useQuery({ query })
   */
  searchUsers: adminProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      if (!input.query.trim()) return [];
      return searchUsers(input.query);
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

  // ── Bookings (admin view) ─────────────────────────────────────────────────

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
   * Frontend: trpc.admin.updateUserRoleExtended.useMutation()
   */
  updateUserRoleExtended: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "expert", "admin"]) }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),
});
