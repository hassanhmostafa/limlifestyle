import EventPdfButton from "@/components/EventPdfButton";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronLeft,
  ClipboardCheck,
  FileHeart,
  HeartPulse,
  Loader2,
  QrCode,
  RotateCcw,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { EventBodyResults } from "@/components/EventBodyResults";
import type { DashboardReading } from "@/components/BodyCompositionReport";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  eventLifestyleSections,
  type EventAnswers,
  scoreEventLifestyle,
} from "@/lib/eventLifestyle";
import { completedEventJourneySteps } from "@/lib/eventJourney";
import EventCareSummary from "@/components/EventCareSummary";

type Registration = {
  firstName: string;
  age: string;
  sex: "male" | "female" | "";
  phone: string;
  phoneConfirm: string;
  city: string;
  consent: boolean;
};
type Screen = "register" | "journey" | "lifestyle" | "device" | "queue" | "nursing" | "report";
type StoredSession = {
  token: string;
  code: string;
  firstName: string | null;
  age: number | null;
  sex: "male" | "female" | null;
  phone: string;
  city: string | null;
  status: "checked_in" | "measured";
  answers: EventAnswers;
  deviceUserId: string | null;
  consultationCompletedAt: Date | string | null;
  reportCompletedAt: Date | string | null;
};

const storageKey = "lim-events-session-token";
const emptyRegistration: Registration = { firstName: "", age: "", sex: "", phone: "", phoneConfirm: "", city: "جدة", consent: false };
const phonePattern = /^((\+966)|(00966)|(966)|(0))5\d{8}$/;

/**
 * The standalone Events web journey from the supplied project. It deliberately
 * has no main-LIM navigation or sign-in dependency. Its opaque session token
 * protects only this browser's event record while physical X18 results remain
 * in the shared LIM health backend.
 */
