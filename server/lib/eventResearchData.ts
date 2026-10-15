import { eventLifestyleSections, lifestyleSectionsForAnswers, type EventAnswers } from "../../shared/eventLifestyle";
import { lifestyleReport } from "../../shared/eventLifestyleInsights";
import { nursingCatalog } from "../../shared/eventNursing";
import { X18MachinePayloadSchema } from "./x18Payload";

const identityKeys = new Set([
  "userID", "recordNo", "name", "sex", "age", "birthday", "address", "loginType", "measureTime",
]);
const metricKeys = new Set(
  Object.keys(X18MachinePayloadSchema.shape.datas.element.shape).filter(key => !identityKeys.has(key))
);
const numericNursingFields = new Set(
  nursingCatalog.flatMap(test => test.fields.filter(field => Boolean(field.unit)).map(field => `${test.id}.${field.key}`))
);

/** Finite numbers and non-empty numeric strings are values; every other value stays missing. */
export function finiteResearchNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizedAnswers(answers: Record<string, unknown>) {
  const questions = lifestyleSectionsForAnswers(answers as EventAnswers).flatMap(section => section.questions);
  const byId = new Map(questions.map(question => [question.id, question]));
  return Object.fromEntries(Object.entries(answers).flatMap(([key, value]) => {
    const question = byId.get(key);
    if (!question) return [];
    if (question.type === "number" || question.type === "slider") {
      const numeric = finiteResearchNumber(value);
      return numeric === undefined ? [] : [[key, numeric]];
    }
    // Choices are already allowlisted by the shared questionnaire declaration.
    return [[key, value]];
  }));
}

function normalizedMeasurements(measurements: unknown) {
  if (!measurements || typeof measurements !== "object" || Array.isArray(measurements)) return {};
  return Object.fromEntries(Object.entries(measurements as Record<string, unknown>).flatMap(([testId, fields]) => {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) return [];
    const allowed = Object.fromEntries(Object.entries(fields as Record<string, unknown>).flatMap(([key, value]) => {
      if (key === "notes" || key === "device" || key === "result") return [];
      if (numericNursingFields.has(`${testId}.${key}`)) {
        const numeric = finiteResearchNumber(value);
        return numeric === undefined ? [] : [[key, numeric]];
      }
      const declared = nursingCatalog.find(test => test.id === testId)?.fields.find(field => field.key === key);
      return declared?.options?.includes(String(value)) ? [[key, value]] : [];
    }));
    return Object.keys(allowed).length ? [[testId, allowed]] : [];
  }));
}

function normalizedMachineMetrics(metrics: unknown) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return {};
  return Object.fromEntries(Object.entries(metrics as Record<string, unknown>).flatMap(([key, value]) => {
    if (!metricKeys.has(key)) return [];
    const numeric = finiteResearchNumber(value);
    return numeric === undefined ? [] : [[key, numeric]];
  }));
}

function clinicalProjection(readings: any[], measurements: Record<string, any>) {
  const latest = readings.at(-1) ?? {};
  const machine = normalizedMachineMetrics(latest.machineMetrics);
  const nursing = measurements as Record<string, Record<string, unknown>>;
  return {
    weight: finiteResearchNumber(latest.weight) ?? finiteResearchNumber(machine.weight) ?? finiteResearchNumber(nursing.weight?.value),
    bmi: finiteResearchNumber(latest.bmi) ?? finiteResearchNumber(machine.bmi),
    waist: finiteResearchNumber(nursing.waist?.value),
    glucose: finiteResearchNumber(nursing.blood_glucose?.value),
  };
}

/** Explicit projection: no bearer tokens, credential hashes or unrelated user records. */
export function researchRecord(
  row: any,
  readings: any[],
  options: { frozenLifestyleReport?: any; finalAdvice?: string | null; archiveId?: string | null; frozenMetadata?: any } = {}
) {
  const answers = row.answers ?? {};
  const answerProjection = normalizedAnswers(answers);
  const lifestyleEnabled = (row.questionnaireIds ?? ["lifestyle"]).includes("lifestyle");
  const hasFrozenReport = Object.prototype.hasOwnProperty.call(options, "frozenLifestyleReport");
  const report = hasFrozenReport ? options.frozenLifestyleReport : (lifestyleEnabled ? lifestyleReport(answerProjection as any) : null);
  const complete = Boolean(report?.complete);
  const measurementProjection = normalizedMeasurements(row.measurements);
  const readingProjection = readings.map(reading => ({
    source: reading.source,
    recordedAt: reading.recordedAt,
    weight: finiteResearchNumber(reading.weight),
    height: finiteResearchNumber(reading.height),
    bmi: finiteResearchNumber(reading.bmi),
    sbp: finiteResearchNumber(reading.sbp),
    dbp: finiteResearchNumber(reading.dbp),
    hr: finiteResearchNumber(reading.hr),
    temperature: finiteResearchNumber(reading.temperature),
    machineMetrics: normalizedMachineMetrics(reading.machineMetrics),
  }));
  return {
    id: row.id,
    eventCode: row.eventCode,
    visitId: row.id,
    participantId: `P-${row.userId}`,
    age: finiteResearchNumber(row.age),
    sex: row.sex,
    city: row.city,
    trackId: row.trackId,
    createdAt: row.createdAt,
    questionnaireIds: row.questionnaireIds,
    questionnaireVersion: options.frozenMetadata?.questionnaireVersion ?? answers._questionnaireVersion ?? "legacy",
    scoringVersion: options.frozenMetadata?.scoringVersion ?? (hasFrozenReport ? "frozen-archive" : "current-unarchived"),
    templateVersion: options.frozenMetadata?.templateVersion ?? (hasFrozenReport ? "frozen-archive" : "current-unarchived"),
    reportRevision: options.frozenMetadata?.reportRevision ?? row.revision ?? null,
    scoreProvenance: hasFrozenReport ? "frozen-approved" : "current-unarchived",
    lifestyleScore: complete ? report.score?.overall ?? null : null,
    lifestyleDomains: complete ? report.score?.domains ?? {} : {},
    lifestyleBand: complete ? report.band?.label ?? null : null,
    archiveId: options.archiveId ?? null,
    finalAdvice: options.finalAdvice ?? null,
    answers: answerProjection,
    testIds: row.testIds,
    measurements: measurementProjection,
    clinical: clinicalProjection(readings, measurementProjection),
    nursingCompletedAt: row.nursingCompletedAt,
    approvedAt: row.approvedAt,
    consultationCompletedAt: row.consultationCompletedAt,
    reportCompletedAt: row.reportCompletedAt,
    readings: readingProjection,
  };
}

export const researchFieldDictionary = {
  lifestyleScore: "0–100; blank when the lifestyle questionnaire is disabled or incomplete",
  lifestyleDomains: "0–10 per domain; blank when the lifestyle questionnaire is disabled or incomplete",
  clinical: {
    weight: "kg", bmi: "kg/m²", waist: "cm", glucose: "mg/dL",
  },
  scoreProvenance: "frozen-approved uses the approved report snapshot; current-unarchived is a current display calculation",
} as const;
