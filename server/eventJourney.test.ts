import { describe, expect, it } from "vitest";
import { completedEventJourneySteps } from "../client/src/lib/eventJourney";

describe("completedEventJourneySteps", () => {
  it("keeps body analysis incomplete after lifestyle assessment", () => {
    expect(completedEventJourneySteps(true, {
      importance: 7,
      confidence: 6,
      fruit: "5",
      vegetables: "5",
    }, false)).toBe(2);
  });

  it("keeps the consultation as the next step after the current X18 measurement arrives", () => {
    expect(completedEventJourneySteps(true, { importance: 7, confidence: 6 }, true)).toBe(3);
  });

  it("finishes consultation after doctor approval and report after participant acknowledgement", () => {
    expect(completedEventJourneySteps(true, { importance: 7, confidence: 6 }, true, true)).toBe(4);
    expect(completedEventJourneySteps(true, { importance: 7, confidence: 6 }, true, true, true)).toBe(5);
  });

  it("skips the questionnaire without manufacturing answers", () => {
    expect(completedEventJourneySteps(true, {}, false, false, false, false)).toBe(1);
    expect(completedEventJourneySteps(true, {}, true, false, false, false)).toBe(2);
    expect(completedEventJourneySteps(true, {}, true, true, false, false)).toBe(3);
    expect(completedEventJourneySteps(true, {}, true, true, true, false)).toBe(4);
  });

  it("handles newly created and absent sessions", () => {
    expect(completedEventJourneySteps(true, {}, false)).toBe(1);
    expect(completedEventJourneySteps(false, undefined, false)).toBe(0);
  });
});
