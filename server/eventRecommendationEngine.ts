import crypto from "crypto";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { getEventReadingByRecordNo } from "./db";
import {
  claimAutomaticRecommendationGeneration,
  completeAutomaticRecommendationGeneration,
  failAutomaticRecommendationGeneration,
  readCare,
  updateCare,
} from "./eventCareDb";
import {
  EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
  type EventConsultationMode,
} from "../shared/eventConsultation";
import type { EventAnswers } from "../shared/eventLifestyle";
import type { Measurements } from "../shared/eventCare";
import { nursingCatalog } from "../shared/eventNursing";
import {
  composeEventLifestyleDraft,
  eventRecommendationById,
} from "../shared/eventRecommendationCatalog";
import { eventParticipantSessions } from "../drizzle/schema";
import { getDb } from "./db";
import { and, eq } from "drizzle-orm";

const MAX_NUMERIC_NURSING_VALUE = 10_000;
/** Keep all provider work below the 90-second automatic-generation lease. */
const MODEL_CATALOG_DEADLINE_MS = 8_000;
const MODEL_SELECTION_DEADLINE_MS = 58_000;
const frequencyValues = new Set(["0", "0.5", "2", "5", "10.5", "21"]);
const sleepValues = new Set(["0", "1", "2", "3", "3.1", "2.1", "0.1"]);
const recentFrequencyValues = new Set(["0", "1", "2", "3"]);
const substanceFrequencyValues = new Set(["0", "1", "2", "3"]);
const priorityValues = new Set([
  "nutrition",
  "activity",
  "sleep",
  "stress",
  "connection",
  "substances",
]);

export type MinimizedRecommendationInput = {
  answers: Record<string, string | number | string[]>;
  body: Record<string, number>;
  nursing: Record<string, Record<string, string | number>>;
};

