import { afterEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  decryptArchiveBytes,
  encryptArchiveBytes,
  EVENT_REPORT_ARCHIVE_MAX_PDF_BYTES,
} from "./eventReportArchive";
import { buildResearchWorkbook } from "./eventResearchWorkbook";
import { buildResearchWorkbookZip } from "./eventResearchWorkbook";

const priorKey = process.env.EVENT_REPORT_ARCHIVE_KEY;
afterEach(() => { process.env.EVENT_REPORT_ARCHIVE_KEY = priorKey; });

describe("Events final-report archive encryption", () => {
  it("round-trips opaque synthetic bytes only with matching archive context", () => {
    process.env.EVENT_REPORT_ARCHIVE_KEY = "a".repeat(64);
    const context = { archiveId: "f5bd7241-3047-49e1-9db9-6574ebf9ce4a", sessionId: 17, reportRevision: 4, kind: "snapshot" as const };
    const encrypted = encryptArchiveBytes(Buffer.from('{"synthetic":true}'), context);
    expect(encrypted.toString("utf8")).not.toContain("synthetic");
    expect(decryptArchiveBytes(encrypted, context).toString("utf8")).toBe('{"synthetic":true}');
    expect(() => decryptArchiveBytes(encrypted, { ...context, reportRevision: 5 })).toThrow();
  });

  it("limits participant PDF uploads to a bounded size", () => {
    expect(EVENT_REPORT_ARCHIVE_MAX_PDF_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("Events multi-event XLSX export", () => {
  it("preserves blank missing data and neutralizes spreadsheet formulas", () => {
    const bytes = buildResearchWorkbook([{ eventCode: "lim-events", visitId: 2, finalAdvice: "=SUM(A1:A2)", missing: null }]);
    const workbook = XLSX.read(bytes, { type: "buffer" });
    expect(workbook.SheetNames).toEqual(["Visits", "Dictionary"]);
    const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Visits, { header: 1, raw: false });
    expect(rows[0]).toContain("finalAdvice");
    expect(rows[1][rows[0].indexOf("finalAdvice")]).toBe("'=SUM(A1:A2)");
    expect(rows[1][rows[0].indexOf("missing")]).toBe("");
  });
  it("creates one dictionary-bearing workbook per selected event in the ZIP", async () => {
    const zip = await JSZip.loadAsync(await buildResearchWorkbookZip([
      { eventCode: "event-a", visitId: 1 }, { eventCode: "event-b", visitId: 2 },
    ], ["event-a", "event-b"]));
    expect(Object.keys(zip.files).sort()).toEqual([
      "LIM-event-a-research.xlsx", "LIM-event-b-research.xlsx",
    ]);
    const first = await zip.file("LIM-event-a-research.xlsx")!.async("nodebuffer");
    expect(XLSX.read(first, { type: "buffer" }).SheetNames).toContain("Dictionary");
  });
  it("flattens frozen scores and readings into typed analytic cells", () => {
    const bytes = buildResearchWorkbook([{
      eventCode: "event-a", visitId: 4, lifestyleScore: 71,
      lifestyleDomains: { activity: 6.5 },
      readings: [{ weight: 72.4, machineMetrics: { skeletalMuscle: 28.1 } }],
    }]);
    const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets.Visits;
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });
    expect(rows[0]).toContain("lifestyleDomains.activity");
    expect(rows[1][rows[0].indexOf("lifestyleScore")]).toBe("71");
    expect(rows[1][rows[0].indexOf("readings.1.machineMetrics.skeletalMuscle")]).toBe("28.1");
    expect(workbook.Sheets.Dictionary["A1"].v).toBe("version");
  });
});
