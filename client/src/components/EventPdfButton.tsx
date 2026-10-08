import React, { useEffect, useRef, useState } from "react";
import { createEventPdf } from "@/lib/eventPdf";

function reportRoot(button: HTMLElement) {
  return button.closest<HTMLElement>("[data-final-report]") ?? button.closest<HTMLElement>("[data-pdf-report]");
}
function reportSignature(root: HTMLElement) {
  const printable = root.querySelector<HTMLElement>("[data-print-report]");
  if (printable) return printable.innerHTML;
  const copy = root.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[data-pdf-hide]").forEach(node => node.remove());
  return copy.innerHTML;
}
function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EventPdfButton({
  filename = "lim-report.pdf", shareable = false,
  label = "تحميل التقرير للطباعة (PDF)",
  className = "rounded-xl bg-[#197f6f] px-5 py-3 font-bold text-white",
}: { filename?: string; shareable?: boolean; label?: string; className?: string }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const cached = useRef<{ file: File; signature: string } | null>(null);
  const [preparing, setPreparing] = useState(shareable);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!shareable || !wrapper.current) return;
    const root = reportRoot(wrapper.current);
    if (!root) return;
    let disposed = false;
    let revision = 0;
    let signature = "";
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const next = reportSignature(root);
      if (next === signature) return;
      signature = next;
      const current = ++revision;
      cached.current = null;
      setReady(false);
      setPreparing(true);
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const pdf = await createEventPdf(root);
          if (disposed || current !== revision || next !== reportSignature(root)) return;
          cached.current = { file: new File([pdf.output("blob")], filename, { type: "application/pdf" }), signature: next };
          setReady(true);
          setError("");
        } catch {
          if (!disposed && current === revision) setError("تعذر تجهيز التقرير. أعد المحاولة.");
        } finally {
          if (!disposed && current === revision) setPreparing(false);
        }
      }, 250);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
    schedule();
    return () => { disposed = true; revision++; clearTimeout(timer); observer.disconnect(); };
  }, [filename, shareable, refresh]);

  const download = async () => {
    const root = wrapper.current && reportRoot(wrapper.current);
    if (!root) { setError("تعذر العثور على التقرير"); return; }
    setBusy(true);
    setError("");
    try {
      if (cached.current?.signature === reportSignature(root)) saveFile(cached.current.file);
      else {
        const pdf = await createEventPdf(root);
        saveFile(new File([pdf.output("blob")], filename, { type: "application/pdf" }));
      }
    } catch { setError("تعذر تجهيز PDF. حاول مرة أخرى من Safari أو Chrome."); }
    finally { setBusy(false); }
  };
  const share = () => {
    const root = wrapper.current && reportRoot(wrapper.current);
    const report = cached.current;
    if (!root || !report || report.signature !== reportSignature(root)) {
      setRefresh(value => value + 1);
      return;
    }
    setError("");
    if (navigator.canShare?.({ files: [report.file] })) {
      // Invoke directly during the click: iOS requires transient user activation.
      const sharing = navigator.share({ files: [report.file], title: "تقرير ليم الصحي" });
      setBusy(true);
      sharing.catch(reason => {
        if (!(reason instanceof Error && reason.name === "AbortError"))
          setError("تعذرت المشاركة. حمّل التقرير وأرسله كمرفق في واتساب.");
      }).finally(() => setBusy(false));
    } else {
      saveFile(report.file);
      setError("تم تنزيل التقرير. أرفقه في محادثة واتساب التي تختارها.");
    }
  };
  return <div ref={wrapper} data-pdf-hide className="print:hidden">
    <button type="button" className={className} disabled={busy || preparing} onClick={download}>
      {busy ? "جارٍ فتح التقرير…" : label}
    </button>
    {shareable && <button type="button" className={`${className} mt-3`} disabled={busy || preparing}
      onClick={ready ? share : () => setRefresh(value => value + 1)}>
      {preparing ? "جارٍ تجهيز التقرير…" : ready ? "مشاركة التقرير عبر واتساب" : "إعادة تجهيز التقرير"}
    </button>}
    {shareable && preparing && <p role="status" className="mt-2 text-xs text-slate-500">يُجهّز الملف تلقائيًا؛ بعد ذلك اضغط المشاركة واختر واتساب.</p>}
    <p className="mt-2 text-xs text-slate-500">للطباعة: افتح ملف PDF، ثم اختر طباعة.</p>
    {error && <p role="status" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
