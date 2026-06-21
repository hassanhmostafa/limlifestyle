/**
 * Demo health readings seed data.
 *
 * Readings are spread over ~14 months so all time ranges (1W, 1M, 1Y, Max) show
 * meaningful data. Each reading reflects a gradual health improvement journey.
 *
 * Safe to run multiple times — duplicate inserts are silently ignored.
 * To disable: remove the seedHealthReadings call in server/_core/index.ts
 */

import { InsertHealthReading } from "../drizzle/schema";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

export const SEED_HEALTH_READINGS: InsertHealthReading[] = [
  // ── 14 months ago ──────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-001",
    bloodPressureSystolic: 148, bloodPressureDiastolic: 96,
    heartRate: 92, weight: "91.0", height: "175.0", bmi: "29.7",
    temperature: "37.1", notes: "Annual check-up", recordedAt: daysAgo(425),
  },
  // ── 12 months ago ──────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-002",
    bloodPressureSystolic: 145, bloodPressureDiastolic: 94,
    heartRate: 90, weight: "90.5", height: "175.0", bmi: "29.6",
    temperature: "37.0", notes: null, recordedAt: daysAgo(365),
  },
  // ── 11 months ago ──────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-003",
    bloodPressureSystolic: 143, bloodPressureDiastolic: 93,
    heartRate: 88, weight: "90.0", height: "175.0", bmi: "29.4",
    temperature: "36.9", notes: "Started diet plan", recordedAt: daysAgo(335),
  },
  // ── 10 months ago ──────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-001",
    bloodPressureSystolic: 140, bloodPressureDiastolic: 91,
    heartRate: 86, weight: "89.0", height: "175.0", bmi: "29.1",
    temperature: "36.9", notes: null, recordedAt: daysAgo(305),
  },
  // ── 9 months ago ───────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-004",
    bloodPressureSystolic: 138, bloodPressureDiastolic: 90,
    heartRate: 84, weight: "88.0", height: "175.0", bmi: "28.7",
    temperature: "36.8", notes: "Gym 3x/week", recordedAt: daysAgo(275),
  },
  // ── 8 months ago ───────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-002",
    bloodPressureSystolic: 136, bloodPressureDiastolic: 89,
    heartRate: 82, weight: "87.0", height: "175.0", bmi: "28.4",
    temperature: "36.8", notes: null, recordedAt: daysAgo(245),
  },
  // ── 7 months ago ───────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-005",
    bloodPressureSystolic: 133, bloodPressureDiastolic: 87,
    heartRate: 80, weight: "86.5", height: "175.0", bmi: "28.2",
    temperature: "36.7", notes: "Feeling stronger", recordedAt: daysAgo(215),
  },
  // ── 6 months ago ───────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-001",
    bloodPressureSystolic: 131, bloodPressureDiastolic: 86,
    heartRate: 78, weight: "86.0", height: "175.0", bmi: "28.1",
    temperature: "36.7", notes: null, recordedAt: daysAgo(182),
  },
  // ── 5 months ago ───────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-003",
    bloodPressureSystolic: 129, bloodPressureDiastolic: 85,
    heartRate: 76, weight: "85.5", height: "175.0", bmi: "27.9",
    temperature: "36.6", notes: "Ramadan fasting", recordedAt: daysAgo(152),
  },
  // ── 4 months ago ───────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-002",
    bloodPressureSystolic: 127, bloodPressureDiastolic: 84,
    heartRate: 75, weight: "85.0", height: "175.0", bmi: "27.8",
    temperature: "36.6", notes: null, recordedAt: daysAgo(122),
  },
  // ── 3 months ago ───────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-006",
    bloodPressureSystolic: 125, bloodPressureDiastolic: 83,
    heartRate: 74, weight: "84.5", height: "175.0", bmi: "27.6",
    temperature: "36.6", notes: "Consistent progress", recordedAt: daysAgo(91),
  },
  // ── 2 months ago ───────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-001",
    bloodPressureSystolic: 124, bloodPressureDiastolic: 82,
    heartRate: 73, weight: "84.0", height: "175.0", bmi: "27.4",
    temperature: "36.5", notes: null, recordedAt: daysAgo(61),
  },
  // ── 6 weeks ago ────────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-004",
    bloodPressureSystolic: 122, bloodPressureDiastolic: 81,
    heartRate: 72, weight: "83.5", height: "175.0", bmi: "27.3",
    temperature: "36.5", notes: null, recordedAt: daysAgo(42),
  },
  // ── 1 month ago ────────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-002",
    bloodPressureSystolic: 121, bloodPressureDiastolic: 80,
    heartRate: 71, weight: "83.0", height: "175.0", bmi: "27.1",
    temperature: "36.5", notes: "Felt a bit tired", recordedAt: daysAgo(30),
  },
  // ── 3 weeks ago ────────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-001",
    bloodPressureSystolic: 120, bloodPressureDiastolic: 79,
    heartRate: 70, weight: "82.5", height: "175.0", bmi: "26.9",
    temperature: "36.5", notes: null, recordedAt: daysAgo(21),
  },
  // ── 2 weeks ago ────────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-003",
    bloodPressureSystolic: 119, bloodPressureDiastolic: 78,
    heartRate: 69, weight: "82.2", height: "175.0", bmi: "26.8",
    temperature: "36.4", notes: null, recordedAt: daysAgo(14),
  },
  // ── 1 week ago ─────────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-005",
    bloodPressureSystolic: 118, bloodPressureDiastolic: 78,
    heartRate: 69, weight: "82.0", height: "175.0", bmi: "26.8",
    temperature: "36.4", notes: "Walking 5km daily", recordedAt: daysAgo(7),
  },
  // ── 4 days ago ─────────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-001",
    bloodPressureSystolic: 117, bloodPressureDiastolic: 77,
    heartRate: 68, weight: "81.8", height: "175.0", bmi: "26.7",
    temperature: "36.4", notes: null, recordedAt: daysAgo(4),
  },
  // ── 2 days ago ─────────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-002",
    bloodPressureSystolic: 116, bloodPressureDiastolic: 77,
    heartRate: 68, weight: "81.5", height: "175.0", bmi: "26.6",
    temperature: "36.4", notes: null, recordedAt: daysAgo(2),
  },
  // ── Today ──────────────────────────────────────────────────────────────────
  {
    userId: 1, kioskId: "kiosk-005",
    bloodPressureSystolic: 115, bloodPressureDiastolic: 76,
    heartRate: 67, weight: "81.2", height: "175.0", bmi: "26.5",
    temperature: "36.3", notes: "Great progress this year!", recordedAt: daysAgo(0),
  },
];
