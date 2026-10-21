/** Diagnostic categories only: never log report content, names, phones or raw errors. */
export function eventPdfFailureCode(error: unknown) {
  const value = error as { name?: unknown; message?: unknown };
  const name = typeof value?.name === "string" ? value.name : "";
  const message = typeof value?.message === "string" ? value.message : "";
  if (
    /dynamically imported|module script|loading chunk|fetch.*module/i.test(
      message
    )
  )
    return "MODULE_LOAD";
  if (/image|decode/i.test(message)) return "IMAGE_LOAD";
  if (/color|parse|unsupported|style/i.test(message)) return "STYLE_CAPTURE";
  if (name === "SecurityError" || /taint|cross.origin/i.test(message))
    return "CANVAS_ORIGIN";
  if (
    /canvas|memory|size|width|height/i.test(message) ||
    name === "IndexSizeError"
  )
    return "CANVAS_SIZE";
  return "CAPTURE_FAILED";
}
