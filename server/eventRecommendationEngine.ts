import { invokeLLM, listLLMModels } from "./_core/llm";
import { getEventReadingByRecordNo } from "./db";
import {
  claimAutomaticRecommendationGeneration,
  completeAutomaticRecommendationGeneration,
  failAutomaticRecommendationGeneration,
} from "./eventCareDb";
import {
  EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
  type EventConsultationMode,
} from "../shared/eventConsultation";
import type { EventAnswers } from "../shared/eventLifestyle";
import type { Measurements } from "../shared/eventCare";

type Suggestion = {
  id: string;
  sourceId: string;
  text: string;
};

const suggestions: Suggestion[] = [
  {
    id: "measurement-followup",
    sourceId: "RIPPE_BEHAVIOR",
    text: "استخدم القياسات المسجلة كنقطة متابعة مع فريق الفعالية، واختر خطوة عملية واحدة قابلة للقياس لتراجعها لاحقًا. هذه القراءات وحدها لا تُعد تشخيصًا طبيًا.",
  },
  {
    id: "nutrition-plants",
    sourceId: "RIPPE_NUTRITION",
    text: "ابدأ هذا الأسبوع بإضافة خضار أو فاكهة إلى وجبة معتادة، وجرّب استبدال جزء من الحبوب المكررة بحبوب كاملة غنية بالألياف بما يلائم تفضيلاتك وحساسياتك الغذائية.",
  },
  {
    id: "nutrition-sugary",
    sourceId: "RIPPE_NUTRITION",
    text: "اختر مشروبًا أو وجبة محلاة متكررة واستبدلها تدريجيًا بخيار أقل إضافة للسكر يناسبك، مع الاستمرار في تحسين نمط الطعام ككل بدل التركيز على منع صنف واحد فقط.",
  },
  {
    id: "activity-gradual",
    sourceId: "RIPPE_ACTIVITY",
    text: "أي قدر من الحركة أفضل من عدمها. اختر نشاطًا مريحًا وآمنًا لك مثل المشي، وابدأ تدريجيًا مع تقليل فترات الجلوس الطويلة قدر الإمكان.",
  },
  {
    id: "activity-target",
    sourceId: "RIPPE_ACTIVITY",
    text: "عند الملاءمة لك، ابنِ نشاطك تدريجيًا نحو 150 دقيقة أسبوعيًا من النشاط متوسط الشدة، مع تمارين تقوية للمجموعات العضلية الرئيسية يومين أو أكثر أسبوعيًا. لا تبدأ نشاطًا شديدًا اعتمادًا على قراءة تركيب الجسم وحدها.",
  },
  {
    id: "sleep-routine",
    sourceId: "CDC_SLEEP_7H",
    text: "حافظ على موعد نوم واستيقاظ منتظم قدر الإمكان، وهيّئ بيئة هادئة للنوم. يحتاج البالغون عمومًا إلى 7 ساعات أو أكثر من النوم يوميًا.",
  },
  {
    id: "tobacco-support",
    sourceId: "RIPPE_TOBACCO",
    text: "إذا كنت تستخدم التبغ أو النيكوتين، فاختر موعدًا أو خطوة صغيرة لطلب دعم الإقلاع من فريق صحي أو خدمة موثوقة، واطلب دعم الأسرة أو الأصدقاء. لا تتضمن هذه التوصية وصف أدوية.",
  },
  {
    id: "small-goal",
    sourceId: "RIPPE_BEHAVIOR",
    text: "حوّل أولويتك إلى هدف صغير ومحدد وواقعي لهذا الأسبوع، وسجّل تقدمك بطريقة بسيطة. يمكن لتمرين تنفّس هادئ أو دقيقة يقظة ذهنية أن يدعم التعامل مع الضغوط دون أن يكون بديلًا للرعاية المتخصصة.",
  },
  {
    id: "support-connection",
    sourceId: "RIPPE_CONNECTION",
    text: "اختر تواصلًا داعمًا واحدًا هذا الأسبوع، مثل مكالمة مع شخص موثوق أو نشاط مجتمعي مناسب لك، وشاركه الهدف الصحي الذي اخترته إذا رغبت.",
  },
];

