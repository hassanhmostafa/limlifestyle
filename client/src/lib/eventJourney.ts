import type { EventAnswers } from "./eventLifestyle";

/**
 * Registration is step 1 and a saved lifestyle questionnaire is step 2.
 * Body analysis is complete only once the X18 upload is explicitly associated
 * with this exact event session. Consultation completion is doctor-authorized; the final milestone records
 * that the participant has read the approved report.
 */
export function completedEventJourneySteps(
  hasSession: boolean,
  answers: EventAnswers | undefined,
  hasCurrentSessionMeasurement: boolean,
  consultationCompleted = false,
  reportCompleted = false,
) {
  if (!hasSession) return 0;
  if (reportCompleted) return 5;
  if (consultationCompleted) return 4;
  if (hasCurrentSessionMeasurement) return 3;
  const hasLifestyle = Object.keys(answers ?? {}).length > 2;
  return hasLifestyle ? 2 : 1;
}
