import { describe, it, expect } from "vitest";
import {
  eventLifestyleSections,
  lifestyleSectionsForAnswers,
  scoreEventLifestyle,
  EVENT_LIFESTYLE_VERSION,
  revisedLifestyleComplete,
  eventQuestionAnswered,
} from "../shared/eventLifestyle";
describe("revised questionnaire compatibility", () => {
  it("rejects out-of-range, missing and unknown-choice values", () => {
    const q = eventLifestyleSections
      .flatMap(s => s.questions)
      .find(q => q.id === "activeDays")!;
    expect(eventQuestionAnswered(q, { activeDays: 8 })).toBe(false);
    expect(eventQuestionAnswered(q, { activeDays: "" })).toBe(false);
    expect(eventQuestionAnswered(q, { activeDays: 0 })).toBe(true);
    expect(
      revisedLifestyleComplete({
        _questionnaireVersion: EVENT_LIFESTYLE_VERSION,
      })
    ).toBe(false);
  });
  it("keeps original alcohol question meaning in historical reports", () => {
    const old = lifestyleSectionsForAnswers({ alcohol: "3" })
      .flatMap(s => s.questions)
      .find(q => q.id === "alcohol");
    expect(old?.text).toContain("5 مشروبات");
    const revised = eventLifestyleSections.flatMap(s => s.questions);
    expect(revised.find(q => q.id === "alcohol")).toBeUndefined();
    expect(revised.find(q => q.id === "alcoholUse")?.text).toContain(
      "كم مرة تناولت"
    );
  });
  it("adds game meat and preserves the approved sleep section", () => {
    expect(
      eventLifestyleSections
        .flatMap(s => s.questions)
        .find(q => q.id === "proteins")
        ?.options?.some(o => o.value === "gameMeat")
    ).toBe(true);
    expect(eventLifestyleSections.find(s => s.id === "sleep")).toEqual(
      lifestyleSectionsForAnswers({}).find(s => s.id === "sleep")
    );
  });
  it("scores the new alcohol answer independently of legacy values", () => {
    const base = {
      tobacco: "3",
      medMisuse: "3",
      cannabis: "3",
      otherDrugs: "3",
    };
    expect(
      scoreEventLifestyle({ ...base, alcoholUse: "0", alcohol: "3" }).domains
        .substances
    ).toBe(8);
    expect(
      scoreEventLifestyle({ ...base, alcohol: "3" }).domains.substances
    ).toBe(10);
  });
  it("selects the new dictionary by explicit version", () =>
    expect(
      lifestyleSectionsForAnswers({
        _questionnaireVersion: EVENT_LIFESTYLE_VERSION,
      })
    ).toBe(eventLifestyleSections));
});
