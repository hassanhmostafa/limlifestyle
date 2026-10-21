import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("../client/src/lib/eventPdf", () => ({ createEventPdf: vi.fn() }));
import EventPdfButton from "../client/src/components/EventPdfButton";

describe("participant report controls", () => {
  it("renders one combined sharing control while retaining attachments", () => {
    const html = renderToStaticMarkup(React.createElement(EventPdfButton, { shareable: true, attachmentsExpected: true, additionalFiles: [new File(["answers"], "answers.pdf")] }));
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toContain("تحميل إجابات");
    expect(html).not.toContain("للطباعة");
    expect(html).toContain("التقرير وملف الإجابات");
  });
  it("preserves standalone download for admin and research uses", () => {
    const html = renderToStaticMarkup(React.createElement(EventPdfButton, { label: "تنزيل التقرير المعاد إنشاؤه" }));
    expect(html).toContain("تنزيل التقرير المعاد إنشاؤه");
    expect(html.match(/<button/g)).toHaveLength(1);
  });
});
