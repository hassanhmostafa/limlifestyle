import type { HealthReading } from "../../drizzle/schema";

/** A privacy-safe representation returned to a participant's event application. */
export type EventHealthReading = {
  id: number;
  recordNo: string | null;
  deviceNo: string | null;
  source: "x18" | "legacy" | "simulator" | "manual" | "demo";
  measuredAt: string;
  vitals: {
    sbp: number | null;
    dbp: number | null;
    hr: number | null;
    height: string | null;
    weight: string | null;
    bmi: string | null;
    temperature: string | null;
  };
  bodyComposition: Record<string, string>;
};

export function toEventHealthReading(reading: HealthReading): EventHealthReading {
  return {
    id: reading.id,
    recordNo: reading.recordNo,
    deviceNo: reading.deviceNo,
    source: reading.source,
    measuredAt: reading.recordedAt.toISOString(),
    vitals: {
      sbp: reading.sbp,
      dbp: reading.dbp,
      hr: reading.hr,
      height: reading.height,
      weight: reading.weight,
      bmi: reading.bmi,
      temperature: reading.temperature,
    },
    bodyComposition: reading.machineMetrics ?? {},
  };
}
