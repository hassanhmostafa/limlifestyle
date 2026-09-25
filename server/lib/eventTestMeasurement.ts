import crypto from "crypto";

/**
 * Produces a complete, clearly labelled X18-like body-composition result for
 * the standalone Events QR step. It is for interface testing only and is
 * persisted with `source: "simulator"`, never submitted through the physical
 * device upload endpoint.
 */
export type EventTestMeasurement = {
  recordNo: string;
  sbp: number;
  dbp: number;
  hr: number;
  weight: string;
  height: string;
  bmi: string;
  machineMetrics: Record<string, string>;
};

function decimal(min: number, max: number, digits = 1) {
  return (min + Math.random() * (max - min)).toFixed(digits);
}

function integer(min: number, max: number) {
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function normalRange(value: string, min: string, max: string) {
  return { value, status: "1", range: `${min} - ${max}` };
}

export function createEventTestMeasurement(): EventTestMeasurement {
  const height = decimal(155, 185);
  const weight = decimal(55, 95);
  const bmi = (Number(weight) / ((Number(height) / 100) ** 2)).toFixed(1);
  const fatRate = decimal(18, 30);
  const fat = (Number(weight) * Number(fatRate) / 100).toFixed(1);
  const fatFree = (Number(weight) - Number(fat)).toFixed(1);
  const muscle = decimal(35, 50);
  const skeletalMuscle = decimal(22, 32);
  const waterRate = decimal(48, 60);
  const waterICW = decimal(18, 27);
  const waterECW = decimal(11, 16);
  const sbp = Number(integer(110, 129));
  const dbp = Number(integer(65, 84));
  const hr = Number(integer(60, 89));

  const metrics: Record<string, string> = {
    height,
    weight,
    bmi,
    bmiType: "normal",
    fat,
    fatRate,
    fatFree,
    skeletalMuscle,
    muscle,
    muscleRate: decimal(43, 53),
    protein: decimal(8, 13),
    waterRate,
    waterICW,
    waterECW,
    bone: decimal(2.1, 3.4),
    mineral: decimal(2.4, 3.8),
    bmr: integer(1350, 1850),
    vfal: integer(4, 9),
    whr: decimal(0.74, 0.89, 2),
    bodyAge: integer(22, 54),
    bodyScore: integer(72, 92),
    obesity: decimal(92, 109),
    idealWeight: decimal(54, 78),
    dci: integer(1750, 2600),
    bodyShape: "standard",
    impedance: integer(420, 620),
    muscleRightArm: decimal(2.0, 3.2),
    muscleLeftArm: decimal(2.0, 3.2),
    muscleTrunk: decimal(18.0, 25.0),
    muscleRightLeg: decimal(6.0, 9.0),
    muscleLeftLeg: decimal(6.0, 9.0),
    fatRightArm: decimal(1.0, 2.5),
    fatLeftArm: decimal(1.0, 2.5),
    fatTrunk: decimal(10.0, 18.0),
    fatRightLeg: decimal(3.0, 6.0),
    fatLeftLeg: decimal(3.0, 6.0),
    muscleRightArmRate: decimal(95, 105),
    muscleLeftArmRate: decimal(95, 105),
    muscleTrunkRate: decimal(95, 105),
    muscleRightLegRate: decimal(95, 105),
    muscleLeftLegRate: decimal(95, 105),
    fatRightArmRate: decimal(85, 110),
    fatLeftArmRate: decimal(85, 110),
    fatTrunkRate: decimal(85, 110),
    fatRightLegRate: decimal(85, 110),
    fatLeftLegRate: decimal(85, 110),
    fatSubCutRate: decimal(12, 22),
    cycling: integer(20, 45),
    ropeJump: integer(12, 30),
    jogging: integer(18, 38),
    walking: integer(35, 70),
    swim: integer(16, 34),
    aerobic: integer(20, 44),
    sbp: String(sbp),
    dbp: String(dbp),
    hr: String(hr),
  };

  const ranges: Array<[string, string, string]> = [
    ["weight", "50.0", "100.0"], ["bmi", "18.5", "24.9"],
    ["fatRate", "18.0", "30.0"], ["fatFree", "38.0", "72.0"],
    ["skeletalMuscle", "20.0", "35.0"], ["muscle", "32.0", "55.0"],
    ["protein", "8.0", "16.0"], ["waterRate", "45.0", "65.0"],
    ["waterICW", "15.0", "30.0"], ["waterECW", "10.0", "18.0"],
    ["bone", "2.0", "4.0"], ["mineral", "2.0", "4.5"],
    ["bmr", "1200", "2100"], ["vfal", "1", "12"], ["whr", "0.70", "0.90"],
    ["fatSubCutRate", "10.0", "25.0"], ["sbp", "90", "139"],
    ["dbp", "60", "89"], ["hr", "55", "99"],
  ];
  for (const [key, min, max] of ranges) {
    const { status, range } = normalRange(metrics[key] ?? "", min, max);
    metrics[`${key}_s`] = status;
    metrics[`${key}_n`] = range;
  }

  return {
    recordNo: `EVENT-TEST-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    sbp,
    dbp,
    hr,
    weight,
    height,
    bmi,
    machineMetrics: metrics,
  };
}
