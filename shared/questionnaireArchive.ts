import {
  lifestyleSectionsForAnswers,
  type EventAnswers,
  type EventSection,
} from "./eventLifestyle";
import type { ArchivedQuestionnaire } from "./assessmentCompanion";

/** Reuse for any newly implemented questionnaire: freeze wording, options AND answers. */
export function freezeQuestionnaire(input: {
  id: string;
  title: string;
  version: string;
  sections: EventSection[];
  answers: EventAnswers;
}): ArchivedQuestionnaire {
  return {
    id: input.id,
    title: input.title,
    version: input.version,
    sections: input.sections.map(s => ({
      id: s.id,
      title: s.title,
      intro: s.intro,
      questions: s.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        ...(q.options ? { options: q.options.map(o => ({ ...o })) } : {}),
        ...(q.min === undefined ? {} : { min: q.min }),
        ...(q.max === undefined ? {} : { max: q.max }),
        ...(q.suffix ? { unit: q.suffix } : {}),
        answer: Object.hasOwn(input.answers, q.id)
          ? structuredClone(input.answers[q.id])
          : null,
      })),
    })),
  };
}
export function archivedQuestionnaires(ids: string[], answers: EventAnswers) {
  // Implemented questionnaires register their own definition/resolver here;
  // the archive, transport and Research display require no per-questionnaire changes.
  const registry: Record<string, () => ArchivedQuestionnaire> = {
    lifestyle: () =>
      freezeQuestionnaire({
        id: "lifestyle",
        title: "استبيان نمط الحياة",
        version: String(answers._questionnaireVersion ?? "legacy"),
        sections: lifestyleSectionsForAnswers(answers),
        answers,
      }),
  };
  return ids.map(id => {
    if (!registry[id])
      throw new Error("QUESTIONNAIRE_ARCHIVE_DEFINITION_REQUIRED");
    return registry[id]();
  });
}
