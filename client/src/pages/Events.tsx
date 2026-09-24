import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  Loader2,
  LogIn,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { BodyCompositionReport } from "@/components/BodyCompositionReport";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const goals = [
  { value: "weight", ar: "إدارة الوزن", en: "Weight management" },
  { value: "fitness", ar: "اللياقة والنشاط", en: "Fitness and activity" },
  { value: "nutrition", ar: "التغذية", en: "Nutrition" },
  { value: "general", ar: "الصحة العامة", en: "General health" },
];

type EventForm = {
  displayName: string;
  age: string;
  sex: "male" | "female" | "";
  city: string;
  activityDays: string;
  sleepHours: string;
  goals: string[];
  consent: boolean;
};

const initialForm: EventForm = {
  displayName: "",
  age: "",
  sex: "",
  city: "",
  activityDays: "",
  sleepHours: "",
  goals: [],
  consent: false,
};

/**
 * The event experience intentionally uses the authenticated LIM account and
 * the same health_readings records as My Health. It never accepts an X18 key
 * or stores a second copy of the physical measurement.
 */
export default function Events() {
  const { isAuthenticated, loading, user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [form, setForm] = useState<EventForm>(initialForm);
  const [showQr, setShowQr] = useState(false);
  const utils = trpc.useUtils();

  const sessionQuery = trpc.events.mySession.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  const resultsQuery = trpc.events.myResults.useQuery(undefined, {
    enabled: isAuthenticated && Boolean(sessionQuery.data?.session),
    refetchInterval: showQr ? 10_000 : false,
    refetchOnWindowFocus: true,
  });

  const checkInMutation = trpc.events.checkIn.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.events.mySession.invalidate(), utils.events.myResults.invalidate()]);
      setShowQr(true);
      toast.success(isAr ? "تم حفظ تسجيل الفعالية" : "Event check-in saved");
    },
    onError: (error) => toast.error(error.message),
  });

  const session = sessionQuery.data?.session;
  const machineUserId = sessionQuery.data?.machineUserId;
  const x18Readings = resultsQuery.data?.readings ?? [];
  const hasResults = x18Readings.length > 0;

  useEffect(() => {
    if (!session) return;
    const answers = session.answers ?? {};
    const savedGoals = Array.isArray(answers.goals) ? answers.goals.filter((goal): goal is string => typeof goal === "string") : [];
    setForm({
      displayName: session.displayName ?? "",
      age: session.age ? String(session.age) : "",
      sex: session.sex ?? "",
      city: session.city ?? "",
      activityDays: typeof answers.activityDays === "number" || typeof answers.activityDays === "string" ? String(answers.activityDays) : "",
      sleepHours: typeof answers.sleepHours === "number" || typeof answers.sleepHours === "string" ? String(answers.sleepHours) : "",
      goals: savedGoals,
      consent: session.consent === "true",
    });
  }, [session]);

  const canSubmit = useMemo(() => (
    form.displayName.trim().length > 0
    && Number(form.age) >= 0
    && Number(form.age) <= 130
    && Boolean(form.sex)
    && form.consent
  ), [form]);

  const update = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleGoal = (goal: string) => update("goals", form.goals.includes(goal)
    ? form.goals.filter((item) => item !== goal)
    : [...form.goals, goal]);

  const submit = () => {
    if (!canSubmit || !form.sex) return;
    checkInMutation.mutate({
      displayName: form.displayName.trim(),
      age: Number(form.age),
      sex: form.sex,
      city: form.city.trim() || undefined,
      consent: true,
      answers: {
        activityDays: form.activityDays ? Number(form.activityDays) : "",
        sleepHours: form.sleepHours ? Number(form.sleepHours) : "",
        goals: form.goals,
      },
    });
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div>;
  }

  if (!isAuthenticated) {
    return <EventSignInGate isAr={isAr} />;
  }

  return (
    <div className="min-h-screen bg-[#f3f8f6] text-slate-900" dir={isAr ? "rtl" : "ltr"}>
      <Navigation />
      <main className="pt-16">
        <section className="relative overflow-hidden bg-[#103d36] px-4 py-12 text-white sm:px-6 lg:py-16">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="container relative max-w-5xl">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-200/25 bg-white/10 px-3 py-1.5 text-sm font-bold text-lime-200">
                  <Sparkles className="h-4 w-4" />
                  {isAr ? "رحلة الفعالية الصحية" : "Event health journey"}
                </div>
                <h1 className="max-w-2xl text-3xl font-black leading-tight sm:text-5xl">
                  {isAr ? "نموذجك وقياسك ونتيجتك في حساب LIM واحد" : "Your form, measurement, and result in one LIM account"}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-100 sm:text-lg">
                  {isAr
                    ? "سجّل بيانات الفعالية، ثم اعرض رمز جوالك لجهاز X18. ستظهر نتائج القياس في هذه الصفحة وفي «صحتي» عند وصولها إلى LIM."
                    : "Check in for the event, present your mobile QR to the X18, and view the same measurement here and in My Health once LIM receives it."}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-emerald-950"><ShieldCheck className="h-6 w-6" /></div><div><p className="font-bold">{isAr ? "خصوصية النتيجة" : "Private results"}</p><p className="text-sm text-emerald-100">{isAr ? "تُعرض لك فقط بعد تسجيل الدخول" : "Visible only after you sign in"}</p></div></div>
                <p className="mt-4 text-sm leading-6 text-emerald-100">{isAr ? "الجهاز يرسل إلى LIM مرة واحدة؛ لا تُنسخ نتائجك إلى قاعدة بيانات فعالية منفصلة." : "The machine uploads to LIM once; results are not copied to a separate event database."}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container max-w-5xl py-8 sm:py-10">
          <JourneySteps isAr={isAr} active={hasResults ? 3 : showQr || session ? 2 : 1} />

          {!session && <EventCheckInForm
            isAr={isAr}
            form={form}
            update={update}
            toggleGoal={toggleGoal}
            canSubmit={canSubmit}
            pending={checkInMutation.isPending}
            onSubmit={submit}
          />}

          {session && !showQr && !hasResults && <Card className="mx-auto max-w-2xl border-0 p-7 shadow-xl shadow-emerald-950/5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-bold text-emerald-700">{isAr ? "تم تسجيلك في الفعالية" : "Event check-in complete"}</p><h2 className="mt-1 text-2xl font-black">{session.displayName || user?.name}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{isAr ? "اعرض رمز جوالك على قارئ X18 لربط القياس بحساب LIM نفسه." : "Show your mobile QR to the X18 scanner to link the measurement to this LIM account."}</p></div>
              <Button onClick={() => setShowQr(true)} className="h-12 bg-emerald-700 px-5 font-bold hover:bg-emerald-800"><QrCode className="me-2 h-5 w-5" />{isAr ? "عرض رمز الجوال" : "Show mobile QR"}</Button>
            </div>
          </Card>}

          {session && (showQr || hasResults) && <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr]">
            <QrMeasurementPanel isAr={isAr} machineUserId={machineUserId} name={session.displayName || user?.name || ""} />
            <ResultsPanel isAr={isAr} loading={resultsQuery.isLoading} hasResults={hasResults} readings={x18Readings} onRefresh={() => resultsQuery.refetch()} />
          </div>}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function EventSignInGate({ isAr }: { isAr: boolean }) {
  return <div className="min-h-screen bg-[#f3f8f6]" dir={isAr ? "rtl" : "ltr"}>
    <Navigation />
    <main className="grid min-h-screen place-items-center px-4 pt-16">
      <Card className="w-full max-w-lg border-0 p-7 text-center shadow-xl shadow-emerald-950/5 sm:p-9">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-800"><LogIn className="h-8 w-8" /></div>
        <h1 className="mt-5 text-2xl font-black">{isAr ? "ابدأ رحلة الفعالية بحساب LIM" : "Start the event journey with LIM"}</h1>
        <p className="mt-3 leading-7 text-slate-600">{isAr ? "استخدم رقم جوالك لتسجيل الدخول أو إنشاء حساب. هذا يضمن أن نتائج X18 تظهر لك وحدك هنا وفي صفحة «صحتي»." : "Sign in or create an account with your mobile number. This ensures only you can view your X18 results here and in My Health."}</p>
        <Link href="/login?redirect=/events" className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-800"><LogIn className="me-2 h-5 w-5" />{isAr ? "تسجيل الدخول أو إنشاء حساب" : "Sign in or create an account"}</Link>
      </Card>
    </main>
    <Footer />
  </div>;
}

