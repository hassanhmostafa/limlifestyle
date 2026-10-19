import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import EventPrintReport from "./EventPrintReport";
import { createEventPdf } from "@/lib/eventPdf";
import {
  acknowledgeResearchReport,
  pendingResearchReport,
  queuePreparedResearchReport,
  researchQueueKey,
} from "@/lib/researchDeliveryQueue";
import type { DashboardReading } from "./BodyCompositionReport";
import type { EventAnswers } from "@/lib/eventLifestyle";

/** Existing approved content only; no recommendation engine or device writes. */
export default function ResearchReportReissue() {
  const [code, setCode] = useState(""),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const context = trpc.eventAdmin.researchReissueContext.useQuery(
    { sessionCode: selected },
    { enabled: Boolean(selected), retry: false, refetchOnWindowFocus: false }
  );
  const relay = trpc.eventAdmin.researchReissuePdf.useMutation();
  const frozen = context.data?.snapshot;
  const readings: DashboardReading[] = frozen
    ? frozen.readings.map((r, i) => ({
        ...r,
        id: r.id ?? i + 1,
        recordedAt: r.recordedAt ?? frozen.archivedAt,
        weight: r.weight == null ? null : String(r.weight),
        height: r.height == null ? null : String(r.height),
        bmi: r.bmi == null ? null : String(r.bmi),
      }))
    : [];
  // A fixed issuance time for this loaded context prevents rerenders changing
  // provenance while its same prepared file is being retried.
  const issuedAt = useRef(new Date().toISOString());
  async function send() {
    if (!context.data || !root.current || busy) return;
    const target = context.data,
      sessionCode = selected;
    setBusy(true);
    setMessage("جارٍ تجهيز النسخة ومزامنتها…");
    try {
      const key = researchQueueKey(target.binding.archiveId, true);
      const prior = await pendingResearchReport(key).catch(() => undefined);
      if (prior?.receiptId) {
        setMessage("سبق استلام النسخة في بوابة الباحثين.");
        return;
      }
      let file: File;
      if (prior?.file)
        file = new File([prior.file], prior.filename, {
          type: "application/pdf",
        });
      else {
        const pdf = await createEventPdf(root.current);
        file = new File([pdf.output("blob")], target.filename, {
          type: "application/pdf",
        });
        const job = await queuePreparedResearchReport(
          target.binding,
          file,
          true
        );
        if (job.receiptId) {
          setMessage("سبق استلام النسخة في بوابة الباحثين.");
          return;
        }
        if (job.file)
          file = new File([job.file], job.filename, {
            type: "application/pdf",
          });
      }
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("PDF_READ_FAILED"));
        reader.readAsDataURL(file);
      });
      const result = await relay.mutateAsync({
        ...target.binding,
        sessionCode,
        pdfBase64,
      });
      if (!result.delivered) throw new Error("RECEIVER_DISABLED");
      await acknowledgeResearchReport(key, result.receiptId).catch(() => {});
      setMessage(
        "استلمت بوابة الباحثين النسخة المعاد إصدارها. استخراج البيانات قيد المعالجة."
      );
    } catch {
      setMessage(
        "لم يتأكد الاستلام. يمكنك إعادة المحاولة بنفس النسخة المحفوظة، دون إعادة القياس."
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-3xl border border-emerald-100 bg-white p-6">
      <h2 className="text-xl font-bold">إعادة إصدار تقرير معتمد للباحثين</h2>
      <p>
        ينشئ نسخة من بيانات التقرير المعتمدة المحفوظة، ويُميزها كنسخة معاد
        إصدارها. لا يغيّر الأصل أو القياسات أو توصيات الطبيب.
      </p>
      <label className="block">
        رمز الجلسة
        <input
          aria-label="رمز جلسة التقرير"
          dir="ltr"
          className="mt-2 w-full rounded-xl border p-3"
          value={code}
          disabled={busy}
          onChange={e => setCode(e.target.value)}
        />
      </label>
      <button
        className="rounded-xl bg-[#123f37] px-5 py-3 font-bold text-white disabled:opacity-40"
        disabled={busy || !/^LIM-[A-Za-z0-9-]{1,28}$/.test(code.trim())}
        onClick={() => {
          setSelected(code.trim());
          setMessage("");
          issuedAt.current = new Date().toISOString();
        }}
      >
        عرض التقرير المعتمد
      </button>
      {context.isFetching && <p>جارٍ استرجاع التقرير المعتمد…</p>}
      {context.error && (
        <p role="alert">
          تعذر استرجاع التقرير؛ تحقق من رمز الجلسة واعتماد التقرير.
        </p>
      )}
      {frozen && context.data && !context.isFetching && (
        <>
          <p>
            التقرير: <bdi>{frozen.participant.code}</bdi> · المراجعة{" "}
            {frozen.reportRevision}
          </p>
          <div ref={root} data-final-report data-pdf-report>
            <EventPrintReport
              participant={frozen.participant}
              readings={readings}
              answers={frozen.answers as EventAnswers}
              lifestyleEnabled={frozen.lifestyleEnabled}
              care={frozen.care}
              frozenLifestyleReport={frozen.lifestyleReport ?? undefined}
              provenance={{
                generatedAt: issuedAt.current,
                templateVersion: frozen.metadata!.templateVersion,
                reportRevision: frozen.reportRevision,
              }}
            />
          </div>
          <button
            className="rounded-xl bg-[#123f37] px-5 py-3 font-bold text-white disabled:opacity-40"
            disabled={busy}
            onClick={() => void send()}
          >
            {busy
              ? "جارٍ المزامنة…"
              : "إرسال النسخة المعاد إصدارها إلى الباحثين"}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
