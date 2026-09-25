import type { DashboardReading } from "@/components/BodyCompositionReport";

export type EventResultField = readonly [key: string, label: string, unit: string];

export const eventResultCategories = {
  primary: [
    ["weight", "الوزن", "كجم"],
    ["height", "الطول", "سم"],
    ["bmi", "مؤشر كتلة الجسم", ""],
    ["fatRate", "نسبة الدهون", "%"],
  ],
  composition: [
    ["muscle", "كتلة العضلات", "كجم"],
    ["skeletalMuscle", "العضلات الهيكلية", "كجم"],
    ["waterRate", "ماء الجسم", "%"],
    ["fat", "كتلة الدهون", "كجم"],
  ],
  quick: [
    ["vfal", "الدهون الحشوية", "مستوى"],
    ["bone", "كتلة العظام", "كجم"],
    ["fatFree", "الكتلة الخالية من الدهون", "كجم"],
    ["protein", "كتلة البروتين", "كجم"],
    ["waterICW", "الماء داخل الخلايا", "كجم"],
    ["waterECW", "الماء خارج الخلايا", "كجم"],
  ],
  details: [
    ["mineral", "الأملاح المعدنية", "كجم"],
    ["whr", "نسبة الخصر إلى الورك", ""],
    ["bodyAge", "العمر الجسدي التقديري", "سنة"],
    ["obesity", "مؤشر السمنة", "%"],
    ["idealWeight", "الوزن المثالي", "كجم"],
    ["dci", "الاحتياج اليومي للطاقة", "سعرة"],
    ["fatSubCutRate", "الدهون تحت الجلد", "%"],
  ],
  vitals: [
    ["sbp", "الضغط الانقباضي", "mmHg"],
    ["dbp", "الضغط الانبساطي", "mmHg"],
    ["hr", "نبض القلب", "نبضة / دقيقة"],
  ],
} as const satisfies Record<string, readonly EventResultField[]>;

export function eventReadingValues(reading: DashboardReading): Record<string, string> {
  const raw = reading.machineMetrics;
  const metrics = raw && typeof raw === "object" && !Array.isArray(raw)
    ? Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .reduce<Record<string, string>>((result, [key, value]) => {
        result[key] = String(value);
        return result;
      }, {})
    : {};

  for (const key of ["height", "weight", "bmi"] as const) {
    if (!metrics[key] && reading[key] !== null && reading[key] !== undefined && reading[key] !== "") {
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
  const formatted = numeric.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Native X18 values use `${key}_s` as the status code and `${key}_n` as the
 * device-provided reference range (for example, `56.2 - 75.9`).
 */
export function eventReferenceRange(values: Record<string, string>, key: string): string | null {
  return values[`${key}_n`] || null;
}
