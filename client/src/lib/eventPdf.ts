/** Export the visible report as paginated A4 PDF; does not depend on window.print. */
type PdfKeepTogether = { top: number; bottom: number };

/**
 * A tall advice or nursing block must still be splittable across pages, but each
 * rendered line is kept whole. Range rectangles give one box per wrapped line.
 */
export function appendTextLineRectangles(
  doc: Document,
  root: HTMLElement,
  bounds: DOMRect,
  keepTogether: PdfKeepTogether[]
) {
  const nodeFilter = doc.defaultView?.NodeFilter;
  if (!nodeFilter) return;
  const renderedLines = new Map<string, PdfKeepTogether>();
  for (const container of Array.from(
    root.querySelectorAll<HTMLElement>(
      "[data-doctor-advice], .lim-print-notes"
    )
  )) {
    const walker = doc.createTreeWalker(container, nodeFilter.SHOW_TEXT);
    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      if (!textNode.textContent?.trim()) continue;
      const range = doc.createRange();
      range.selectNodeContents(textNode);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width <= 0 || rect.height <= 0) continue;
        const line = {
          top: rect.top - bounds.top,
          bottom: rect.bottom - bounds.top,
        };
        // Arabic/Latin text can create several client rects for one visual
        // line. Protect the shared line, not each bidi fragment separately.
        const key = `${Math.round(line.top * 100)}:${Math.round(
          line.bottom * 100
        )}`;
        renderedLines.set(key, line);
      }
    }
  }
  keepTogether.push(...Array.from(renderedLines.values()));
}