export default function Events() {
  const eventProfile = trpc.eventAdmin.publicProfile.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  // Track is an organizer concern: links may scope registration, never a participant choice.
  const trackParam = new URLSearchParams(window.location.search).get("track");
  const trackId = trackParam && /^[1-9]\d*$/.test(trackParam) && Number.isSafeInteger(Number(trackParam))
    ? Number(trackParam) : undefined;
  const [screen, setScreen] = useState<Screen>("register");
  const [registration, setRegistration] = useState<Registration>(emptyRegistration);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(storageKey));
  const [answers, setAnswers] = useState<EventAnswers>({ importance: 5, confidence: 5 });
  const [error, setError] = useState("");
  const [lifestyleIndex, setLifestyleIndex] = useState(0);

  const sessionQuery = trpc.events.getSession.useQuery(
    { accessToken: accessToken ?? "" },
    { enabled: Boolean(accessToken), retry: false, refetchOnWindowFocus: false, refetchInterval: 10000 },
  );
  const resultQuery = trpc.events.results.useQuery(
    { accessToken: accessToken ?? "" },
    { enabled: Boolean(accessToken), refetchInterval: screen === "device" || screen === "report" ? 10_000 : false, retry: false },
  );
  const createSession = trpc.events.createSession.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(storageKey, data.accessToken);
      setAccessToken(data.accessToken);
      setScreen("journey");
      toast.success("تم إنشاء جلستك الصحية");
    },
    onError: (eventError) => setError(eventError.data?.code === "INTERNAL_SERVER_ERROR" ? "تعذر حفظ التسجيل حاليًا. حاول مرة أخرى، وإذا استمرت المشكلة تواصل مع منظم الفعالية. بياناتك ما زالت محفوظة في النموذج." : eventError.message),
  });
  const saveLifestyle = trpc.events.saveLifestyle.useMutation({
    onSuccess: () => {
      sessionQuery.refetch();
      // The next actionable step is scanning the participant QR at X18.
      // Take the participant directly there instead of making them reopen it.
      setScreen("device");
      toast.success("تم حفظ تقييم نمط الحياة");
    },
    onError: (eventError) => setError(eventError.message),
  });
  const generateTestMeasurement = trpc.events.generateTestMeasurement.useMutation();
  const careQuery = trpc.events.care.useQuery({ accessToken: accessToken ?? "" }, {
    enabled: Boolean(accessToken), retry: false, refetchInterval: 10000,
  });
  const care = careQuery.data;
  const completeReport = trpc.events.completeReport.useMutation({
    onSuccess: async () => {
      await sessionQuery.refetch();
      go("journey");
      toast.success("اكتملت رحلتك الصحية");
    },
    onError: (eventError) => setError(eventError.message),
  });

  const apiSession = sessionQuery.data;
  const session: StoredSession | null = apiSession && accessToken ? {
    token: accessToken,
    code: apiSession.code,
    firstName: apiSession.firstName,
    age: apiSession.age,
    sex: apiSession.sex,
    phone: "",
    city: apiSession.city,
    status: apiSession.status,
    answers: apiSession.answers as EventAnswers,
    deviceUserId: apiSession.deviceUserId,
    consultationCompletedAt: apiSession.consultationCompletedAt,
    reportCompletedAt: apiSession.reportCompletedAt,
  } : null;
  const physicalReadings = resultQuery.data?.readings ?? [];
  const hasResult = physicalReadings.length > 0;

  useEffect(() => {
    if (!sessionQuery.isError) return;
    localStorage.removeItem(storageKey);
    setAccessToken(null);
    setScreen("register");
  }, [sessionQuery.isError]);

  useEffect(() => {
    if (!session) return;
    setAnswers({ importance: 5, confidence: 5, ...session.answers });
    // A restored measured session opens its body report first. Consultation is
    // a deliberate participant action through the yellow LIM button below it.
    if (session.status === "measured") setScreen((current) => current === "register" ? "device" : current);
  }, [session?.code]);

  const lifestyleEnabled = (apiSession?.questionnaireIds ?? ["lifestyle"]).includes("lifestyle");
  const baseCompletedSteps = completedEventJourneySteps(
    Boolean(session),
    session?.answers,
    hasResult,
    Boolean(care?.approvedAt),
    Boolean(care?.approvedAt && session?.reportCompletedAt),
    lifestyleEnabled,
  );
  const completedSteps = baseCompletedSteps + (care?.nursingEnabled && (care.nursingCompletedAt || care.approvedAt) ? 1 : 0);
  const journeySteps: { id: string; label: string; hint: string; icon: typeof UserRound; target: Screen }[] = [
    { id: "registration", label: "البيانات الشخصية", hint: "تم حفظ بياناتك", icon: UserRound, target: "journey" },
    ...(lifestyleEnabled ? [{ id: "lifestyle", label: "تقييم نمط الحياة", hint: "نحو 10 دقائق", icon: HeartPulse, target: "lifestyle" as Screen }] : []),
    { id: "device", label: "تحليل عناصر الجسم", hint: "امسح رمز جوالك قبل القياس", icon: QrCode, target: "device" },
    ...(care?.nursingEnabled ? [{ id: "nursing", label: "محطة التمريض", hint: care.nursingCompletedAt ? "تم اعتماد القياسات" : "توجّه لمحطة التمريض", icon: HeartPulse, target: "nursing" as Screen }] : []),
    { id: "doctor", label: "الاستشارة الطبية", hint: hasResult ? "نتائجك جاهزة للاستشارة" : "يمكن المتابعة أثناء انتظار النتيجة", icon: Stethoscope, target: "queue" },
    { id: "report", label: "التقرير النهائي", hint: care?.approvedAt ? "اعتمد الطبيب التقرير" : "يظهر بعد اعتماد الطبيب", icon: FileHeart, target: "report" },
  ];

  const canRegister = useMemo(() => (
    Number(registration.age) >= 18
    && Boolean(registration.sex)
    && phonePattern.test(registration.phone.replace(/\s/g, ""))
    && registration.phone.replace(/\s/g, "") === registration.phoneConfirm.replace(/\s/g, "")
    && registration.consent
  ), [registration]);

  const reset = () => {
    localStorage.removeItem(storageKey);
    setAccessToken(null);
    setRegistration(emptyRegistration);
    setAnswers({ importance: 5, confidence: 5 });
    setLifestyleIndex(0);
    setError("");
    setScreen("register");
  };
  const go = (next: Screen) => { setError(""); setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (accessToken && sessionQuery.isLoading) return <LoadingShell />;

  return <main dir="rtl" className="min-h-screen bg-[#f3f8f6] text-[#123a34] print:bg-white">
    <div className="mx-auto min-h-screen w-full max-w-[560px] bg-[#f8fbfa] shadow-[0_0_60px_rgba(13,59,50,.08)] print:max-w-none print:shadow-none">
      <EventHeader onHome={session ? () => go("journey") : undefined} />
      {screen === "register" && eventProfile.data && <section className="space-y-3 px-5 pt-5">
        {eventProfile.data.poster && <img src={eventProfile.data.poster} alt="بوستر الفعالية" className="w-full rounded-3xl object-contain" />}
        <h1 className="text-2xl font-bold">{eventProfile.data.name}</h1>
        <p>{eventProfile.data.location}{eventProfile.data.organizer && ` · ${eventProfile.data.organizer}`}</p>
        {eventProfile.data.startsOn && <p>{eventProfile.data.startsOn} — {eventProfile.data.endsOn}</p>}
      </section>}
      {screen === "register" && eventProfile.data?.closed ? <p role="status" className="m-5 rounded-3xl bg-white p-6">انتهى التسجيل في هذه الفعالية. شكرًا لاهتمامك.</p> : screen === "register" && <RegistrationView form={registration} setForm={setRegistration} error={error} saving={createSession.isPending} onSubmit={() => {
        if (!canRegister || !registration.sex) return;
        setError("");
        createSession.mutate({ firstName: registration.firstName.trim() || undefined, age: Number(registration.age), sex: registration.sex, phone: registration.phone, city: registration.city.trim() || undefined, consent: true, trackId });
      }} />}
      {screen === "journey" && session && <JourneyView session={session} steps={journeySteps} completeCount={completedSteps} onOpen={(target, index) => {
        if (index <= completedSteps || (target === "queue" && completedSteps >= (lifestyleEnabled ? 2 : 1))) go(target);
      }} onReset={reset} />}
      {screen === "lifestyle" && session && <LifestyleView answers={answers} sectionIndex={lifestyleIndex} setSectionIndex={setLifestyleIndex} onBack={() => go("journey")} onSave={() => saveLifestyle.mutate({ accessToken: session.token, answers })} saving={saveLifestyle.isPending} />}
      {screen === "device" && session && <DeviceView session={session} readings={physicalReadings} loading={resultQuery.isLoading} testing={generateTestMeasurement.isPending} onBack={() => go("journey")} onRefresh={() => resultQuery.refetch()} onViewConsultation={() => go(care?.nursingEnabled && !care.nursingCompletedAt ? "nursing" : "queue")} onGenerateTest={async () => {
        setError("");
        try {
          const testUpload = await generateTestMeasurement.mutateAsync({ accessToken: session.token });
          const uploadResponse = await fetch(`/api/kiosk/data?apiKey=${encodeURIComponent(testUpload.apiKey)}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(testUpload.payload),
          });
          const uploadBody = await uploadResponse.json() as { code?: string; msg?: string };
          if (!uploadResponse.ok || uploadBody.code !== "1") {
            throw new Error(uploadBody.msg || "تعذر رفع نتيجة الاختبار إلى رابط بيانات الجهاز.");
          }
          await Promise.all([sessionQuery.refetch(), resultQuery.refetch()]);
          toast.success("تم إرسال التقرير التجريبي عبر رابط بيانات الجهاز");
        } catch (eventError) {
          setError(eventError instanceof Error ? eventError.message : "تعذر إنشاء نتيجة الاختبار.");
        }
      }} />}
      {(screen === "queue" || screen === "nursing") && session && <section className="space-y-5 p-5"><BackButton onClick={() => go("journey")} /><div className="rounded-3xl bg-[#123f37] p-6 text-white"><h1 className="text-2xl font-bold">{screen === "nursing" ? "محطة التمريض" : "الاستشارة الطبية"}</h1><p className="my-4 leading-7">{care?.approvedAt ? "اعتمد الطبيب تقريرك؛ يمكنك الاطلاع عليه الآن." : screen === "nursing" ? care?.nursingCompletedAt ? "تم اعتماد قياساتك، توجّه إلى الطبيب." : "توجّه إلى محطة التمريض وقدّم رمزك للفريق لإدخال القياسات." : "قدّم رمزك للطبيب لمراجعة نتائجك وإضافة النصائح. يظهر التقرير بعد اعتماد الطبيب."}</p><p dir="ltr">{session.code}</p>{session.deviceUserId && <div className="mx-auto my-4 w-fit rounded-2xl bg-white p-3"><QRCodeSVG value={session.deviceUserId} size={180} includeMargin /></div>}</div><Button onClick={() => { careQuery.refetch(); sessionQuery.refetch(); }}>تحديث الحالة</Button>{screen === "nursing" && care?.nursingCompletedAt && <PrimaryButton onClick={() => go("queue")}>متابعة إلى الطبيب</PrimaryButton>}{care?.approvedAt && <PrimaryButton onClick={() => go("report")}>عرض التقرير النهائي</PrimaryButton>}{careQuery.error && <p role="alert">تعذر تحديث الحالة، حاول مرة أخرى.</p>}</section>}
      {screen === "report" && session && (care?.approvedAt ? <div data-final-report data-pdf-report>
        <section className="space-y-4 px-5 pt-6"><h2 className="text-xl font-bold">نصائح الطبيب</h2><p className="whitespace-pre-wrap rounded-2xl bg-white p-5">{care.advice}</p><p className="text-sm">اعتمدها: {care.doctorName}</p>{care.nursingCompletedAt && <><h2 className="font-bold">قياسات التمريض</h2><EventCareSummary measurements={care.measurements} notes={care.nurseNotes} /></>}</section>
        <ReportView lifestyleEnabled={lifestyleEnabled} session={session} readings={physicalReadings} finishing={completeReport.isPending} onBack={() => go("journey")} onFinish={() => completeReport.mutate({ accessToken: session.token })} />
      </div> : <section className="p-5"><BackButton onClick={() => go("journey")} /><p>التقرير النهائي بانتظار اعتماد الطبيب.</p></section>)}
      {error && screen !== "register" && <p role="alert" className="mx-5 mb-8 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-bold text-[#a43f30]">{error}</p>}
    </div>
  </main>;
}

function LoadingShell() { return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f3f8f6] text-[#123a34]"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm"><Loader2 className="h-5 w-5 animate-spin" />جارٍ استرجاع جلسة الفعالية…</div></main>; }

function EventHeader({ onHome }: { onHome?: () => void }) { return <header className="sticky top-0 z-20 border-b border-[#d9e8e3] bg-white/95 px-5 py-4 backdrop-blur print:static"><div className="flex items-center justify-between"><button type="button" onClick={onHome} className="flex items-center gap-3 text-right"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dff33d] text-[#103d36] shadow-[0_8px_24px_rgba(191,211,36,.28)]"><HeartPulse className="h-7 w-7" strokeWidth={2.2} /></span><span><span className="block text-xl font-black leading-none">ليم <span className="tracking-wide">LIM</span></span><span className="mt-1 block text-sm text-[#64847d]">رحلتك الصحية في الفعالية</span></span></button><span className="rounded-full border border-[#d8e8e3] bg-[#f6faf8] px-3 py-1.5 text-xs font-bold text-[#52736c]">فعاليات LIM</span></div></header>; }

function RegistrationView({ form, setForm, error, saving, onSubmit }: { form: Registration; setForm: React.Dispatch<React.SetStateAction<Registration>>; error: string; saving: boolean; onSubmit: () => void }) {
  const update = <K extends keyof Registration>(key: K, value: Registration[K]) => setForm((current) => ({ ...current, [key]: value }));
  const phone = form.phone.replace(/\s/g, "");
  const valid = Number(form.age) >= 18 && Boolean(form.sex) && phonePattern.test(phone) && phone === form.phoneConfirm.replace(/\s/g, "") && form.consent;
  return <section className="px-5 pb-12 pt-7"><Hero eyebrow="الخطوة الأولى" title="ابدأ رحلتك بصورة أوضح لصحتك" copy="سجّل بياناتك الأساسية، ثم أكمل التقييم والقياسات واحفظ تقريرك في جوالك." />
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="space-y-5 rounded-[28px] border border-[#dce9e5] bg-white p-5 shadow-[0_12px_35px_rgba(18,58,52,.06)]"><div><h2 className="text-xl font-black">بيانات المشارك</h2><p className="mt-1 text-sm leading-6 text-[#6c8882]">تُحفظ في جلسة الفعالية الخاصة بك. لا يلزم تسجيل دخول تطبيق LIM هنا.</p></div>
      <Field label="الاسم الأول (اختياري)"><Input value={form.firstName} onChange={(event) => update("firstName", event.target.value)} placeholder="مثال: عبداللطيف" /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="العمر"><Input inputMode="numeric" value={form.age} onChange={(event) => update("age", event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="18+" /></Field><fieldset className="space-y-2"><legend className="text-sm font-medium">الجنس</legend><div className="grid grid-cols-2 gap-2"><Choice active={form.sex === "male"} onClick={() => update("sex", "male")}>ذكر</Choice><Choice active={form.sex === "female"} onClick={() => update("sex", "female")}>أنثى</Choice></div></fieldset></div>
      <Field label="رقم الجوال"><Input dir="ltr" inputMode="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="05XXXXXXXX" className="text-left" /></Field>
      <Field label="تأكيد رقم الجوال"><Input dir="ltr" inputMode="tel" value={form.phoneConfirm} onChange={(event) => update("phoneConfirm", event.target.value)} placeholder="أعد كتابة الرقم" className="text-left" /></Field>
      <Field label="المدينة (اختياري)"><Input value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#f3f8f6] p-4"><Checkbox checked={form.consent} onCheckedChange={(value) => update("consent", value === true)} className="mt-1" /><span className="text-sm leading-6 text-[#45665f]">أوافق على استخدام بياناتي لإتمام التقييم وربط نتائج الفحص بهذه الجلسة وإتاحتها لفريق التمريض والطبيب المصرح لهم في هذه الفعالية وفق سياسة الخصوصية.</span></label>
      {error && <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-bold text-[#a43f30]">{error}</p>}
      <PrimaryButton disabled={!valid || saving}>{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>إنشاء جلستي الصحية<ChevronLeft className="mr-2 h-5 w-5" /></>}</PrimaryButton>
    </form></section>;
}

function JourneyView({ session, steps, completeCount, onOpen, onReset }: { session: StoredSession; steps: { id: string; label: string; hint: string; icon: typeof UserRound; target: Screen }[]; completeCount: number; onOpen: (target: Screen, index: number) => void; onReset: () => void }) {
  const progress = Math.round((completeCount / steps.length) * 100);
  return <section className="px-5 pb-14 pt-7"><div className="mb-7 rounded-[28px] bg-[#123f37] p-6 text-white shadow-[0_18px_45px_rgba(11,55,47,.15)]"><p className="text-sm font-bold text-[#dff33d]">{session.firstName ? `أهلًا ${session.firstName}` : "أهلًا بك"}</p><h1 className="mt-2 text-[1.7rem] font-black">رحلتك الصحية اليوم</h1><div className="mt-6 flex items-center justify-between text-sm"><span className="text-[#d5e5e1]">اكتملت {completeCount} من {steps.length}</span><strong className="text-[#dff33d]">{progress}%</strong></div><Progress value={progress} className="mt-3 h-2.5 bg-white/15 [&_[data-slot=progress-indicator]]:bg-[#dff33d]" /><p className="mt-5 text-sm leading-6 text-[#c8dcd7]">أكمل كل خطوة بالترتيب. تُحفظ بيانات النموذج في هذه الجلسة فقط.</p></div>
    <div className="space-y-3">{steps.map((step, index) => { const done = index < completeCount; const active = index === completeCount; const Icon = step.icon; return <button key={step.id} type="button" onClick={() => onOpen(step.target, index)} disabled={!active && !done} className={`flex w-full items-center gap-4 rounded-[22px] border p-4 text-right ${done ? "border-[#8acdbf] bg-[#e7f6f1]" : active ? "border-[#c8dc2f] bg-white shadow-[0_10px_30px_rgba(18,58,52,.08)]" : "border-[#dfe9e6] bg-[#f1f5f4] opacity-65"}`}><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${done ? "bg-[#197f6f] text-white" : active ? "bg-[#dff33d] text-[#123a34]" : "bg-[#dfe8e5] text-[#78928c]"}`}>{done ? <Check className="h-6 w-6" strokeWidth={3} /> : <Icon className="h-6 w-6" />}</span><span className="min-w-0 flex-1"><span className="block text-base font-black">{step.label}</span><span className="mt-1 block text-sm text-[#718b85]">{done ? "مكتملة" : step.hint}</span></span>{active && <ChevronLeft className="h-5 w-5" />}</button>; })}</div>
    <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#dae8e4] bg-white p-4 text-sm"><div><strong className="block">رمز الجلسة</strong><span dir="ltr" className="font-mono font-bold">{session.code}</span></div><button type="button" onClick={onReset} className="flex items-center gap-1 text-xs text-[#6e8781]"><RotateCcw className="h-4 w-4" />جلسة جديدة</button></div>
  </section>;
}

function LifestyleView({ answers, sectionIndex, setSectionIndex, onBack, onSave, saving }: { answers: EventAnswers; sectionIndex: number; setSectionIndex: React.Dispatch<React.SetStateAction<number>>; onBack: () => void; onSave: () => void; saving: boolean }) {
  useLayoutEffect(() => {
    // Both next and previous sections start at the top, before the browser paints.
    window.scrollTo({top:0,left:0,behavior:'instant'});
  }, [sectionIndex]);
  const section = eventLifestyleSections[sectionIndex];
  const complete = section.questions.every((question) => question.type === "multi" ? Array.isArray(answers[question.id]) : answers[question.id] !== undefined && answers[question.id] !== "");
  const priorities = [answers.priority1, answers.priority2, answers.priority3];
  const setAnswer = (id: string, value: EventAnswers[string]) => { answers[id] = value; };
  const [, repaint] = useState(0);
  const updateAnswer = (id: string, value: EventAnswers[string]) => { setAnswer(id, value); repaint((valueNow) => valueNow + 1); };
  return <section className="px-5 pb-14 pt-6"><BackButton onClick={sectionIndex ? () => setSectionIndex((current) => current - 1) : onBack} /><div className="mb-6"><div className="flex items-center justify-between text-sm font-bold"><span>{section.title}</span><span className="text-[#6c8882]">{sectionIndex + 1} من {eventLifestyleSections.length}</span></div><Progress value={((sectionIndex + 1) / eventLifestyleSections.length) * 100} className="mt-3 h-2" /><p className="mt-3 text-sm leading-6 text-[#6c8882]">{section.intro}</p></div>
    <div className="space-y-5">{section.questions.map((question, questionIndex) => <div key={question.id} className="rounded-[24px] border border-[#dce9e5] bg-white p-5 shadow-[0_8px_25px_rgba(18,58,52,.05)]"><p className="mb-4 font-black leading-7"><span className="ml-2 text-[#197f6f]">{questionIndex + 1}.</span>{question.text}</p>
      {question.type === "slider" && <div><input aria-label={question.text} type="range" min={question.min} max={question.max} value={Number(answers[question.id] ?? 5)} onChange={(event) => updateAnswer(question.id, Number(event.target.value))} className="w-full accent-[#197f6f]" /><div className="mt-2 flex justify-between text-xs text-[#708a84]"><span>0</span><strong className="text-xl text-[#123a34]">{String(answers[question.id] ?? 5)}</strong><span>10</span></div></div>}
      {question.type === "number" && <div className="flex items-center gap-3"><Input type="number" min={question.min} max={question.max} value={String(answers[question.id] ?? "")} onChange={(event) => updateAnswer(question.id, Number(event.target.value))} className="h-12 text-center text-lg font-bold" /><span className="min-w-14 text-sm text-[#6c8882]">{question.suffix}</span></div>}
      {(question.type === "radio" || question.type === "priority") && <div className="grid gap-2">{question.options?.map((option) => { const unavailable = question.type === "priority" && priorities.includes(option.value) && answers[question.id] !== option.value; return <button disabled={unavailable} key={option.value} type="button" onClick={() => updateAnswer(question.id, option.value)} className={`rounded-xl border px-4 py-3 text-right text-sm leading-6 ${answers[question.id] === option.value ? "border-[#197f6f] bg-[#e7f6f1] font-bold text-[#126b5d]" : unavailable ? "border-[#e7ecea] bg-[#f5f7f6] text-[#a4b2ae]" : "border-[#d8e6e2] bg-white"}`}>{option.label}</button>; })}</div>}
      {question.type === "multi" && <div className="grid gap-2">{question.options?.map((option) => { const current = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : []; const selected = current.includes(option.value); return <button key={option.value} type="button" onClick={() => updateAnswer(question.id, selected ? current.filter((item) => item !== option.value) : [...current, option.value])} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm ${selected ? "border-[#197f6f] bg-[#e7f6f1] font-bold" : "border-[#d8e6e2]"}`}><span className={`grid h-5 w-5 place-items-center rounded-md border ${selected ? "border-[#197f6f] bg-[#197f6f] text-white" : "border-[#a9bdb8]"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span>{option.label}</button>; })}</div>}
    </div>)}</div>
    <PrimaryButton disabled={!complete || saving} onClick={() => sectionIndex < eventLifestyleSections.length - 1 ? setSectionIndex((current) => current + 1) : onSave()} className="mt-6">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : sectionIndex < eventLifestyleSections.length - 1 ? <>التالي<ChevronLeft className="mr-2 h-5 w-5" /></> : <>حفظ التقييم<Check className="mr-2 h-5 w-5" /></>}</PrimaryButton>
  </section>;
}

function DeviceView({ session, readings, loading, testing, onBack, onRefresh, onViewConsultation, onGenerateTest }: { session: StoredSession; readings: DashboardReading[]; loading: boolean; testing: boolean; onBack: () => void; onRefresh: () => void; onViewConsultation: () => void; onGenerateTest: () => Promise<void> }) {
  const hasResult = readings.length > 0;
  if (hasResult) return <section className="px-5 pb-14 pt-6"><BackButton onClick={onBack} /><EventBodyResults readings={readings} participant={session} /><PrimaryButton onClick={onViewConsultation} className="mt-6"><Stethoscope className="ml-2 h-5 w-5" />متابعة الرحلة<ChevronLeft className="mr-2 h-5 w-5" /></PrimaryButton></section>;
  return <section className="px-5 pb-14 pt-6"><BackButton onClick={onBack} /><div className="mb-5 rounded-[28px] border border-[#dce9e5] bg-white p-5 shadow-[0_8px_25px_rgba(18,58,52,.05)]"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dff33d] text-[#123a34]"><QrCode className="h-6 w-6" /></span><div><h1 className="text-xl font-black">رمز جوالك للفحص</h1><p className="mt-1 text-sm leading-6 text-[#6c8882]">امسح الرمز بقارئ جهاز تحليل الجسم قبل بدء القياس.</p></div></div>
    {session.deviceUserId ? <><div className="my-5 rounded-2xl border border-[#dce9e5] bg-white p-3"><QRCodeSVG value={session.deviceUserId} size={260} level="M" includeMargin className="mx-auto h-auto w-full max-w-[260px]" /></div><p className="rounded-xl bg-[#f3f8f6] p-3 text-center text-sm leading-6 text-[#45665f]">سيظهر الرقم نفسه في خانة <b dir="ltr">ID</b> على الجهاز: <b dir="ltr" className="text-[#123a34]">{session.deviceUserId}</b></p></> : <p role="alert" className="mt-4 rounded-xl bg-[#fff0ed] p-3 text-sm text-[#a43f30]">تعذر تجهيز رمز الجهاز لهذه الجلسة.</p>}
  </div>
  <div className="rounded-[28px] bg-[#123f37] p-6 text-white"><Activity className="h-8 w-8 text-[#dff33d]" /><h2 className="mt-4 text-xl font-black">بانتظار نتيجة الجهاز</h2><p className="mt-2 leading-7 text-[#d2e1dd]">بعد القياس يرسل X18 النتيجة مباشرة إلى نظام LIM. ستظهر هنا تلقائيًا، ويمكنك المتابعة إلى الاستشارة أثناء الانتظار.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Button variant="outline" onClick={onRefresh} disabled={loading || testing} className="border-white/30 text-white hover:bg-white/10">{loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Activity className="ml-2 h-4 w-4" />}تحديث النتائج</Button><Button type="button" onClick={() => void onGenerateTest()} disabled={testing || loading} className="bg-[#dff33d] text-[#123a34] hover:bg-[#d3ea2d]">{testing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Activity className="ml-2 h-4 w-4" />}إنشاء نتيجة اختبار</Button></div><p className="mt-4 text-xs leading-5 text-[#c8dcd7]">للاختبار فقط: ينشئ هذا الزر كل قيم X18 عشوائيًا ثم يرفعها إلى نفس رابط بيانات الجهاز مع مفتاح مؤقت لهذه الجلسة. تظهر في Events وMy Health مع وسم «بيانات اختبار».</p></div>
  </section>;
}

function ReportView({ lifestyleEnabled, session, readings, finishing, onBack, onFinish }: { lifestyleEnabled: boolean; session: StoredSession; readings: DashboardReading[]; finishing: boolean; onBack: () => void; onFinish: () => void }) {
  const lifestyle = scoreEventLifestyle(session.answers);
  return <section className="px-5 pb-14 pt-6 print:px-0">
    <div className="print:hidden"><BackButton onClick={onBack} /></div>
    <div className="rounded-[28px] border border-[#dce9e5] bg-white p-5">
      <p className="text-sm font-bold text-[#197f6f]">التقرير الصحي</p>
      <h1 className="mt-1 text-2xl font-black">{session.firstName || "المشارك"}</h1>
      <p dir="ltr" className="mt-1 text-xs text-[#708a84]">{session.code}</p>
      {lifestyleEnabled && <div className="mt-6">
        <div className="flex items-end justify-between"><h2 className="font-black">تقييم نمط الحياة</h2><strong className="text-2xl text-[#197f6f]">{lifestyle.overall}<span className="text-sm">/100</span></strong></div>
        <div className="mt-4 space-y-3">{Object.entries(lifestyle.domains).map(([key, value]) => <div key={key}><div className="mb-1 flex justify-between text-xs"><span>{({ nutrition: "التغذية", activity: "النشاط", sleep: "النوم", mood: "المزاج والضغوط", connection: "المعنى والترابط", substances: "تجنب المواد الضارة" } as Record<string, string>)[key]}</span><strong>{value}/10</strong></div><Progress value={value * 10} className="h-2" /></div>)}</div>
      </div>}
    </div>
    {/* This deliberately shares the exact same parent width as DeviceView.
        It prevents the report's extra padded card from reflowing the anatomy stage. */}
    {readings.length > 0 && <div className="mt-7"><EventBodyResults readings={readings} participant={session} /></div>}
    <p className="mt-6 text-xs leading-5 text-[#7c918c]">هذا التقرير يعرض نتائج التقييم والقياسات كما سُجلت، ولا يُعد تشخيصًا طبيًا.</p>
    <div className="mt-5"><EventPdfButton filename={`lim-final-${session.code}.pdf`} className="min-h-14 w-full rounded-2xl bg-[#197f6f] p-4 font-bold text-white" /></div>
    <PrimaryButton disabled={finishing || Boolean(session.reportCompletedAt)} onClick={onFinish} className="mt-4 print:hidden">{finishing ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Check className="ml-2 h-5 w-5" />}{session.reportCompletedAt ? "اكتملت الرحلة" : "إنهاء الرحلة"}</PrimaryButton>
  </section>;
}

function Hero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <div className="mb-7 rounded-[28px] bg-[#123f37] p-6 text-white shadow-[0_18px_45px_rgba(11,55,47,.15)]"><div className="mb-7 flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#dff33d]">{eyebrow}</span><Activity className="h-6 w-6 text-[#dff33d]" /></div><h1 className="text-[1.7rem] font-black leading-tight">{title}</h1><p className="mt-3 text-base leading-7 text-[#d4e3df]">{copy}</p><div className="mt-5 flex items-center gap-2 text-sm text-[#c6d9d4]"><ClipboardCheck className="h-5 w-5 text-[#dff33d]" /><span>تُحفظ كل خطوة تلقائيًا</span></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`h-12 rounded-xl border text-sm font-bold ${active ? "border-[#197f6f] bg-[#e4f4ef] text-[#126b5d]" : "border-[#cedfd9] bg-white text-[#536f69]"}`}>{children}</button>; }
function PrimaryButton({ children, className = "", ...props }: React.ComponentProps<typeof Button>) { return <Button {...props} className={`h-14 w-full rounded-2xl bg-[#dff33d] text-base font-black text-[#123a34] shadow-[0_8px_20px_rgba(195,214,37,.25)] hover:bg-[#d3ea2d] disabled:bg-[#dfe7e4] disabled:text-[#8aa09a] ${className}`}>{children}</Button>; }
function BackButton({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="mb-5 flex items-center gap-2 text-sm font-bold text-[#58756e]"><ArrowRight className="h-4 w-4" />العودة إلى الرحلة</button>; }
