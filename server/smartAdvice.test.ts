import { describe, it, expect } from "vitest";
import { composeEventLifestyleDraft } from "../shared/eventRecommendationCatalog";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import EventLifestyleCharts from "../client/src/components/EventLifestyleCharts";
import { eventLifestyleSections } from "../shared/eventLifestyle";
import { lifestyleReport } from "../shared/eventLifestyleInsights";
describe("single practical action plan", () => {
  it("uses measurable time-bound physician steps with gradual activity and source-selected topics", () => {
    const text = composeEventLifestyleDraft([
      "nutrition-plants",
      "activity-gradual",
      "sleep-routine",
    ]);
    expect(text).toContain("خمس حصص");
    expect(text).toContain("خمسة أيام");
    expect(text).toContain("خمس دقائق");
    expect(text).toContain("الأيام السبعة");
    expect(text).not.toContain("خمسة أصناف");
  });
  it("removes next steps from both display and print without removing strengths", () => {
    const answers: any = {
      _questionnaireVersion: "2026-09-28",
      importance: 7,
      confidence: 7,
      priority1: "nutrition",
      priority2: "activity",
      priority3: "sleep",
      fruit: 2,
      vegetables: 2,
      wholeGrains: 5,
      refinedGrains: 2,
      preparedFood: 2,
      sugary: 2,
      salty: 2,
      fried: 2,
      proteins: ["fish", "legumes"],
      sleepHours: 2,
      dayTired: 1,
      activeDays: 3,
      activeMinutes: 20,
      strengthDays: 1,
      lowInterest: 0,
      lowMood: 0,
      notOnTop: 0,
      overwhelmed: 0,
      purpose: 3,
      support: 3,
      tobacco: 3,
      alcoholUse: 3,
      medMisuse: 3,
      cannabis: 3,
      otherDrugs: 3,
    };
    for (const q of eventLifestyleSections.flatMap(s => s.questions)) {
      if (q.type === "radio" && typeof answers[q.id] === "number")
        answers[q.id] = String(answers[q.id]);
    }
    expect(lifestyleReport(answers).complete).toBe(true);
    for (const compact of [true, false]) {
      const html = renderToStaticMarkup(
        React.createElement(EventLifestyleCharts, { answers, compact })
      );
      expect(html).not.toContain("خطواتك الصحية القادمة");
      expect(html).toContain("نقاط القوة");
      expect(html).toContain("جوانب التحسين");
    }
  });
});
