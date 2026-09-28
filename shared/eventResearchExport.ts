import { csvCell } from "./eventReport";
/** Nested raw fields become independent CSV columns; JSON export keeps the full tree. */
export function flattenResearchRecord(
  row: Record<string, unknown>,
  prefix = ""
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value instanceof Date) output[path] = value.toISOString();
    else if (value && typeof value === "object" && !Array.isArray(value))
      Object.assign(
        output,
        flattenResearchRecord(value as Record<string, unknown>, path)
      );
    else output[path] = value;
  }
  return output;
}
export function researchCsv(records: Record<string, unknown>[]) {
  const rows = records.map(r => flattenResearchRecord(r));
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  return (
    "\uFEFF" +
    [
      keys.map(csvCell).join(","),
      ...rows.map(r => keys.map(k => csvCell(r[k])).join(",")),
    ].join("\r\n")
  );
}
