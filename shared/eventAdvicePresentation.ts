/** Presentation-only removal of the three retired framing sentences.
 * Approved snapshots and previously archived PDF bytes remain immutable.
 */
const retiredParagraphs = new Set([
  "نتائج BIA تقديرات وليست تشخيصًا؛ لا يُستنتج ضعف العضلات من كتلتها وحدها، ولا يُعد العمر الجسدي أو مؤشر الدهون الحشوية هدفًا علاجيًا.",
  "مواعيد البداية والتدرج أمثلة تطبيقية لأهداف SMART تُعدَّل حسب القدرة وتفضيلات الشخص؛ ليست جرعات منقولة حرفيًا من المراجع.",
  "BIA results are estimates, not a diagnosis; muscle weakness cannot be inferred from muscle mass alone, and body age or the visceral fat index is not a treatment target.",
  "Start dates and progression are practical examples of SMART goals, adjusted to ability and personal preferences; they are not doses quoted verbatim from the references.",
]);
const retiredClause = "اختر منها ما يلائمك وناقش أي قلق صحي مع مختص.";
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
function unparenthesize(text: string) {
  const clean = normalize(text);
  return clean.startsWith("(") && clean.endsWith(")")
    ? clean.slice(1, -1).trim()
    : clean;
}
export function presentEventAdvice(advice: string | null | undefined): string {
  if (!advice) return "";
  return advice
    .split(/\r?\n/)
    .filter(line => !retiredParagraphs.has(unparenthesize(line)))
    .map(line => {
      const clean = normalize(line);
      if (clean === retiredClause || unparenthesize(line) === retiredClause)
        return "";
      if (
        clean.startsWith("توصيات تثقيفية مبنية على بيانات هذه الزيارة") &&
        clean.includes(retiredClause)
      )
        return "توصيات تثقيفية مبنية على بيانات هذه الزيارة.";
      if (
        clean ===
        "Educational recommendations based on this visit's data; choose what suits you and discuss any health concerns with a professional."
      )
        return "Educational recommendations based on this visit's data.";
      return line;
    })
    .filter(line => line.trim())
    .join("\n");
}
