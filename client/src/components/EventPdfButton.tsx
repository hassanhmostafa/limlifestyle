import React, { useState } from "react";
import { downloadEventPdf } from "@/lib/eventPdf";
export default function EventPdfButton({
  filename = "lim-report.pdf",
  label = "تحميل التقرير للطباعة (PDF)",
  className = "rounded-xl bg-[#197f6f] px-5 py-3 font-bold text-white",
}: {
  filename?: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div data-pdf-hide className="print:hidden">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async e => {
          const root =
            e.currentTarget.closest<HTMLElement>("[data-final-report]") ??
            e.currentTarget.closest<HTMLElement>("[data-pdf-report]");
          if (!root) {
            setError("تعذر العثور على التقرير");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await downloadEventPdf(root, filename);
          } catch {
            setError("تعذر تجهيز PDF. حاول مرة أخرى من Safari أو Chrome.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "جارٍ تجهيز PDF…" : label}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        افتح ملف PDF، ثم اختر مشاركة ← طباعة.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
