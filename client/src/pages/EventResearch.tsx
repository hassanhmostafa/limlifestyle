import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { researchCsv } from "@shared/eventResearchExport";
import {
  eventLifestyleSections,
  lifestyleSectionsForAnswers,
  EVENT_LIFESTYLE_VERSION,
} from "@shared/eventLifestyle";
import { nursingCatalog } from "@shared/eventNursing";
import EventPrintReport from "@/components/EventPrintReport";
import EventPdfButton from "@/components/EventPdfButton";
import type { DashboardReading } from "@/components/BodyCompositionReport";
import { eventReportFilename, EVENT_REPORT_TEMPLATE_VERSION } from "@shared/eventReportArchive";
const button =
  "rounded-xl bg-[#123f37] px-5 py-3 font-bold text-white disabled:opacity-40";
const input = "w-full rounded-xl border border-emerald-100 p-3";
const visitColumns = [
  ["visit", "رقم الزيارة"], ["participant", "رمز المشارك"], ["date", "التاريخ"],
  ["status", "حالة التقرير"], ["age", "العمر"], ["sex", "الجنس"], ["questionnaire", "نسخة الاستبيان"],
  ["score", "المؤشر العام"], ["nutrition", "التغذية"], ["activity", "النشاط"], ["sleep", "النوم"],
  ["mood", "المزاج"], ["connection", "التواصل"], ["substances", "المواد"],
  ["weight", "الوزن"], ["bmi", "BMI"], ["waist", "الخصر"], ["glucose", "الجلوكوز"],
] as const;
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadBase64(name: string, base64: string, type: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function EventResearch() {
  const me = trpc.eventResearch.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [latestOnly, setLatestOnly] = useState(false);
  const [columns, setColumns] = useState(["visit", "participant", "date", "status", "age", "sex", "questionnaire", "score", "weight", "bmi", "waist", "glucose"]);
  const [after, setAfter] = useState(0);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [visitCode, setVisitCode] = useState(""); const [identity, setIdentity] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const [archiveAfter, setArchiveAfter] = useState(0); const [archiveHistory, setArchiveHistory] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [archive, setArchive] = useState<any>(null);
  const data = trpc.eventResearch.data.useQuery(
    { eventCode, after, limit: 25, purpose: "view", from: from || undefined, to: to || undefined, code: visitCode || undefined, identity: identity || undefined },
    { enabled: Boolean(me.data && eventCode), retry: false }
  );
  const archives = trpc.eventResearch.archives.useQuery(
    { eventCode, after: archiveAfter, limit: 25 },
    { enabled: Boolean(me.data?.reportArchiveAccess && eventCode), retry: false }
  );
  const exportFilters = { from: from || undefined, to: to || undefined, code: visitCode || undefined, identity: identity || undefined };
  const invalidDateRange = Boolean(from && to && from > to);
  const resetRecordPagination = () => { setAfter(0); setHistory([]); };
  const exportXlsx = trpc.eventResearch.exportXlsx.useMutation({
    onSuccess: result => {
      downloadBase64(result.filename, result.base64, result.mimeType);
      setMessage(`تم تنزيل ملف Excel يحتوي على ${result.rowCount} زيارة`);
    },
    onError: error => setMessage(error.message),
  });
  const exportXlsxZip = trpc.eventResearch.exportXlsxZip.useMutation({
    onSuccess: result => {
      downloadBase64(result.filename, result.base64, result.mimeType);
      setMessage(`تم تنزيل ملف ZIP يحتوي على ${result.rowCount} زيارة`);
    },
    onError: error => setMessage(error.message),
  });
  const retryArchiveStorage = trpc.eventResearch.retryArchiveStorage.useMutation({
    onSuccess: async () => { setMessage("أُعيدت محاولة حفظ النسخة الثابتة."); await archives.refetch(); },
    onError: error => setMessage(error.message),
  });
  const visibleEvents = useMemo(() => {
    const query = eventFilter.trim().toLocaleLowerCase("ar");
    if (!query || !me.data) return me.data?.events ?? [];
    return me.data.events.filter(event => [event.name, event.organizer, event.startsOn, event.endsOn, event.eventCode]
      .filter(Boolean).some(value => String(value).toLocaleLowerCase("ar").includes(query)));
  }, [eventFilter, me.data]);
  const login = trpc.eventResearch.login.useMutation({
    onSuccess: async () => {
      setCode("");
      setMessage("");
      await utils.eventResearch.invalidate();
    },
    onError: e => setMessage(e.message),
  });
  const logout = trpc.eventResearch.logout.useMutation({
    onSuccess: () => {
      utils.eventResearch.me.setData(undefined, undefined);
      utils.eventResearch.data.invalidate();
      window.location.assign("/research");
    },
    onError: e => setMessage(e.message),
  });
  useEffect(() => {
    if (me.data && !me.data.events.some(e => e.eventCode === eventCode)) {
      setEventCode(me.data.events[0]?.eventCode ?? "");
      setSelectedCodes(me.data.events[0] ? [me.data.events[0].eventCode] : []);
      setAfter(0);
      setHistory([]);
    }
  }, [me.data, eventCode]);
  async function exportData(format: "json" | "csv") {
    setBusy(true);
    setMessage("جارٍ تجهيز البيانات…");
    try {
      const records: Record<string, unknown>[] = [];
      let cursor = 0;
      do {
        const p = await utils.eventResearch.data.fetch({
          eventCode,
          after: cursor,
          limit: 50,
          purpose: "export", ...exportFilters,
        });
        records.push(...p.records);
        if (p.nextCursor === null) break;
        cursor = p.nextCursor;
      } while (true);
      // Recheck authorization at the end before creating a downloadable artifact.
      await utils.eventResearch.me.fetch();
      const name = `lim-research-${eventCode.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      if (format === "csv")
        download(name + ".csv", researchCsv(records), "text/csv;charset=utf-8");
      else
        download(
          name + ".json",
          JSON.stringify(
            {
              event: me.data?.events.find(e => e.eventCode === eventCode),
              exportedAt: new Date().toISOString(),
              records,
            },
            null,
            2
          ),
          "application/json"
        );
      setMessage(`تم تنزيل ${records.length} زيارة`);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "تعذر تنزيل البيانات. لم يتم تنزيل ملف جزئي."
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main dir="rtl" className="min-h-screen bg-[#f3f8f6] p-5 text-[#123a34]">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-[#123f37] p-7 text-white">
          <p className="text-lime-300">LIM · ليم</p>
          <h1 className="mt-2 text-3xl font-bold">بوابة الباحثين</h1>
          <p className="mt-3">
            بيانات الفعاليات المصرّح لك بها · عرض وتنزيل البيانات الخام
          </p>
        </header>
        {message && (
          <p role="status" className="rounded-xl bg-white p-4">
            {message}
          </p>
        )}
        {me.isLoading ? (
          <p>جارٍ التحقق من الدخول…</p>
        ) : !me.data || me.error ? (
          <form
            onSubmit={e => {
              e.preventDefault();
              login.mutate({ username, code });
            }}
            className="mx-auto max-w-lg space-y-5 rounded-3xl bg-white p-6"
          >
            <h2 className="text-xl font-bold">تسجيل دخول الباحث</h2>
            <p>استخدم اسم المستخدم والكود اللذين منحك إياهما الأدمن.</p>
            <label className="block">
              اسم المستخدم
              <input
                className={input}
                required
                dir="ltr"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </label>
            <label className="block">
              كود الدخول
              <input
                className={input}
                required
                dir="ltr"
                type="password"
                autoComplete="current-password"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </label>
            <button className={button + " w-full"} disabled={login.isPending}>
              {login.isPending ? "جارٍ الدخول…" : "دخول"}
            </button>
          </form>
        ) : (
          <>
            <section className="space-y-4 rounded-3xl bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-bold">أهلًا {me.data.name}</h2>
                <button
                  className="underline"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate()}
                >
                  تسجيل الخروج
                </button>
              </div>
              <p>الجداول وملفات التصدير الاعتيادية منزوعة الهوية ولا تشمل الأسماء أو الجوال أو الملاحظات النصية.</p>
              {me.data.reportArchiveAccess && <p className="text-sm text-amber-800">لديك صلاحية إضافية للتقارير الكاملة المؤرشفة؛ قد تتضمن اسم المشارك والملاحظات والتوصية المعتمدة، ويُسجل الوصول إليها.</p>}
              <label className="block">
                الفعالية
                <input value={eventFilter} onChange={e => setEventFilter(e.target.value)} className={input + " mb-2 text-sm"} placeholder="ابحث بالاسم أو الجهة أو التاريخ" />
                <select
                  className={input}
                  value={eventCode}
                  onChange={e => {
                    setEventCode(e.target.value);
                    setAfter(0);
                    setHistory([]); setArchiveAfter(0); setArchiveHistory([]);
                  }}
                >
                  {!me.data.events.length && (
                    <option value="">لا توجد فعاليات متاحة</option>
                  )}
                  {visibleEvents.map(e => (
                    <option value={e.eventCode} key={e.eventCode}>
                      {e.name} · {e.startsOn ?? e.eventCode} · {e.completed}/{e.total} مكتملة
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  className={button}
                  disabled={busy || !eventCode || invalidDateRange}
                  onClick={() => void exportData("csv")}
                >
                  تنزيل CSV
                </button>
                <button
                  className={button}
                  disabled={busy || !eventCode || invalidDateRange}
                  onClick={() => void exportData("json")}
                >
                  تنزيل JSON كامل
                </button>
                <button
                  className={button}
                  onClick={() =>
                    download(
                      "lim-data-dictionary.json",
                      JSON.stringify(
                        {
                          questionnaires: {
                            [EVENT_LIFESTYLE_VERSION]: eventLifestyleSections,
                            legacy: lifestyleSectionsForAnswers({}),
                          },
                          nursing: nursingCatalog,
                          notes: [
                            "معرّفات المشاركين ثابتة داخل المنصة",
                            "كل صف يمثل زيارة؛ الفراغ يعني عدم توفر البيانات وليس صفرًا",
                            "نسخة الاستبيان محفوظة لكل زيارة؛ alcoholUse يختلف عن alcohol القديم",
                            "حالات اعتماد التمريض والطبيب تميز البيانات المعتمدة من المسودات",
                            "readings يحتفظ بجميع رسائل الجهاز المرتبطة بقياس الزيارة ومصدرها؛ قد يشمل بيانات اختبار",
                          ],
                        },
                        null,
                        2
                      ),
                      "application/json"
                    )
                  }
                >
                  قاموس المتغيرات
                </button>
              </div>
              <fieldset className="space-y-3 rounded-2xl border border-emerald-100 p-4">
                <legend className="px-1 font-bold">تصدير Excel للفعاليات المسموح بها</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {me.data.events.map(event => <label key={event.eventCode} className="flex gap-2 text-sm"><input type="checkbox" checked={selectedCodes.includes(event.eventCode)} onChange={e => setSelectedCodes(current => e.target.checked ? [...current, event.eventCode] : current.filter(code => code !== event.eventCode))} />{event.name} <span dir="ltr">({event.eventCode})</span></label>)}
                </div>
                <label className="flex gap-2 text-sm"><input type="checkbox" checked={latestOnly} onChange={e => setLatestOnly(e.target.checked)} />أحدث زيارة فقط لكل مشارك (الافتراضي: كل الزيارات)</label>
                <div className="flex flex-wrap gap-3"><button className={button} disabled={!selectedCodes.length || invalidDateRange || exportXlsx.isPending || exportXlsxZip.isPending} onClick={() => exportXlsx.mutate({ eventCodes: selectedCodes, latestPerParticipant: latestOnly, filters: exportFilters })}>{exportXlsx.isPending ? "جارٍ تجهيز Excel…" : "تنزيل Excel موحّد"}</button><button className={button} disabled={!selectedCodes.length || invalidDateRange || exportXlsx.isPending || exportXlsxZip.isPending} onClick={() => exportXlsxZip.mutate({ eventCodes: selectedCodes, latestPerParticipant: latestOnly, filters: exportFilters })}>{exportXlsxZip.isPending ? "جارٍ تجهيز ZIP…" : "تنزيل ملفات Excel منفصلة (ZIP)"}</button></div>
              </fieldset>
            </section>
            <section className="space-y-4 rounded-3xl bg-white p-5">
              <h2 className="text-xl font-bold">الزيارات والبيانات الخام</h2>
              <div className="grid gap-2 sm:grid-cols-4"><input className={input} type="date" value={from} onChange={e => {setFrom(e.target.value);resetRecordPagination()}} aria-label="من تاريخ"/><input className={input} type="date" value={to} onChange={e => {setTo(e.target.value);resetRecordPagination()}} aria-label="إلى تاريخ"/><input className={input} value={visitCode} onChange={e => {setVisitCode(e.target.value);resetRecordPagination()}} placeholder="رمز الزيارة أو المشارك"/>{me.data.reportArchiveAccess && <input className={input} value={identity} onChange={e => {setIdentity(e.target.value);resetRecordPagination()}} placeholder="اسم أو جوال (صلاحية خاصة)"/>}</div>
              {invalidDateRange && <p role="alert" className="text-sm text-red-700">يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساويًا له.</p>}
              <fieldset className="flex flex-wrap gap-x-4 gap-y-2 rounded-2xl bg-slate-50 p-3 text-sm">
                <legend className="px-1 font-bold">الأعمدة الظاهرة</legend>
                {visitColumns.map(([id, label]) => <label key={id} className="flex gap-1.5"><input type="checkbox" checked={columns.includes(id)} onChange={e => setColumns(current => e.target.checked ? [...current, id] : current.filter(column => column !== id))} />{label}</label>)}
              </fieldset>
              {data.isFetching ? (
                <p>جارٍ تحميل البيانات…</p>
              ) : data.error ? (
                <p role="alert">{data.error.message}</p>
              ) : !data.data?.records.length ? (
                <p>لا توجد زيارات في هذه الصفحة.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-emerald-100">
                  <table className="w-full min-w-[680px] text-right text-sm"><thead className="bg-[#edf7f3]"><tr>{visitColumns.filter(([id]) => columns.includes(id)).map(([id, label]) => <th key={id} className="whitespace-nowrap p-3 font-bold">{label}</th>)}<th className="p-3">تفاصيل</th></tr></thead><tbody>
                    {data.data.records.map(r => <tr key={r.id} className="border-t border-emerald-50">
                      {columns.includes("visit") && <td className="p-3">{r.id}</td>}
                      {columns.includes("participant") && <td className="p-3"><bdi>{r.participantId}</bdi></td>}
                      {columns.includes("date") && <td className="whitespace-nowrap p-3">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-CA") : "—"}</td>}
                      {columns.includes("status") && <td className="p-3">{r.approvedAt ? "مكتمل" : r.nursingCompletedAt ? "بانتظار التقرير" : "قيد الإجراء"}</td>}
                      {columns.includes("age") && <td className="p-3">{r.age ?? "—"}</td>}
                      {columns.includes("sex") && <td className="p-3">{r.sex === "male" ? "ذكر" : r.sex === "female" ? "أنثى" : "—"}</td>}
                      {columns.includes("questionnaire") && <td className="p-3">{r.questionnaireVersion}</td>}
                      {columns.includes("score") && <td className="p-3">{r.lifestyleScore ?? "—"}</td>}
                      {columns.includes("nutrition") && <td className="p-3">{r.lifestyleDomains?.nutrition ?? "—"}</td>}
                      {columns.includes("activity") && <td className="p-3">{r.lifestyleDomains?.activity ?? "—"}</td>}
                      {columns.includes("sleep") && <td className="p-3">{r.lifestyleDomains?.sleep ?? "—"}</td>}
                      {columns.includes("mood") && <td className="p-3">{r.lifestyleDomains?.mood ?? "—"}</td>}
                      {columns.includes("connection") && <td className="p-3">{r.lifestyleDomains?.connection ?? "—"}</td>}
                      {columns.includes("substances") && <td className="p-3">{r.lifestyleDomains?.substances ?? "—"}</td>}
                      {columns.includes("weight") && <td className="p-3">{r.clinical?.weight ?? "—"}</td>}
                      {columns.includes("bmi") && <td className="p-3">{r.clinical?.bmi ?? "—"}</td>}
                      {columns.includes("waist") && <td className="p-3">{r.clinical?.waist ?? "—"}</td>}
                      {columns.includes("glucose") && <td className="p-3">{r.clinical?.glucose ?? "—"}</td>}
                      <td className="p-3">{r.archiveId && me.data.reportArchiveAccess ? <button className="ml-3 underline" onClick={() => void utils.eventResearch.archiveSnapshot.fetch({ archiveId: r.archiveId! }).then(setArchive).catch(error => setMessage(error instanceof Error ? error.message : "تعذر فتح النسخة المؤرشفة"))}>التقرير المؤرشف</button> : null}<details><summary className="cursor-pointer underline">عرض</summary><pre dir="ltr" className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-50 p-3 text-xs">{JSON.stringify(r, null, 2)}</pre></details></td>
                    </tr>)}
                  </tbody></table>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  className={button}
                  disabled={!history.length || data.isFetching}
                  onClick={() => {
                    setAfter(history.at(-1)!);
                    setHistory(history.slice(0, -1));
                  }}
                >
                  السابق
                </button>
                <button
                  className={button}
                  disabled={data.isFetching || !data.data?.nextCursor}
                  onClick={() => {
                    setHistory([...history, after]);
                    setAfter(data.data!.nextCursor!);
                  }}
                >
                  التالي
                </button>
              </div>
            </section>
            {me.data.reportArchiveAccess && <section className="space-y-4 rounded-3xl bg-white p-5">
              <div>
                <h2 className="text-xl font-bold">أرشيف التقارير النهائيّة</h2>
                <p className="mt-1 text-sm text-slate-600">هذه صلاحية إضافية. فتح النسخة أو تنزيل الملف الأصلي يُسجّل في سجل التدقيق.</p>
              </div>
              {archives.isLoading ? <p>جارٍ تحميل الأرشيف…</p> : archives.error ? <p role="alert">تعذر تحميل الأرشيف.</p> : !archives.data?.archives.length ? <p>لا توجد تقارير مؤرشفة لهذه الفعالية.</p> : <div className="space-y-3">
                {archives.data.archives.map(item => <article key={item.archiveId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 p-4">
                  <div><b>زيارة {item.sessionId} · رمز {item.participantCode} · نسخة التقرير {item.reportRevision}</b><p className="text-xs text-slate-500">اللقطة: {item.snapshotStatus} · PDF: {item.pdfStatus}</p></div>
                  <div className="flex flex-wrap gap-3">
                    <button className="underline" onClick={() => void utils.eventResearch.archiveSnapshot.fetch({ archiveId: item.archiveId }).then(setArchive).catch(error => setMessage(error instanceof Error ? error.message : "تعذر فتح النسخة المؤرشفة"))}>فتح النسخة المؤرشفة</button>
                    {item.pdfStatus === "archived" ? <a className="underline" href={`/api/research/reports/${item.archiveId}/original.pdf`}>تنزيل PDF الأصلي</a> : <span className="text-xs text-slate-500">ملف PDF غير محفوظ بعد</span>}
                    {item.snapshotStatus !== "archived" && <button className="underline" disabled={retryArchiveStorage.isPending} onClick={() => retryArchiveStorage.mutate({ archiveId: item.archiveId })}>إعادة محاولة حفظ النسخة</button>}
                  </div>
                </article>)}
              </div>}
              {archives.data?.archives.length ? <div className="flex gap-3"><button className={button} disabled={!archiveHistory.length || archives.isFetching} onClick={() => { setArchiveAfter(archiveHistory.at(-1)!); setArchiveHistory(archiveHistory.slice(0, -1)); }}>السابق</button><button className={button} disabled={!archives.data.nextCursor || archives.isFetching} onClick={() => { setArchiveHistory([...archiveHistory, archiveAfter]); setArchiveAfter(archives.data!.nextCursor!); }}>التالي</button></div> : null}
              {archive?.snapshot && <ArchivedSnapshot snapshot={archive.snapshot} />}
            </section>}
          </>
        )}
      </div>
    </main>
  );
}

/** Reuses the participant report renderer with saved inputs only; no AI or live visit data is read. */
function ArchivedSnapshot({ snapshot }: { snapshot: any }) {
  const generatedAt = useMemo(() => new Date().toISOString(), [snapshot.reportRevision, snapshot.archivedAt]);
  const metadata = snapshot.metadata ?? { participantId: "Plegacy", visitId: snapshot.participant.code, visitDate: snapshot.archivedAt, reportRevision: snapshot.reportRevision, questionnaireVersion: "legacy", scoringVersion: "legacy", templateVersion: "legacy" };
  return <section className="space-y-4 rounded-2xl border-2 border-emerald-200 bg-[#f7fbf9] p-4" data-final-report data-pdf-report>
    <div><h3 className="font-bold">إعادة إنشاء التقرير من النسخة المؤرشفة</h3><p className="text-sm text-slate-600">لقطة ثابتة؛ لا يعيد النظام حساب التوصيات أو يستدعي الذكاء الاصطناعي.</p></div>
    <EventPrintReport
      participant={snapshot.participant}
      readings={snapshot.readings as DashboardReading[]}
      answers={snapshot.answers}
      lifestyleEnabled={snapshot.lifestyleEnabled}
      care={snapshot.care}
      frozenLifestyleReport={snapshot.lifestyleReport}
      provenance={{ generatedAt, templateVersion: EVENT_REPORT_TEMPLATE_VERSION, reportRevision: snapshot.reportRevision }}
    />
    <div data-pdf-hide><EventPdfButton filename={eventReportFilename(metadata, true)} label="تنزيل التقرير المعاد إنشاؤه" /></div>
  </section>;
}
