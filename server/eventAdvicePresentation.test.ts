import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { presentEventAdvice } from "../shared/eventAdvicePresentation";
import { composeEventLifestyleDraft } from "../shared/eventRecommendationCatalog";
import EventPrintReport from "../client/src/components/EventPrintReport";
import { LanguageProvider } from "../client/src/contexts/LanguageContext";
import { eventPdfFailureCode } from "../client/src/lib/eventPdfFailure";
const opening =
  "نتائج BIA تقديرات وليست تشخيصًا؛ لا يُستنتج ضعف العضلات من كتلتها وحدها، ولا يُعد العمر الجسدي أو مؤشر الدهون الحشوية هدفًا علاجيًا.";
const clause = "اختر منها ما يلائمك وناقش أي قلق صحي مع مختص.";
const footer =
  "مواعيد البداية والتدرج أمثلة تطبيقية لأهداف SMART تُعدَّل حسب القدرة وتفضيلات الشخص؛ ليست جرعات منقولة حرفيًا من المراجع.";
const current = composeEventLifestyleDraft([
  "body-aerobic",
  "body-resistance",
  "nutrition-sugary",
  "nutrition-plants",
]);
const legacy = [
  opening,
  current.replace(
    "توصيات تثقيفية مبنية على بيانات هذه الزيارة.",
    "توصيات تثقيفية مبنية على بيانات هذه الزيارة؛ " + clause
  ),
  footer,
].join("\n");
afterEach(() => vi.unstubAllGlobals());
describe("retired recommendation framing", () => {
  it("removes exactly the retired paragraphs and clause from legacy advice, keeping current cards intact", () => {
    expect(presentEventAdvice(legacy)).toBe(current);
    expect(
      presentEventAdvice(`(${opening})\r\n${current}\r\n(${footer})`)
    ).toBe(current);
    expect(
      presentEventAdvice("ملاحظة الطبيب الخاصة: نتيجة الجهاز تحتاج متابعة.")
    ).toBe("ملاحظة الطبيب الخاصة: نتيجة الجهاز تحتاج متابعة.");
    expect(presentEventAdvice(null)).toBe("");
  });
  it.each(["ar", "en"] as const)(
    "omits the same framing in the %s screen/export presentation",
    language => {
      vi.stubGlobal("localStorage", { getItem: () => language });
      const care = {
        advice: legacy,
        doctorName: "Synthetic clinician",
        measurements: {},
      };
      const before = JSON.stringify(care);
      const html = renderToStaticMarkup(
        createElement(LanguageProvider, {
          children: createElement(EventPrintReport, {
            participant: { code: "SYNTHETIC-ONLY" },
            readings: [],
            answers: {},
            lifestyleEnabled: false,
            care,
          }),
        })
      );
      for (const removed of [opening, clause, footer])
        expect(html).not.toContain(removed);
      expect(html).toContain(
        language === "en"
          ? "Educational recommendations based on this visit"
          : "توصيات تثقيفية مبنية على بيانات هذه الزيارة."
      );
      expect(JSON.stringify(care)).toBe(before);
    }
  );
  it("keeps browser diagnostics free from report content", () => {
    expect(
      eventPdfFailureCode(
        new Error("Attempting to parse an unsupported color function oklch")
      )
    ).toBe("STYLE_CAPTURE");
    expect(
      eventPdfFailureCode(
        new Error("Failed to fetch dynamically imported module")
      )
    ).toBe("MODULE_LOAD");
    expect(eventPdfFailureCode(new Error("Synthetic private text"))).toBe(
      "CAPTURE_FAILED"
    );
  });
});
