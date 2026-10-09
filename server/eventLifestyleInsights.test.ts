import { describe, expect, it } from "vitest";
import {
  lifestyleNextSteps,
  lifestylePillarInsights,
  lifestyleStrengths,
  scoreBand,
} from "../shared/eventLifestyleInsights";
import type { EventAnswers } from "../shared/eventLifestyle";

function currentAnswers(overrides: EventAnswers = {}): EventAnswers {
  return {
    _questionnaireVersion: "2026-09-28",
    importance: 8,
    confidence: 8,
    priority1: "nutrition",
    priority2: "activity",
    priority3: "sleep",
    fruit: "5",
    vegetables: "5",
    wholeGrains: "5",
    refinedGrains: "2",
    preparedFood: "2",
    sugary: "2",
    salty: "2",
    fried: "2",
    proteins: ["legumes", "nuts"],
    sleepHours: "3",
    dayTired: "0",
    activeDays: 4,
    activeMinutes: 45,
    strengthDays: 2,
    lowInterest: "0",
    lowMood: "0",
    notOnTop: "0",
    overwhelmed: "0",
    purpose: "3",
    support: "3",
    tobacco: "3",
    alcoholUse: "3",
    medMisuse: "3",
    cannabis: "3",
    otherDrugs: "3",
    ...overrides,
  };
}

const find = (answers: EventAnswers, key: string) =>
  lifestylePillarInsights(answers).find(item => item.key === key)!;

describe("Events lifestyle score bands", () => {
  it.each([
    [0, "سلوكيات صحية عالية الخطورة", "#bd4747"],
    [25, "سلوكيات صحية عالية الخطورة", "#bd4747"],
    [26, "سلوكيات صحية دون المستوى الأمثل", "#c98220"],
    [50, "سلوكيات صحية دون المستوى الأمثل", "#c98220"],
    [51, "سلوكيات صحية متوسطة", "#3579be"],
    [75, "سلوكيات صحية متوسطة", "#3579be"],
    [76, "سلوكيات صحية مثالية", "#238b57"],
    [100, "سلوكيات صحية مثالية", "#238b57"],
  ])("uses the approved shared band at %s", (score, label, color) => {
    const band = scoreBand(score);
    expect(band.label).toBe(label);
    expect(band.color).toBe(color);
    expect(band.cardBackground).toBe(color);
  });
});

