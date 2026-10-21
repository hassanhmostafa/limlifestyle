import { createElement } from "react";
import { Router } from "wouter";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../client/src/contexts/LanguageContext";
import EventPrintReport from "../client/src/components/EventPrintReport";
import { eventText } from "../shared/eventTranslations";
import {
  eventRecommendationCatalog,
  composeEventLifestyleDraft,
} from "../shared/eventRecommendationCatalog";
import {
  eventLifestyleSections,
  lifestyleSectionsForAnswers,
  EVENT_LIFESTYLE_VERSION,
  type EventAnswers,
} from "../shared/eventLifestyle";
import { archivedQuestionnaires } from "../shared/questionnaireArchive";
import { assessmentAnswersPdf } from "./assessmentCompanion";
import { EventTerms, EventPrivacy } from "../client/src/pages/EventLegal";

afterEach(() => vi.unstubAllGlobals());
const arabic = /[\u0600-\u06ff]/;
function englishRender(component: ReturnType<typeof createElement>) {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  return renderToStaticMarkup(
    createElement(LanguageProvider, {
      children: createElement(Router, {
        ssrPath: "/events",
        children: component,
      }),
    })
  );
}
function completeAnswers() {
  const answers: EventAnswers = {
    _questionnaireVersion: EVENT_LIFESTYLE_VERSION,
  };
  for (const section of eventLifestyleSections)
    for (const q of section.questions) {
      answers[q.id] = q.type === "multi" ? [] : (q.options?.[0]?.value ?? 5);
    }
  Object.assign(answers, {
    priority1: "nutrition",
    priority2: "activity",
    priority3: "sleep",
  });
  return answers;
}

describe("native participant localization", () => {
  it("covers current and legacy question wording, response anchors and units without rewriting definitions", () => {
    for (const answers of [
      {},
      { _questionnaireVersion: EVENT_LIFESTYLE_VERSION },
    ]) {
      const sections = lifestyleSectionsForAnswers(answers);
      const before = JSON.stringify(sections);
      for (const section of sections)
        for (const text of [
          section.title,
          section.intro,
          ...section.questions.flatMap(q => [
            q.text,
            q.suffix,
            ...(q.options?.map(o => o.label) ?? []),
          ]),
        ]) {
          if (text) expect(eventText(text, "en"), text).not.toMatch(arabic);
        }
      expect(JSON.stringify(sections)).toBe(before);
    }
  });
  it("translates all controlled advice and preserves unknown physician text", () => {
    for (const card of eventRecommendationCatalog) {
      expect(eventText(card.text, "en"), card.id).not.toMatch(arabic);
      expect(eventText(`2. ${card.text}`, "en")).toMatch(/^2\. /);
      expect(eventText(card.text, "ar")).toBe(card.text);
    }
    expect(eventText("ملاحظة خاصة لا تطابق أي بطاقة", "en")).toBe(
      "ملاحظة خاصة لا تطابق أي بطاقة"
    );
    expect(eventText(" أهلًا Alex ", "en")).toBe(" Welcome Alex ");
    expect(eventText("الشعور بالضغط: عدة أيام.", "en")).toBe(
      "Feeling stressed: Several days."
    );
  });
  it("renders an English report without changing identifiers, clinical values or approval data", () => {
    const props = {
      participant: {
        firstName: "Synthetic Participant",
        code: "SYNTHETIC-ONLY",
        phone: "+966500000000",
        sex: "male",
        age: 40,
      },
      readings: [
        {
          id: 1,
          recordNo: "TEST-ONLY",
          recordedAt: "2026-10-21T12:00:00Z",
          height: "170",
          weight: "80",
          bmi: "27.68",
          machineMetrics: { muscleRightArm: "2.49", fatRightArm: "2.1" },
        },
      ],
      answers: completeAnswers(),
      lifestyleEnabled: true,
      care: {
        advice: composeEventLifestyleDraft([
          "body-aerobic",
          "body-resistance",
          "nutrition-sugary",
          "nutrition-plants",
        ]),
        doctorName: null,
        consultationMode: "automatic" as const,
        nursingCompletedAt: "2026-10-21",
        measurements: { blood_glucose: { value: "100", context: "صائم" } },
      },
    };
    const before = JSON.stringify(props);
    const html = englishRender(createElement(EventPrintReport, props));
    expect(html).toContain('lang="en"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("Body composition results");
    expect(html).toContain("Lifestyle questionnaire results");
    expect(html).toContain("SYNTHETIC-ONLY");
    expect(html).toContain("27.68");
    expect(html).toContain("2.49 kg");
    expect(html).not.toMatch(arabic);
    expect(JSON.stringify(props)).toBe(before);
  });
  it("renders English consent documents", () => {
    expect(englishRender(createElement(EventTerms))).not.toMatch(arabic);
    expect(englishRender(createElement(EventPrivacy))).not.toMatch(arabic);
  });
  it("creates deterministic English answer PDFs while preserving the canonical companion and Arabic PDF", async () => {
    const data = {
      version: 1 as const,
      approvedAt: "2026-10-21T12:00:00Z",
      binding: {
        archiveId: "synthetic",
        revision: 1,
        reportPdfSha256: "a".repeat(64),
        snapshotSha256: "b".repeat(64),
      },
      participant: {
        id: null,
        code: "SYNTHETIC-ONLY",
        name: "Test",
        mobile: null,
        city: null,
        age: 40,
        sex: "male",
      },
      questionnaires: archivedQuestionnaires(["lifestyle"], completeAnswers()),
      nursing: [],
    };
    const before = JSON.stringify(data);
    const ar = await assessmentAnswersPdf(data as any);
    const en = await assessmentAnswersPdf(data as any, "en");
    expect(en.subarray(0, 4).toString()).toBe("%PDF");
    expect(en.equals(ar)).toBe(false);
    expect((await assessmentAnswersPdf(data as any, "en")).equals(en)).toBe(
      true
    );
    expect((await assessmentAnswersPdf(data as any)).equals(ar)).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
  });
});

it("does not disclose stack traces in the production fallback", async () => {
  vi.stubEnv("DEV", false);
  try {
    const { default: ErrorBoundary } = await import(
      "../client/src/components/ErrorBoundary"
    );
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = {
      hasError: true,
      error: new Error("PRIVATE_STACK_SENTINEL"),
    };
    const html = renderToStaticMarkup(boundary.render());
    expect(html).not.toContain("PRIVATE_STACK_SENTINEL");
    expect(html).not.toContain("<pre");
    expect(html).toContain('translate="no"');
  } finally {
    vi.unstubAllEnvs();
  }
});
