import {
  eventQuestionAnswered,
  lifestyleSectionsForAnswers,
  scoreEventLifestyle,
  type EventAnswers,
  type EventQuestion,
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
  explanation: string;
};

export const lifestyleScoreBands = [
  { min: 76, max: 100, label: "سلوكيات صحية مثالية", color: "#238b57", background: "#e8f7ee" },
  { min: 51, max: 75, label: "سلوكيات صحية متوسطة", color: "#3579be", background: "#ecf4fe" },
  { min: 26, max: 50, label: "سلوكيات صحية دون المستوى الأمثل", color: "#c98220", background: "#fff6e7" },
  { min: 0, max: 25, label: "سلوكيات صحية عالية الخطورة", color: "#bd4747", background: "#fff0f0" },
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
  if (answered.length < ids.length) return "تتوفر إجابات جزئية فقط لهذا الجانب؛ لا يمكن استنتاج جانب محدد للتحسين من الأسئلة غير المجاب عنها.";
  return undefined;
}

function joined(items: string[]) {
  return items.filter(Boolean).join("، ");
}

function nutritionInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["fruit", "vegetables", "wholeGrains", "refinedGrains", "preparedFood", "sugary", "salty", "fried", "proteins"];
  const missing = missingText(answers, ids);
  if (missing) return { state: "missing", explanation: missing };

  const lowWholePlants = ["fruit", "vegetables", "wholeGrains"]
    .filter(id => (finite(answers[id]) ?? 0) < 5)
    .map(id => `${questionById(answers, id)?.text.split(":")[0] ?? id}: ${label(answers, id)}`);
  const highFoods = ["refinedGrains", "preparedFood", "sugary", "salty", "fried"]
    .filter(id => (finite(answers[id]) ?? 0) >= 5)
    .map(id => `${questionById(answers, id)?.text.split(":")[0] ?? id}: ${label(answers, id)}`);
  const proteins = Array.isArray(answers.proteins) ? answers.proteins : [];
  const plantProteinMissing = !proteins.includes("legumes") && !proteins.includes("nuts")
    ? "لم تُحدَّد البقوليات أو المكسرات والبذور ضمن مصادر البروتين المتكررة."
    : "";
  const findings = [
    lowWholePlants.length ? `ذُكر تناول أقل تكرارًا لبعض الأغذية النباتية الكاملة: ${joined(lowWholePlants)}.` : "",
    highFoods.length ? `ذُكر تكرار أعلى للأطعمة التالية: ${joined(highFoods)}.` : "",
    plantProteinMissing,
  ].filter(Boolean);
  return findings.length
    ? { state: "finding", explanation: joined(findings) }
    : { state: "none", explanation: "لم يظهر جانب محدد للتحسين بناء على إجاباتك." };
}

function activityInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["activeDays", "activeMinutes", "strengthDays"];
  const missing = missingText(answers, ids);
  if (missing) return { state: "missing", explanation: missing };
  const days = finite(answers.activeDays)!;
  const minutes = finite(answers.activeMinutes)!;
  const strength = finite(answers.strengthDays)!;
  if (days === 0 || minutes === 0 || strength < 2)
    return { state: "finding", explanation: `أفاد الاستبيان بـ ${days} أيام نشاط أسبوعيًا، ومتوسط ${minutes} دقيقة في اليوم النشط، و${strength} من تمارين تقوية العضلات أسبوعيًا.` };
  return { state: "none", explanation: "لم يظهر جانب محدد للتحسين بناء على إجاباتك." };
}

function sleepInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["sleepHours", "dayTired"];
  const missing = missingText(answers, ids);
  if (missing) return { state: "missing", explanation: missing };
  const hours = finite(answers.sleepHours)!;
  const tired = finite(answers.dayTired)!;
  if (hours < 3 || tired > 0)
    return { state: "finding", explanation: `أفاد الاستبيان بمتوسط نوم ${label(answers, "sleepHours")} وبالتعب أو صعوبة البقاء مستيقظًا: ${label(answers, "dayTired")}.` };
  return { state: "none", explanation: "لم يظهر جانب محدد للتحسين بناء على إجاباتك." };
}

function moodInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["lowInterest", "lowMood", "notOnTop", "overwhelmed"];
  const missing = missingText(answers, ids);
  if (missing) return { state: "missing", explanation: missing };
  const selected = ids
    .filter(id => (finite(answers[id]) ?? 0) > 0)
    .map(id => `${questionById(answers, id)?.text}: ${label(answers, id)}`);
  return selected.length
    ? { state: "finding", explanation: `وردت إجابات عن أعراض أو ضغوط متكررة: ${joined(selected)}.` }
    : { state: "none", explanation: "لم يظهر جانب محدد للتحسين بناء على إجاباتك." };
}

function connectionInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const ids = ["purpose", "support"];
  const missing = missingText(answers, ids);
  if (missing) return { state: "missing", explanation: missing };
  const selected = ids
    .filter(id => (finite(answers[id]) ?? 0) < 2)
    .map(id => `${questionById(answers, id)?.text}: ${label(answers, id)}`);
  return selected.length
    ? { state: "finding", explanation: `وردت إجابات أقل تكرارًا عن ${joined(selected)}.` }
    : { state: "none", explanation: "لم يظهر جانب محدد للتحسين بناء على إجاباتك." };
}

function substancesInsight(answers: EventAnswers): Omit<LifestylePillarInsight, "key" | "label" | "score"> {
  const alcoholId = answers.alcoholUse !== undefined ? "alcoholUse" : "alcohol";
  const ids = ["tobacco", alcoholId, "medMisuse", "cannabis", "otherDrugs"];
  const missing = missingText(answers, ids);
  if (missing) return { state: "missing", explanation: missing };
  const selected = ids
    .filter(id => (finite(answers[id]) ?? 3) < 3)
    .map(id => `${questionById(answers, id)?.text}: ${label(answers, id)}`);
  return selected.length
    ? { state: "finding", explanation: `أفاد الاستبيان باستخدام مُبلّغ عنه: ${joined(selected)}.` }
    : { state: "none", explanation: "لم يظهر جانب محدد للتحسين بناء على إجاباتك." };
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

export function lifestyleReport(answers: EventAnswers) {
  const score = scoreEventLifestyle(answers);
  return {
    complete: lifestyleReportComplete(answers),
    score,
    band: scoreBand(score.overall),
    insights: lifestylePillarInsights(answers),
  };
}
