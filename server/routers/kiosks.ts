/**
 * Kiosk tRPC router.
 *
 * All procedures here are public (no login required) so the map is
 * accessible to every visitor.  When you add an admin panel, use
 * `protectedProcedure` + role check to gate write operations.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getAllKiosks, getKioskById, searchKiosks } from "../db";

export const kiosksRouter = router({
  /**
   * Return all active kiosks.
   * Frontend calls: trpc.kiosks.list.useQuery()
   */
  list: publicProcedure.query(async () => {
    return getAllKiosks();
  }),

  /**
   * Return a single kiosk by ID.
   * Frontend calls: trpc.kiosks.byId.useQuery({ id })
   */
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const kiosk = await getKioskById(input.id);
      if (!kiosk) {
        throw new Error("Kiosk not found");
      }
      return kiosk;
    }),

  /**
   * Search kiosks by name, location, or address.
   * Frontend calls: trpc.kiosks.search.useQuery({ query })
   */
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      if (!input.query.trim()) {
        return getAllKiosks();
      }
      return searchKiosks(input.query);
    }),
});
