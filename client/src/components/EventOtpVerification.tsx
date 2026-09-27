import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

function otpMessage(error: unknown, fallback: string) {
  const candidate = error as { message?: unknown; data?: { code?: unknown } };
  const code = candidate?.data?.code;
  const publicCodes = new Set([
    "BAD_REQUEST",
    "TOO_MANY_REQUESTS",
    "UNAUTHORIZED",
    "PRECONDITION_FAILED",
    "SERVICE_UNAVAILABLE",
  ]);
  return typeof candidate?.message === "string" && typeof code === "string" && publicCodes.has(code)
    ? candidate.message
    : fallback;
}

/** Embedded in the registration form. All controls are non-submit buttons. */
export function EventOtpVerification({ phone, enabled, saving, onVerified }: {
  phone: string; enabled: boolean; saving: boolean;
  onVerified: (token: string | null) => void;
}) {
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const send = trpc.events.sendOtp.useMutation();
  const verify = trpc.events.verifyOtp.useMutation();
  const busy = saving || send.isPending || verify.isPending;
  const validPhone = /^((\+966)|(00966)|(966)|(0))5\d{8}$/.test(phone.replace(/\s/g, ""));
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (expiresAt && now >= expiresAt) {
      setVerified(false); setToken(""); setExpiresAt(0); onVerified(null);
      setMessage("انتهت صلاحية الرمز. اطلب رمزًا جديدًا.");
    }
  }, [now, expiresAt, onVerified]);
  return <div className="space-y-3 rounded-2xl border border-[#dce9e5] bg-[#f3f8f6] p-4" aria-label="التحقق من رقم الجوال">
    <p className="font-bold">تأكيد الجوال برمز OTP</p>
    {verified ? <p role="status" className="font-bold text-[#197f6f]">✓ تم التحقق من رقم الجوال</p> : <>
      <p className="text-sm leading-6">نرسل رمزًا برسالة SMS للتأكد من رقمك. لا تحتاج كتابة رقم الجوال مرة ثانية.</p>
      <button type="button" disabled={!enabled || !validPhone || busy || seconds > 0} className="w-full rounded-xl border border-[#123a34] bg-white p-3 font-bold disabled:opacity-50" onClick={async () => {
        onVerified(null); setMessage(""); setToken(""); setCode("");
        try {
          const result = await send.mutateAsync({ phone });
          setToken(result.challengeToken); setRetryAt(Date.now() + result.retryAfterSeconds * 1000);
          setExpiresAt(Date.now() + result.expiresInSeconds * 1000); setNow(Date.now());
        } catch (e) { setMessage(otpMessage(e, "تعذر إرسال رمز التحقق حاليًا. حاول مرة أخرى بعد قليل.")); }
      }}>{send.isPending ? "جارٍ إرسال الرمز…" : seconds > 0 ? `إعادة الإرسال بعد ${seconds} ثانية` : token ? "إعادة إرسال الرمز" : "إرسال رمز التحقق"}</button>
      {token && <>
        <p role="status" className="text-sm">تم إرسال الرمز إلى <b dir="ltr">{phone}</b></p>
        <label htmlFor="event-otp" className="block font-bold">رمز التحقق</label>
        <input id="event-otp" autoFocus dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code}
          onChange={event => setCode(event.target.value.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/\D/g, ""))}
          onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }}
          className="h-14 w-full rounded-2xl border bg-white text-center text-2xl tracking-widest" />
        <button type="button" disabled={!enabled || busy || !/^\d{4,8}$/.test(code)} className="w-full rounded-xl bg-[#dff33d] p-3 font-bold disabled:opacity-50" onClick={async () => {
          setMessage("");
          try {
            await verify.mutateAsync({ phone, challengeToken: token, code });
            setVerified(true); onVerified(token);
          } catch (e) { setMessage(otpMessage(e, "تعذر تأكيد رمز التحقق حاليًا. حاول مرة أخرى بعد قليل.")); }
        }}>{verify.isPending ? "جارٍ التحقق…" : "تأكيد الرمز"}</button>
      </>}
    </>}
    {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{message}</p>}
  </div>;
}
