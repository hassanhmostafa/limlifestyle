/**
 * Demo health readings seed data. Variable names match the X18_5 machine JSON:
 * `sbp` (systolic), `dbp` (diastolic), and `hr` (heart rate).
 */
import { InsertHealthReading } from "../drizzle/schema";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

const timeline: Array<[number, number, number, number, number, string | null]> = [
  [425, 148, 96, 92, 91.0, "Annual check-up"],
  [365, 145, 94, 90, 90.5, null],
  [335, 143, 93, 88, 90.0, "Started diet plan"],
  [305, 140, 91, 86, 89.0, null],
  [275, 138, 90, 84, 88.0, "Gym 3x/week"],
  [245, 136, 89, 82, 87.0, null],
  [215, 133, 87, 80, 86.5, "Feeling stronger"],
  [182, 131, 86, 78, 86.0, null],
  [152, 129, 85, 76, 85.5, "Ramadan fasting"],
  [122, 127, 84, 75, 85.0, null],
  [91, 125, 83, 74, 84.5, "Consistent progress"],
  [61, 124, 82, 73, 84.0, null],
  [42, 122, 81, 72, 83.5, null],
  [30, 121, 80, 71, 83.0, "Felt a bit tired"],
  [21, 120, 79, 70, 82.5, null],
  [14, 119, 78, 69, 82.2, null],
  [7, 118, 78, 69, 82.0, "Walking 5km daily"],
  [4, 117, 77, 68, 81.8, null],
  [2, 116, 77, 68, 81.5, null],
  [0, 115, 76, 67, 81.2, "Great progress this year!"],
];

export const SEED_HEALTH_READINGS: InsertHealthReading[] = timeline.map(
  ([days, sbp, dbp, hr, weight, notes], index) => {
    const bmi = (weight / Math.pow(1.75, 2)).toFixed(1);
    return {
      userId: 1,
      kioskId: `kiosk-${String((index % 6) + 1).padStart(3, "0")}`,
      sbp,
      dbp,
      hr,
      weight: weight.toFixed(1),
      height: "175.0",
      bmi,
      temperature: (37.1 - index * 0.04).toFixed(1),
      notes,
      recordedAt: daysAgo(days),
    };
  }
);
