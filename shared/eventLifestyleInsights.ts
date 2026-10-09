import {
  eventQuestionAnswered,
  lifestyleSectionsForAnswers,
  scoreEventLifestyle,
  type EventAnswers,
} from "./eventLifestyle";

export const lifestyleDomains = [
  { key: "nutrition", label: "التغذية", color: "#197f6f" },
  { key: "activity", label: "النشاط البدني", color: "#398f99" },
  { key: "sleep", label: "النوم", color: "#677ab9" },
  { key: "mood", label: "المزاج وإدارة الضغوط", color: "#b07a46" },
  { key: "connection", label: "المعنى والترابط", color: "#8e73a9" },
  { key: "substances", label: "تجنب المواد الضارة", color: "#729249" },
] as const;

export type LifestyleDomainKey = (typeof lifestyleDomains)[number]["key"];
export type LifestyleInsightState = "finding" | "none" | "missing";

export type LifestylePillarInsight = {
  key: LifestyleDomainKey;
  label: string;
  score: number;
  state: LifestyleInsightState;
  /** Short answer-backed sentences for screen and PDF. */
  bullets: string[];
  /** Kept for existing callers and assistive summaries. */
  explanation: string;
};

export type LifestyleStrength = {
  key: LifestyleDomainKey;
  label: string;
  score: number;
  message: string;
};

export type LifestyleNextStep = {
  key: string;
  text: string;
  /** Source note for the reviewed deterministic catalog, not participant data. */
  source: "catalog" | "cdc-activity" | "cdc-sleep";
};

/** One shared palette controls card, classification and every legend row. */
export const lifestyleScoreBands = [
  {
    min: 76,
    max: 100,
    label: "سلوكيات صحية مثالية",
    color: "#238b57",
    background: "#e8f7ee",
    cardBackground: "#238b57",
  },
  {
    min: 51,
    max: 75,
    label: "سلوكيات صحية متوسطة",
    color: "#3579be",
    background: "#ecf4fe",
    cardBackground: "#3579be",
  },
  {
    min: 26,
    max: 50,
    label: "سلوكيات صحية دون المستوى الأمثل",
    color: "#c98220",
    background: "#fff6e7",
    cardBackground: "#c98220",
  },
  {
    min: 0,
    max: 25,
    label: "سلوكيات صحية عالية الخطورة",
    color: "#bd4747",
    background: "#fff0f0",
    cardBackground: "#bd4747",
  },
] as const;

function finite(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function questions(answers: EventAnswers) {
  return lifestyleSectionsForAnswers(answers).flatMap(section => section.questions);
}

function questionById(answers: EventAnswers, id: string) {
  return questions(answers).find(question => question.id === id);
}

function isAnswered(answers: EventAnswers, id: string) {
  const question = questionById(answers, id);
  return Boolean(question && eventQuestionAnswered(question, answers));
}

function label(answers: EventAnswers, id: string) {
  const question = questionById(answers, id);
  const value = answers[id];
  if (!question || !isAnswered(answers, id)) return undefined;
  if (question.type === "number" || question.type === "slider") return String(value);
  if (question.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return selected
      .map(item => question.options?.find(option => option.value === item)?.label)
      .filter((item): item is string => Boolean(item));
  }
  return question.options?.find(option => option.value === value)?.label;
}

function answeredIds(answers: EventAnswers, ids: string[]) {
  return ids.filter(id => isAnswered(answers, id));
}

function missingText(answers: EventAnswers, ids: string[]) {
  const answered = answeredIds(answers, ids);
  if (answered.length === 0) return "لا تتوفر إجابات لهذا الجانب في الاستبيان.";
  if (answered.length < ids.length)
    return "تتوفر إجابات جزئية فقط لهذا الجانب؛ لا يمكن استنتاج جانب محدد للتحسين من الأسئلة غير المجاب عنها.";
  return undefined;
}

function insight(
  state: LifestyleInsightState,
  bullets: string[]
): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  return { state, bullets, explanation: bullets.join(" ") };
}

