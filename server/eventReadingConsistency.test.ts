import { describe, expect, it } from "vitest";
import { eventReadingCareInvalidationPatch, eventReadingMaterialFingerprint, shouldInvalidateEventReading } from "./db";

describe("Events reading/advice consistency", () => {
  it("turns a physician approval into a private re-review draft when a newer X18 result arrives", () => {
    const patch = eventReadingCareInvalidationPatch({ revision: 8, consultationMode: "physician", advice: "نصيحة معتمدة سابقًا" });
    expect(patch).toMatchObject({ revision: 9, advice: "نصيحة معتمدة سابقًا", approvedAt: null, approvedRecordNo: null });
  });

  it("removes automatic output and generation claims when a newer X18 result arrives", () => {
    const patch = eventReadingCareInvalidationPatch({ revision: 4, consultationMode: "automatic", advice: "توصيات قديمة" });
    expect(patch).toMatchObject({
      revision: 5,
      advice: null,
      approvedAt: null,
      approvedRecordNo: null,
      autoGenerationState: "not_requested",
      autoGenerationAttemptToken: null,
      autoGenerationFingerprint: null,
      autoGenerationRecordNo: null,
      autoGenerationAttempts: 0,
    });
  });

  it("invalidates a corrected physical upload even when the device reuses its record number", () => {
    const initial = eventReadingMaterialFingerprint({ height: 170, weight: 70, machineMetrics: { fatRate: "20", skeletalMuscle: "42" } });
    const corrected = eventReadingMaterialFingerprint({ height: 170, weight: 70, machineMetrics: { fatRate: "25", skeletalMuscle: "42" } });
    expect(shouldInvalidateEventReading({ latestRecordNo: "R1", latestReadingFingerprint: initial }, "R1", initial)).toBe(false);
    expect(shouldInvalidateEventReading({ latestRecordNo: "R1", latestReadingFingerprint: initial }, "R1", corrected)).toBe(true);
  });
});
