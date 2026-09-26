import { nursingCatalog } from "./eventNursing";
export type Measurements = Record<string, Record<string, string>>;
export function validateMeasurements(
  testIds: string[],
  measurements: Measurements,
  finalize: boolean
): string | null {
  for (const id of Object.keys(measurements))
    if (!testIds.includes(id)) return "فحص غير مفعّل لهذه الزيارة";
  for (const id of testIds) {
    const test = nursingCatalog.find(t => t.id === id);
    if (!test) return "نوع الفحص غير معروف";
    const values = measurements[id] ?? {};
    if (Object.keys(values).some(key => !test.fields.some(f => f.key === key)))
      return "خانة غير معروفة";
    for (const field of test.fields) {
      const value = values[field.key]?.trim();
      const optional = field.key === "trial_2" || field.key === "trial_3";
      if (!value) {
        if (finalize && !optional) return `أكمل ${test.name}: ${field.label}`;
        continue;
      }
      if (field.options && !field.options.includes(value))
        return `اختيار غير صالح: ${field.label}`;
      if (field.unit && (!Number.isFinite(Number(value)) || Number(value) < 0))
        return `أدخل رقمًا صالحًا: ${test.name}`;
    }
  }
  return null;
}
