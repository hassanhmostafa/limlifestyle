import { describe, expect, it } from "vitest";
import { calculateBmi, computeAge, healthyBmiRange, idealWeightKg } from "../shared/bmi";

describe("computeAge", () => {
  it("computes age correctly for a known birth date", () => {
    // Use a fixed date relative to today
    const today = new Date();
    const birthYear = today.getFullYear() - 30;
    const birthDate = `${birthYear}-01-01`;
    const age = computeAge(birthDate);
    // Should be 30 or 29 depending on whether Jan 1 has passed this year
    expect(age).toBeGreaterThanOrEqual(29);
    expect(age).toBeLessThanOrEqual(30);
  });

  it("returns 0 for a newborn today", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(computeAge(today)).toBe(0);
  });
});

describe("healthyBmiRange", () => {
  it("returns 18.5–24.9 for adults under 65", () => {
    const range = healthyBmiRange(35);
    expect(range.min).toBe(18.5);
    expect(range.max).toBe(24.9);
  });

  it("returns 22–27 for seniors 65+", () => {
    const range = healthyBmiRange(70);
    expect(range.min).toBe(22);
    expect(range.max).toBe(27);
  });
});

describe("idealWeightKg", () => {
  it("calculates ideal weight for a 175cm male", () => {
    // 175cm = 68.9 inches; inches over 5ft = 68.9 - 60 = 8.9
    // Male: 50 + 2.3 * 8.9 = 50 + 20.47 = 70.47 kg
    const weight = idealWeightKg(175, "male");
    expect(weight).toBeCloseTo(70.47, 1);
  });

  it("calculates ideal weight for a 160cm female", () => {
    // 160cm = 62.99 inches; inches over 5ft = 62.99 - 60 = 2.99
    // Female: 45.5 + 2.3 * 2.99 = 45.5 + 6.88 = 52.38 kg
    const weight = idealWeightKg(160, "female");
    expect(weight).toBeCloseTo(52.38, 1);
  });
});

describe("calculateBmi", () => {
  it("correctly classifies a normal BMI", () => {
    // 70kg, 175cm → BMI = 70 / 1.75² = 22.9
    const result = calculateBmi(70, 175, "1990-01-01", "male");
    expect(result.actualBmi).toBeCloseTo(22.9, 0);
    expect(result.classification).toBe("Normal");
  });

  it("correctly classifies overweight", () => {
    // 90kg, 175cm → BMI = 90 / 1.75² = 29.4
    const result = calculateBmi(90, 175, "1990-01-01", "male");
    expect(result.actualBmi).toBeCloseTo(29.4, 0);
    expect(result.classification).toBe("Overweight");
  });

  it("correctly classifies obese", () => {
    // 110kg, 175cm → BMI = 110 / 1.75² = 35.9
    const result = calculateBmi(110, 175, "1990-01-01", "male");
    expect(result.actualBmi).toBeCloseTo(35.9, 0);
    expect(result.classification).toBe("Obese");
  });

  it("correctly classifies underweight", () => {
    // 50kg, 175cm → BMI = 50 / 1.75² = 16.3
    const result = calculateBmi(50, 175, "1990-01-01", "male");
    expect(result.actualBmi).toBeCloseTo(16.3, 0);
    expect(result.classification).toBe("Underweight");
  });

  it("ideal BMI is clamped within the healthy range", () => {
    const result = calculateBmi(80, 175, "1990-01-01", "male");
    expect(result.idealBmi).toBeGreaterThanOrEqual(result.healthyMin);
    expect(result.idealBmi).toBeLessThanOrEqual(result.healthyMax);
  });

  it("uses senior healthy range for age 70", () => {
    const birthYear = new Date().getFullYear() - 70;
    const result = calculateBmi(75, 170, `${birthYear}-06-01`, "male");
    expect(result.healthyMin).toBe(22);
    expect(result.healthyMax).toBe(27);
    expect(result.age).toBeGreaterThanOrEqual(69);
  });

  it("returns correct age in result", () => {
    const birthYear = new Date().getFullYear() - 35;
    const result = calculateBmi(75, 175, `${birthYear}-01-01`, "male");
    expect(result.age).toBeGreaterThanOrEqual(34);
    expect(result.age).toBeLessThanOrEqual(35);
  });
});
