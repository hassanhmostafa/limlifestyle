import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { nursingCatalog } from "@shared/eventNursing";
export default function EventCareAdmin() {
  const settings = trpc.eventTeam.settings.useQuery(undefined, {
    retry: false,
  });
  const [enabled, setEnabled] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [newTrack, setNewTrack] = useState("");
  const [secret, setSecret] = useState<{ code: string; name: string } | null>(
    null
  );
  const [copyStatus, setCopyStatus] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (settings.data) {
      setEnabled(Boolean(settings.data.nursingEnabled));
      setIds(settings.data.testIds);
    }
  }, [settings.data]);
  const configure = trpc.eventTeam.configure.useMutation({
    onSuccess: async () => {
      await settings.refetch();
      setMessage("تم حفظ إعدادات الزيارات الجديدة");
    },
    onError: e => setMessage(e.message),
  });
  const createTrack = trpc.eventTeam.createTrack.useMutation({
    onSuccess: async () => {
      setNewTrack("");
      await settings.refetch();
      setMessage("تم إنشاء المسار");
    },
    onError: e => setMessage(e.message),
  });
  const revealCode = (code: string, name: string) => {
    setSecret({ code, name });
    setCopyStatus("");
  };
  const button =
    "rounded-xl bg-[#123f37] px-5 py-3 font-bold text-white disabled:opacity-40";
  return (
    <main dir="rtl" className="min-h-screen bg-[#f3f8f6] p-5 text-[#123a34]">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-2xl font-bold">ليم · إعداد دورة الفعالية</h1>
        <p>إعداد محطة التمريض وصلاحيات الفريق للفعالية الحالية.</p>
        {settings.isLoading ? (
          <p>جارٍ التحميل…</p>
        ) : settings.error ? (
          <>
            <p role="alert">{settings.error.message}</p>
            <a
              href="/login?redirect=%2Fevents%2Fcare-admin"
              className="underline"
            >
              دخول الأدمن
            </a>
          </>
        ) : (
          <>
            <section className="space-y-4 rounded-3xl bg-white p-6">
              <label className="flex gap-3 text-lg font-bold">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={e => setEnabled(e.target.checked)}
                />
                إظهار محطة التمريض ضمن رحلة المستفيد
              </label>
              <p>
                عند إخفائها ينتقل المستفيد من تحليل الجسم إلى الطبيب. الإعدادات
                تُحفظ لكل زيارة؛ التعديل يسري على الزيارات الجديدة.
              </p>
              <label className="block">
                إضافة فحص
                <select
                  value=""
                  className="mt-2 w-full rounded-xl border p-3"
                  onChange={e => {
                    if (e.target.value) setIds([...ids, e.target.value]);
                  }}
                >
                  <option value="">اختر من قائمة الفحوصات</option>
                  {nursingCatalog
                    .filter(t => !ids.includes(t.id))
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                {ids.map(id => (
                  <button
                    key={id}
                    className="rounded-full bg-emerald-50 px-4 py-2"
                    onClick={() => setIds(ids.filter(x => x !== id))}
                  >
                    {nursingCatalog.find(t => t.id === id)?.name} ×
                  </button>
                ))}
              </div>
              <button
                className={button}
                disabled={configure.isPending || (enabled && !ids.length)}
                onClick={() =>
                  configure.mutate({ nursingEnabled: enabled, testIds: ids })
                }
              >
                حفظ إعدادات التمريض
              </button>
            </section>
            <section className="space-y-4 rounded-3xl bg-white p-6">
              <h2 className="text-xl font-bold">
                مسارات الفعالية ·{" "}
                {settings.data?.tracks.filter(t => t.active).length ?? 0} مفعّلة
              </h2>
              <p>
                أنشئ المسارات ثم أضف الطبيب والتمريض لكل مسار. وجّه المستفيد إلى
                رابط مساره قبل التسجيل.
              </p>
              <form
                className="flex flex-wrap gap-3"
                onSubmit={e => {
                  e.preventDefault();
                  createTrack.mutate({ name: newTrack });
                }}
              >
                <input
                  aria-label="اسم المسار الجديد"
                  className="min-w-0 flex-1 rounded-xl border p-3"
                  placeholder="مثال: المسار 2"
                  maxLength={100}
                  required
                  value={newTrack}
                  onChange={e => setNewTrack(e.target.value)}
                />
                <button
                  className={button}
                  disabled={createTrack.isPending || !newTrack.trim()}
                >
                  إضافة مسار
                </button>
              </form>
            </section>
            {settings.data?.tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                staff={settings.data!.staff.filter(s => s.trackId === track.id)}
                refresh={() => settings.refetch()}
                onCode={revealCode}
              />
            ))}
            {secret && (
              <Dialog
                open
                onOpenChange={open => {
                  if (!open) setSecret(null);
                }}
              >
                <DialogContent
                  dir="rtl"
                  className="rounded-3xl border-lime-400 bg-lime-50 p-6"
                >
                  <DialogTitle>كود {secret.name}</DialogTitle>
                  <DialogDescription>
                    انسخه وسلّمه للموظف. يظهر هنا مرة واحدة؛ يمكن إصدار بديل إذا
                    فقدته.
                  </DialogDescription>
                  <code
                    dir="ltr"
                    className="block break-all rounded-xl bg-white p-4 text-center text-lg select-all"
                  >
                    {secret.code}
                  </code>
                  <div className="mt-4 flex gap-3">
                    <button
                      className={button}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(secret.code);
                          setCopyStatus("تم نسخ الكود");
                        } catch {
                          setCopyStatus("حدد الكود أعلاه وانسخه يدويًا");
                        }
                      }}
                    >
                      نسخ الكود
                    </button>
                    <button className={button} onClick={() => setSecret(null)}>
                      إخفاء الكود
                    </button>
                  </div>
                  <p role="status" className="mt-3">
                    {copyStatus}
                  </p>
                </DialogContent>
              </Dialog>
            )}
            <a className="inline-block underline" href="/events/team">
              رابط دخول الفريق
            </a>
            {message && <p role="status">{message}</p>}
          </>
        )}
      </div>
    </main>
  );
}

