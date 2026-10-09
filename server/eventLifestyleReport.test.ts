import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EventLifestyleCharts from "../client/src/components/EventLifestyleCharts";
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
  return answers;
}

describe("participant lifestyle report", () => {
  it("renders score reference and all six answer-based improvement rows", () => {
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
    expect(markup).toContain("تجنب المواد الضارة");
    expect(markup).toContain("data-pdf-keep");
    expect(markup).not.toContain("فرصتك القادمة للتحسين");
    expect(markup).not.toContain("استخدام مواد مخدرة أخرى: أبدًا");
  });
});
