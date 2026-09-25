import { describe, expect, it } from "vitest";
import {
  eventFormattedValue,
  eventNumeric,
  eventReadingValues,
  eventReferenceRange,
} from "../client/src/lib/eventResultsData";

describe("Events body-result data mapping", () => {
  it("uses the current X18 machine metric names and preserves reference ranges", () => {
    const values = eventReadingValues({
      id: 1,
      recordedAt: new Date("2026-09-25T10:00:00Z"),
      height: "174",
      weight: "76.9",
      bmi: "25.4",
      machineMetrics: {
        fatRate: "35.3",
        fatRate_s: "0",
        fatRate_n: "18.0 - 30.0",
        muscleRightArm: "2.2",
        bmr: "1426",
      },
    });

    expect(values).toMatchObject({ height: "174", weight: "76.9", bmi: "25.4", fatRate: "35.3" });
    expect(eventReferenceRange(values, "fatRate")).toBe("18.0 - 30.0");
    expect(eventFormattedValue(values.bmr, "سعرة / يوم")).toBe("1,426 سعرة / يوم");
  });

  it("does not manufacture numerical results from invalid or absent machine values", () => {
    expect(eventNumeric("not-a-number")).toBeNull();
    expect(eventNumeric(undefined)).toBeNull();
    expect(eventFormattedValue("", "kg")).toBe("—");
  });
});
