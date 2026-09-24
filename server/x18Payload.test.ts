import { describe, expect, it } from "vitest";
import { extractX18Metrics, mergeX18Metrics, X18MachinePayloadSchema } from "./lib/x18Payload";

const heightWeightPayload = {
  deviceModel: "X18_5",
  deviceNo: "G260820131014906",
  datas: [{
    userID: "0563817217",
    recordNo: "20260924191112",
    measureTime: "2026-09-24 19:11:12",
    height: "174.5",
    weight: "76.6",
    bmi: "25.2",
  }],
};

const bodyCompositionPayload = {
  deviceModel: "X18_5",
  deviceNo: "G260820131014906",
  datas: [{
    userID: "0563817217",
    recordNo: "20260924191112",
    measureTime: "2026-09-24 19:11:12",
    fatRate: "22.9",
    skeletalMuscle: "33.3",
    bmr: "1644",
    vfal: "7",
    impedance: "330.7,327.9,23.4",
  }],
};

describe("X18_5 payload mapping", () => {
  it("accepts the native flat payload and retains its vendor fields", () => {
    const parsed = X18MachinePayloadSchema.parse(bodyCompositionPayload);
    const metrics = extractX18Metrics(parsed.datas[0]);

    expect(metrics.raw).toMatchObject({
      fatRate: "22.9",
      skeletalMuscle: "33.3",
      bmr: "1644",
      vfal: "7",
      impedance: "330.7,327.9,23.4",
    });
  });

  it("merges separate X18 posts using one report record", () => {
    const first = extractX18Metrics(X18MachinePayloadSchema.parse(heightWeightPayload).datas[0]);
    const second = extractX18Metrics(X18MachinePayloadSchema.parse(bodyCompositionPayload).datas[0]);
    const merged = mergeX18Metrics(first, second);

    expect(merged.height).toBe("174.5");
    expect(merged.weight).toBe("76.6");
    expect(merged.bmi).toBe("25.2");
    expect(merged.raw.fatRate).toBe("22.9");
    expect(merged.raw.skeletalMuscle).toBe("33.3");
  });

  it("preserves every body-analysis metric rendered in the LIM detailed report", () => {
    const parsed = X18MachinePayloadSchema.parse({
      deviceModel: "X18_5",
      deviceNo: "G260820131014906",
      datas: [{
        userID: "0563817217", recordNo: "photo-report", measureTime: "2026-09-24 23:11:00",
        fatRate: "35.3", bodyScore: "29.0", fat: "26.7", fatFree: "48.9",
        skeletalMuscle: "25.2", muscle: "42.8", waterRate: "47.3", bmr: "1426",
        vfal: "10", bone: "2.8", protein: "9.6", waterICW: "22.4", waterECW: "13.3",
        muscleRightArm: "2.2", muscleLeftArm: "2.3", muscleTrunk: "20.6", muscleRightLeg: "6.9", muscleLeftLeg: "7.1",
        fatRightArm: "1.6", fatLeftArm: "1.6", fatTrunk: "15.3", fatRightLeg: "4.1", fatLeftLeg: "4.1",
      }],
    });
    const raw = extractX18Metrics(parsed.datas[0]).raw;

    expect(raw).toMatchObject({
      fatRate: "35.3", bodyScore: "29.0", fat: "26.7", fatFree: "48.9",
      skeletalMuscle: "25.2", muscle: "42.8", waterRate: "47.3", bmr: "1426",
      vfal: "10", bone: "2.8", protein: "9.6", waterICW: "22.4", waterECW: "13.3",
      muscleRightArm: "2.2", muscleLeftArm: "2.3", muscleTrunk: "20.6", muscleRightLeg: "6.9", muscleLeftLeg: "7.1",
      fatRightArm: "1.6", fatLeftArm: "1.6", fatTrunk: "15.3", fatRightLeg: "4.1", fatLeftLeg: "4.1",
    });
  });
});
