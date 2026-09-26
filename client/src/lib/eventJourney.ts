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
  lifestyleEnabled = true,
) {
  if (!hasSession) return 0;
  if (reportCompleted) return lifestyleEnabled ? 5 : 4;
  if (consultationCompleted) return lifestyleEnabled ? 4 : 3;
  if (hasCurrentSessionMeasurement) return lifestyleEnabled ? 3 : 2;
  if (!lifestyleEnabled) return 1;
  const hasLifestyle = Object.keys(answers ?? {}).length > 2;
  return hasLifestyle ? 2 : 1;
}
