import { describe, expect, it } from "vitest";
import { wrapPdfText } from "../client/src/lib/eventPdf";

describe("Arabic PDF line layout", () => {
  it("keeps Arabic words whole and preserves authored paragraphs", () => {
    const text = "ابدأ بخطوة صغيرة لتحسين النوم\nتناول الخضروات كل يوم";
    const lines = wrapPdfText(text, 18, value => value.length);
    expect(lines).toEqual(["ابدأ بخطوة صغيرة", "لتحسين النوم", "تناول الخضروات كل", "يوم"]);
    expect(lines.every(line => line.length <= 18)).toBe(true);
  });
  it("retains mixed-language advice, numbers and blank lines", () => {
    expect(wrapPdfText("امشِ 30 دقيقة (Walk)\n\nابدأ اليوم", 100, value => value.length))
      .toEqual(["امشِ 30 دقيقة (Walk)", " ", "ابدأ اليوم"]);
  });
  it("wraps oversized tokens without losing combining marks", () => {
    const text = "أَبَتَثَجَحَخَدَ";
    const lines = wrapPdfText(text, 4, value => Array.from(new Intl.Segmenter("ar", { granularity: "grapheme" }).segment(value)).length);
    expect(lines.join("")).toBe(text);
    expect(lines).toHaveLength(2);
  });
});
