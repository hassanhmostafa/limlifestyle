import EventLifestyleCharts from "@/components/EventLifestyleCharts";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { nursingCatalog } from "@shared/eventNursing";
import type { Measurements } from "@shared/eventCare";
import EventCareSummary from "@/components/EventCareSummary";
import { EventBodyResults } from "@/components/EventBodyResults";

const inputClass = "w-full rounded-xl border border-emerald-200 bg-white p-3";
const buttonClass =
  "rounded-xl bg-[#123f37] px-5 py-3 font-bold text-white disabled:opacity-40";
export default function EventTeam() {
  const me = trpc.eventTeam.me.useQuery(undefined, {
    retry: false,
    refetchInterval: 30000,
  });
  const [loginCode, setLoginCode] = useState("");
  const login = trpc.eventTeam.login.useMutation({
    onSuccess: () => {
      setLoginCode("");
      window.location.assign("/events/team");
    },
  });
  const logout = trpc.eventTeam.logout.useMutation({
    onSuccess: () => window.location.assign("/events/team"),
  });
  const [query, setQuery] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const lookup = trpc.eventTeam.lookup.useMutation();
  const participant = lookup.data;
  const record = trpc.eventTeam.record.useQuery(
    { sessionId: participant?.id ?? 0, confirmed: true },
    {
      enabled: Boolean(participant && confirmed && me.data && !me.isError),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [notes, setNotes] = useState("");
  const [advice, setAdvice] = useState("");
  const [message, setMessage] = useState("");
  const saved = async () => {
    await record.refetch();
    setMessage("تم الحفظ بنجاح");
  };
  const nursing = trpc.eventTeam.saveNursing.useMutation({
    onSuccess: saved,
    onError: e => setMessage(e.message),
  });
  const doctor = trpc.eventTeam.saveAdvice.useMutation({
    onSuccess: saved,
    onError: e => setMessage(e.message),
  });
  const care = record.data?.care;
  useEffect(() => {
    setMeasurements(care?.measurements ?? {});
    setNotes(care?.nurseNotes ?? "");
    setAdvice(care?.advice ?? "");
  }, [care]);
  const pending = nursing.isPending || doctor.isPending;
  return (
    <main dir="rtl" className="min-h-screen bg-[#f3f8f6] p-5 text-[#123a34]">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-3xl bg-[#123f37] p-6 text-white">
          <p className="text-[#dff33d]">ليم LIM · فريق الفعالية</p>
          <h1 className="mt-3 text-2xl font-bold">
            {!me.data || me.isError
              ? "دخول فريق الفعالية"
              : me.data.duty === "doctor"
                ? "صفحة الطبيب"
                : "محطة التمريض"}
          </h1>
          {me.data && !me.isError && (
            <>
              <p>
                {me.data.name} · {me.data.trackName}
              </p>
              <button
                className="mt-3 underline"
                disabled={pending || logout.isPending}
                onClick={() => logout.mutate()}
              >
                تسجيل الخروج
              </button>
              {logout.error && (
                <p role="alert">تعذر تسجيل الخروج، حاول مرة أخرى.</p>
              )}
            </>
          )}
        </header>
        {me.isLoading ? (
          <p>جارٍ التحقق من الدخول…</p>
        ) : !me.data || me.isError ? (
          <form
            className="space-y-4 rounded-3xl bg-white p-6"
            onSubmit={e => {
              e.preventDefault();
              login.mutate({ code: loginCode });
            }}
          >
            <label htmlFor="staff-code" className="block font-bold">
              كود دخول الموظف
            </label>
            <input
              id="staff-code"
              className={inputClass}
              type="password"
              dir="ltr"
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              value={loginCode}
              onChange={e => setLoginCode(e.target.value)}
              placeholder="LIM-…"
              maxLength={100}
              required
            />
            <p className="text-sm text-slate-500">
              أدخل الكود الذي أعطاك الأدمن. يفتح لك دورك ومسارك مباشرة.
            </p>
            <button
              className={buttonClass}
              disabled={login.isPending || !loginCode.trim()}
            >
              {login.isPending ? "جارٍ الدخول…" : "دخول"}
            </button>
            {login.error && (
              <p role="alert" className="text-red-700">
                {login.error.message}
              </p>
            )}
          </form>
        ) : (
          <>
            <form
              className="rounded-3xl bg-white p-5"
              onSubmit={e => {
                e.preventDefault();
                if (pending || lookup.isPending) return;
                setConfirmed(false);
                setMessage("");
                lookup.reset();
                lookup.mutate({ query });
              }}
            >
              <label
                htmlFor="participant-query"
                className="mb-3 block font-bold"
              >
                امسح رمز المستفيد أو ابحث برقم الجوال
              </label>
              <input
                id="participant-query"
                className={inputClass}
                dir="ltr"
                autoComplete="off"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="05XXXXXXXX / LIM-…"
              />
              <p className="my-3 text-sm text-slate-500">
                ضع المؤشر في الخانة ثم استخدم القارئ اللاسلكي. زر Enter ينفذ
                البحث.
              </p>
              <button
                className={buttonClass}
                disabled={lookup.isPending || pending || !query.trim()}
              >
                بحث
              </button>
              {lookup.error && (
                <p role="alert" className="mt-3 text-red-700">
                  {lookup.error.message}
                </p>
              )}
            </form>
            {participant && (
              <section className="rounded-3xl border border-emerald-200 bg-white p-5">
                <h2 className="text-xl font-bold">
                  {participant.name || "المستفيد"}
                </h2>
                <p>
                  {participant.age} سنة ·{" "}
                  {participant.sex === "male" ? "ذكر" : "أنثى"}
                </p>
                <p dir="ltr">
                  {participant.phone} · {participant.code}
                </p>
                <label className="mt-4 flex gap-3">
                  <input
                    type="checkbox"
                    disabled={pending}
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                  />
                  تأكدت من هوية المستفيد قبل فتح الزيارة
                </label>
              </section>
            )}
            {confirmed && record.isLoading && <p>جارٍ جلب الزيارة…</p>}
            {confirmed && record.error && (
              <p role="alert">{record.error.message}</p>
            )}
            {confirmed && participant && care && (
              <>
                <p className="rounded-2xl bg-lime-100 p-4">
                  {care.approvedAt
                    ? "اعتمد الطبيب التقرير وأصبح متاحًا للمستفيد"
                    : care.nursingEnabled && !care.nursingCompletedAt
                      ? "بانتظار إكمال قياسات التمريض"
                      : "جاهز لاستشارة الطبيب"}
                </p>
                {!record.data?.readings.length && (
                  <p>
                    لم تصل نتيجة الجهاز لهذه الزيارة بعد.{" "}
                    <button
                      className="underline"
                      onClick={() => record.refetch()}
                    >
                      تحديث
                    </button>
                  </p>
                )}
                {me.data.duty === "nurse" ? (
                  <section className="space-y-4">
                    {!care.nursingEnabled ? (
                      <p>
                        محطة التمريض مخفية لهذه الزيارة؛ يتابع المستفيد للطبيب.
                      </p>
                    ) : (
                      <>
                        <fieldset
                          disabled={
                            pending ||
                            Boolean(care.nursingCompletedAt) ||
                            Boolean(care.approvedAt)
                          }
                          className="space-y-4"
                        >
                          {care.testIds.map(id => {
                            const test = nursingCatalog.find(t => t.id === id);
                            return (
                              test && (
                                <div
                                  key={id}
                                  className="rounded-3xl bg-white p-5"
                                >
                                  <h2 className="mb-4 font-bold">
                                    {test.name}
                                  </h2>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {test.fields.map(field => (
                                      <label
                                        key={field.key}
                                        className="space-y-1"
                                      >
                                        <span>
                                          {field.label}{" "}
                                          {field.unit && `(${field.unit})`}
                                        </span>
                                        {field.options ? (
                                          <select
                                            className={inputClass}
                                            value={
                                              measurements[id]?.[field.key] ??
                                              ""
                                            }
                                            onChange={e =>
                                              setMeasurements(m => ({
                                                ...m,
                                                [id]: {
                                                  ...m[id],
                                                  [field.key]: e.target.value,
                                                },
                                              }))
                                            }
                                          >
                                            <option value="">اختر</option>
                                            {field.options.map(option => (
                                              <option key={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            className={inputClass}
                                            type={
                                              field.unit ? "number" : "text"
                                            }
                                            step="any"
                                            min={field.unit ? 0 : undefined}
                                            value={
                                              measurements[id]?.[field.key] ??
                                              ""
                                            }
                                            onChange={e =>
                                              setMeasurements(m => ({
                                                ...m,
                                                [id]: {
                                                  ...m[id],
                                                  [field.key]: e.target.value,
                                                },
                                              }))
                                            }
                                          />
                                        )}
                                      </label>
                                    ))}
                                  </div>
                                  {test.note && (
                                    <p className="mt-3 text-sm text-slate-500">
                                      {test.note}
                                    </p>
                                  )}
                                </div>
                              )
                            );
                          })}
                          <label className="block">
                            ملاحظات التمريض
                            <textarea
                              className={inputClass}
                              maxLength={3000}
                              value={notes}
                              onChange={e => setNotes(e.target.value)}
                            />
                          </label>
                        </fieldset>
                        {!care.nursingCompletedAt && !care.approvedAt && (
                          <div className="flex gap-3">
                            <button
                              className={buttonClass}
                              disabled={
                                pending || !record.data?.readings.length
                              }
                              onClick={() =>
                                nursing.mutate({
                                  sessionId: participant.id,
                                  confirmed: true,
                                  measurements,
                                  notes,
                                  finalize: false,
                                })
                              }
                            >
                              حفظ مسودة
                            </button>
                            <button
                              className={buttonClass}
                              disabled={
                                pending || !record.data?.readings.length
                              }
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "اعتماد القياسات وإتاحتها للطبيب والمستفيد؟"
                                  )
                                )
                                  nursing.mutate({
                                    sessionId: participant.id,
                                    confirmed: true,
                                    measurements,
                                    notes,
                                    finalize: true,
                                  });
                              }}
                            >
                              اعتماد وإرسال للطبيب
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                ) : (
                  <>
                    {Boolean(record.data?.readings.length) && (
                      <EventBodyResults
                        readings={record.data!.readings}
                        participant={{
                          firstName: participant.name,
                          age: participant.age,
                          sex: participant.sex,
                        }}
                      />
                    )}
                    <EventLifestyleCharts answers={record.data?.answers ?? {}} />
                    <details className="rounded-2xl bg-white p-5">
                      <summary className="font-bold">
                        إجابات استبيان نمط الحياة
                      </summary>
                      <LifestyleAnswers answers={record.data?.answers ?? {}} />
                    </details>
                    <section className="rounded-2xl bg-white p-5">
                      <h2 className="mb-3 font-bold">قياسات التمريض</h2>
                      {care.nursingEnabled ? (
                        care.nursingCompletedAt ? (
                          <EventCareSummary
                            measurements={care.measurements}
                            notes={care.nurseNotes}
                          />
                        ) : (
                          <p>
                            لم يعتمدها التمريض بعد.{" "}
                            <button
                              className="underline"
                              onClick={() => record.refetch()}
                            >
                              تحديث
                            </button>
                          </p>
                        )
                      ) : (
                        <p>غير مطلوبة لهذه الزيارة</p>
                      )}
                    </section>
                    <label className="block rounded-2xl bg-white p-5">
                      <span className="mb-3 block font-bold">
                        نصائح الطبيب التي تظهر للمستفيد
                      </span>
                      <textarea
                        className={inputClass}
                        rows={6}
                        value={advice}
                        maxLength={10000}
                        disabled={Boolean(care.approvedAt) || pending}
                        onChange={e => setAdvice(e.target.value)}
                      />
                    </label>
                    {!care.approvedAt && (
                      <div className="flex gap-3">
                        <button
                          className={buttonClass}
                          disabled={
                            pending ||
                            !advice.trim() ||
                            !record.data?.readings.length
                          }
                          onClick={() =>
                            doctor.mutate({
                              sessionId: participant.id,
                              confirmed: true,
                              advice,
                              finalize: false,
                            })
                          }
                        >
                          حفظ مسودة
                        </button>
                        <button
                          className={buttonClass}
                          disabled={
                            pending ||
                            !advice.trim() ||
                            !record.data?.readings.length ||
                            Boolean(
                              care.nursingEnabled && !care.nursingCompletedAt
                            )
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                "اعتماد النصائح وإصدار التقرير النهائي للمستفيد؟"
                              )
                            )
                              doctor.mutate({
                                sessionId: participant.id,
                                confirmed: true,
                                advice,
                                finalize: true,
                              });
                          }}
                        >
                          اعتماد التقرير النهائي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {message && (
              <p role="status" className="rounded-xl bg-white p-4">
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

import { eventLifestyleSections } from "@/lib/eventLifestyle";
function LifestyleAnswers({
  answers,
}: {
  answers: Record<string, string | number | string[]>;
}) {
  return (
    <dl className="mt-3 space-y-3">
      {eventLifestyleSections
        .flatMap(s => s.questions)
        .filter(q => answers[q.id] !== undefined)
        .map(q => (
          <div key={q.id}>
            <dt className="text-sm text-slate-500">{q.text}</dt>
            <dd>
              {(Array.isArray(answers[q.id])
                ? (answers[q.id] as string[])
                : [answers[q.id]]
              )
                .map(
                  value =>
                    q.options?.find(o => o.value === value)?.label ??
                    String(value)
                )
                .join("، ")}
            </dd>
          </div>
        ))}
    </dl>
  );
}