function numeric(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function integerInRange(value: unknown, min: number, max: number) {
  const parsed = numeric(value);
  return parsed !== undefined && Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : undefined;
}

function closedValue(value: unknown, allowed: Set<string>) {
  return typeof value === "string" && allowed.has(value) ? value : undefined;
}

/** Only recognized, closed questionnaire fields are retained. Missing is unknown. */
export function minimizeQuestionnaire(answers: EventAnswers | null | undefined) {
  const source = answers ?? {};
  const output: Record<string, string | number | string[]> = {};
  for (const id of ["fruit", "vegetables", "wholeGrains", "sugary"] as const) {
    const value = closedValue(source[id], frequencyValues);
    if (value !== undefined) output[id] = value;
  }
  const sleep = closedValue(source.sleepHours, sleepValues);
  if (sleep !== undefined) output.sleepHours = sleep;
  const tobacco = closedValue(source.tobacco, substanceFrequencyValues);
  if (tobacco !== undefined) output.tobacco = tobacco;
  for (const id of ["priority1", "priority2", "priority3"] as const) {
    const value = closedValue(source[id], priorityValues);
    if (value !== undefined) output[id] = value;
  }
  for (const id of ["activeDays", "strengthDays"] as const) {
    const value = integerInRange(source[id], 0, 7);
    if (value !== undefined) output[id] = value;
  }
  const activeMinutes = integerInRange(source.activeMinutes, 0, 300);
  if (activeMinutes !== undefined) output.activeMinutes = activeMinutes;
  // Keep only known, closed survey responses; no explanatory free text survives.
  for (const id of ["dayTired", "lowInterest", "lowMood", "notOnTop", "overwhelmed", "purpose", "support"] as const) {
    const value = closedValue(source[id], recentFrequencyValues);
    if (value !== undefined) output[id] = value;
  }
  return output;
}

/** Only the eight approved numeric X18 report fields plus device BP survive. */
export function minimizeBodyReading(latest: {
  height?: unknown;
  weight?: unknown;
  bmi?: unknown;
  sbp?: unknown;
  dbp?: unknown;
  machineMetrics?: unknown;
}) {
  const output: Record<string, number> = {};
  const add = (key: string, value: unknown, min: number, max: number) => {
    const parsed = numeric(value);
    if (parsed !== undefined && parsed >= min && parsed <= max) output[key] = parsed;
  };
  add("height", latest.height, 80, 260);
  add("weight", latest.weight, 20, 350);
  add("bmi", latest.bmi, 10, 100);
  add("systolic", latest.sbp, 40, 300);
  add("diastolic", latest.dbp, 20, 200);
  const metrics =
    latest.machineMetrics && typeof latest.machineMetrics === "object" && !Array.isArray(latest.machineMetrics)
      ? (latest.machineMetrics as Record<string, unknown>)
      : {};
  add("fatRate", metrics.fatRate, 0, 100);
  add("skeletalMuscle", metrics.skeletalMuscle, 0, 150);
  add("vfal", metrics.vfal, 0, 100);
  add("whr", metrics.whr, 0.3, 3);
  add("bodyAge", metrics.bodyAge, 0, 150);
  return output;
}

/**
 * X18 may post isolated vitals before the completed body-composition payload.
 * A recommendation requires the core triad plus at least two composition
 * measures; a record number, BP, or temperature alone is never sufficient.
 */
export function hasSubstantiveBodyCompositionResult(body: Record<string, number>) {
  const core = ["height", "weight", "bmi"].every(key => body[key] !== undefined);
  const compositionCount = ["fatRate", "skeletalMuscle", "vfal", "whr", "bodyAge"]
    .filter(key => body[key] !== undefined).length;
  return core && compositionCount >= 2;
}

/**
 * Retains numeric nursing fields and catalog-defined closed enums only. It
 * deliberately excludes nurse notes and bone/device/site/result free text.
 */
export function minimizeNursingMeasurements(measurements: Measurements | null | undefined) {
  const source = measurements ?? {};
  const output: Record<string, Record<string, string | number>> = {};
  for (const test of nursingCatalog) {
    const values = source[test.id];
    if (!values || typeof values !== "object") continue;
    const safe: Record<string, string | number> = {};
    for (const field of test.fields) {
      const value = values[field.key];
      if (field.unit) {
        const parsed = numeric(value);
        if (parsed !== undefined && parsed >= 0 && parsed <= MAX_NUMERIC_NURSING_VALUE)
          safe[field.key] = parsed;
      } else if (field.options?.includes(String(value))) {
        safe[field.key] = String(value);
      }
    }
    if (Object.keys(safe).length) output[test.id] = safe;
  }
  return output;
}

function knownNumber(answers: Record<string, string | number | string[]>, id: string) {
  const value = answers[id];
  return typeof value === "number" ? value : undefined;
}

export function candidateSuggestionIds(answers: Record<string, string | number | string[]>) {
  // Unknown answers must not be treated as a deficiency. These neutral cards are
  // nevertheless appropriate for any adult completing a body-composition visit.
  const ids = new Set<string>([
    "measurement-followup",
    "small-goal",
    "activity-gradual",
    "nutrition-plants",
    "sleep-routine",
  ]);
  const activityDays = knownNumber(answers, "activeDays");
  const activityMinutes = knownNumber(answers, "activeMinutes");
  const strengthDays = knownNumber(answers, "strengthDays");
  if (
    (activityDays !== undefined && activityMinutes !== undefined && activityDays * activityMinutes < 150) ||
    (strengthDays !== undefined && strengthDays < 2)
  )
    ids.add("activity-target");
  else if (
    activityDays !== undefined &&
    activityMinutes !== undefined &&
    activityDays * activityMinutes >= 150 &&
    strengthDays !== undefined &&
    strengthDays >= 2
  )
    ids.add("activity-gradual");
  if (["0", "1", "2"].includes(String(answers.sleepHours ?? ""))) ids.add("sleep-routine");
  if (answers.tobacco && answers.tobacco !== "3") ids.add("tobacco-support");
  if (Number(answers.sugary) >= 2) ids.add("nutrition-sugary");
  if (["fruit", "vegetables", "wholeGrains"].some(id => {
    const value = answers[id];
    return typeof value === "string" && Number(value) < 2;
  }))
    ids.add("nutrition-plants");
  if ([answers.priority1, answers.priority2, answers.priority3].includes("connection"))
    ids.add("support-connection");
  return Array.from(ids);
}

function bloodPressureFromInput(input: MinimizedRecommendationInput) {
  const device = {
    systolic: input.body.systolic,
    diastolic: input.body.diastolic,
  };
  const nursing = input.nursing.blood_pressure ?? {};
  return [
    device,
    {
      systolic: typeof nursing.systolic === "number" ? nursing.systolic : undefined,
      diastolic: typeof nursing.diastolic === "number" ? nursing.diastolic : undefined,
    },
  ];
}

function isUrgentBloodPressure(values: Array<{ systolic?: number; diastolic?: number }>) {
  return values.some(value => (value.systolic ?? 0) > 180 || (value.diastolic ?? 0) > 120);
}

function urgentAdvice() {
  return "توجد قراءة ضغط مرتفعة جدًا تحتاج إعادة قياس بعد دقيقة واحدة ومراجعة عاجلة من مختص صحي. إذا كان لديك ألم في الصدر أو ضيق في التنفس أو ألم في الظهر أو خدر أو ضعف أو تغير في الرؤية أو صعوبة في الكلام، اطلب الرعاية الإسعافية فورًا. تجنب بدء توصيات نشاط بدني عامة إلى أن تتم المراجعة السريرية.";
}

function stableFingerprint(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function chooseSuggestionIds(input: MinimizedRecommendationInput) {
  const candidateIds = candidateSuggestionIds(input.answers);
  const catalog = candidateIds.map(id => {
    const entry = eventRecommendationById.get(id)!;
    return {
      id: entry.id,
      label: entry.label,
      sourceId: entry.sourceId,
      sourceSummary: entry.sourceSummary,
    };
  });
  const models = await listLLMModels({ timeoutMs: MODEL_CATALOG_DEADLINE_MS });
  const model = models.data.find(item => item.id === "gpt-5-mini")?.id;
  if (!model) throw new Error("Configured structured recommendation model is unavailable.");
  const response = await invokeLLM({
    model,
    timeoutMs: MODEL_SELECTION_DEADLINE_MS,
    messages: [
      {
        role: "system",
        content:
          "You are a conservative Arabic lifestyle-recommendation prioritizer. Select only IDs from the supplied allowlist. Do not produce prose, diagnoses, treatment, medication, calorie targets, exercise clearance, or emergency advice. Never infer missing facts. Return two to four distinct IDs that best match the supplied non-identifying numeric/closed-choice data.",
      },
      {
        role: "user",
        content: JSON.stringify({
          promptVersion: EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
          candidates: catalog,
          minimizedInputs: input,
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "event_recommendation_selection",
        strict: true,
        schema: {
          type: "object",
          properties: {
            suggestionIds: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              uniqueItems: true,
              items: { type: "string", enum: candidateIds },
            },
          },
          required: ["suggestionIds"],
          additionalProperties: false,
        },
      },
    },
  });
  const text = response.choices[0]?.message.content;
  if (typeof text !== "string") throw new Error("Recommendation selection was empty.");
  const parsed = JSON.parse(text) as { suggestionIds?: unknown };
  if (
    !Array.isArray(parsed.suggestionIds) ||
    parsed.suggestionIds.length < 2 ||
    parsed.suggestionIds.length > 4 ||
    new Set(parsed.suggestionIds).size !== parsed.suggestionIds.length ||
    parsed.suggestionIds.some(id => typeof id !== "string" || !candidateIds.includes(id))
  )
    throw new Error("Recommendation selection did not satisfy the allowlist.");
  return { model, ids: parsed.suggestionIds as string[] };
}

async function readRecommendationSession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [session] = await db
    .select()
    .from(eventParticipantSessions)
    .where(
      and(
        eq(eventParticipantSessions.id, sessionId),
        eq(eventParticipantSessions.eventCode, "lim-events")
      )
    )
    .limit(1);
  if (!session) throw new Error("Event session unavailable");
  return session;
}

async function buildMinimizedInput(sessionId: number) {
  const [session, care] = await Promise.all([
    readRecommendationSession(sessionId),
    readCare(sessionId),
  ]);
  const readings = session.latestRecordNo
    ? await getEventReadingByRecordNo(session.userId, session.latestRecordNo)
    : [];
  const latest = readings[0];
  if (!latest || !session.latestRecordNo)
    throw new Error("No linked X18 reading is available for recommendations.");
  const input: MinimizedRecommendationInput = {
    answers: minimizeQuestionnaire(session.answers),
    body: minimizeBodyReading(latest),
    nursing: minimizeNursingMeasurements(care.measurements),
  };
  if (!hasSubstantiveBodyCompositionResult(input.body))
    throw new Error("A completed body-composition result is required.");
  return { session, care, input, fingerprint: stableFingerprint(input) };
}

async function inputStillMatches(
  sessionId: number,
  expected: { recordNo: string; careRevision: number; fingerprint: string }
) {
  try {
    const fresh = await buildMinimizedInput(sessionId);
    return (
      fresh.session.latestRecordNo === expected.recordNo &&
      fresh.care.revision === expected.careRevision &&
      fresh.fingerprint === expected.fingerprint
    );
  } catch {
    return false;
  }
}

function recommendationMeta(ids: string[], fingerprint: string, mode: EventConsultationMode) {
  const chosen = ids.map(id => eventRecommendationById.get(id)!).filter(Boolean);
  return {
    promptVersion: EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
    mode,
    reviewRequired: mode === "physician",
    inputFingerprint: fingerprint,
    suggestionIds: chosen.map(item => item.id),
    sourceIds: Array.from(new Set(chosen.map(item => item.sourceId))),
  };
}

export type AutomaticRecommendationResult =
  | { state: "not_applicable" | "already_generated" | "retry_limit" | "waiting_for_nursing" | "waiting_for_body" | "busy" | "input_changed" | "failed" }
  | { state: "generated"; mode: "automatic" };

/** Produces only an allowlisted, source-backed automatic report after nursing. */
export async function generateAutomaticRecommendationsForSession(sessionId: number): Promise<AutomaticRecommendationResult> {
  let context: Awaited<ReturnType<typeof buildMinimizedInput>>;
  try {
    context = await buildMinimizedInput(sessionId);
  } catch (error) {
    return { state: error instanceof Error && error.message.includes("completed body-composition") ? "waiting_for_body" : "failed" };
  }
  if (context.care.consultationMode !== "automatic") return { state: "not_applicable" };
  if (!context.care.nursingCompletedAt) return { state: "waiting_for_nursing" };
  const claimed = await claimAutomaticRecommendationGeneration(sessionId, {
    fingerprint: context.fingerprint,
    inputRevision: context.care.revision,
    recordNo: context.session.latestRecordNo!,
  });
  if (claimed.state !== "claimed") return claimed;
  const attempt = {
    token: claimed.attemptToken,
    fingerprint: context.fingerprint,
    inputRevision: context.care.revision,
    recordNo: context.session.latestRecordNo!,
  };
  try {
    if (isUrgentBloodPressure(bloodPressureFromInput(context.input))) {
      if (!(await inputStillMatches(sessionId, {
        recordNo: attempt.recordNo,
        careRevision: claimed.care.revision,
        fingerprint: attempt.fingerprint,
      }))) return { state: "input_changed" };
      const published = await completeAutomaticRecommendationGeneration(sessionId, attempt, {
        advice: urgentAdvice(),
        recommendationMeta: {
          promptVersion: EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
          mode: "automatic",
          deterministicSafetyRule: "SBP>180 OR DBP>120",
          sourceIds: ["AHA_BP_180_120"],
          suggestionIds: ["urgent-blood-pressure"],
          inputFingerprint: context.fingerprint,
        },
        model: null,
      });
      return published ? { state: "generated", mode: "automatic" } : { state: "input_changed" };
    }
    const selected = await chooseSuggestionIds(context.input);
    if (!(await inputStillMatches(sessionId, {
      recordNo: attempt.recordNo,
      careRevision: claimed.care.revision,
      fingerprint: attempt.fingerprint,
    }))) return { state: "input_changed" };
    const published = await completeAutomaticRecommendationGeneration(sessionId, attempt, {
      advice: composeEventLifestyleDraft(selected.ids),
      recommendationMeta: recommendationMeta(selected.ids, context.fingerprint, "automatic"),
      model: selected.model,
    });
    return published ? { state: "generated", mode: "automatic" } : { state: "input_changed" };
  } catch {
    await failAutomaticRecommendationGeneration(
      sessionId,
      claimed.attemptToken,
      "تعذر إعداد توصيات نمط الحياة. يمكن للفريق إعادة المحاولة من صفحة التمريض."
    );
    return { state: "failed" };
  }
}

/**
 * Generates a private, editable physician draft. The model only selects
 * source-backed IDs; Arabic prose is composed from the immutable allowlist.
 */
export async function generatePhysicianRecommendationDraftForSession(input: {
  sessionId: number;
  trackId: number;
  expectedRevision: number;
  doctor: { userId: number | null; staffId: number; name: string | null };
}) {
  const context = await buildMinimizedInput(input.sessionId);
  if (context.care.consultationMode !== "physician")
    throw new Error("Automatic visits do not permit physician drafts.");
  if (context.care.nursingEnabled && !context.care.nursingCompletedAt)
    throw new Error("Nursing must be completed before generating a physician draft.");
  if (context.care.revision !== input.expectedRevision)
    throw new Error("Recommendation draft revision is stale.");

  let advice: string;
  let metadata: Record<string, unknown>;
  let model: string | null = null;
  if (isUrgentBloodPressure(bloodPressureFromInput(context.input))) {
    advice = urgentAdvice();
    metadata = {
      promptVersion: EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
      mode: "physician",
      reviewRequired: true,
      deterministicSafetyRule: "SBP>180 OR DBP>120",
      sourceIds: ["AHA_BP_180_120"],
      suggestionIds: ["urgent-blood-pressure"],
      inputFingerprint: context.fingerprint,
    };
  } else {
    const selected = await chooseSuggestionIds(context.input);
    advice = composeEventLifestyleDraft(selected.ids);
    metadata = recommendationMeta(selected.ids, context.fingerprint, "physician");
    model = selected.model;
  }
  if (!(await inputStillMatches(input.sessionId, {
    recordNo: context.session.latestRecordNo!,
    careRevision: input.expectedRevision,
    fingerprint: context.fingerprint,
  }))) throw new Error("Recommendation draft input changed before it could be saved.");
  const updated = await updateCare(
    input.sessionId,
    {
      advice,
      doctorUserId: input.doctor.userId,
      doctorStaffId: input.doctor.staffId,
      doctorName: input.doctor.name ?? "الطبيب",
      recommendationMeta: metadata,
      autoModel: model,
      approvedAt: null,
      approvedRecordNo: null,
    },
    false,
    input.trackId,
    input.expectedRevision
  );
  return { advice, recommendationMeta: metadata, revision: updated.revision, model };
}
