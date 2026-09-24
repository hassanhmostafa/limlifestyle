import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bone, CalendarDays, Droplets, Dumbbell, Flame, Gauge, Percent, Scale, Sparkles, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";

export type DashboardReading = {
  id: number;
  recordedAt: Date | string;
  height?: string | null;
  weight?: string | null;
  bmi?: string | null;
  machineMetrics?: unknown;
  recordNo?: string | null;
  deviceNo?: string | null;
  source?: string;
};

export type PatientIdentity = {
  name?: string | null;
  age?: number | null;
  gender?: "male" | "female" | null;
};

type Language = "en" | "ar";
type MetricDefinition = {
  key: string;
  en: string;
  ar: string;
  unit: string;
  color: string;
};

const metrics: MetricDefinition[] = [
  { key: "$height", en: "Height", ar: "الطول", unit: "cm", color: "#0ea5a4" },
  { key: "$weight", en: "Weight", ar: "الوزن", unit: "kg", color: "#3b82f6" },
  { key: "$bmi", en: "BMI", ar: "مؤشر كتلة الجسم", unit: "", color: "#8b5cf6" },
  { key: "fatRate", en: "Body fat percentage", ar: "نسبة الدهون", unit: "%", color: "#ef6d5a" },
  { key: "bodyScore", en: "Body score", ar: "مؤشر كتلة الجسم", unit: "", color: "#d2a11a" },
  { key: "fat", en: "Fat mass", ar: "كتلة الدهون", unit: "kg", color: "#ef6d5a" },
  { key: "fatFree", en: "Fat-free mass", ar: "الكتلة الخالية من الدهون", unit: "kg", color: "#3c9b86" },
  { key: "muscle", en: "Muscle mass", ar: "كتلة العضلات", unit: "kg", color: "#26805c" },
  { key: "skeletalMuscle", en: "Skeletal muscle", ar: "العضلات الهيكلية", unit: "kg", color: "#26805c" },
  { key: "waterRate", en: "Body water", ar: "ماء الجسم", unit: "%", color: "#2e9cc5" },
  { key: "waterICW", en: "Intracellular water", ar: "الماء داخل الخلايا", unit: "kg", color: "#2e9cc5" },
  { key: "waterECW", en: "Extracellular water", ar: "الماء خارج الخلايا", unit: "kg", color: "#2e9cc5" },
  { key: "protein", en: "Protein mass", ar: "كتلة البروتين", unit: "kg", color: "#8671c8" },
  { key: "bone", en: "Bone mass", ar: "كتلة العظام", unit: "kg", color: "#718096" },
  { key: "mineral", en: "Mineral mass", ar: "كتلة المعادن", unit: "kg", color: "#718096" },
  { key: "bmr", en: "Basal metabolic rate", ar: "معدل الأيض الأساسي", unit: "kcal/day", color: "#e8902d" },
  { key: "vfal", en: "Visceral fat level", ar: "الدهون الحشوية", unit: "level", color: "#ef6d5a" },
  { key: "whr", en: "Waist-to-hip ratio", ar: "نسبة الخصر إلى الورك", unit: "", color: "#d27d3a" },
  { key: "fatSubCutRate", en: "Subcutaneous fat", ar: "الدهون تحت الجلد", unit: "%", color: "#ef6d5a" },
  { key: "idealWeight", en: "Ideal weight", ar: "الوزن المثالي", unit: "kg", color: "#3b82f6" },
  { key: "dci", en: "Daily calorie intake", ar: "الاحتياج اليومي للطاقة", unit: "kcal", color: "#e8902d" },
  { key: "bodyAge", en: "Body age", ar: "عمر الجسم", unit: "years", color: "#7a6ad8" },
  { key: "obesity", en: "Obesity index", ar: "مؤشر السمنة", unit: "%", color: "#d27d3a" },
];

