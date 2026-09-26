/** Export the visible report as paginated A4 PDF; does not depend on window.print. */
export async function downloadEventPdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  await document.fonts.ready;
  const marker = "pdf-" + crypto.randomUUID();
  element.dataset.pdfCapture = marker;
  let canvas: HTMLCanvasElement;
  let captureWidth = 760;
  let keepTogether: { top: number; bottom: number }[] = [];
  try {
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
      onclone: doc => {
        const root = doc.querySelector<HTMLElement>(
          `[data-pdf-capture="${marker}"]`
        )!;
        // Use a consistent paper layout, independent of the phone viewport.
        root.style.width = "760px";
        root.style.maxWidth = "none";
        root
          .querySelectorAll<HTMLElement>(
            "[data-pdf-hide], .lim-print-hide, .print\\:hidden"
          )
          .forEach(node => (node.style.display = "none"));
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
            "p,h1,h2,h3,h4,.lim-result-metric,.lim-quick-indicator,.lim-results-card"
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
      },
    });
  } finally {
    delete element.dataset.pdfCapture;
  }
  const pdf = new JsPDF({ unit: "mm", format: "a4", compress: true });
  const margin = 10,
    width = 190,
    height = 277;
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
          Math.min(...crossing.map(block => block.top * pixelScale))
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
      margin,
      margin,
      width,
      (slice.height * width) / canvas.width
    );
    slice.width = slice.height = 0;
    top = bottom;
  }
  canvas.width = canvas.height = 0;
  pdf.save(filename);
}
