import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventBodyResults } from "../client/src/components/EventBodyResults";
import {
  eventAdultWeightRange,
  eventMuscleBalance,
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
    expect(markup).toContain("توازن العضلات");
    expect(markup).toContain("النطاق الإرشادي حسب الطول");
    expect(markup).toContain("أعلى من النطاق الإرشادي");
    expect(markup).not.toContain("كتلة العظام");
    expect(markup).not.toContain("ماء الجسم");
    expect(markup).not.toContain("الضغط الانقباضي");
  });
});
