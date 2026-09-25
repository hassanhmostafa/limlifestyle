import { describe, expect, it } from "vitest";
import { completedEventJourneySteps, nextEventScreenAfterMeasurement } from "../client/src/lib/eventJourney";

describe("completedEventJourneySteps", () => {
  it("keeps body analysis incomplete after lifestyle assessment", () => {
    expect(completedEventJourneySteps(true, {
      importance: 7,
      confidence: 6,
      fruit: "5",
      vegetables: "5",
    }, false)).toBe(2);
  });

  it("opens the medical consultation after the current X18 measurement arrives", () => {
    expect(completedEventJourneySteps(true, { importance: 7, confidence: 6 }, true)).toBe(3);
    expect(nextEventScreenAfterMeasurement("device", true)).toBe("queue");
    expect(nextEventScreenAfterMeasurement("queue", true)).toBe("queue");
    expect(nextEventScreenAfterMeasurement("device", false)).toBe("device");
  });

  it("handles newly created and absent sessions", () => {
    expect(completedEventJourneySteps(true, {}, false)).toBe(1);
    expect(completedEventJourneySteps(false, undefined, false)).toBe(0);
  });
});
