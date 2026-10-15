import { lifestyleSectionsForAnswers } from "../../shared/eventLifestyle";
import { lifestyleReport } from "../../shared/eventLifestyleInsights";
import { X18MachinePayloadSchema } from "./x18Payload";
const identityKeys = new Set([
  "userID",
  "recordNo",
  "name",
  "sex",
  "age",
  "birthday",
  "address",
  "loginType",
  "measureTime",
]);
const metricKeys = new Set(
  Object.keys(X18MachinePayloadSchema.shape.datas.element.shape).filter(
    k => !identityKeys.has(k)
  )
);
/** Explicit projection: no bearer tokens, credential hashes or unrelated user records. */
export function researchRecord(
  row: any,
  readings: any[],
  options: { frozenLifestyleReport?: any; finalAdvice?: string | null; archiveId?: string | null; frozenMetadata?: any } = {}
) {
  const answers = row.answers ?? {};
  const questions = lifestyleSectionsForAnswers(answers).flatMap(section => section.questions);
  const byId = new Map(questions.map(question => [question.id, question]));
  const normalizedAnswers = Object.fromEntries(Object.entries(answers).flatMap(([key, value]) => {
    const question = byId.get(key);
    if (!question) return [];
    // Numeric values remain missing unless a finite non-empty vendor/UI value exists.
    if ((question.type === "number" || question.type === "slider") && typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? [[key, parsed]] : [];
    }
    return [[key, value]];
  }));
  const report = options.frozenLifestyleReport ?? lifestyleReport(normalizedAnswers as any);
  const complete = Boolean(report.complete);
  return {
    id: row.id,
    eventCode: row.eventCode,
    visitId: row.id,
    participantId: `P-${row.userId}`,
    age: row.age,
    sex: row.sex,
    city: row.city,
    trackId: row.trackId,
    createdAt: row.createdAt,
    questionnaireIds: row.questionnaireIds,
    questionnaireVersion: options.frozenMetadata?.questionnaireVersion ?? answers._questionnaireVersion ?? "legacy",
    scoringVersion: options.frozenMetadata?.scoringVersion ?? (options.frozenLifestyleReport ? "frozen-archive" : "current-unarchived"),
    templateVersion: options.frozenMetadata?.templateVersion ?? (options.frozenLifestyleReport ? "frozen-archive" : "current-unarchived"),
    reportRevision: options.frozenMetadata?.reportRevision ?? row.revision ?? null,
    scoreProvenance: options.frozenLifestyleReport ? "frozen-approved" : "current-unarchived",
    lifestyleScore: complete ? report.score?.overall ?? null : null,
    lifestyleDomains: complete ? report.score?.domains ?? {} : {},
    lifestyleBand: complete ? report.band?.label ?? null : null,
    archiveId: options.archiveId ?? null,
    finalAdvice: options.finalAdvice ?? null,
    answers: normalizedAnswers,
    testIds: row.testIds,
    measurements: row.measurements ?? {},
    nursingCompletedAt: row.nursingCompletedAt,
    approvedAt: row.approvedAt,
    consultationCompletedAt: row.consultationCompletedAt,
    reportCompletedAt: row.reportCompletedAt,
    readings: readings.map(r => ({
      source: r.source,
      recordedAt: r.recordedAt,
      weight: r.weight,
      height: r.height,
      bmi: r.bmi,
      sbp: r.sbp,
      dbp: r.dbp,
      hr: r.hr,
      temperature: r.temperature,
      machineMetrics: Object.fromEntries(
        Object.entries(r.machineMetrics ?? {}).filter(([k]) =>
          metricKeys.has(k)
        )
      ),
    })),
  };
}