export async function downloadEventPdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  await document.fonts.ready;
  const marker = "pdf-" + crypto.randomUUID();
  element.dataset.pdfCapture = marker;
  const sourcePrintReport = element.querySelector<HTMLElement>(
    "[data-print-report]"
  );
  const sourceRootStyle = element.getAttribute("style");
  const sourceChildStyles = Array.from(element.children).map(child => ({
    child: child as HTMLElement,
    style: child.getAttribute("style"),
  }));
  const sourcePrintAriaHidden = sourcePrintReport?.getAttribute("aria-hidden");
  let canvas: HTMLCanvasElement;
  let captureWidth = 760;
  let keepTogether: PdfKeepTogether[] = [];
  let sourceLineHeights: Array<{
    node: HTMLElement;
    value: string;
    priority: string;
  }> = [];
  try {
    // html2canvas measures its target before cloning it. The printable report is
    // normally hidden in the interactive UI, so reveal it briefly in the source
    // tree to ensure canvas height includes lifestyle, nursing and doctor advice.
    if (sourcePrintReport) {
      element.style.width = "760px";
      element.style.maxWidth = "none";
      element.style.background = "#fff";
      for (const { child } of sourceChildStyles)
        child.style.display = child === sourcePrintReport ? "block" : "none";
      sourcePrintReport.removeAttribute("aria-hidden");
      // Apply the same line-height normalization used in the clone before
      // measuring the source tree, so the capture geometry stays consistent.
      const sourceNodes = [
        element,
        ...Array.from(element.querySelectorAll<HTMLElement>("*")),
      ];
      sourceLineHeights = sourceNodes.map(node => ({
        node,
        value: node.style.getPropertyValue("line-height"),
        priority: node.style.getPropertyPriority("line-height"),
      }));
      for (const node of sourceNodes) {
        const css = getComputedStyle(node);
        if (parseFloat(css.lineHeight) < parseFloat(css.fontSize) * 1.3)
          node.style.setProperty("line-height", "1.3", "important");
      }
    }
    canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: 1000,
      scale: Math.min(
        2,
        Math.sqrt(
          10000000 /
            Math.max(
              1,
              Math.max(760, element.scrollWidth) * element.scrollHeight
            )
        )
      ),
      onclone: async doc => {
        const root = doc.querySelector<HTMLElement>(
          `[data-pdf-capture="${marker}"]`
        )!;
        // Use a consistent paper layout, independent of the phone viewport.
        root.style.width = "760px";
        root.style.maxWidth = "none";
        const printReport = root.querySelector<HTMLElement>(
          "[data-print-report]"
        );
        if (printReport) {
          for (const child of Array.from(root.children)) {
            if (child instanceof doc.defaultView!.HTMLElement) {
              (child as HTMLElement).style.display =
                child === printReport ? "block" : "none";
            }
          }
          printReport.removeAttribute("aria-hidden");
          root.style.background = "#fff";
        }
        // A report can be downloaded immediately after opening it. Wait for
        // both anatomy images and the approved logo before taking the capture.
        await Promise.all(
          Array.from(root.querySelectorAll("img")).map(img =>
            img.decode().catch(() => {
              throw new Error("Report image failed to load");
            })
          )
        );
        root
          .querySelectorAll<HTMLElement>(
            "[data-pdf-hide], .lim-print-hide, .print\\:hidden"
          )
          .forEach(node => (node.style.display = "none"));
        // Keep physician advice readable when Arabic, Latin text and numbers
        // share a line. Explicit clone styles also preserve authored line
        // breaks and bullets in html2canvas PDF captures.
        root
          .querySelectorAll<HTMLElement>("[data-doctor-advice]")
          .forEach(node => {
            node.setAttribute("dir", "rtl");
            node.setAttribute("lang", "ar");
            node.style.setProperty("direction", "rtl", "important");
            node.style.setProperty("text-align", "right", "important");
            node.style.setProperty("unicode-bidi", "plaintext", "important");
            node.style.setProperty("white-space", "pre-wrap", "important");
            node.style.setProperty("overflow-wrap", "anywhere", "important");
            node.style.setProperty("word-break", "normal", "important");
          });
        // html2canvas does not parse CSS Color 4 values emitted by Tailwind v4.
        // Let the browser convert them before the PDF renderer reads styles.
        const pixel = doc.createElement("canvas");
        pixel.width = pixel.height = 1;
        const ctx = pixel.getContext("2d")!;
        const convert = (value: string) =>
          value.replace(/(?:oklch|oklab|lab|lch|color)\([^)]*\)/g, color => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
            return `rgba(${r},${g},${b},${a / 255})`;
          });
        for (const node of [
          doc.documentElement,
          doc.body,
          root,
          ...Array.from(root.querySelectorAll<HTMLElement>("*")),
        ]) {
          node.style.setProperty("letter-spacing", "0px", "important");
          const css = doc.defaultView!.getComputedStyle(node);
          // Avoid clipping glyph descenders in tight metric cards during canvas capture.
          if (parseFloat(css.lineHeight) < parseFloat(css.fontSize) * 1.3)
            node.style.setProperty("line-height", "1.3", "important");
          for (const property of [
            "color",
            "background-color",
            "background-image",
            "border-top-color",
            "border-bottom-color",
            "border-left-color",
            "border-right-color",
            "outline-color",
            "box-shadow",
            "text-shadow",
            "fill",
            "stroke",
          ]) {
            const value = css.getPropertyValue(property);
            if (/(?:oklch|oklab|lab|lch|color)\(/.test(value))
              node.style.setProperty(property, convert(value), "important");
          }
          if (css.position === "sticky") node.style.position = "static";
        }
        const bounds = root.getBoundingClientRect();
        captureWidth = bounds.width;
        // Keep headings, text lines and metric cards off page boundaries.
        keepTogether = Array.from(
          root.querySelectorAll(
            "[data-pdf-keep],p,h1,h2,h3,h4,.lim-result-metric,.lim-quick-indicator,.lim-results-card"
          )
        )
          .map(node => node.getBoundingClientRect())
          .filter(
            rect => rect.height > 0 && rect.height < (bounds.width * 277) / 190
          )
          .map(rect => ({
            top: rect.top - bounds.top,
            bottom: rect.bottom - bounds.top,
          }));
        appendTextLineRectangles(doc, root, bounds, keepTogether);
      },
    });
  } finally {
    delete element.dataset.pdfCapture;
    for (const { node, value, priority } of sourceLineHeights) {
      if (value) node.style.setProperty("line-height", value, priority);
      else node.style.removeProperty("line-height");
    }
    if (sourcePrintReport) {
      if (sourceRootStyle === null) element.removeAttribute("style");
      else element.setAttribute("style", sourceRootStyle);
      for (const { child, style } of sourceChildStyles) {
        if (style === null) child.removeAttribute("style");
        else child.setAttribute("style", style);
      }
      if (sourcePrintAriaHidden == null)
        sourcePrintReport.removeAttribute("aria-hidden");
      else sourcePrintReport.setAttribute("aria-hidden", sourcePrintAriaHidden);
    }
  }
  const pdf = new JsPDF({ unit: "mm", format: "a4", compress: true });
  // Keep generous side margins for labels, but use the printable A4 height
  // efficiently so the ordinary report is not split by a tiny trailing slice.
  const marginX = 10,
    marginY = 8,
    width = 190,
    height = 281;
  const sliceHeight = Math.floor((canvas.width * height) / width);
  const pixelScale = canvas.width / captureWidth;
  for (let top = 0, index = 0; top < canvas.height; index++) {
    let bottom = Math.min(top + sliceHeight, canvas.height);
    if (bottom < canvas.height) {
      const crossing = keepTogether.filter(
        block =>
          block.top * pixelScale > top + 1 &&
          block.top * pixelScale < bottom &&
          block.bottom * pixelScale > bottom
      );
      if (crossing.length)
        bottom = Math.floor(
          Math.max(
            top + 1,
            Math.min(...crossing.map(block => block.top * pixelScale)) -
              pixelScale * 12
          )
        );
    }
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = bottom - top;
    slice
      .getContext("2d")!
      .drawImage(
        canvas,
        0,
        top,
        canvas.width,
        slice.height,
        0,
        0,
        canvas.width,
        slice.height
      );
    if (index) pdf.addPage();
    pdf.addImage(
      slice.toDataURL("image/png"),
      "PNG",
      marginX,
      marginY,
      width,
      (slice.height * width) / canvas.width
    );
    slice.width = slice.height = 0;
    top = bottom;
  }
  canvas.width = canvas.height = 0;
  pdf.save(filename);
}