function JourneySteps({ isAr, active }: { isAr: boolean; active: number }) {
  const steps = [
    { icon: ClipboardList, ar: "تسجيل الفعالية", en: "Event check-in" },
    { icon: QrCode, ar: "مسح رمز الجوال", en: "Mobile QR scan" },
    { icon: HeartPulse, ar: "النتائج في LIM", en: "Results in LIM" },
  ];
  return <div className="mb-8 grid gap-3 sm:grid-cols-3">{steps.map((step, index) => {
    const Icon = step.icon;
    const done = active > index + 1;
    const current = active === index + 1;
    return <div key={step.en} className={`flex items-center gap-3 rounded-2xl border p-4 ${done ? "border-emerald-200 bg-emerald-50" : current ? "border-lime-300 bg-white shadow-sm" : "border-slate-200 bg-white/60"}`}><div className={`grid h-10 w-10 place-items-center rounded-xl ${done ? "bg-emerald-700 text-white" : current ? "bg-lime-300 text-emerald-950" : "bg-slate-100 text-slate-400"}`}>{done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</div><div><p className="text-xs text-slate-500">{isAr ? `الخطوة ${index + 1}` : `Step ${index + 1}`}</p><p className="font-bold">{isAr ? step.ar : step.en}</p></div></div>;
  })}</div>;
}

function EventCheckInForm({ isAr, form, update, toggleGoal, canSubmit, pending, onSubmit }: {
  isAr: boolean;
  form: EventForm;
  update: <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;
  toggleGoal: (goal: string) => void;
  canSubmit: boolean;
  pending: boolean;
  onSubmit: () => void;
}) {
  return <Card className="mx-auto max-w-3xl border-0 p-5 shadow-xl shadow-emerald-950/5 sm:p-8">
    <div className="mb-7 flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ClipboardList className="h-6 w-6" /></div><div><p className="text-sm font-bold text-emerald-700">{isAr ? "الخطوة الأولى" : "Step one"}</p><h2 className="text-2xl font-black">{isAr ? "بيانات فعالية LIM" : "LIM event details"}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{isAr ? "هذه البيانات تخص تنظيم الفعالية. اسم وعمر وجنس تقرير X18 تظهر كما يرسلها الجهاز نفسه." : "These fields support the event. The name, age, and sex on an X18 report are always shown exactly as the device submits them."}</p></div></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={isAr ? "الاسم" : "Name"}><Input value={form.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder={isAr ? "مثال: عبداللطيف" : "e.g. Abdulaziz"} /></Field>
      <Field label={isAr ? "العمر" : "Age"}><Input value={form.age} inputMode="numeric" onChange={(event) => update("age", event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="18" /></Field>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">{isAr ? "الجنس" : "Gender"}</legend><div className="grid grid-cols-2 gap-3"><ChoiceButton active={form.sex === "male"} onClick={() => update("sex", "male")}>{isAr ? "ذكر" : "Male"}</ChoiceButton><ChoiceButton active={form.sex === "female"} onClick={() => update("sex", "female")}>{isAr ? "أنثى" : "Female"}</ChoiceButton></div></fieldset>
      <Field label={isAr ? "المدينة (اختياري)" : "City (optional)"}><div className="relative"><MapPin className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="ps-9" value={form.city} onChange={(event) => update("city", event.target.value)} placeholder={isAr ? "جدة" : "Jeddah"} /></div></Field>
      <Field label={isAr ? "أيام النشاط أسبوعيًا (اختياري)" : "Active days per week (optional)"}><Input value={form.activityDays} inputMode="numeric" onChange={(event) => update("activityDays", event.target.value.replace(/\D/g, "").slice(0, 1))} placeholder="3" /></Field>
      <Field label={isAr ? "متوسط ساعات النوم (اختياري)" : "Average sleep hours (optional)"}><Input value={form.sleepHours} inputMode="numeric" onChange={(event) => update("sleepHours", event.target.value.replace(/[^\d.]/g, "").slice(0, 4))} placeholder="7" /></Field>
    </div>
    <fieldset className="mt-6 space-y-3"><legend className="text-sm font-medium">{isAr ? "ما الذي تود التركيز عليه؟ (اختياري)" : "What would you like to focus on? (optional)"}</legend><div className="grid gap-3 sm:grid-cols-2">{goals.map((goal) => <button key={goal.value} type="button" onClick={() => toggleGoal(goal.value)} className={`rounded-xl border px-4 py-3 text-start text-sm font-bold transition ${form.goals.includes(goal.value) ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"}`}>{form.goals.includes(goal.value) && <CheckCircle2 className="me-2 inline h-4 w-4" />}{isAr ? goal.ar : goal.en}</button>)}</div></fieldset>
    <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4"><Checkbox checked={form.consent} onCheckedChange={(value) => update("consent", value === true)} className="mt-0.5" /><span className="text-sm leading-6 text-slate-600">{isAr ? "أوافق على حفظ نموذج الفعالية في حساب LIM الخاص بي وربط نتيجة القياس بحسابي. لا يُعد هذا النموذج تشخيصًا طبيًا." : "I agree to save this event form in my LIM account and link my measurement to my account. This form is not a medical diagnosis."}</span></label>
    <Button onClick={onSubmit} disabled={!canSubmit || pending} className="mt-7 h-13 w-full bg-emerald-700 text-base font-bold hover:bg-emerald-800">{pending ? <Loader2 className="me-2 h-5 w-5 animate-spin" /> : <QrCode className="me-2 h-5 w-5" />}{isAr ? "حفظ وعرض رمز الجوال" : "Save and show mobile QR"}</Button>
  </Card>;
}

function QrMeasurementPanel({ isAr, machineUserId, name }: { isAr: boolean; machineUserId: string | null | undefined; name: string }) {
  return <Card className="border-0 p-5 shadow-xl shadow-emerald-950/5 sm:p-7">
    <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime-200 text-emerald-950"><QrCode className="h-6 w-6" /></div><div><p className="text-sm font-bold text-emerald-700">{isAr ? "الخطوة الثانية" : "Step two"}</p><h2 className="text-xl font-black">{isAr ? "امسح رمز جوالك على X18" : "Scan your mobile QR at X18"}</h2></div></div>
    {machineUserId ? <><div className="my-6 rounded-[28px] border border-emerald-100 bg-white p-4"><QRCodeSVG value={machineUserId} size={260} level="M" includeMargin className="mx-auto h-auto w-full max-w-[260px]" title="LIM mobile identity QR" /></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">{isAr ? "الرقم الذي سيظهر في خانة ID بالجهاز" : "The number the device will show in its ID field"}</p><p dir="ltr" className="mt-1 text-2xl font-black tracking-wide text-emerald-800">{machineUserId}</p><p className="mt-3 text-sm leading-6 text-emerald-800/80">{isAr ? `أدخل الاسم والعمر والجنس في شاشة الجهاز عند طلبها. سيظهر ${name || "المشارك"} في نموذج الفعالية فقط؛ أما هوية التقرير فتأتي من جهاز X18.` : "Enter name, age, and gender on the device when prompted. The report identity comes from the X18 itself."}</p></div></> : <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">{isAr ? "أضف رقم جوال سعودي صحيحًا في حساب LIM أولًا، ثم عُد إلى رحلة الفعالية." : "Add a valid Saudi mobile number to your LIM account, then return to the event journey."}</div>}
  </Card>;
}

function ResultsPanel({ isAr, loading, hasResults, readings, onRefresh }: {
  isAr: boolean;
  loading: boolean;
  hasResults: boolean;
  readings: Array<React.ComponentProps<typeof BodyCompositionReport>["readings"][number]>;
  onRefresh: () => void;
}) {
  if (hasResults) return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-emerald-700">{isAr ? "الخطوة الثالثة" : "Step three"}</p><h2 className="text-2xl font-black">{isAr ? "نتيجة قياسك من LIM" : "Your LIM measurement result"}</h2></div><Button variant="outline" onClick={() => window.print()} className="print:hidden">{isAr ? "طباعة التقرير" : "Print report"}</Button></div><BodyCompositionReport readings={readings} language={isAr ? "ar" : "en"} /></div>;
  return <Card className="border-0 p-7 shadow-xl shadow-emerald-950/5"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Activity className="h-7 w-7" /></div><h2 className="mt-5 text-2xl font-black">{isAr ? "بانتظار نتيجة جهاز X18" : "Waiting for the X18 result"}</h2><p className="mt-3 max-w-xl leading-7 text-slate-600">{isAr ? "بعد إكمال القياس، يرسل الجهاز النتيجة مباشرة إلى LIM باستخدام رابط الرفع المشترك. يتم التحقق من النتيجة هنا تلقائيًا كل 10 ثوانٍ." : "After measurement, the device uploads directly to LIM using the shared upload URL. This page automatically checks for your result every 10 seconds."}</p><Button variant="outline" onClick={onRefresh} disabled={loading} className="mt-5">{loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Activity className="me-2 h-4 w-4" />}{isAr ? "تحديث الآن" : "Refresh now"}</Button><p className="mt-5 text-xs leading-5 text-slate-400">{isAr ? "إذا لم تظهر النتيجة، تأكد من أن الجهاز مسح الرقم الظاهر في QR وأن إعدادات الجهاز تستخدم رابط LIM الصحيح." : "If no result appears, confirm the device scanned the QR number and is configured with the correct LIM upload URL."}</p></Card>;
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`h-11 rounded-xl border text-sm font-bold transition ${active ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"}`}>{active && <CheckCircle2 className="me-1 inline h-4 w-4" />}{children}</button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><Label>{label}</Label>{children}</label>;
}