function none() {
  return insight("none", ["لم يظهر جانب محدد للتحسين بناء على إجاباتك."]);
}

function nutritionInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["fruit", "vegetables", "wholeGrains", "refinedGrains", "preparedFood", "sugary", "salty", "fried", "proteins"];
  const missing = missingText(answers, ids);
  if (missing) return insight("missing", [missing]);

  const lowFruit = (finite(answers.fruit) ?? 0) < 5;
  const lowVegetables = (finite(answers.vegetables) ?? 0) < 5;
  const lowWholeGrains = (finite(answers.wholeGrains) ?? 0) < 5;
  const highFried = (finite(answers.fried) ?? 0) >= 5;
  const highPrepared = (finite(answers.preparedFood) ?? 0) >= 5;
  const highSugary = (finite(answers.sugary) ?? 0) >= 5;
  const proteins = Array.isArray(answers.proteins) ? answers.proteins : [];
  const bullets: string[] = [];

  if (lowFruit && lowVegetables) bullets.push("تناول الفواكه والخضراوات أقل تكرارًا.");
  else if (lowFruit) bullets.push("تناول الفواكه أقل تكرارًا.");
  else if (lowVegetables) bullets.push("تناول الخضراوات أقل تكرارًا.");
  if (lowWholeGrains && bullets.length < 3) bullets.push("تناول الحبوب الكاملة غير منتظم.");
  if (highFried && bullets.length < 3) bullets.push("توجد فرصة لتقليل الأطعمة المقلية.");
  if (highPrepared && bullets.length < 3) bullets.push("تكرار الوجبات الجاهزة أو من المطاعم مرتفع.");
  if (highSugary && bullets.length < 3) bullets.push("تكرار الأطعمة أو المشروبات المحلاة مرتفع.");
  if (!proteins.includes("legumes") && !proteins.includes("nuts") && bullets.length < 3)
    bullets.push("لم تُحدَّد البقوليات أو المكسرات والبذور ضمن مصادر البروتين المتكررة.");

  return bullets.length ? insight("finding", bullets) : none();
}

function activityInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["activeDays", "activeMinutes", "strengthDays"];
  const missing = missingText(answers, ids);
  if (missing) return insight("missing", [missing]);
  const days = finite(answers.activeDays)!;
  const minutes = finite(answers.activeMinutes)!;
  const strength = finite(answers.strengthDays)!;
  const weeklyMinutes = days * minutes;
  const bullets: string[] = [];
  // This is the existing reviewed activity criterion used by the score catalog.
  if (weeklyMinutes < 150) bullets.push("النشاط البدني أقل من المستوى المستهدف أسبوعيًا.");
  if (strength < 2) bullets.push("تمارين تقوية العضلات أقل من يومين أسبوعيًا.");
  return bullets.length ? insight("finding", bullets) : none();
}

function sleepInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["sleepHours", "dayTired"];
  const missing = missingText(answers, ids);
  if (missing) return insight("missing", [missing]);
  const hours = finite(answers.sleepHours)!;
  const tired = finite(answers.dayTired)!;
  const bullets: string[] = [];
  if (hours < 3) bullets.push(`متوسط النوم: ${label(answers, "sleepHours")}.`);
  if (tired > 0) bullets.push(`التعب أو صعوبة البقاء مستيقظًا: ${label(answers, "dayTired")}.`);
  return bullets.length ? insight("finding", bullets) : none();
}

function moodInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["lowInterest", "lowMood", "notOnTop", "overwhelmed"];
  const topics: Record<string, string> = {
    lowInterest: "قلة الاستمتاع",
    lowMood: "الحزن أو الإحباط",
    notOnTop: "التعامل مع المسؤوليات",
    overwhelmed: "الشعور بالضغط",
  };
  const missing = missingText(answers, ids);
  if (missing) return insight("missing", [missing]);
  const bullets = ids
    .filter(id => (finite(answers[id]) ?? 0) > 0)
    .slice(0, 3)
    .map(id => `${topics[id]}: ${label(answers, id)}.`);
  return bullets.length ? insight("finding", bullets) : none();
}

function connectionInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["purpose", "support"];
  const topics: Record<string, string> = {
    purpose: "الشعور بالهدف والمعنى",
    support: "التواصل مع مصادر الدعم",
  };
  const missing = missingText(answers, ids);
  if (missing) return insight("missing", [missing]);
  const bullets = ids
    .filter(id => (finite(answers[id]) ?? 0) < 2)
    .map(id => `${topics[id]}: ${label(answers, id)}.`);
  return bullets.length ? insight("finding", bullets) : none();
}

function substancesInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const alcoholId = answers.alcoholUse !== undefined ? "alcoholUse" : "alcohol";
  const ids = ["tobacco", alcoholId, "medMisuse", "cannabis", "otherDrugs"];
  const topics: Record<string, string> = {
    tobacco: "التبغ أو النيكوتين",
    alcoholUse: "تناول المشروبات الكحولية",
    // Historical records used a separate binge-drinking question. Keep its meaning.
    alcohol: "الإفراط في تناول الكحول في يوم واحد",
    medMisuse: "إساءة استخدام الأدوية الموصوفة",
    cannabis: "استخدام القنب أو منتجاته",
    otherDrugs: "استخدام مواد مخدرة أخرى",
  };
  const missing = missingText(answers, ids);
  if (missing) return insight("missing", [missing]);
  const bullets = ids
    .filter(id => (finite(answers[id]) ?? 3) < 3)
    .slice(0, 3)
    .map(id => `${topics[id]}: ${label(answers, id)}.`);
  return bullets.length ? insight("finding", bullets) : none();
}

const insightBuilders: Record<LifestyleDomainKey, (answers: EventAnswers) => Omit<LifestylePillarInsight, "key" | "label" | "score">> = {
  nutrition: nutritionInsight,
  activity: activityInsight,
  sleep: sleepInsight,
  mood: moodInsight,
  connection: connectionInsight,
  substances: substancesInsight,
};

export function lifestyleReportComplete(answers: EventAnswers) {
  return questions(answers).every(question => eventQuestionAnswered(question, answers));
}

export function scoreBand(score: number) {
  const normalized = Math.round(Math.max(0, Math.min(100, score)));
  return lifestyleScoreBands.find(band => normalized >= band.min && normalized <= band.max) ?? lifestyleScoreBands.at(-1)!;
}

export function lifestylePillarInsights(answers: EventAnswers): LifestylePillarInsight[] {
  const score = scoreEventLifestyle(answers);
  return lifestyleDomains.map(domain => ({
    ...domain,
    score: score.domains[domain.key],
    ...insightBuilders[domain.key](answers),
  }));
}

/** Positive, relative strengths only; no claim that symptoms or risks are absent. */
export function lifestyleStrengths(answers: EventAnswers, insights = lifestylePillarInsights(answers)): LifestyleStrength[] {
  if (!lifestyleReportComplete(answers)) return [];
  return [...insights]
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(item => ({
      key: item.key,
      label: item.label,
      score: item.score,
      message: `${item.label} من الركائز الأعلى تقييمًا لديك.`,
    }));
}

function isLow(answers: EventAnswers, id: string) {
  return (finite(answers[id]) ?? 0) < 5;
}

/**
 * A deliberately small, deterministic catalog. It complements—never replaces—
 * the existing clinician or reviewed automatic recommendations.
 */
