import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventBodyResults } from "../client/src/components/EventBodyResults";

describe("EventBodyResults", () => {
  it("renders the dedicated X18 Events result design with the two anatomical modes", () => {
    const markup = renderToStaticMarkup(
      createElement(EventBodyResults, { readings: [{
        id: 71,
        recordedAt: new Date("2026-09-25T10:00:00Z"),
        recordNo: "EVENT-20260925-001",
        deviceNo: "G260820131014906",
        height: "174.5",
        weight: "76.6",
        bmi: "25.2",
        machineMetrics: {
          fatRate: "35.3",
          muscle: "42.8",
          skeletalMuscle: "25.2",
          waterRate: "47.3",
          fat: "26.7",
          bmr: "1426",
          muscleRightArm: "2.2",
          muscleLeftArm: "2.3",
          muscleTrunk: "20.6",
          muscleRightLeg: "6.9",
          muscleLeftLeg: "7.1",
          fatRightArm: "1.6",
          fatLeftArm: "1.6",
          fatTrunk: "15.3",
          fatRightLeg: "4.1",
          fatLeftLeg: "4.1",
        },
      }] }),
    );

    expect(markup).toContain("نتائج تحليل الجسم");
    expect(markup).toContain("توزيع الدهون والعضلات");
    expect(markup).toContain("الحرق ومؤشرات إضافية");
    expect(markup).toContain("body-muscle_d437e41d.png");
    expect(markup).toContain("الدهون");
  });

  it("visibly labels generated QR-step reports as test data", () => {
    const markup = renderToStaticMarkup(
      createElement(EventBodyResults, { readings: [{
        id: 72,
        source: "x18_test",
        recordedAt: new Date("2026-09-25T10:00:00Z"),
        recordNo: "EVENT-TEST-20260925-001",
        deviceNo: "EVENTS_TEST",
        height: "174.5",
        weight: "76.6",
        bmi: "25.2",
        machineMetrics: { fatRate: "25.3", muscle: "42.8", bmr: "1426" },
      }] }),
    );

    expect(markup).toContain("بيانات اختبار");
    expect(markup).toContain("قيم اختبار مولّدة عشوائيًا ومرفوعة عبر رابط بيانات X18");
  });
});
