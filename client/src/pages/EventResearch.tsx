import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { researchCsv } from "@shared/eventResearchExport";
import {
  eventLifestyleSections,
  lifestyleSectionsForAnswers,
  EVENT_LIFESTYLE_VERSION,
} from "@shared/eventLifestyle";
import { nursingCatalog } from "@shared/eventNursing";
const button =
  "rounded-xl bg-[#123f37] px-5 py-3 font-bold text-white disabled:opacity-40";
const input = "w-full rounded-xl border border-emerald-100 p-3";
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
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
  const [after, setAfter] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const data = trpc.eventResearch.data.useQuery(
    { eventCode, after, limit: 25, purpose: "view" },
    { enabled: Boolean(me.data && eventCode), retry: false }
  );
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
      window.location.assign("/events/research");
    },
    onError: e => setMessage(e.message),
  });
  useEffect(() => {
    if (me.data && !me.data.events.some(e => e.eventCode === eventCode)) {
      setEventCode(me.data.events[0]?.eventCode ?? "");
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
          purpose: "export",
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
              <p>
                {me.data.includeIdentity
                  ? "صلاحيتك تشمل بيانات التعريف والملاحظات النصية."
                  : "صلاحيتك لا تشمل الأسماء والجوال والملاحظات النصية."}
              </p>
              <label className="block">
                الفعالية
                <select
                  className={input}
                  value={eventCode}
                  onChange={e => {
                    setEventCode(e.target.value);
                    setAfter(0);
                    setHistory([]);
                  }}
                >
                  {!me.data.events.length && (
                    <option value="">لا توجد فعاليات متاحة</option>
                  )}
                  {me.data.events.map(e => (
                    <option value={e.eventCode} key={e.eventCode}>
                      {e.name} · {e.startsOn ?? e.eventCode}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  className={button}
                  disabled={busy || !eventCode}
                  onClick={() => void exportData("csv")}
                >
                  تنزيل CSV
                </button>
                <button
                  className={button}
                  disabled={busy || !eventCode}
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
            </section>
            <section className="space-y-4 rounded-3xl bg-white p-5">
              <h2 className="text-xl font-bold">الزيارات والبيانات الخام</h2>
              {data.isFetching ? (
                <p>جارٍ تحميل البيانات…</p>
              ) : data.error ? (
                <p role="alert">{data.error.message}</p>
              ) : !data.data?.records.length ? (
                <p>لا توجد زيارات في هذه الصفحة.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.data.records.map(r => (
                    <article
                      key={r.id}
                      className="min-w-0 space-y-3 rounded-2xl border border-emerald-100 p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-bold">الزيارة {r.id}</h3>
                        <span>{r.name ?? r.participantId}</span>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-slate-500">العمر</dt>
                          <dd>{r.age ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">الجنس</dt>
                          <dd>
                            {r.sex === "male"
                              ? "ذكر"
                              : r.sex === "female"
                                ? "أنثى"
                                : "—"}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-slate-500">نسخة الاستبيان</dt>
                          <dd>{r.questionnaireVersion}</dd>
                        </div>
                      </dl>
                      <details>
                        <summary className="cursor-pointer font-bold underline">
                          عرض البيانات
                        </summary>
                        <pre
                          dir="ltr"
                          className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-50 p-3 text-xs"
                        >
                          {JSON.stringify(r, null, 2)}
                        </pre>
                      </details>
                    </article>
                  ))}
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
          </>
        )}
      </div>
    </main>
  );
}