export function lifestyleNextSteps(
  answers: EventAnswers,
  insights = lifestylePillarInsights(answers)
): LifestyleNextStep[] {
  if (!lifestyleReportComplete(answers)) return [];
  const byKey = new Map(insights.map(item => [item.key, item]));
  const candidates: Partial<Record<LifestyleDomainKey, LifestyleNextStep[]>> = {};
  const activityMinutes = (finite(answers.activeDays) ?? 0) * (finite(answers.activeMinutes) ?? 0);

  if (byKey.get("nutrition")?.state === "finding") {
    const nutrition: LifestyleNextStep[] = [];
    if (isLow(answers, "vegetables"))
      nutrition.push({ key: "vegetables", text: "أضف حصة من الخضراوات إلى وجبة الغداء يوميًا هذا الأسبوع.", source: "catalog" });
    else if (isLow(answers, "fruit"))
      nutrition.push({ key: "fruit", text: "أضف حصة من الفاكهة إلى وجبة خفيفة يوميًا هذا الأسبوع.", source: "catalog" });
    else if (isLow(answers, "wholeGrains"))
      nutrition.push({ key: "whole-grains", text: "استبدل خيارًا واحدًا من الحبوب المكررة بخيار كامل هذا الأسبوع.", source: "catalog" });
    else if ((finite(answers.fried) ?? 0) >= 5)
      nutrition.push({ key: "fried", text: "اختر وجبة غير مقلية في مرتين هذا الأسبوع.", source: "catalog" });
    if (nutrition.length) candidates.nutrition = nutrition;
  }

  if (byKey.get("activity")?.state === "finding") {
    const activity: LifestyleNextStep[] = [];
    if (activityMinutes < 150)
      activity.push({ key: "walk", text: "ابدأ بالمشي لمدة 10 دقائق بعد إحدى الوجبات، خمسة أيام هذا الأسبوع، حسب قدرتك.", source: "cdc-activity" });
    if ((finite(answers.strengthDays) ?? 0) < 2)
      activity.push({ key: "strength", text: "أضف جلستين قصيرتين لتقوية العضلات هذا الأسبوع، حسب قدرتك.", source: "catalog" });
    if (activity.length) candidates.activity = activity;
  }

  if (byKey.get("sleep")?.state === "finding")
    candidates.sleep = [{ key: "wake-time", text: "حافظ على وقت استيقاظ ثابت خلال أيام الأسبوع.", source: "cdc-sleep" }];
  if (byKey.get("connection")?.state === "finding")
    candidates.connection = [{ key: "support", text: "حدّد وقتًا قصيرًا هذا الأسبوع للتواصل مع شخص أو مصدر دعم تثق به.", source: "catalog" }];
  if (byKey.get("mood")?.state === "finding")
    candidates.mood = [{ key: "pause", text: "خصّص عشر دقائق هذا الأسبوع لنشاط مهدئ تختاره بما يناسبك.", source: "catalog" }];

  const priorityMap: Record<string, LifestyleDomainKey> = {
    nutrition: "nutrition",
    activity: "activity",
    sleep: "sleep",
    stress: "mood",
    connection: "connection",
    substances: "substances",
  };
  const priorityOrder = [answers.priority1, answers.priority2, answers.priority3]
    .map(value => priorityMap[String(value)] as LifestyleDomainKey | undefined)
    .filter((value): value is LifestyleDomainKey => Boolean(value));
  const keys = Array.from(new Set<LifestyleDomainKey>([
    ...priorityOrder,
    ...lifestyleDomains.map(domain => domain.key),
  ]));
  const result: LifestyleNextStep[] = [];
  for (const key of keys) {
    const next = candidates[key]?.shift();
    if (next) result.push(next);
    if (result.length === 3) return result;
  }
  for (const key of keys) {
    for (const next of candidates[key] ?? []) {
      result.push(next);
      if (result.length === 3) return result;
    }
  }
  return result;
}

export function lifestyleReport(answers: EventAnswers) {
  const score = scoreEventLifestyle(answers);
  const insights = lifestylePillarInsights(answers);
  return {
    complete: lifestyleReportComplete(answers),
    score,
    band: scoreBand(score.overall),
    insights,
    strengths: lifestyleStrengths(answers, insights),
    nextSteps: lifestyleNextSteps(answers, insights),
  };
}