const segmentDefinitions = {
  muscle: [
    { key: "muscleRightArm", en: "Right arm", ar: "الذراع الأيمن" },
    { key: "muscleLeftArm", en: "Left arm", ar: "الذراع الأيسر" },
    { key: "muscleTrunk", en: "Trunk", ar: "الجذع" },
    { key: "muscleRightLeg", en: "Right leg", ar: "الساق اليمنى" },
    { key: "muscleLeftLeg", en: "Left leg", ar: "الساق اليسرى" },
  ],
  fat: [
    { key: "fatRightArm", en: "Right arm", ar: "الذراع الأيمن" },
    { key: "fatLeftArm", en: "Left arm", ar: "الذراع الأيسر" },
    { key: "fatTrunk", en: "Trunk", ar: "الجذع" },
    { key: "fatRightLeg", en: "Right leg", ar: "الساق اليمنى" },
    { key: "fatLeftLeg", en: "Left leg", ar: "الساق اليسرى" },
  ],
} as const;

function recordMetrics(reading: DashboardReading | undefined): Record<string, string> {
  if (!reading?.machineMetrics || typeof reading.machineMetrics !== "object" || Array.isArray(reading.machineMetrics)) return {};
  return Object.fromEntries(
    Object.entries(reading.machineMetrics as Record<string, unknown>)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
}

function numberValue(reading: DashboardReading | undefined, key: string): number | null {
  if (key === "$height" || key === "$weight" || key === "$bmi") {
    const rawCoreValue = reading?.[key.slice(1) as "height" | "weight" | "bmi"];
    const parsedCoreValue = Number(rawCoreValue);
    return Number.isFinite(parsedCoreValue) ? parsedCoreValue : null;
  }
  const raw = recordMetrics(reading)[key];
  if (raw === undefined || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function formattedValue(reading: DashboardReading | undefined, key: string, unit = ""): string {
  if (key === "$height" || key === "$weight" || key === "$bmi") {
    const rawCoreValue = reading?.[key.slice(1) as "height" | "weight" | "bmi"];
    const parsedCoreValue = Number(rawCoreValue);
    if (!Number.isFinite(parsedCoreValue)) return "—";
    return `${parsedCoreValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`;
  }
  const raw = recordMetrics(reading)[key];
  if (!raw) return "—";
  const parsed = Number(raw);
  const value = Number.isFinite(parsed) ? parsed.toLocaleString(undefined, { maximumFractionDigits: 1 }) : raw;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function referenceRange(reading: DashboardReading | undefined, key: string): string | null {
  const raw = recordMetrics(reading);
  const low = raw[`${key}_s`];
  const high = raw[`${key}_n`];
  return low || high ? `${low ?? "—"} – ${high ?? "—"}` : null;
}

function metricLabel(metric: MetricDefinition, language: Language) {
  return language === "ar" ? metric.ar : metric.en;
}

function ReportMetricCard({ metric, reading, language, icon }: { metric: MetricDefinition; reading: DashboardReading; language: Language; icon?: React.ReactNode }) {
  const ref = referenceRange(reading, metric.key);
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-900/70">
        {icon}<span>{metricLabel(metric, language)}</span>
      </div>
      <div className="text-xl font-extrabold text-emerald-950">{formattedValue(reading, metric.key, metric.unit)}</div>
      {ref && <div className="mt-1 text-[10px] text-slate-400">{language === "ar" ? "المرجع" : "Reference"}: {ref}</div>}
    </div>
  );
}

function X18MetricTrend({ metric, readings, language }: { metric: MetricDefinition; readings: DashboardReading[]; language: Language }) {
  const [range, setRange] = useState<"1W" | "1M" | "1Y" | "ALL">("1M");
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "1W") cutoff.setDate(now.getDate() - 7);
  if (range === "1M") cutoff.setMonth(now.getMonth() - 1);
  if (range === "1Y") cutoff.setFullYear(now.getFullYear() - 1);
  const data = useMemo(() => readings
    .filter((reading) => range === "ALL" || new Date(reading.recordedAt) >= cutoff)
    .map((reading) => ({
      date: new Date(reading.recordedAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric" }),
      value: numberValue(reading, metric.key),
    }))
    .filter((point) => point.value !== null)
    .reverse(), [readings, range, metric.key, language, cutoff.getTime()]);

  return (
    <Card className="border-0 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-slate-800">{metricLabel(metric, language)}</h4>
          <p className="text-xs text-slate-400">{metric.unit || (language === "ar" ? "قيمة" : "Value")}</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(["1W", "1M", "1Y", "ALL"] as const).map((item) => (
            <button key={item} onClick={() => setRange(item)} className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${range === item ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? <div className="flex h-40 items-center justify-center text-sm text-slate-400">{language === "ar" ? "لا توجد قياسات في هذه الفترة" : "No measurements in this period"}</div> : (
        <ResponsiveContainer width="100%" height={165}>
          <AreaChart data={data} margin={{ top: 5, right: 4, left: -20, bottom: 0 }}>
            <defs><linearGradient id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={metric.color} stopOpacity={0.24}/><stop offset="95%" stopColor={metric.color} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="#edf2f7" strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={34}/>
            <Tooltip formatter={(value) => [`${value}${metric.unit ? ` ${metric.unit}` : ""}`, metricLabel(metric, language)]}/>
            <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2.4} fill={`url(#gradient-${metric.key})`} dot={{ r: 3, fill: metric.color }} activeDot={{ r: 5 }}/>
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function BodySilhouette({ mode }: { mode: "muscle" | "fat" }) {
  const color = mode === "muscle" ? "#25855e" : "#ef836f";
  const pale = mode === "muscle" ? "#ccebd9" : "#fbd1c8";
  return (
    <svg viewBox="0 0 170 250" className="mx-auto h-56 w-36" role="img" aria-label={mode === "muscle" ? "Muscle distribution" : "Fat distribution"}>
      <circle cx="85" cy="24" r="18" fill="#f0d9c6" />
      <rect x="70" y="41" width="30" height="17" rx="7" fill="#ead2bd" />
      <path d="M54 60 Q85 48 116 60 L127 129 Q115 145 85 145 Q55 145 43 129 Z" fill={pale} stroke={color} strokeWidth="2"/>
      <path d="M51 66 L20 115 L30 128 L59 94" fill={pale} stroke={color} strokeWidth="2"/>
      <path d="M119 66 L150 115 L140 128 L111 94" fill={pale} stroke={color} strokeWidth="2"/>
      <path d="M63 139 L52 218 L73 223 L84 155" fill={pale} stroke={color} strokeWidth="2"/>
      <path d="M107 139 L118 218 L97 223 L86 155" fill={pale} stroke={color} strokeWidth="2"/>
      <path d="M68 63 Q85 81 102 63 M60 100 Q85 113 110 100 M85 58 L85 140" stroke={color} strokeWidth="2" opacity=".7" fill="none"/>
      <circle cx="29" cy="117" r="4" fill={color}/><circle cx="141" cy="117" r="4" fill={color}/><circle cx="85" cy="103" r="4" fill={color}/><circle cx="63" cy="189" r="4" fill={color}/><circle cx="107" cy="189" r="4" fill={color}/>
    </svg>
  );
}

export function BodyCompositionReport({ readings, language, patient }: { readings: DashboardReading[]; language: Language; patient?: PatientIdentity }) {
  const reports = readings.filter((reading) => Object.keys(recordMetrics(reading)).length > 0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"muscle" | "fat">("muscle");
  const report = reports.find((item) => item.id === selectedId) ?? reports[0];
  if (!report) return null;

  const primaryCards: Array<{ metric: MetricDefinition; icon: React.ReactNode }> = [
    { metric: metrics.find((metric) => metric.key === "fatRate")!, icon: <Percent className="h-3.5 w-3.5"/> },
    { metric: metrics.find((metric) => metric.key === "bodyScore")!, icon: <Gauge className="h-3.5 w-3.5"/> },
  ];
  const compositionKeys = ["fat", "waterRate", "skeletalMuscle", "muscle"];
  const additionKeys = ["bmr", "vfal", "fatFree", "bone", "protein", "waterICW", "waterECW", "mineral", "whr", "fatSubCutRate", "idealWeight", "dci", "bodyAge", "obesity"];
  const segments = segmentDefinitions[mode];
  const genderLabel = patient?.gender === "male"
    ? (language === "ar" ? "ذكر" : "Male")
    : patient?.gender === "female"
      ? (language === "ar" ? "أنثى" : "Female")
      : "—";
  const segmentColor = mode === "muscle" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-rose-200 bg-rose-50 text-rose-950";
  const allSegments = [...segmentDefinitions.muscle, ...segmentDefinitions.fat];
  const trendMetrics = [...metrics, ...allSegments.map((segment) => ({ key: segment.key, en: segment.en, ar: segment.ar, unit: "kg", color: segment.key.startsWith("muscle") ? "#25855e" : "#ef836f" }))]
    .filter((metric, index, list) => list.findIndex((candidate) => candidate.key === metric.key) === index)
    .filter((metric) => reports.some((reading) => numberValue(reading, metric.key) !== null));

  return (
    <section className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 p-5 text-white sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2 text-emerald-100"><Sparkles className="h-4 w-4"/><span className="text-xs font-semibold uppercase tracking-[0.16em]">{language === "ar" ? "بيانات توضيحية من جهاز X18" : "X18 measurement report"}</span></div>
              <h2 className="text-2xl font-extrabold">{language === "ar" ? "نتائج تحليل الجسم" : "Body Analysis Results"}</h2>
              <p className="mt-1 text-sm text-emerald-100">{new Date(report.recordedAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5"><UserRound className="h-3.5 w-3.5 text-emerald-100"/><span className="text-emerald-100">{language === "ar" ? "الاسم" : "Name"}:</span><span className="font-bold">{patient?.name || "—"}</span></div>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5"><CalendarDays className="h-3.5 w-3.5 text-emerald-100"/><span className="text-emerald-100">{language === "ar" ? "العمر" : "Age"}:</span><span className="font-bold">{patient?.age ?? "—"}{patient?.age !== null && patient?.age !== undefined ? (language === "ar" ? " سنة" : " yrs") : ""}</span></div>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5"><UserRound className="h-3.5 w-3.5 text-emerald-100"/><span className="text-emerald-100">{language === "ar" ? "الجنس" : "Gender"}:</span><span className="font-bold">{genderLabel}</span></div>
              </div>
            </div>
            {reports.length > 1 && <select aria-label="Select body composition report" value={report.id} onChange={(event) => setSelectedId(Number(event.target.value))} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none backdrop-blur [&_option]:text-slate-900">
              {reports.map((item) => <option key={item.id} value={item.id}>{new Date(item.recordedAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}</option>)}
            </select>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {primaryCards.map(({ metric, icon }) => <ReportMetricCard key={metric.key} metric={metric} reading={report} language={language} icon={icon}/>) }
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-100"><Scale className="h-3.5 w-3.5"/>{language === "ar" ? "الوزن" : "Weight"}</div><div className="text-2xl font-extrabold">{report.weight ? `${Number(report.weight).toFixed(1)} kg` : "—"}</div></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-3"><div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-100"><Dumbbell className="h-3.5 w-3.5"/>{language === "ar" ? "الطول" : "Height"}</div><div className="text-2xl font-extrabold">{report.height ? `${Number(report.height).toFixed(1)} cm` : "—"}</div></div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <h3 className="mb-3 text-lg font-extrabold text-emerald-950">{language === "ar" ? "تكوين الجسم" : "Body Composition"}</h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {compositionKeys.map((key) => {
              const metric = metrics.find((item) => item.key === key)!;
              const icon = key === "waterRate" ? <Droplets className="h-3.5 w-3.5"/> : key.includes("muscle") ? <Dumbbell className="h-3.5 w-3.5"/> : <Scale className="h-3.5 w-3.5"/>;
              return <ReportMetricCard key={key} metric={metric} reading={report} language={language} icon={icon}/>;
            })}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-0 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-lg font-extrabold text-slate-800">{language === "ar" ? "توزيع الدهون والعضلات" : "Fat & Muscle Distribution"}</h3><p className="text-sm text-slate-500">{language === "ar" ? "اختر نوع القياس لعرض القيم القطاعية من الجهاز" : "Choose a measurement type to view the device's segmental values."}</p></div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(["muscle", "fat"] as const).map((item) => <button key={item} onClick={() => setMode(item)} className={`rounded-lg px-5 py-2 text-sm font-bold transition ${mode === item ? (item === "muscle" ? "bg-emerald-700 text-white shadow" : "bg-rose-500 text-white shadow") : "text-slate-500"}`}>{item === "muscle" ? (language === "ar" ? "العضلات" : "Muscle") : (language === "ar" ? "الدهون" : "Fat")}</button>)}
          </div>
        </div>
        <div className="grid items-center gap-4 md:grid-cols-[1fr_180px_1fr]">
          <div className="grid gap-3">
            {segments.slice(0, 2).map((segment) => <div key={segment.key} className={`rounded-xl border p-3 ${segmentColor}`}><div className="text-xs font-medium opacity-70">{language === "ar" ? segment.ar : segment.en}</div><div className="text-xl font-extrabold">{formattedValue(report, segment.key, "kg")}</div></div>)}
            <div className={`rounded-xl border p-3 ${segmentColor}`}><div className="text-xs font-medium opacity-70">{language === "ar" ? segments[2].ar : segments[2].en}</div><div className="text-xl font-extrabold">{formattedValue(report, segments[2].key, "kg")}</div></div>
          </div>
          <div className="rounded-3xl bg-slate-50 py-2"><BodySilhouette mode={mode}/></div>
          <div className="grid gap-3">
            {segments.slice(3).map((segment) => <div key={segment.key} className={`rounded-xl border p-3 ${segmentColor}`}><div className="text-xs font-medium opacity-70">{language === "ar" ? segment.ar : segment.en}</div><div className="text-xl font-extrabold">{formattedValue(report, segment.key, "kg")}</div></div>)}
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700"><div className="text-xs font-medium text-slate-400">{language === "ar" ? "مصدر القياس" : "Report source"}</div><div className="mt-1 break-all text-xs font-semibold">{report.deviceNo ?? "X18"} · {report.recordNo ?? "—"}</div></div>
          </div>
        </div>
      </Card>

      <Card className="border-0 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500"/><div><h3 className="text-lg font-extrabold text-slate-800">{language === "ar" ? "الحرق ومؤشرات إضافية" : "Metabolism & Additional Indicators"}</h3><p className="text-sm text-slate-500">{language === "ar" ? "كل قيمة أدناه مأخوذة بالاسم نفسه من machineMetrics." : "Every value below is retained from machineMetrics under its original X18 key."}</p></div></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {additionKeys.map((key) => {
            const metric = metrics.find((item) => item.key === key)!;
            const icon = key === "bmr" || key === "dci" ? <Flame className="h-3.5 w-3.5"/> : key === "bone" || key === "mineral" ? <Bone className="h-3.5 w-3.5"/> : <Gauge className="h-3.5 w-3.5"/>;
            return <ReportMetricCard key={key} metric={metric} reading={report} language={language} icon={icon}/>;
          })}
        </div>
      </Card>

      <div>
        <div className="mb-3"><h3 className="text-xl font-extrabold text-slate-900">{language === "ar" ? "اتجاهات القياسات التفصيلية" : "Detailed Metric Trends"}</h3><p className="text-sm text-slate-500">{language === "ar" ? "مخطط منفصل لكل مقياس يتوفر له أكثر من قراءة." : "A separate chart is shown for every machine metric with recorded values."}</p></div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {trendMetrics.map((metric) => <X18MetricTrend key={metric.key} metric={metric} readings={reports} language={language}/>) }
        </div>
      </div>
    </section>
  );
}
