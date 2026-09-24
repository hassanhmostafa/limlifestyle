import { describe, expect, it } from "vitest";
import { toEventHealthReading } from "./lib/eventHealth";

describe("event health response mapping", () => {
  it("includes native X18 machineMetrics while excluding account identifiers", () => {
    const reading = {
      id: 42,
      userId: 9001,
      kioskId: "event-kiosk",
      source: "x18" as const,
      sbp: 128,
      dbp: 83,
      hr: 72,
      weight: "76.6",
      height: "174.5",
      bmi: "25.2",
      temperature: null,
      machineMetrics: { fatRate: "22.9", skeletalMuscle: "33.3" },
      recordNo: "20260924225100",
      deviceNo: "G260820131014906",
      notes: "X18_5 measurement",
      recordedAt: new Date("2026-09-24T19:51:00.000Z"),
      createdAt: new Date("2026-09-24T19:51:00.000Z"),
    } as any;

    expect(toEventHealthReading(reading)).toEqual({
      id: 42,
      recordNo: "20260924225100",
      deviceNo: "G260820131014906",
      source: "x18",
      measuredAt: "2026-09-24T19:51:00.000Z",
      vitals: { sbp: 128, dbp: 83, hr: 72, height: "174.5", weight: "76.6", bmi: "25.2", temperature: null },
      bodyComposition: { fatRate: "22.9", skeletalMuscle: "33.3" },
    });
  });
});
