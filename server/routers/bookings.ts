/**
 * Bookings tRPC router.
 * Users can book, view, and cancel their kiosk visit appointments.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createBooking, getUserBookings, cancelBooking, getBookedSlots, getKioskById } from "../db";

export const bookingsRouter = router({
  /**
   * Get available (not yet booked) time slots for a kiosk on a given date.
   * Generates slots from the kiosk's operating hours for that day.
   * Frontend: trpc.bookings.availableSlots.useQuery({ kioskId, visitDate })
   */
  availableSlots: protectedProcedure
    .input(z.object({ kioskId: z.string(), visitDate: z.string() }))
    .query(async ({ input }) => {
      const kiosk = await getKioskById(input.kioskId);
      if (!kiosk) throw new TRPCError({ code: "NOT_FOUND", message: "Kiosk not found" });

      // Determine the day of week from visitDate (YYYY-MM-DD)
      const date = new Date(input.visitDate + "T00:00:00");
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[date.getDay()];

      // Find operating hours for that day
      const hours = (kiosk.hours ?? []) as { day: string; open: string; close: string }[];
      const dayHours = hours.find(h => h.day === dayName);

      if (!dayHours) {
        return { slots: [], closed: true };
      }

      // Generate 30-minute slots between open and close
      const slots = generateTimeSlots(dayHours.open, dayHours.close);

      // Remove already booked slots
      const booked = await getBookedSlots(input.kioskId, input.visitDate);
      const available = slots.filter(s => !booked.includes(s));

      return { slots: available, closed: false };
    }),

  /**
   * Book a time slot at a kiosk.
   * Frontend: trpc.bookings.book.useMutation()
   */
  book: protectedProcedure
    .input(z.object({
      kioskId: z.string(),
      visitDate: z.string(),
      timeSlot: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check slot is still available
      const booked = await getBookedSlots(input.kioskId, input.visitDate);
      if (booked.includes(input.timeSlot)) {
        throw new TRPCError({ code: "CONFLICT", message: "This time slot is no longer available. Please choose another." });
      }

      return createBooking({
        userId: ctx.user.id,
        kioskId: input.kioskId,
        visitDate: input.visitDate,
        timeSlot: input.timeSlot,
        notes: input.notes,
        status: "confirmed",
      });
    }),

  /**
   * Get all bookings for the current user.
   * Frontend: trpc.bookings.myBookings.useQuery()
   */
  myBookings: protectedProcedure.query(async ({ ctx }) => {
    return getUserBookings(ctx.user.id);
  }),

  /**
   * Cancel a booking.
   * Frontend: trpc.bookings.cancel.useMutation()
   */
  cancel: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await cancelBooking(input.bookingId, ctx.user.id);
      return { success: true };
    }),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a 12-hour time string like "10:00 AM" or "9:30 PM" into total minutes since midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  // Handle "H:MM AM/PM"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "AM" && h === 12) h = 0;
    if (period === "PM" && h !== 12) h += 12;
    return h * 60 + m;
  }
  // Handle "HH:MM" 24-hour fallback
  const h24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    return parseInt(h24[1], 10) * 60 + parseInt(h24[2], 10);
  }
  return 0;
}

/**
 * Format total minutes since midnight as "H:MM AM/PM".
 */
function minutesToTimeStr(minutes: number): string {
  let h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Generate 30-minute time slots between open and close times.
 */
function generateTimeSlots(open: string, close: string): string[] {
  const startMin = parseTimeToMinutes(open);
  const endMin = parseTimeToMinutes(close);
  const slots: string[] = [];
  for (let t = startMin; t < endMin; t += 30) {
    slots.push(minutesToTimeStr(t));
  }
  return slots;
}
