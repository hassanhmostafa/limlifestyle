/**
 * Kiosk type definitions and utilities for the frontend.
 *
 * Data is no longer stored here — it is fetched from the backend API via tRPC.
 * The JEDDAH_KIOSKS array has been moved to server/seed.ts and is seeded into
 * the database on server startup.
 *
 * To switch from test data to real data:
 *   - Update or replace the rows in the `kiosks` database table.
 *   - No frontend code changes are needed.
 */

/** Shape returned by the tRPC kiosks.list / kiosks.byId / kiosks.search endpoints. */
export interface Kiosk {
  id: string;
  name: string;
  location: string;
  address: string;
  latitude: string;   // Decimal stored as string by MySQL
  longitude: string;  // Decimal stored as string by MySQL
  phone: string | null;
  email: string | null;
  image: string | null;
  rating: string | null;
  isActive: "true" | "false";
  hours: { day: string; open: string; close: string }[] | null;
  services: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  // Computed on the frontend after fetching
  distance?: number;
}

/**
 * Haversine formula — returns distance in kilometres between two coordinates.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
