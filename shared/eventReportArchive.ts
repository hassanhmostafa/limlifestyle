/** Version identifiers describe the logic used at issuance, not today's date. */
export const EVENT_REPORT_TEMPLATE_VERSION = "lim-a4-2026-10-21-phone";
export const EVENT_REPORT_SCORING_VERSION = "lifestyle-score-2026-10-09";

export type EventReportMetadata = {
  participantId: string;
  visitId: number;
  visitDate: string;
  reportRevision: number;
  questionnaireVersion: string;
  scoringVersion: string;
  templateVersion: string;
};
export type EventReportProvenance = {
  generatedAt: string;
  templateVersion: string;
  reportRevision: number;
};

function identifier(value: string | number, prefix: "P" | "V") {
  const raw = String(value).replace(new RegExp(`^${prefix}-?`, "i"), "");
  if (/^\d+$/.test(raw)) return prefix + raw.padStart(5, "0");
  return (
    prefix + (raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "unknown")
  );
}

/** Visit calendar dates use the same Saudi timezone as the event operation. */
export function eventReportDate(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "undated";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function eventReportFilename(
  metadata: EventReportMetadata,
  regenerated = false
) {
  const revision = Math.max(1, Math.trunc(metadata.reportRevision) || 1);
  return `LIM-${identifier(metadata.participantId, "P")}-${identifier(metadata.visitId, "V")}-${eventReportDate(metadata.visitDate)}-r${revision}${regenerated ? "-regenerated" : ""}.pdf`;
}
