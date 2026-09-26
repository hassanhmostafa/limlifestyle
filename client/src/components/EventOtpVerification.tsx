import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export function EventOtpVerification({ phone, initialToken, saving, error, onVerified, onBack }: {
  phone: string; initialToken: string; saving: boolean; error: string;
  onVerified: (token: string) => void; onBack: () => void;
}) {
  const [token, setToken] = useState(initialToken);
  const [code, setCode] = useState("");
  const [retryAt, setRetryAt] = useState(() => Date.now() + 60_000);
  const [seconds, setSeconds] = useState(60);
  const [message, setMessage] = useState("");
  const send = trpc.events.sendOtp.useMutation();
  const verify = trpc.events.verifyOtp.useMutation();
  const busy = saving || send.isPending || verify.isPending;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const timer = window.setInterval(() => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))), 500);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  return <section className="m-5 rounded-3xl border border-[#dce9e5] bg-white p-6">
    <h1 className="text-2xl font-bold">تأكيد رقم الجوال</h1>
    <p className="my-4 leading-7">أرسلنا رمز تحقق برسالة SMS إلى <b dir="ltr">{phone}</b>. أدخله لإكمال التسجيل.</p>
    <form onSubmit={async event => {
      event.preventDefault();
      if (busy || !/^\d{4,8}$/.test(code)) return;
      setMessage("");
      try { await verify.mutateAsync({ phone, challengeToken: token, code }); onVerified(token); }
      catch (e) { setMessage(e instanceof Error ? e.message : "تعذر تأكيد الرمز."); }
    }}>
      <label htmlFor="event-otp" className="block font-bold">رمز التحقق</label>
      <input id="event-otp" autoFocus dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code}
        onChange={event => setCode(event.target.value.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/\D/g, ""))}
        className="my-3 h-14 w-full rounded-2xl border text-center text-2xl tracking-widest" />
      {(message || error) && <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-red-800">{message || error}</p>}
      <button type="submit" disabled={busy || !/^\d{4,8}$/.test(code)} className="w-full rounded-2xl bg-[#dff33d] p-4 font-bold text-[#123a34] disabled:opacity-50">{busy ? "جارٍ التحقق…" : "تأكيد وإنشاء جلستي الصحية"}</button>
    </form>
    <button type="button" disabled={busy || seconds > 0} className="mt-4 w-full rounded-xl border p-3 disabled:opacity-50" onClick={async () => {
      setMessage("");
      try {
        const result = await send.mutateAsync({ phone });
        setToken(result.challengeToken); setCode(""); setRetryAt(Date.now() + result.retryAfterSeconds * 1000); setSeconds(result.retryAfterSeconds);
        document.getElementById("event-otp")?.focus();
      } catch (e) { setMessage(e instanceof Error ? e.message : "تعذر إرسال الرمز."); }
    }}>{seconds > 0 ? `إعادة الإرسال بعد ${seconds} ثانية` : "إعادة إرسال الرمز"}</button>
    <button type="button" disabled={busy} onClick={onBack} className="mt-3 w-full p-3 underline">تعديل رقم الجوال أو البيانات</button>
  </section>;
}
