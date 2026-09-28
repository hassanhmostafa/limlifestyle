import { useState } from "react";
import { trpc } from "@/lib/trpc";
const button =
  "rounded-xl bg-[#123f37] px-5 py-3 font-bold text-white disabled:opacity-40";
const field = "w-full rounded-xl border p-3";
const empty = {
  name: "",
  username: "",
  active: true,
  allEvents: false,
  includeIdentity: false,
  eventCodes: [] as string[],
};
export default function EventResearchAdmin() {
  const data = trpc.eventResearch.adminList.useQuery(undefined, {
    retry: false,
  });
  const [form, setForm] = useState<typeof empty & { id?: number }>(empty);
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const save = trpc.eventResearch.save.useMutation({
    onSuccess: r => {
      setSecret(r.code ?? "");
      setMessage(
        r.code
          ? "تم إنشاء الحساب. انسخ الكود؛ لن يظهر مجددًا."
          : "تم حفظ الصلاحيات وإلغاء جلسات الدخول السابقة"
      );
      setForm(empty);
      void data.refetch();
    },
    onError: e => setMessage(e.message),
  });
  const rotate = trpc.eventResearch.rotate.useMutation({
    onSuccess: r => {
      setSecret(r.code);
      setMessage(
        "تم تغيير الكود وإلغاء جلسات الدخول السابقة. انسخ الكود الآن."
      );
    },
    onError: e => setMessage(e.message),
  });
  return (
    <section
      dir="rtl"
      className="space-y-5 rounded-3xl border border-emerald-100 bg-white p-6"
    >
      <h2 className="text-xl font-bold">الباحثون وصلاحيات البيانات</h2>
      <a
        className={button + " block text-center"}
        href="/events/research"
        target="_blank"
        rel="noreferrer"
      >
        فتح بوابة الباحثين
      </a>
      <p className="text-sm text-slate-600">
        حساب مستقل عن الطبيب والتمريض والمسارات. الوصول للقراءة والتنزيل فقط،
        ويشمل الزيارات في جميع مسارات الفعالية المصرح بها.
      </p>
      {message && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3">
          {message}
        </p>
      )}
      {secret && (
        <div className="space-y-2 rounded-xl bg-lime-50 p-4">
          <p>كود الدخول — يظهر مرة واحدة:</p>
          <code dir="ltr" className="block break-all select-all">
            {secret}
          </code>
          <button
            type="button"
            className="underline"
            onClick={() =>
              void navigator.clipboard
                .writeText(secret)
                .then(() => setMessage("تم نسخ الكود"))
                .catch(() => setMessage("حدد الكود وانسخه يدويًا"))
            }
          >
            نسخ الكود
          </button>
          <button className="mx-4 underline" onClick={() => setSecret("")}>
            إخفاء
          </button>
        </div>
      )}
      {data.isLoading ? (
        <p>جارٍ تحميل الباحثين…</p>
      ) : data.error ? (
        <div role="alert">
          <p>
            تعذر تحميل إدارة الباحثين. تأكد من صلاحية المدير وتجهيز تحديث قاعدة
            البيانات.
          </p>
          <button className="underline" onClick={() => void data.refetch()}>
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <h3 className="font-bold">
              {form.id ? "تعديل حساب الباحث" : "إضافة باحث"}
            </h3>
            <label className="block">
              اسم الباحث
              <input
                className={field}
                required
                maxLength={255}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              اسم المستخدم
              <input
                className={field}
                dir="ltr"
                required
                minLength={3}
                maxLength={80}
                pattern="[A-Za-z0-9._\-]{3,80}"
                autoCapitalize="none"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
              />
            </label>
            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={form.allEvents}
                onChange={e =>
                  setForm({ ...form, allEvents: e.target.checked })
                }
              />
              جميع الفعاليات الحالية والمستقبلية
            </label>
            {!form.allEvents && (
              <fieldset className="space-y-2 rounded-xl border p-3">
                <legend>الفعاليات المسموح بها</legend>
                {data.data?.events.map(e => (
                  <label className="flex items-start gap-3" key={e.eventCode}>
                    <input
                      type="checkbox"
                      checked={form.eventCodes.includes(e.eventCode)}
                      onChange={v =>
                        setForm({
                          ...form,
                          eventCodes: v.target.checked
                            ? [...form.eventCodes, e.eventCode]
                            : form.eventCodes.filter(c => c !== e.eventCode),
                        })
                      }
                    />
                    <span>
                      {e.name} <small dir="ltr">({e.eventCode})</small>
                      {e.startsOn && (
                        <small className="block">
                          {e.startsOn} — {e.endsOn}
                        </small>
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={form.includeIdentity}
                onChange={e =>
                  setForm({ ...form, includeIdentity: e.target.checked })
                }
              />
              إتاحة الأسماء والجوال والملاحظات النصية إلى جانب النتائج الخام
            </label>
            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm({ ...form, active: e.target.checked })}
              />
              الحساب مفعّل
            </label>
            <button
              className={button}
              disabled={
                save.isPending || (!form.allEvents && !form.eventCodes.length)
              }
            >
              {save.isPending
                ? "جارٍ الحفظ…"
                : form.id
                  ? "حفظ صلاحيات الباحث"
                  : "إنشاء الحساب والكود"}
            </button>
            {form.id && (
              <button
                type="button"
                className="mx-4 underline"
                onClick={() => setForm(empty)}
              >
                إلغاء التعديل
              </button>
            )}
          </form>
          <div className="space-y-3">
            {data.data?.researchers.length === 0 && (
              <p>لم تتم إضافة باحثين بعد.</p>
            )}
            {data.data?.researchers.map(r => (
              <article
                key={r.id}
                className="space-y-2 rounded-2xl bg-[#f3f8f6] p-4"
              >
                <h3 className="font-bold">
                  {r.name} — <span dir="ltr">{r.username}</span>
                </h3>
                <p>
                  {r.active ? "مفعّل" : "موقوف"} ·{" "}
                  {r.allEvents
                    ? "جميع الفعاليات"
                    : `${r.eventCodes.length} فعالية محددة`}{" "}
                  ·{" "}
                  {r.includeIdentity
                    ? "مع بيانات التعريف"
                    : "دون حقول التعريف والملاحظات النصية"}
                </p>
                <button
                  className="underline"
                  onClick={() => {
                    setSecret("");
                    setForm({
                      ...r,
                      active: Boolean(r.active),
                      allEvents: Boolean(r.allEvents),
                      includeIdentity: Boolean(r.includeIdentity),
                    });
                  }}
                >
                  تعديل الصلاحيات / إيقاف الحساب
                </button>
                <button
                  className="mx-4 underline"
                  disabled={rotate.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `تغيير كود ${r.name} وإلغاء جلساته الحالية؟`
                      )
                    )
                      rotate.mutate({ id: r.id });
                  }}
                >
                  إنشاء كود جديد
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
