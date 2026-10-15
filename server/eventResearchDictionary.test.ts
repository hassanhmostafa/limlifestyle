import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildResearchWorkbook } from "./eventResearchWorkbook";
import { flattenResearchRecord } from "../shared/eventResearchExport";

describe("research workbook field dictionary", () => {
  it("documents every actual column and preserves coded choices, vendor text and missing measurements", () => {
    const records = [{
      eventCode: "synthetic", participantId: "P-7", visitId: 12, questionnaireVersion: "legacy",
      answers: { fruit: 2, sleep: 3.1 }, clinical: { weight: 70.4, glucose: undefined },
      readings: [{ source: "x18", machineMetrics: { fatRate: 20, bodyShape: "standard", bmi_s: "18.5–24.9", skeletalMuscle: 28.1 } }],
      lifestyleDomains: { activity: 6.5 },
    }];
    const book = XLSX.read(buildResearchWorkbook(records), { type: "buffer" });
    const visits = XLSX.utils.sheet_to_json<any[]>(book.Sheets.Visits, { header: 1 });
    const dictionary = XLSX.utils.sheet_to_json<any[]>(book.Sheets.Dictionary, { header: 1 });
    const headers = visits[0];
    const entries = new Map(dictionary.slice(1).map(row => [row[1], row]));
    expect(headers.length).toBe(Object.keys(flattenResearchRecord(records[0])).length);
    expect(headers.every(column => entries.has(column))).toBe(true);
    expect(entries.get("readings.1.machineMetrics.fatRate")?.[3]).toBe("%");
    expect(entries.get("readings.1.machineMetrics.skeletalMuscle")?.[3]).toBe("kg");
    expect(entries.get("answers.fruit")?.[0]).toBe("legacy");
    expect(entries.get("answers.fruit")?.[3]).toContain("2=");
    expect(visits[1][headers.indexOf("clinical.weight")]).toBe(70.4);
    expect(visits[1][headers.indexOf("clinical.glucose")] ?? "").toBe("");
    expect(visits[1][headers.indexOf("readings.1.machineMetrics.bodyShape")]).toBe("standard");
  });
});
