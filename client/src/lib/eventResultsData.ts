import type { DashboardReading } from "@/components/BodyCompositionReport";

export type EventResultField = readonly [
  key: string,
  label: string,
  unit: string,
];

export const eventResultCategories = {
  primary: [
    ["weight", "الوزن", "كجم"],
    ["bmi", "مؤشر كتلة الجسم", ""],
    ["fatRate", "نسبة الدهون", "%"],
    ["skeletalMuscle", "العضلات الهيكلية", "كجم"],
  ],
  indicators: [
    ["vfal", "الدهون الحشوية", "مستوى"],
    ["whr", "نسبة الخصر إلى الورك", ""],
    ["bodyAge", "العمر الجسدي التقديري", "سنة"],
  ],
  metabolism: [["bmr", "معدل الأيض الأساسي", "سعرة / يوم"]],
} as const satisfies Record<string, readonly EventResultField[]>;

export type EventMuscleBalance = {
  armsDifference: number | null;
  legsDifference: number | null;
  maximumDifference: number;
  isClose: boolean;
};

export function eventReadingValues(
  reading: DashboardReading
): Record<string, string> {
  const raw = reading.machineMetrics;
  const metrics =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? Object.entries(raw as Record<string, unknown>)
          .filter(
            ([, value]) => value !== null && value !== undefined && value !== ""
          )
          .reduce<Record<string, string>>((result, [key, value]) => {
            result[key] = String(value);
            return result;
          }, {})
      : {};

  for (const key of ["height", "weight", "bmi"] as const) {
    if (
      !metrics[key] &&
      reading[key] !== null &&
      reading[key] !== undefined &&
      reading[key] !== ""
    ) {
      metrics[key] = String(reading[key]);
    }
  }
  return metrics;
}

export function eventNumeric(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function eventFormattedValue(value: unknown, unit = ""): string {
  const numeric = eventNumeric(value);
  if (numeric === null) return "—";
  const formatted = numeric.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Native X18 values use `${key}_s` as the status code and `${key}_n` as the
 * device-provided reference range (for example, `56.2 - 75.9`).
 */
export function eventReferenceRange(
  values: Record<string, string>,
  key: string
): string | null {
  return values[`${key}_n`] || null;
}

/**
 * Adult screening fallback used only when the device does not return its own
 * weight reference. The range is calculated from BMI 18.5–24.9 and the
 * participant's measured height; it is deliberately not presented as a
 * diagnosis or a treatment target.
 */
export function eventAdultWeightRange(height: unknown): string | null {
  const heightCm = eventNumeric(height);
  if (heightCm === null || heightCm < 100 || heightCm > 250) return null;
  const heightM = heightCm / 100;
  const min = 18.5 * heightM * heightM;
  const max = 24.9 * heightM * heightM;
  return `${min.toFixed(1)} - ${max.toFixed(1)}`;
}

function pairedMuscleDifference(right: unknown, left: unknown): number | null {
  const rightValue = eventNumeric(right);
  const leftValue = eventNumeric(left);
  if (
    rightValue === null ||
    leftValue === null ||
    rightValue <= 0 ||
    leftValue <= 0
  )
    return null;
  return (
    Math.round(
      (Math.abs(rightValue - leftValue) / Math.max(rightValue, leftValue)) *
        1_000
    ) / 10
  );
}

/**
 * A transparent side-to-side screening indicator. It compares the segmental
 * muscle mass of each pair against the higher side and uses the largest
 * available difference. Ten percent is an interface review threshold, not a
 * clinical diagnosis.
 */
export function eventMuscleBalance(
  values: Record<string, string>
): EventMuscleBalance | null {
  const armsDifference = pairedMuscleDifference(
    values.muscleRightArm,
    values.muscleLeftArm
  );
  const legsDifference = pairedMuscleDifference(
    values.muscleRightLeg,
    values.muscleLeftLeg
  );
  const available = [armsDifference, legsDifference].filter(
    (value): value is number => value !== null
  );
  if (!available.length) return null;
  const maximumDifference = Math.max(...available);
  return {
    armsDifference,
    legsDifference,
    maximumDifference,
    isClose: maximumDifference <= 10,
  };
}
