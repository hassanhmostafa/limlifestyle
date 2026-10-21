import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../client/src/lib/eventPdf", () => ({ createEventPdf: vi.fn() }));
import EventPdfButton, {
  supportsEventFileShare,
} from "../client/src/components/EventPdfButton";

describe("participant report controls", () => {
  it("offers desktop save and browser print while retaining combined attachments", () => {
    const html = renderToStaticMarkup(
      React.createElement(EventPdfButton, {
        shareable: true,
        attachmentsExpected: true,
        additionalFiles: [new File(["answers"], "answers.pdf")],
      })
    );
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html).not.toContain("تحميل إجابات");
    expect(html).toContain("حفظ التقرير والاستبيان (PDF)");
    expect(html).toContain("طباعة / حفظ PDF من المتصفح");
    expect(html).toContain("التقرير وملف الإجابات");
  });
  it("preserves standalone download for admin and research uses", () => {
    const html = renderToStaticMarkup(
      React.createElement(EventPdfButton, {
        label: "تنزيل التقرير المعاد إنشاؤه",
      })
    );
    expect(html).toContain("تنزيل التقرير المعاد إنشاؤه");
    expect(html.match(/<button/g)).toHaveLength(1);
  });
});

it("requires both sharing APIs and tolerates browsers that reject file sharing", () => {
  vi.stubGlobal("navigator", { canShare: () => true });
  expect(supportsEventFileShare()).toBe(false);
  vi.stubGlobal("navigator", { share: () => {}, canShare: () => true });
  expect(supportsEventFileShare()).toBe(true);
  vi.stubGlobal("navigator", {
    share: () => {},
    canShare: () => {
      throw new Error("unsupported");
    },
  });
  expect(supportsEventFileShare()).toBe(false);
  vi.unstubAllGlobals();
});
