/** Immutable, questionnaire-independent archive contract. No clinical interpretation. */
export type ArchivedQuestion = {
  id: string;
  text: string;
  type: string;
  options?: { value: string; label: string }[];
  answer: string | number | string[] | null;
  min?: number;
  max?: number;
  unit?: string;
};
export type ArchivedQuestionnaire = {
  id: string;
  title: string;
  version: string;
  sections: {
    id: string;
    title: string;
    intro?: string;
    questions: ArchivedQuestion[];
  }[];
};
export type AssessmentCompanion = {
  version: 1;
  approvedAt: string;
  binding: {
    archiveId: string;
    revision: number;
    reportPdfSha256: string;
    snapshotSha256: string;
  };
  participant: {
    id?: string | null;
    code: string;
    name: string | null;
    mobile: string | null;
    age: number | null;
    sex: "male" | "female" | null;
    city: string | null;
  };
  questionnaires: ArchivedQuestionnaire[];
  nursing: {
    id: string;
    label: string;
    unit: string | null;
    value: string | number | null;
  }[];
};
export const COMPANION_PATH = "/api/integrations/lim/companions";
