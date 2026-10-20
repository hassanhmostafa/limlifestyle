import { nursingCatalog } from "./eventNursing";
import type { AssessmentCompanion } from "./assessmentCompanion";
/** Freeze units and labels at approval rather than assigning today's definitions on retry. */
export function archivedNursingMeasurements(
  measurements: Record<string, Record<string, string>>
): AssessmentCompanion["nursing"] {
  const definitions = new Map(nursingCatalog.map(t => [t.id, t]));
  return Object.entries(measurements).flatMap(([testId, values]) =>
    Object.entries(values).map(([key, value]) => {
      const test = definitions.get(testId),
        field = test?.fields.find(f => f.key === key);
      return {
        id: `nurse_${testId}_${key}`,
        label: `${test?.name ?? testId} — ${field?.label ?? key}`,
        unit: field?.unit ?? null,
        value:
          value.trim() === ""
            ? null
            : field?.unit && Number.isFinite(Number(value))
              ? Number(value)
              : value,
      };
    })
  );
}
