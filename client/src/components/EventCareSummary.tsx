import { nursingCatalog } from "@shared/eventNursing";
import type { Measurements } from "@shared/eventCare";
export default function EventCareSummary({
  measurements,
  notes,
}: {
  measurements: Measurements;
  notes?: string | null;
}) {
  return (
    <div className="space-y-3">
      {Object.entries(measurements).map(([id, values]) => {
        const test = nursingCatalog.find(t => t.id === id);
        return (
          <div
            key={id}
            className="rounded-2xl border border-emerald-100 bg-white p-4"
          >
            <h3 className="font-bold">{test?.name ?? id}</h3>
            <dl className="mt-2 flex flex-wrap gap-4">
              {Object.entries(values)
                .filter(([, v]) => v !== "")
                .map(([key, value]) => {
                  const field = test?.fields.find(f => f.key === key);
                  return (
                    <div key={key}>
                      <dt className="text-xs text-slate-500">
                        {field?.label ?? key}
                      </dt>
                      <dd className="font-bold">
                        {value} <small>{field?.unit}</small>
                      </dd>
                    </div>
                  );
                })}
            </dl>
          </div>
        );
      })}
      {notes && (
        <p className="whitespace-pre-wrap rounded-2xl bg-emerald-50 p-4">
          {notes}
        </p>
      )}
    </div>
  );
}
