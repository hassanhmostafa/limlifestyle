/** Styling only; never translate, reinterpret, or discard participant advice. */
export function adviceLineKind(line: string) {
  const value = line.trim();
  if (!value) return 'gap';
  if (value === 'ملخص تحليل جسمك' || value === 'Body composition summary' || value === 'ملاحظات إضافية') return 'heading';
  if (/^[0-9٠-٩]+[.\u06d4]\s+/.test(value)) return 'heading';
  if (/^(الأهداف(?: المقترحة)?|Suggested goals|Goals):?$/.test(value)) return 'label';
  return 'text';
}
