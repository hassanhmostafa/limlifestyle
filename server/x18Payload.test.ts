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
});
