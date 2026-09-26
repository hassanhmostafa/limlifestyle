import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { QRCodeSVG } from "qrcode.react";
export default function EventAdminLaunch() {
  const [message, setMessage] = useState(""),
    [started, setStarted] = useState(false);
  const utils = trpc.useUtils();
  const start = trpc.eventAdmin.start.useMutation({
    onSuccess: async () => {
      setStarted(true);
      setMessage("الفعالية مفتوحة وجاهزة لاستقبال المشاركين");
      await utils.eventAdmin.profile.invalidate();
    },
    onError: e => setMessage(e.message),
  });
  return (
    <section className="space-y-4 rounded-3xl border border-emerald-100 bg-white p-6">
      <h2 className="text-xl font-bold">جاهزية الفعالية</h2>
      <p>بعد حفظ بيانات الفعالية وتجهيز المسارات، ابدأ استقبال المشاركين.</p>
      <button
        type="button"
        className="min-h-16 w-full rounded-2xl bg-[#dff33d] p-4 text-xl font-black text-[#123f37] disabled:opacity-50"
        disabled={start.isPending}
        onClick={() => start.mutate()}
      >
        {start.isPending ? "جارٍ بدء الفعالية…" : "بدء الفعالية"}
      </button>
      {message && <p role="status">{message}</p>}
      {started && (
        <div className="space-y-3 rounded-2xl bg-emerald-50 p-4 text-center">
          <a
            href="/events"
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-emerald-800 bg-white p-4 font-bold"
          >
            فتح صفحة المستفيد
          </a>
          <QRCodeSVG
            value={`${window.location.origin}/events`}
            size={180}
            includeMargin
            className="mx-auto"
          />
          <p className="text-sm">
            هذا رابط التسجيل العام. روابط المسارات الخاصة موجودة في بطاقات
            المسارات.
          </p>
        </div>
      )}
      <a
        href="/events/team"
        className="flex min-h-16 w-full items-center justify-center rounded-2xl bg-[#123f37] p-4 text-center text-xl font-bold text-white"
      >
        دخول الطبيب والتمريض
      </a>
    </section>
  );
}
