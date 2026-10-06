import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventBodyResults } from "../client/src/components/EventBodyResults";
import {
  eventAdultWeightRange,
  eventMuscleBalance,
  eventMetricReference,
  eventMetricStatus,
} from "../client/src/lib/eventResultsData";

describe("Events approved body-composition report", () => {
  it("calculates only the documented adult weight fallback and transparent side balance", () => {
    expect(eventAdultWeightRange("161.5")).toBe("48.3 - 64.9");
    expect(eventAdultWeightRange("invalid")).toBeNull();

    expect(
      eventMuscleBalance({
        muscleRightArm: "2.5",
        muscleLeftArm: "2.4",
        muscleRightLeg: "7.0",
        muscleLeftLeg: "6.3",
      })
    ).toEqual({
      armsDifference: 4,
      legsDifference: 10,
      maximumDifference: 10,
      isClose: true,
    });
  });

  it("shows the approved metrics and omits non-approved raw X18 measurements", () => {
    const markup = renderToStaticMarkup(
      createElement(EventBodyResults, {
        readings: [
          {
            id: 73,
            recordedAt: new Date("2026-10-05T10:00:00Z"),
            height: "161.5",
            weight: "75.2",
            bmi: "28.8",
            machineMetrics: {
              fatRate: "38.1",
              fatRate_s: "2",
              fatRate_n: "10.0 - 20.0",
              skeletalMuscle: "25.9",
              vfal: "13",
              whr: "0.94",
              bodyAge: "51",
              bmr: "1426",
              muscleRightArm: "2.49",
              muscleLeftArm: "2.47",
              muscleRightLeg: "7.05",
              muscleLeftLeg: "7.05",
              bone: "3.35",
              waterRate: "45.2",
              sbp: "126",
            },
          },
        ],
      })
    );

    expect(markup).toContain("العضلات الهيكلية");
    expect(markup).toContain("نسبة الخصر إلى الورك");
    expect(markup).toContain("العمر الجسدي التقديري");
    expect(markup).not.toContain("توازن العضلات");
    expect(markup).not.toContain("معدل الأيض الأساسي");
    expect(markup).toContain("الطبيعي حسب الطول للبالغين");
    expect(markup).toContain("مرتفع");
    expect(markup).not.toContain("كتلة العظام");
    expect(markup).not.toContain("ماء الجسم");
    expect(markup).not.toContain("الضغط الانقباضي");
  });

  it("classifies against the displayed range even if the device flag contradicts it", () => {
    expect(eventMetricStatus({ bmi: "29.9", bmi_s: "1", bmi_n: "18.5 - 24.9" }, "bmi")).toEqual({ code: "2", label: "مرتفع" });
    expect(eventMetricStatus({ fatRate: "9", fatRate_n: "10–20" }, "fatRate")?.label).toBe("منخفض");
    expect(eventMetricStatus({ fatRate: "20", fatRate_n: "10–20" }, "fatRate")?.label).toBe("طبيعي");
    expect(eventMetricStatus({ fatRate: "", fatRate_s: "1" }, "fatRate")).toBeNull();
    expect(eventMetricStatus({ vfal: "5" }, "vfal")).toBeNull();
    for (const key of ["height", "bodyAge"]) {
      expect(eventMetricStatus({ [key]: "50", [`${key}_s`]: "2" }, key)).toBeNull();
      expect(eventMetricReference({ [`${key}_n`]: "20 - 30" }, key)).toBeNull();
    }
  });
});
