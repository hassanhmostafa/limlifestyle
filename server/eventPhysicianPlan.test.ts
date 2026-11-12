import { describe, expect, it } from "vitest";
import { composePhysicianPlan } from "./eventPhysicianPlan";
const priorities = {
  priority1: "activity",
  priority2: "sleep",
  priority3: "nutrition",
};
describe("physician FITT/SMART plans", () => {
  it("uses exactly three participant priorities in order and never adds other pillars", () => {
    const plan = composePhysicianPlan({
      ...priorities,
      activeDays: 0,
      activeMinutes: 0,
      strengthDays: 0,
      sleepHours: "1",
      vegetables: "0",
      tobacco: "0",
    });
    expect(plan.priorities).toEqual(["activity", "sleep", "nutrition"]);
    expect(plan.advice.match(/الوصفة FITT/g)).toHaveLength(3);
    expect(plan.advice).not.toContain("الإقلاع");
    expect(plan.advice.indexOf("1. النشاط البدني")).toBeLessThan(
      plan.advice.indexOf("2. النوم")
    );
  });
  it("changes goals from beginner to maintenance based on actual activity answers", () => {
    expect(
      composePhysicianPlan({ ...priorities, activeDays: 0, activeMinutes: 0 })
        .advice
    ).toContain("امشِ 15");
    const active = composePhysicianPlan({
      ...priorities,
      activeDays: 5,
      activeMinutes: 40,
      strengthDays: 3,
    }).advice;
    expect(active).toContain("حافظ على نشاطك");
    expect(active).not.toContain("امشِ 15");
  });
  it("does not infer missing answers as poor habits", () => {
    const advice = composePhysicianPlan(priorities).advice;
    expect(advice).toContain("لا تتوفر إجابات كافية");
    expect(advice).not.toContain("امشِ 15");
    expect(advice).not.toContain("أضف الخضروات");
  });
  it("rejects missing, repeated, and unrecognized priorities", () => {
    for (const a of [
      {},
      { priority1: "sleep", priority2: "sleep", priority3: "nutrition" },
      { ...priorities, priority1: "injected" },
    ])
      expect(() => composePhysicianPlan(a)).toThrow("ثلاث أولويات");
  });
  it("distinguishes abstinence from substance use and low support from frequent support", () => {
    const a = {
      priority1: "substances",
      priority2: "connection",
      priority3: "stress",
      tobacco: "3",
      alcoholUse: "0",
      support: "0",
      overwhelmed: "3",
    };
    const advice = composePhysicianPlan(a).advice;
    expect(advice).toContain("تقييمًا لدى مختص");
    expect(advice).not.toContain("سجل مرات استخدام التبغ");
    expect(advice).toContain("شخصًا واحدًا موثوقًا");
    expect(composePhysicianPlan({ ...a, support: "3" }).advice).not.toContain(
      "شخصًا واحدًا موثوقًا"
    );
  });
});
