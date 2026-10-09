import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EventLifestyleCharts, {
  LifestyleBandReference,
} from "../client/src/components/EventLifestyleCharts";
import {
  EVENT_LIFESTYLE_VERSION,
  eventLifestyleSections,
  type EventAnswers,
} from "../shared/eventLifestyle";

function completeAnswers(): EventAnswers {
  const answers: EventAnswers = { _questionnaireVersion: EVENT_LIFESTYLE_VERSION };
  for (const section of eventLifestyleSections) {
    for (const question of section.questions) {
      if (question.id === "priority1") answers[question.id] = "nutrition";
      else if (question.id === "priority2") answers[question.id] = "activity";
      else if (question.id === "priority3") answers[question.id] = "sleep";
      else if (question.type === "multi") answers[question.id] = [];
      else if (question.type === "number") answers[question.id] = question.min ?? 0;
      else if (question.type === "slider") answers[question.id] = 8;
      else answers[question.id] = question.options?.[0]?.value ?? "";
    }
  }
  Object.assign(answers, {
    fruit: "5", vegetables: "0.5", wholeGrains: "5", refinedGrains: "2",
    preparedFood: "2", sugary: "2", salty: "2", fried: "2",
    proteins: ["legumes", "nuts"], sleepHours: "3", dayTired: "0",
    activeDays: 4, activeMinutes: 45, strengthDays: 2,
    lowInterest: "0", lowMood: "0", notOnTop: "0", overwhelmed: "0",
    purpose: "3", support: "3", tobacco: "3", alcoholUse: "3",
    medMisuse: "3", cannabis: "3", otherDrugs: "3",
  });
  return answers;
}

describe("participant lifestyle report", () => {
  it("renders score reference, strengths, next steps and all six answer-based improvement rows", () => {
    const markup = renderToStaticMarkup(
      createElement(EventLifestyleCharts, { answers: completeAnswers() })
    );

    expect(markup).toContain("المؤشر العام");
    expect(markup).toContain("أهمية التغيير");
    expect(markup).toContain("الثقة بالقدرة");
    expect(markup).toContain("المحاور الستة");
    expect(markup).toContain("مرجع المؤشر العام");
    expect(markup).toContain("سلوكيات صحية مثالية");
    expect(markup).toContain("سلوكيات صحية متوسطة");
    expect(markup).toContain("سلوكيات صحية دون المستوى الأمثل");
    expect(markup).toContain("سلوكيات صحية عالية الخطورة");
    expect(markup).toContain("جوانب التحسين بناء على إجاباتك");
    expect(markup).toContain("نقاط القوة في نمط حياتك");
    expect(markup).toContain("خطواتك الصحية القادمة");
    expect(markup).toContain("تجنب المواد الضارة");
    expect(markup).toContain("data-pdf-keep");
    expect(markup).toContain("data-lifestyle-improvement");
    expect(markup).toContain("data-lifestyle-reference-title");
    expect(markup).toContain("data-lifestyle-improvements-heading");
    expect(markup).toContain("data-lifestyle-bullet-glyph");
    expect(markup).toContain("data-lifestyle-next-step");
    expect(markup).not.toContain("<table");
  });

  it("uses the shared blue band on the 51-point boundary and colors every legend row", () => {
    const markup = renderToStaticMarkup(
      createElement(LifestyleBandReference, { score: 51 })
    );

    expect(markup).toContain("data-lifestyle-band-row=\"76\"");
    expect(markup).toContain("data-lifestyle-band-row=\"51\"");
    expect(markup).toContain("data-lifestyle-band-row=\"26\"");
    expect(markup).toContain("data-lifestyle-band-row=\"0\"");
    expect(markup).toContain("#3579be");
    expect(markup).toContain("#238b57");
    expect(markup).toContain("#c98220");
    expect(markup).toContain("#bd4747");
    expect(markup).toContain("✓");
  });
});