describe("deterministic Events lifestyle insights", () => {
  it("keeps fatigue as a finding even when sleep is among the highest relative scores", () => {
    const sleep = find(currentAnswers({ dayTired: "1" }), "sleep");
    expect(sleep.state).toBe("finding");
    expect(sleep.bullets).toContain("التعب أو صعوبة البقاء مستيقظًا: عدة أيام.");
  });

  it("keeps missing answers unavailable instead of inventing a deficit", () => {
    const answers = currentAnswers();
    delete answers.fried;
    const nutrition = find(answers, "nutrition");
    expect(nutrition.state).toBe("missing");
    expect(nutrition.explanation).toContain("إجابات جزئية");
    expect(nutrition.bullets).toHaveLength(1);
  });

  it("creates short answer-backed improvement bullets without raw question paragraphs", () => {
    const answers = currentAnswers({
      fruit: "0.5",
      vegetables: "0.5",
      wholeGrains: "2",
      fried: "5",
      activeDays: 1,
      activeMinutes: 10,
      strengthDays: 1,
      lowInterest: "1",
      lowMood: "2",
      notOnTop: "1",
      overwhelmed: "3",
      purpose: "1",
      support: "0",
    });
    const nutrition = find(answers, "nutrition");
    const activity = find(answers, "activity");
    const mood = find(answers, "mood");
    const connection = find(answers, "connection");

    expect(nutrition.bullets).toEqual([
      "تناول الفواكه والخضراوات أقل تكرارًا.",
      "تناول الحبوب الكاملة غير منتظم.",
      "توجد فرصة لتقليل الأطعمة المقلية.",
    ]);
    expect(activity.bullets).toEqual([
      "النشاط البدني أقل من المستوى المستهدف أسبوعيًا.",
      "تمارين تقوية العضلات أقل من يومين أسبوعيًا.",
    ]);
    expect(mood.bullets).toHaveLength(3);
    expect(mood.bullets[0]).toBe("قلة الاستمتاع: عدة أيام.");
    expect(connection.bullets).toEqual([
      "الشعور بالهدف والمعنى: عدة أيام.",
      "التواصل مع مصادر الدعم: أبدًا.",
    ]);
    expect(nutrition.explanation).not.toContain("خلال الأسابيع الأربعة الماضية");
  });

  it("preserves the legacy alcohol meaning rather than recasting it", () => {
    const answers = currentAnswers({ _questionnaireVersion: "legacy", alcohol: "1" });
    delete answers.alcoholUse;
    const substances = find(answers, "substances");
    expect(substances.bullets).toContain("الإفراط في تناول الكحول في يوم واحد: أسبوعيًا.");
    expect(substances.explanation).not.toContain("تناول المشروبات الكحولية:");
  });

  it("derives relative strengths from completed scores without calling them ideal", () => {
    const answers = currentAnswers({ dayTired: "1", activeDays: 1, activeMinutes: 10, strengthDays: 0 });
    const strengths = lifestyleStrengths(answers);
    expect(strengths.length).toBeGreaterThan(0);
    expect(strengths[0]?.message).toContain("من الركائز الأعلى تقييمًا لديك");
    expect(strengths.map(item => item.message).join(" ")).not.toContain("مثالية");

    const incomplete = currentAnswers();
    delete incomplete.sleepHours;
    expect(lifestyleStrengths(incomplete)).toEqual([]);
  });

  it("creates a small priority-aware plan without advising highly active people to start walking", () => {
    const lowerActivity = currentAnswers({
      priority1: "activity",
      priority2: "nutrition",
      activeDays: 1,
      activeMinutes: 10,
      strengthDays: 1,
      vegetables: "0.5",
    });
    const steps = lifestyleNextSteps(lowerActivity);
    expect(steps).toHaveLength(3);
    expect(steps[0]?.text).toContain("المشي لمدة 10 دقائق بعد إحدى الوجبات");
    expect(steps[0]?.source).toBe("cdc-activity");
    expect(steps.some(step => step.text.includes("الخضراوات"))).toBe(true);

    const active = currentAnswers({ activeDays: 5, activeMinutes: 45, strengthDays: 3 });
    expect(lifestyleNextSteps(active).some(step => step.key === "walk")).toBe(false);
  });

  it("keeps isolated refined-grain and salty patterns visible with an actionable nutrition plan", () => {
    const answers = currentAnswers({ refinedGrains: "5", salty: "5" });
    const nutrition = find(answers, "nutrition");
    const steps = lifestyleNextSteps(answers);

    expect(nutrition.state).toBe("finding");
    expect(nutrition.bullets).toContain("تكرار الحبوب المكررة والأطعمة المالحة مرتفع.");
    expect(steps.map(step => step.key)).toEqual(expect.arrayContaining(["refined-grains", "salty"]));
  });

  it("keeps prepared and sugary food patterns visible when they are the only nutrition deficits", () => {
    const answers = currentAnswers({ preparedFood: "5", sugary: "5" });
    const nutrition = find(answers, "nutrition");
    const steps = lifestyleNextSteps(answers);

    expect(nutrition.state).toBe("finding");
    expect(nutrition.bullets).toEqual([
      "تكرار الوجبات الجاهزة أو من المطاعم مرتفع.",
      "تكرار الأطعمة أو المشروبات المحلاة مرتفع.",
    ]);
    expect(steps.map(step => step.key)).toEqual(expect.arrayContaining(["prepared-food", "sugary"]));
  });

  it("does not produce a substance action plan or infer abrupt withdrawal", () => {
    const answers = currentAnswers({ tobacco: "1" });
    const steps = lifestyleNextSteps(answers);
    expect(steps.some(step => step.key.includes("substance") || step.text.includes("التبغ"))).toBe(false);
  });
});
