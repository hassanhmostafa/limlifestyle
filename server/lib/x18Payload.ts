import { z } from "zod";

const stringValue = z.union([z.string(), z.number()]).transform(String);

/**
 * TRIPLEBIGHT X18_5 posts separate payloads for height/weight, body composition,
 * and blood pressure. All posts share recordNo, deviceNo, and userID.
 */
export const X18MachinePayloadSchema = z.object({
  unitNo: z.string().optional(),
  unitName: z.string().optional(),
  deviceModel: z.string().optional(),
  deviceNo: z.string().min(1),
  macAddr: z.string().optional(),
  datas: z.array(z.object({
    userID: stringValue.optional(),
    recordNo: stringValue.optional(),
    name: z.string().optional(),
    sex: stringValue.optional(),
    age: stringValue.optional(),
    birthday: z.string().optional(),
    address: z.string().optional(),
    loginType: stringValue.optional(),
    measureTime: z.string().optional(),

    // Height/weight payload
    height: stringValue.optional(),
    weight: stringValue.optional(),
    bmi: stringValue.optional(),
    weight_s: stringValue.optional(),
    weight_n: stringValue.optional(),
    bmi_s: stringValue.optional(),
    bmi_n: stringValue.optional(),
    bmiType: stringValue.optional(),

    // Blood-pressure payload
    sbp: stringValue.optional(),
    dbp: stringValue.optional(),
    hr: stringValue.optional(),
    sbp_s: stringValue.optional(),
    sbp_n: stringValue.optional(),
    dbp_s: stringValue.optional(),
    dbp_n: stringValue.optional(),
    hr_s: stringValue.optional(),
    hr_n: stringValue.optional(),

    // Body-composition payload: fields intentionally retain the vendor names.
    fat: stringValue.optional(),
    fatRate: stringValue.optional(),
    fatRate_s: stringValue.optional(),
    fatRate_n: stringValue.optional(),
    fatFree: stringValue.optional(),
    fatFree_s: stringValue.optional(),
    fatFree_n: stringValue.optional(),
    skeletalMuscle: stringValue.optional(),
    skeletalMuscle_s: stringValue.optional(),
    skeletalMuscle_n: stringValue.optional(),
    muscle: stringValue.optional(),
    muscle_s: stringValue.optional(),
    muscle_n: stringValue.optional(),
    muscleRate: stringValue.optional(),
    protein: stringValue.optional(),
    protein_s: stringValue.optional(),
    protein_n: stringValue.optional(),
    waterRate: stringValue.optional(),
    waterRate_s: stringValue.optional(),
    waterRate_n: stringValue.optional(),
    waterICW: stringValue.optional(),
    waterICW_s: stringValue.optional(),
    waterICW_n: stringValue.optional(),
    waterECW: stringValue.optional(),
    waterECW_s: stringValue.optional(),
    waterECW_n: stringValue.optional(),
    bone: stringValue.optional(),
    bone_s: stringValue.optional(),
    bone_n: stringValue.optional(),
    mineral: stringValue.optional(),
    mineral_s: stringValue.optional(),
    mineral_n: stringValue.optional(),
    bmr: stringValue.optional(),
    bmr_s: stringValue.optional(),
    bmr_n: stringValue.optional(),
    vfal: stringValue.optional(),
    vfal_s: stringValue.optional(),
    vfal_n: stringValue.optional(),
    whr: stringValue.optional(),
    whr_s: stringValue.optional(),
    whr_n: stringValue.optional(),
    bodyAge: stringValue.optional(),
    bodyScore: stringValue.optional(),
    obesity: stringValue.optional(),
    idealWeight: stringValue.optional(),
    dci: stringValue.optional(),
    bodyShape: z.string().optional(),

    // Segmental composition values and vendor activity estimates are retained raw.
    impedance: z.string().optional(),
    muscleLeftArm: stringValue.optional(),
    muscleRightArm: stringValue.optional(),
    muscleLeftLeg: stringValue.optional(),
    muscleRightLeg: stringValue.optional(),
    muscleTrunk: stringValue.optional(),
    fatLeftArm: stringValue.optional(),
    fatRightArm: stringValue.optional(),
    fatLeftLeg: stringValue.optional(),
    fatRightLeg: stringValue.optional(),
    muscleLeftArmRate: stringValue.optional(),
    muscleRightArmRate: stringValue.optional(),
    muscleLeftLegRate: stringValue.optional(),
    muscleRightLegRate: stringValue.optional(),
    muscleTrunkRate: stringValue.optional(),
    fatLeftArmRate: stringValue.optional(),
    fatRightArmRate: stringValue.optional(),
    fatLeftLegRate: stringValue.optional(),
    fatRightLegRate: stringValue.optional(),
    fatTrunk: stringValue.optional(),
    fatTrunkRate: stringValue.optional(),
    fatSubCutRate: stringValue.optional(),
    fatSubCutRate_s: stringValue.optional(),
    fatSubCutRate_n: stringValue.optional(),
    cycling: stringValue.optional(),
    ropeJump: stringValue.optional(),
    jogging: stringValue.optional(),
    walking: stringValue.optional(),
    swim: stringValue.optional(),
    aerobic: stringValue.optional(),
  }).passthrough()).min(1),
}).passthrough();

export type X18MachinePayload = z.infer<typeof X18MachinePayloadSchema>;
export type X18Measurement = X18MachinePayload["datas"][number];

export type X18MetricBundle = {
  height?: string;
  weight?: string;
  bmi?: string;
  sbp?: string;
  dbp?: string;
  hr?: string;
  raw: Record<string, string>;
};

const identityKeys = new Set([
  "userID", "recordNo", "name", "sex", "age", "birthday", "address", "loginType", "measureTime",
]);

/** Extracts dashboard values while preserving all vendor-native names and values in `raw`. */
export function extractX18Metrics(data: X18Measurement): X18MetricBundle {
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Keep all vendor-native measurement, range, and status variables—including
    // fields the vendor adds in a later firmware version—without storing identity metadata.
    if (identityKeys.has(key) || value === undefined || value === null || value === "") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      raw[key] = String(value);
    }
  }

  return {
    height: data.height,
    weight: data.weight,
    bmi: data.bmi,
    sbp: data.sbp,
    dbp: data.dbp,
    hr: data.hr,
    raw,
  };
}

/** Merges the three X18 posts belonging to the same report without discarding values. */
export function mergeX18Metrics(existing: X18MetricBundle, incoming: X18MetricBundle): X18MetricBundle {
  return {
    height: incoming.height ?? existing.height,
    weight: incoming.weight ?? existing.weight,
    bmi: incoming.bmi ?? existing.bmi,
    sbp: incoming.sbp ?? existing.sbp,
    dbp: incoming.dbp ?? existing.dbp,
    hr: incoming.hr ?? existing.hr,
    raw: { ...existing.raw, ...incoming.raw },
  };
}

export function parseX18MeasurementTime(value: string | undefined): Date {
  if (!value) return new Date();
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
