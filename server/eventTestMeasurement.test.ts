import { describe, expect, it } from "vitest";
import { createEventTestMeasurement } from "./lib/eventTestMeasurement";

describe("createEventTestMeasurement", () => {
  it("creates a unique full X18-like metric set for the Events QR test action", () => {
    const result = createEventTestMeasurement();

    expect(result.recordNo).toMatch(/^EVENT-TEST-/);
    expect(result.weight).toMatch(/^\d+\.\d$/);
    expect(result.height).toMatch(/^\d+\.\d$/);
    expect(Number(result.bmi)).toBeGreaterThan(10);
    expect(result.sbp).toBeGreaterThanOrEqual(110);
    expect(result.dbp).toBeGreaterThanOrEqual(65);
    expect(result.hr).toBeGreaterThanOrEqual(60);
    expect(result.machineMetrics).toMatchObject({
      weight: result.weight,
      height: result.height,
      bmi: result.bmi,
      fatRate: expect.any(String),
      skeletalMuscle: expect.any(String),
      waterRate: expect.any(String),
      muscleRightArm: expect.any(String),
      muscleTrunk: expect.any(String),
      fatLeftLeg: expect.any(String),
      bmr: expect.any(String),
      waterICW: expect.any(String),
      sbp: String(result.sbp),
      dbp: String(result.dbp),
      hr: String(result.hr),
      fatRate_s: "1",
      fatRate_n: "18.0 - 30.0",
    });
  });
});
