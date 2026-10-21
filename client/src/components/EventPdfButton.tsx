import { useEventLocale } from "@/contexts/EventLocale";
import React, { useEffect, useRef, useState } from "react";
import { createEventPdf } from "@/lib/eventPdf";

function reportRoot(button: HTMLElement) {
  return (
    button.closest<HTMLElement>("[data-final-report]") ??
    button.closest<HTMLElement>("[data-pdf-report]")
  );
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
  filename = "lim-report.pdf",
  shareable = false,
  label = "تحميل التقرير للطباعة (PDF)",
  className = "rounded-xl bg-[#197f6f] px-5 py-3 font-bold text-white",
  onPreparedPdf,
  additionalFiles = [],
  attachmentsPending = false,
  attachmentsExpected = false,
  onRetryAttachments,
}: {
  additionalFiles?: File[];
  attachmentsPending?: boolean;
  attachmentsExpected?: boolean;
  onRetryAttachments?: () => void;
  filename?: string;
  shareable?: boolean;
  label?: string;
  className?: string;
  onPreparedPdf?: (file: File) => void | Promise<void>;
}) {
  const { t } = useEventLocale();
  const wrapper = useRef<HTMLDivElement>(null);
  const preparedCallback = useRef(onPreparedPdf);
  preparedCallback.current = onPreparedPdf;
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
          if (
            disposed ||
            current !== revision ||
            next !== reportSignature(root)
          )
            return;
          const file = new File([pdf.output("blob")], filename, {
            type: "application/pdf",
          });
          cached.current = { file, signature: next };
          // Non-blocking: sharing/downloading remains usable if archival storage
          // is temporarily unavailable. The next rendered report retries it.
          void Promise.resolve(preparedCallback.current?.(file)).catch(
            () => {}
          );
          setReady(true);
          setError("");
        } catch {
          if (!disposed && current === revision)
            setError("تعذر تجهيز التقرير. أعد المحاولة.");
        } finally {
          if (!disposed && current === revision) setPreparing(false);
        }
      }, 250);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    schedule();
    return () => {
      disposed = true;
      revision++;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [filename, shareable, refresh]);

  const download = async () => {
    const root = wrapper.current && reportRoot(wrapper.current);
    if (!root) {
      setError("تعذر العثور على التقرير");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (cached.current?.signature === reportSignature(root))
        saveFile(cached.current.file);
      else {
        const pdf = await createEventPdf(root);
        saveFile(
          new File([pdf.output("blob")], filename, { type: "application/pdf" })
        );
      }
    } catch {
      setError("تعذر تجهيز PDF. حاول مرة أخرى من Safari أو Chrome.");
    } finally {
      setBusy(false);
    }
  };
  const share = () => {
    if (
      attachmentsExpected &&
      (attachmentsPending || additionalFiles.length === 0)
    ) {
      onRetryAttachments?.();
      return;
    }
    const root = wrapper.current && reportRoot(wrapper.current);
    const report = cached.current;
    if (!root || !report || report.signature !== reportSignature(root)) {
      setRefresh(value => value + 1);
      return;
    }
    setError("");
    const files = [report.file, ...additionalFiles];
    let canShareFiles = false;
    try {
      canShareFiles = Boolean(navigator.canShare?.({ files }));
    } catch {
      canShareFiles = false;
    }
    if (!canShareFiles) {
      saveFile(report.file);
      additionalFiles.forEach(saveFile);
      setError(
        files.length > 1
          ? "تم تنزيل الملفين. أرفقهما في محادثة واتساب التي تختارها."
          : "تم تنزيل التقرير. أرفقه في محادثة واتساب التي تختارها."
      );
      return;
    }
    try {
      // Invoke directly during the click: iOS requires transient user activation.
      const sharing = navigator.share({ files, title: t("تقرير ليم الصحي") });
      setBusy(true);
      Promise.resolve(sharing)
        .catch(reason => {
          if (!(reason instanceof Error && reason.name === "AbortError")) {
            files.forEach(saveFile);
            setError(
              files.length > 1
                ? "تعذرت المشاركة المباشرة؛ تم تنزيل الملفين لإرفاقهما في واتساب."
                : "تعذرت المشاركة المباشرة؛ تم تنزيل التقرير لإرفاقه في واتساب."
            );
          }
        })
        .finally(() => setBusy(false));
    } catch {
      files.forEach(saveFile);
      setError(
        files.length > 1
          ? "تم تنزيل الملفين. أرفقهما في محادثة واتساب التي تختارها."
          : "تم تنزيل التقرير. أرفقه في محادثة واتساب التي تختارها."
      );
    }
  };
  return (
    <div ref={wrapper} data-pdf-hide className="print:hidden">
      {!shareable && (
        <button
          type="button"
          className={className}
          disabled={busy || preparing}
          onClick={download}
        >
          {t(busy ? t("جارٍ فتح التقرير…") : label)}
        </button>
      )}
      {shareable && additionalFiles.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          {t(
            "التقرير وملف الإجابات يحملان معرّف الفحص نفسه، وتتم مشاركتهما معًا."
          )}
        </p>
      )}
      {shareable && (
        <button
          type="button"
          className={`${className} mt-3`}
          disabled={
            busy || preparing || (attachmentsExpected && attachmentsPending)
          }
          onClick={ready ? share : () => setRefresh(value => value + 1)}
        >
          {t(
            preparing
              ? t("جارٍ تجهيز التقرير…")
              : attachmentsExpected && attachmentsPending
                ? t("جارٍ تجهيز الاستبيان…")
                : attachmentsExpected && additionalFiles.length === 0
                  ? t("إعادة تجهيز التقرير + الاستبيان للمشاركة")
                  : ready
                    ? t("مشاركة التقرير + الاستبيان عبر الواتساب")
                    : t("إعادة تجهيز التقرير")
          )}
        </button>
      )}
      {shareable && preparing && (
        <p role="status" className="mt-2 text-xs text-slate-500">
          {t("يُجهّز الملف تلقائيًا؛ بعد ذلك اضغط المشاركة واختر واتساب.")}
        </p>
      )}

      {error && (
        <p role="status" className="mt-2 text-sm text-red-700">
          {t(error)}
        </p>
      )}
    </div>
  );
}
