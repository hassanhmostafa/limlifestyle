import { expect, it } from "vitest";
import { adjustPdfSliceBottom, appendTextLineRectangles, hasPdfSliceInk, logicalPdfPageRanges } from "../client/src/lib/eventPdf";

it("keeps every rendered advice and nursing line together without treating a long block as one page", () => {
  const advice = { textContent: "سطر طويل" } as unknown as Node;
  const nursing = { textContent: "Nursing note" } as unknown as Node;
  const whitespace = { textContent: "   \n" } as unknown as Node;
  const adviceContainer = {} as HTMLElement;
  const nursingContainer = {} as HTMLElement;
  const nodes = new Map<HTMLElement, Node[]>([
    [adviceContainer, [advice, whitespace]],
    [nursingContainer, [nursing]],
  ]);
  let selected: Node | null = null;
  const documentStub = {
    defaultView: { NodeFilter: { SHOW_TEXT: 4 } },
    createTreeWalker(container: HTMLElement) {
      const pending = [...(nodes.get(container) ?? [])];
      return { nextNode: () => pending.shift() ?? null };
    },
    createRange() {
      return {
        selectNodeContents(node: Node) {
          selected = node;
        },
        getClientRects() {
          if (selected === advice)
            return [
              { top: 20, bottom: 32, width: 100, height: 12 },
              { top: 34, bottom: 46, width: 100, height: 12 },
            ];
          if (selected === nursing)
            return [{ top: 60, bottom: 72, width: 100, height: 12 }];
          return [];
        },
      };
    },
  } as unknown as Document;
  const root = {
    querySelectorAll: () => [adviceContainer, nursingContainer],
  } as unknown as HTMLElement;
  const kept: { top: number; bottom: number }[] = [];

  appendTextLineRectangles(
    documentStub,
    root,
    { top: 10 } as DOMRect,
    kept
  );

  expect(kept).toEqual([
    { top: 10, bottom: 22 },
    { top: 24, bottom: 36 },
    { top: 50, bottom: 62 },
  ]);
});

it("moves a page boundary clear of a line that starts at antialiasing distance", () => {
  const bottom = adjustPdfSliceBottom(0, 100, 2, [
    { top: 49.6, bottom: 58 },
  ]);

  expect(bottom).toBe(63);
});

it("does not create a terminal PDF page for an all-white raster slice", () => {
  const white = new Uint8ClampedArray(4 * 20).fill(255);
  expect(hasPdfSliceInk(white)).toBe(false);

  const text = new Uint8ClampedArray(4 * 20).fill(255);
  for (let pixel = 0; pixel < 12; pixel++) text[pixel * 4] = 20;
  expect(hasPdfSliceInk(text)).toBe(true);
});

it("keeps explicit questionnaire and body pages separate before raster pagination", () => {
  expect(logicalPdfPageRanges([
    { top: 0, bottom: 240 },
    { top: 240, bottom: 700 },
  ], 2, 1600)).toEqual([
    { top: 0, bottom: 480 },
    { top: 480, bottom: 1400 },
  ]);
});

it("does not duplicate a fractional raster row between adjacent logical pages", () => {
  expect(logicalPdfPageRanges([
    { top: 0, bottom: 100.25 },
    { top: 100.25, bottom: 220 },
  ], 2, 500)).toEqual([
    { top: 0, bottom: 201 },
    { top: 201, bottom: 440 },
  ]);
});