const byId = new Map(suggestions.map(item => [item.id, item]));

function numeric(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isActiveTobacco(answers: EventAnswers) {
  const value = answers.tobacco;
  return typeof value === "string" && value !== "3";
}

function candidateSuggestionIds(answers: EventAnswers) {
  const ids = new Set<string>(["measurement-followup", "small-goal"]);
  const activityMinutes = (numeric(answers.activeDays) ?? 0) * (numeric(answers.activeMinutes) ?? 0);
  if (activityMinutes < 150 || (numeric(answers.strengthDays) ?? 0) < 2) ids.add("activity-target");
  else ids.add("activity-gradual");
  // The questionnaire stores sleep as categorical option codes. Only the
  // <5, 5–6 and 6–7 hour options map to the CDC under-seven-hours cue.
  if (["0", "1", "2"].includes(String(answers.sleepHours ?? ""))) ids.add("sleep-routine");
  if (isActiveTobacco(answers)) ids.add("tobacco-support");
  if ((numeric(answers.sugary) ?? 0) >= 2) ids.add("nutrition-sugary");
  if ((numeric(answers.fruit) ?? 0) < 2 || (numeric(answers.vegetables) ?? 0) < 2 || (numeric(answers.wholeGrains) ?? 0) < 2) ids.add("nutrition-plants");
  if (answers.priority1 === "connection" || answers.priority2 === "connection" || answers.priority3 === "connection") ids.add("support-connection");
  return Array.from(ids);
}

function normalizeMeasurements(measurements: Measurements) {
  return Object.fromEntries(
    Object.entries(measurements).map(([testId, fields]) => [
      testId,
      Object.fromEntries(Object.entries(fields).filter(([key]) => key !== "notes")),
    ])
  );
}

function bloodPressureFromCare(measurements: Measurements) {
  const values = measurements.blood_pressure;
  return {
    systolic: numeric(values?.systolic),
    diastolic: numeric(values?.diastolic),
  };
}

function isUrgentBloodPressure(values: Array<{ systolic?: number; diastolic?: number }>) {
  return values.some(value => (value.systolic ?? 0) > 180 || (value.diastolic ?? 0) > 120);
}

function urgentAdvice() {
  return "توجد قراءة ضغط مرتفعة جدًا تحتاج إعادة قياس بعد دقيقة واحدة ومراجعة عاجلة من مختص صحي. إذا كان لديك ألم في الصدر أو ضيق في التنفس أو ألم في الظهر أو خدر أو ضعف أو تغير في الرؤية أو صعوبة في الكلام، اطلب الرعاية الإسعافية فورًا. تجنب بدء توصيات نشاط بدني عامة إلى أن تتم المراجعة السريرية.";
}

async function chooseSuggestionIds(input: {
  candidateIds: string[];
  answers: EventAnswers;
  body: Record<string, unknown>;
  nursing: Record<string, Record<string, string>>;
}) {
  const catalog = input.candidateIds.map(id => ({ id, sourceId: byId.get(id)!.sourceId }));
  const models = await listLLMModels();
  const model = models.data.find(item => item.id === "gpt-5-mini")?.id;
  if (!model) throw new Error("Configured structured recommendation model is unavailable.");

  const response = await invokeLLM({
    model,
    messages: [
      {
        role: "system",
        content: "You are a conservative Arabic lifestyle-recommendation prioritizer. Select only IDs from the supplied allowlist. Do not produce prose, diagnoses, treatment, medication, calorie targets, exercise clearance, or emergency advice. Never infer missing facts. Return two to four distinct IDs that best match the supplied non-identifying event measurements and questionnaire responses.",
      },
      {
        role: "user",
        content: JSON.stringify({
          promptVersion: EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
          candidates: catalog,
          answers: input.answers,
          x18Measurements: input.body,
          nursingMeasurements: input.nursing,
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
              items: { type: "string", enum: input.candidateIds },
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
  if (!Array.isArray(parsed.suggestionIds) || parsed.suggestionIds.length < 2 || parsed.suggestionIds.length > 4 || new Set(parsed.suggestionIds).size !== parsed.suggestionIds.length || parsed.suggestionIds.some(id => typeof id !== "string" || !input.candidateIds.includes(id))) {
    throw new Error("Recommendation selection did not satisfy the allowlist.");
  }
  return { model, ids: parsed.suggestionIds as string[] };
}

export type AutomaticRecommendationResult =
  | { state: "not_applicable" | "already_generated" | "retry_limit" | "waiting_for_nursing" | "failed" }
  | { state: "generated"; mode: EventConsultationMode };

/**
 * Produces an allowlisted, source-backed Arabic recommendation only after the
 * nursing station completes a new automatic-mode visit. No name, phone number,
 * free-text nurse note, or model prose is persisted or sent to the model.
 */
export async function generateAutomaticRecommendationsForSession(sessionId: number): Promise<AutomaticRecommendationResult> {
  const claimed = await claimAutomaticRecommendationGeneration(sessionId);
  if (claimed.state !== "claimed") return claimed;

  try {
    const readings = claimed.session.latestRecordNo
      ? await getEventReadingByRecordNo(claimed.session.userId, claimed.session.latestRecordNo)
      : [];
    const latest = readings[0];
    if (!latest) throw new Error("No linked X18 reading is available for automatic recommendations.");

    const body = {
      height: latest.height ?? null,
      weight: latest.weight ?? null,
      bmi: latest.bmi ?? null,
      machineMetrics: latest.machineMetrics ?? {},
      systolic: latest.sbp ?? null,
      diastolic: latest.dbp ?? null,
    };
    const nursing = normalizeMeasurements(claimed.care.measurements ?? {});
    const nursingBp = bloodPressureFromCare(claimed.care.measurements ?? {});
    const deviceBp = { systolic: numeric(latest.sbp), diastolic: numeric(latest.dbp) };

    if (isUrgentBloodPressure([deviceBp, nursingBp])) {
      await completeAutomaticRecommendationGeneration(sessionId, {
        advice: urgentAdvice(),
        recommendationMeta: {
          promptVersion: EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
          suggestionIds: ["urgent-blood-pressure"],
          sourceIds: ["AHA_BP_180_120"],
          deterministicSafetyRule: "SBP>180 OR DBP>120",
        },
        model: null,
      });
      return { state: "generated", mode: "automatic" };
    }

    const candidates = candidateSuggestionIds(claimed.session.answers ?? {});
    const selected = await chooseSuggestionIds({
      candidateIds: candidates,
      answers: claimed.session.answers ?? {},
      body,
      nursing,
    });
    const chosen = selected.ids.map(id => byId.get(id)!).filter(Boolean);
    const advice = [
      "توصيات تثقيفية مبنية على بيانات هذه الزيارة؛ اختر منها ما يلائمك وناقش أي قلق صحي مع مختص.",
      ...chosen.map((item, index) => `${index + 1}. ${item.text}`),
    ].join("\n");
    await completeAutomaticRecommendationGeneration(sessionId, {
      advice,
      recommendationMeta: {
        promptVersion: EVENT_AUTOMATIC_RECOMMENDATION_PROMPT_VERSION,
        suggestionIds: chosen.map(item => item.id),
          sourceIds: Array.from(new Set(chosen.map(item => item.sourceId))),
      },
      model: selected.model,
    });
    return { state: "generated", mode: "automatic" };
  } catch {
    await failAutomaticRecommendationGeneration(sessionId, "تعذر إعداد توصيات نمط الحياة. يمكن للفريق إعادة المحاولة من صفحة التمريض.");
    return { state: "failed" };
  }
}
