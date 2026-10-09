import { describe, expect, it } from "vitest";
import {
  lifestylePillarInsights,
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

describe("Events lifestyle score bands", () => {
  it.each([
    [0, "سلوكيات صحية عالية الخطورة"],
    [25, "سلوكيات صحية عالية الخطورة"],
    [26, "سلوكيات صحية دون المستوى الأمثل"],
    [50, "سلوكيات صحية دون المستوى الأمثل"],
    [51, "سلوكيات صحية متوسطة"],
    [75, "سلوكيات صحية متوسطة"],
    [76, "سلوكيات صحية مثالية"],
    [100, "سلوكيات صحية مثالية"],
  ])("uses the approved band at %s", (score, label) => {
    expect(scoreBand(score).label).toBe(label);
  });
});

describe("deterministic Events lifestyle insights", () => {
  it("uses actual selected answer labels and preserves fatigue even when sleep score is high", () => {
    const insights = lifestylePillarInsights(currentAnswers({ dayTired: "1" }));
    const sleep = insights.find(item => item.key === "sleep")!;

    expect(sleep.state).toBe("finding");
    expect(sleep.explanation).toContain("نحو 7-8 ساعات");
    expect(sleep.explanation).toContain("عدة أيام");
  });

  it("keeps missing answers unavailable instead of inventing a deficit", () => {
    const answers = currentAnswers();
    delete answers.fried;
    const nutrition = lifestylePillarInsights(answers).find(item => item.key === "nutrition")!;

    expect(nutrition.state).toBe("missing");
    expect(nutrition.explanation).toContain("إجابات جزئية");
    expect(nutrition.explanation).not.toContain("الأطعمة المقلية:");
  });

  it("supports the legacy alcohol response schema without treating it as missing", () => {
    const answers = currentAnswers({ _questionnaireVersion: "legacy", alcohol: "3" });
    delete answers.alcoholUse;
    const substances = lifestylePillarInsights(answers).find(item => item.key === "substances")!;

    expect(substances.state).toBe("none");
    expect(substances.explanation).toBe("لم يظهر جانب محدد للتحسين بناء على إجاباتك.");
  });

  it("reports actual activity and food frequencies rather than generic lowest-domain advice", () => {
    const insights = lifestylePillarInsights(currentAnswers({
      activeDays: 1,
      activeMinutes: 20,
      strengthDays: 0,
      fruit: "0.5",
      sugary: "10.5",
    }));

    const activity = insights.find(item => item.key === "activity")!;
    const nutrition = insights.find(item => item.key === "nutrition")!;
    expect(activity.explanation).toContain("1 أيام نشاط أسبوعيًا");
    expect(activity.explanation).toContain("20 دقيقة");
    expect(nutrition.explanation).toContain("الفواكه");
    expect(nutrition.explanation).toContain("الأطعمة والمشروبات الغنية بالسكر المضاف");
  });
});
