import React, { useState } from "react";
import { createEventPdf, downloadEventPdf } from "@/lib/eventPdf";
export default function EventPdfButton({
  filename = "lim-report.pdf",
  shareable = false,
  label = "تحميل التقرير للطباعة (PDF)",
  className = "rounded-xl bg-[#197f6f] px-5 py-3 font-bold text-white",
}: {
  filename?: string;
  shareable?: boolean;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [shareFile, setShareFile] = useState<File | null>(null);
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
      {shareable && <button type="button" className={`${className} mt-3`} disabled={busy} onClick={async e => {
        setError("");
        if (shareFile) {
          if (navigator.canShare?.({ files: [shareFile] })) {
            try { await navigator.share({ files: [shareFile], title: "تقرير ليم الصحي" }); }
            catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setError("تعذرت المشاركة. حمّل التقرير وأرسله كمرفق في واتساب."); }
          } else {
            const url = URL.createObjectURL(shareFile);
            const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setError("تم تنزيل التقرير. افتح واتساب وأرفقه بالمحادثة التي تختارها.");
          }
          return;
        }
        const root = e.currentTarget.closest<HTMLElement>("[data-final-report]");
        if (!root) { setError("تعذر العثور على التقرير"); return; }
        setBusy(true);
        try {
          const pdf = await createEventPdf(root);
          setShareFile(new File([pdf.output("blob")], filename, { type: "application/pdf" }));
        } catch { setError("تعذر تجهيز التقرير للمشاركة. حاول مرة أخرى."); }
        finally { setBusy(false); }
      }}>{busy ? "جارٍ تجهيز التقرير…" : shareFile ? "مشاركة التقرير — اختر واتساب" : "تجهيز التقرير للمشاركة عبر واتساب"}</button>}
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
