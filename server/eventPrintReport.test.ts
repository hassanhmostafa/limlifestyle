import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import EventPrintReport from "../client/src/components/EventPrintReport";
import { EventBodyResults } from "../client/src/components/EventBodyResults";

it("prints the exact same eight measurements and both distributions, preserving long advice", () => {
  const readings = [
    {
      id: 1,
      recordNo: "SAME-RECORD",
      recordedAt: new Date("2026-10-06T08:00:00Z"),
      height: "161.5",
      weight: "75.2",
      bmi: "28.8",
      machineMetrics: {
        bmi_s: "1",
        fatRightArm: "2.1",
        muscleRightArm: "2.49",
      },
    },
  ];
  const participant = { firstName: "اختبار", code: "TEST" };
  const advice = "نص عربي مع English 123.\n".repeat(80) + "نهاية التوصيات";
  const screen = renderToStaticMarkup(
    createElement(EventBodyResults, { readings, participant })
  );
  const enabledPrint = renderToStaticMarkup(
    createElement(EventPrintReport, {
      readings,
      participant,
      answers: {
        importance: 5, confidence: 5, priority1: "nutrition", priority2: "activity", priority3: "sleep",
        fruit: "5", vegetables: "5", wholeGrains: "5", refinedGrains: "2", preparedFood: "2", sugary: "2", salty: "2", fried: "2", proteins: ["legumes"],
        sleepHours: "3", dayTired: "0", activeDays: 3, activeMinutes: 30, strengthDays: 2,
        lowInterest: "0", lowMood: "0", notOnTop: "0", overwhelmed: "0", purpose: "3", support: "3",
        tobacco: "3", alcohol: "3", medMisuse: "3", cannabis: "3", otherDrugs: "3",
      },
      lifestyleEnabled: true,
      care: { advice, doctorName: "الطبيب", measurements: {} },
    })
  );
  const cards = (html: string) =>
    html.match(/<article data-body-metric=.*?<\/article>/g);
  expect(cards(enabledPrint)).toEqual(cards(screen));
  expect(cards(enabledPrint)).toHaveLength(8);
  expect(enabledPrint).toContain("/api/events/anatomy/fat");
  expect(enabledPrint).toContain("/api/events/anatomy/muscle");
  expect(enabledPrint.match(/lim-print-advice-line/g)).toHaveLength(
    advice.split("\n").length
  );
  expect(enabledPrint).toContain("نص عربي مع English 123.");
  expect(enabledPrint).toContain("نهاية التوصيات");
  expect(enabledPrint).toContain("SAME-RECORD");
  expect(enabledPrint).toContain('data-pdf-logical-page="questionnaire"');
  expect(enabledPrint).toContain('data-pdf-logical-page="body"');
  expect(enabledPrint.indexOf("توصيات الطبيب")).toBeLessThan(enabledPrint.indexOf("نتائج استبيان نمط الحياة"));
  expect(enabledPrint.indexOf("نتائج استبيان نمط الحياة")).toBeLessThan(enabledPrint.indexOf("نتائج تحليل الجسم"));
  expect(enabledPrint).toContain("جوانب التحسين بناء على إجاباتك");

  const disabledPrint = renderToStaticMarkup(
    createElement(EventPrintReport, {
      readings,
      participant,
      answers: { fruit: "0" },
      lifestyleEnabled: false,
      care: { advice: "توصية في أعلى صفحة تحليل الجسم", doctorName: "الطبيب", measurements: {} },
    })
  );
  expect(disabledPrint.match(/data-pdf-logical-page/g)).toHaveLength(1);
  expect(disabledPrint).not.toContain("نتائج استبيان نمط الحياة");
  expect(disabledPrint.indexOf("توصية في أعلى صفحة تحليل الجسم")).toBeLessThan(disabledPrint.indexOf("نتائج تحليل الجسم"));
});
