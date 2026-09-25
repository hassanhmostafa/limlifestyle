import type { EventAnswers } from "./eventLifestyle";

/**
 * Registration is step 1 and a saved lifestyle questionnaire is step 2.
 * Body analysis is complete only once the X18 upload is explicitly associated
 * with this exact event session. Consultation and the final report are
 * participant actions after the measurement, not automatically completed by
 * the device upload.
 */
export function completedEventJourneySteps(
  hasSession: boolean,
  answers: EventAnswers | undefined,
  hasCurrentSessionMeasurement: boolean,
) {
  if (!hasSession) return 0;
  if (hasCurrentSessionMeasurement) return 3;
  const hasLifestyle = Object.keys(answers ?? {}).length > 2;
  return hasLifestyle ? 2 : 1;
}
