import { describe, expect, it } from "vitest";
import { completedEventJourneySteps } from "./eventJourney";

describe("completedEventJourneySteps", () => {
  it("keeps body analysis incomplete after lifestyle assessment", () => {
    expect(completedEventJourneySteps(true, {
      importance: 7,
      confidence: 6,
      fruit: "5",
      vegetables: "5",
    }, false)).toBe(2);
  });

  it("marks the five-step journey complete only after the current X18 measurement arrives", () => {
    expect(completedEventJourneySteps(true, { importance: 7, confidence: 6 }, true)).toBe(5);
  });

  it("handles newly created and absent sessions", () => {
    expect(completedEventJourneySteps(true, {}, false)).toBe(1);
    expect(completedEventJourneySteps(false, undefined, false)).toBe(0);
  });
});
