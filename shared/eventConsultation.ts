export const EVENT_CONSULTATION_MODES = ["physician", "automatic"] as const;

export type EventConsultationMode = (typeof EVENT_CONSULTATION_MODES)[number];

export function isEventConsultationMode(value: unknown): value is EventConsultationMode {
  return typeof value === "string" && (EVENT_CONSULTATION_MODES as readonly string[]).includes(value);
}

export const EVENT_AUTOMATIC_RECOMMENDATION_MAX_ATTEMPTS = 2;
export const EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION = "events-lifestyle-v1";
