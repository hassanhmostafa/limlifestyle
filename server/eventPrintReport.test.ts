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
  const print = renderToStaticMarkup(
    createElement(EventPrintReport, {
      readings,
      participant,
      answers: {},
      lifestyleEnabled: true,
      care: { advice, doctorName: "الطبيب", measurements: {} },
    })
  );
  const cards = (html: string) =>
    html.match(/<article data-body-metric=.*?<\/article>/g);
  expect(cards(print)).toEqual(cards(screen));
  expect(cards(print)).toHaveLength(8);
  expect(print).toContain("/api/events/anatomy/fat");
  expect(print).toContain("/api/events/anatomy/muscle");
  expect(print.match(/lim-print-advice-line/g)).toHaveLength(
    advice.split("\n").length
  );
  expect(print).toContain("نص عربي مع English 123.");
  expect(print).toContain("نهاية التوصيات");
  expect(print).toContain("SAME-RECORD");
});
