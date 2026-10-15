import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EventPrintReport from "../client/src/components/EventPrintReport";
import { eventReportDate, eventReportFilename, EVENT_REPORT_TEMPLATE_VERSION } from "../shared/eventReportArchive";
import { lifestyleReport, scoreBand } from "../shared/eventLifestyleInsights";

const metadata = {
  participantId: "P-125", visitId: 3, visitDate: "2026-10-14T22:30:00.000Z", reportRevision: 2,
  questionnaireVersion: "legacy", scoringVersion: "saved-score-v1", templateVersion: "saved-template-v1",
};
const props = {
  participant: { code: "SYNTHETIC-ONLY", firstName: "اختبار", age: 43, sex: "male" as const },
  readings: [], answers: {}, lifestyleEnabled: false,
  care: { advice: "توصية محفوظة للاختبار فقط", doctorName: "طبيب الاختبار", measurements: {} },
};

describe("archived report naming and provenance", () => {
  it("keeps stable participant/visit/revision names and distinguishes regeneration", () => {
    expect(eventReportDate(metadata.visitDate)).toBe("2026-10-15");
    expect(eventReportFilename(metadata)).toBe("LIM-P00125-V00003-2026-10-15-r2.pdf");
    expect(eventReportFilename(metadata, true)).toBe("LIM-P00125-V00003-2026-10-15-r2-regenerated.pdf");
    expect(eventReportFilename({ ...metadata, participantId: "P-12\r\nunsafe" })).not.toMatch(/[\r\n]/);
  });

  it("marks only regenerated output inside the printable report, preserving saved advice", () => {
    const original = renderToStaticMarkup(React.createElement(EventPrintReport, props));
    expect(original).not.toContain("أُعيد توليده");
    const regenerated = renderToStaticMarkup(React.createElement(EventPrintReport, {
      ...props, provenance: { generatedAt: metadata.visitDate, templateVersion: EVENT_REPORT_TEMPLATE_VERSION, reportRevision: 2 },
    }));
    expect(regenerated).toContain("data-print-report");
    expect(regenerated).toContain("أُعيد توليده");
    expect(regenerated).toContain("2026-10-15");
    expect(regenerated).toContain(EVENT_REPORT_TEMPLATE_VERSION);
    expect(regenerated).toContain(props.care.advice);
  });

  it("renders saved score51 even when current raw answers would be incomplete", () => {
    const saved = lifestyleReport({});
    saved.complete = true;
    saved.score.overall = 51;
    saved.band = scoreBand(51);
    const html = renderToStaticMarkup(React.createElement(EventPrintReport, {
      ...props, lifestyleEnabled: true, frozenLifestyleReport: saved,
    }));
    expect(html).toContain("#3579be");
    expect(html).toMatch(/51/);
    expect(html).toContain("سلوكيات صحية متوسطة");
  });
});