type Track = { id: number; name: string; active: number };
type Staff = {
  id: number;
  trackId: number | null;
  name: string | null;
  duty: "doctor" | "nurse";
  active: number;
  hasCode: number;
};
function TrackCard({
  track,
  staff,
  refresh,
  onCode,
}: {
  track: Track;
  staff: Staff[];
  refresh: () => Promise<unknown>;
  onCode: (code: string, name: string) => void;
}) {
  const [trackName, setTrackName] = useState(track.name);
  const [name, setName] = useState("");
  const [duty, setDuty] = useState<"doctor" | "nurse">("doctor");
  const [message, setMessage] = useState("");
  const url = `${window.location.origin}/events?track=${track.id}`;
  const button =
    "rounded-xl bg-[#123f37] px-4 py-2 text-white disabled:opacity-40";
  const edit = trpc.eventTeam.editTrack.useMutation({
    onSuccess: async () => {
      await refresh();
      setMessage("تم تحديث المسار");
    },
    onError: e => setMessage(e.message),
  });
  const add = trpc.eventTeam.createStaff.useMutation({
    onSuccess: async data => {
      onCode(data.code, name);
      setName("");
      await refresh();
      setMessage("تم إنشاء الموظف؛ انسخ الكود من النافذة");
    },
    onError: e => setMessage(e.message),
  });
  const rotate = trpc.eventTeam.rotateCode.useMutation({
    onSuccess: async (data, input) => {
      onCode(data.code, staff.find(s => s.id === input.id)?.name ?? "الموظف");
      await refresh();
      setMessage("تم تجديد الكود وإلغاء جلسات الدخول السابقة");
    },
    onError: e => setMessage(e.message),
  });
  const toggle = trpc.eventTeam.setStaffActive.useMutation({
    onSuccess: async () => {
      await refresh();
      setMessage("تم تحديث صلاحية الموظف");
    },
    onError: e => setMessage(e.message),
  });
  const busy =
    edit.isPending || add.isPending || rotate.isPending || toggle.isPending;
  return (
    <section className="space-y-4 rounded-3xl border border-emerald-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{track.name}</h2>
        <span
          className={`rounded-full px-3 py-1 text-sm ${track.active ? "bg-emerald-100" : "bg-slate-100"}`}
        >
          {track.active ? "مفعّل" : "متوقف"}
        </span>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={e => {
          e.preventDefault();
          edit.mutate({
            id: track.id,
            name: trackName,
            active: Boolean(track.active),
          });
        }}
      >
        <input
          aria-label="اسم المسار"
          className="min-w-0 flex-1 rounded-xl border p-3"
          maxLength={100}
          value={trackName}
          required
          onChange={e => setTrackName(e.target.value)}
        />
        <button className={button} disabled={busy || !trackName.trim()}>
          حفظ الاسم
        </button>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={() => {
            if (
              track.active &&
              !window.confirm(
                "إيقاف المسار يمنع التسجيل ودخول فريقه ويُنهي جلساتهم الحالية. المتابعة؟"
              )
            )
              return;
            edit.mutate({
              id: track.id,
              name: track.name,
              active: !track.active,
            });
          }}
        >
          {track.active ? "إيقاف المسار" : "تفعيل المسار"}
        </button>
      </form>
      <details className="rounded-2xl bg-[#f3f8f6] p-4">
        <summary className="cursor-pointer font-bold">
          رابط ورمز تسجيل المستفيدين في هذا المسار
        </summary>
        <a
          href={url}
          dir="ltr"
          className="my-3 block break-all text-sm underline"
        >
          {url}
        </a>
        <QRCodeSVG value={url} size={160} includeMargin className="mx-auto" />
        <p className="mt-3 text-sm">
          هذا الرمز لتسجيل المستفيدين؛ رمز الجوال الخاص بالجهاز يظهر لهم بعد
          التسجيل.
        </p>
      </details>
      <div className="space-y-3">
        {staff.map(person => (
          <article
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
          >
            <div>
              <strong>{person.name || "الموظف"}</strong>
              <p className="text-sm">
                {person.duty === "doctor" ? "طبيب" : "تمريض"} ·{" "}
                {person.active ? "مفعّل" : "متوقف"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  if (
                    person.hasCode &&
                    !window.confirm(
                      "سيُلغى الكود القديم وجلسات الموظف السابقة. إصدار كود جديد؟"
                    )
                  )
                    return;
                  rotate.mutate({ id: person.id });
                }}
              >
                {person.hasCode ? "تجديد الكود" : "إصدار كود"}
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  toggle.mutate({ id: person.id, active: !person.active })
                }
              >
                {person.active ? "إيقاف الموظف" : "تفعيل الموظف"}
              </button>
            </div>
          </article>
        ))}
      </div>
      <form
        className="grid gap-3 rounded-2xl bg-emerald-50 p-4 sm:grid-cols-3"
        onSubmit={e => {
          e.preventDefault();
          add.mutate({ trackId: track.id, name, duty });
        }}
      >
        <label>
          اسم الموظف
          <input
            className="mt-1 w-full rounded-xl border bg-white p-3"
            maxLength={255}
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <label>
          الدور
          <select
            className="mt-1 w-full rounded-xl border bg-white p-3"
            value={duty}
            onChange={e => setDuty(e.target.value as typeof duty)}
          >
            <option value="doctor">طبيب</option>
            <option value="nurse">تمريض</option>
          </select>
        </label>
        <button
          className={`${button} self-end`}
          disabled={busy || !track.active || !name.trim()}
        >
          إضافة وإصدار كود
        </button>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
