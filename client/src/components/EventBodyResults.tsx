import React, { useMemo, useState } from "react";
import {
  Activity,
  Bone,
  CalendarDays,
  ChevronDown,
  Dna,
  Download,
  Droplets,
  Flame,
  HeartPulse,
  Network,
  Sparkles,
} from "lucide-react";
import type { DashboardReading } from "@/components/BodyCompositionReport";
import {
  eventFormattedValue,
  eventNumeric,
  eventReadingValues,
  eventReferenceRange,
  eventResultCategories,
  type EventResultField,
} from "@/lib/eventResultsData";
import "@/styles/event-results.css";

type DistributionMode = "muscle" | "fat";

const segments = [
  ["RightArm", "الذراع اليمنى"],
  ["LeftArm", "الذراع اليسرى"],
  ["Trunk", "الجذع"],
  ["RightLeg", "الساق اليمنى"],
  ["LeftLeg", "الساق اليسرى"],
] as const;

function reportDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "وقت القياس غير متوفر"
    : date.toLocaleString("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Riyadh",
        calendar: "gregory",
      });
}

function statusLabel(value: string | undefined) {
  if (value === "0") return "منخفض";
  if (value === "1") return "ضمن مرجع الجهاز";
  if (value === "2") return "مرتفع";
  return null;
}

function ResultMetric({ field, values, tone = "soft" }: { field: EventResultField; values: Record<string, string>; tone?: "soft" | "dark" }) {
  const [key, label, unit] = field;
  const value = eventFormattedValue(values[key], unit);
  const status = values[`${key}_s`];
  const badge = statusLabel(status);
  const reference = eventReferenceRange(values, key);
  const unavailable = eventNumeric(values[key]) === null;

  return (
    <article className={`lim-event-metric lim-event-metric-${tone}`}>
      <p>{label}</p>
      <div className="lim-event-value"><strong dir="ltr">{value}</strong></div>
      {unavailable ? <span className="lim-event-unavailable">غير متوفر</span> : badge ? <span className={`lim-event-status lim-event-status-${status}`}>{badge}</span> : reference ? <small>مرجع الجهاز: {reference}</small> : null}
    </article>
  );
}

function SegmentCard({ label, value, position, mode }: { label: string; value?: string; position: string; mode: DistributionMode }) {
  const numeric = eventNumeric(value);
  return (
    <div className={`lim-event-segment lim-event-segment-${position} lim-event-segment-${mode}`}>
      <span>{label}</span>
      <strong dir="ltr">{numeric === null ? "غير متوفر" : `${numeric.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`}</strong>
    </div>
  );
}

function Distribution({ mode, values }: { mode: DistributionMode; values: Record<string, string> }) {
  const prefix = mode === "muscle" ? "muscle" : "fat";
  return (
    <div className="lim-event-anatomy-stage">
      <SegmentCard position="left-arm" mode={mode} label={segments[0][1]} value={values[`${prefix}${segments[0][0]}`]} />
      <SegmentCard position="right-arm" mode={mode} label={segments[1][1]} value={values[`${prefix}${segments[1][0]}`]} />
      <SegmentCard position="trunk" mode={mode} label={segments[2][1]} value={values[`${prefix}${segments[2][0]}`]} />
      <SegmentCard position="left-leg" mode={mode} label={segments[3][1]} value={values[`${prefix}${segments[3][0]}`]} />
      <SegmentCard position="right-leg" mode={mode} label={segments[4][1]} value={values[`${prefix}${segments[4][0]}`]} />
      <div className="lim-event-anatomy-figure">
        <img
          src={mode === "muscle" ? "/manus-storage/body-muscle_66410d1d.png" : "/manus-storage/body-fat_bbcef35d.png"}
          alt={mode === "muscle" ? "رسم توضيحي لتوزيع العضلات" : "رسم توضيحي لتوزيع الدهون"}
        />
      </div>
    </div>
  );
}

function QuickIndicator({ icon, field, values }: { icon: React.ReactNode; field: EventResultField; values: Record<string, string> }) {
  const [key, label, unit] = field;
  const numeric = eventNumeric(values[key]);
  return (
    <article className="lim-event-quick">
      <span className="lim-event-quick-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong dir="ltr">{numeric === null ? "—" : `${numeric.toLocaleString("en-US", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`}</strong>
        {numeric === null && <small>غير متوفر</small>}
      </div>
    </article>
  );
}

/**
 * Events-only X18 result presentation. It consumes the existing shared
 * `health_readings` payload; no machine route, upload key, or session behavior
 * is changed by this component.
 */
export function EventBodyResults({ readings }: { readings: DashboardReading[] }) {
  const reports = readings.filter((reading) => Object.keys(eventReadingValues(reading)).length > 0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<DistributionMode>("muscle");
  const report = reports.find((reading) => reading.id === selectedId) ?? reports[0];
  const values = useMemo(() => report ? eventReadingValues(report) : {}, [report]);

  if (!report) return null;

  const bmr = eventFormattedValue(values.bmr, "سعرة / يوم");
  const details = eventResultCategories.details.filter(([key]) => eventNumeric(values[key]) !== null);
  const vitals = eventResultCategories.vitals.filter(([key]) => eventNumeric(values[key]) !== null);

  return (
    <section className="lim-event-results" dir="rtl">
      <header className="lim-event-header">
        <div className="lim-event-brand"><span><HeartPulse size={22} /></span><b>ليم <em>LIM</em></b></div>
        <div className="lim-event-title"><span>بيانات توضيحية</span><h2>نتائج تحليل الجسم</h2><p><CalendarDays size={16} />{reportDate(report.recordedAt)}</p></div>
        <button type="button" className="lim-event-download lim-print-hide" onClick={() => window.print()}><Download size={19} />تحميل التقرير</button>
      </header>

      {reports.length > 1 && <label className="lim-event-history">سجل التحاليل<select value={report.id} onChange={(event) => setSelectedId(Number(event.target.value))}>{reports.map((item) => <option key={item.id} value={item.id}>{reportDate(item.recordedAt)} · {item.recordNo ?? "—"}</option>)}</select></label>}

      <div className="lim-event-top-metrics">{eventResultCategories.primary.map((field) => <ResultMetric key={field[0]} field={field} values={values} tone="dark" />)}</div>

      <section className="lim-event-card">
        <h3>تكوين الجسم</h3>
        <div className="lim-event-composition">{eventResultCategories.composition.map((field) => <ResultMetric key={field[0]} field={field} values={values} />)}</div>
      </section>

      <section className={`lim-event-card lim-event-distribution lim-event-distribution-${mode}`}>
        <h3>توزيع الدهون والعضلات</h3>
        <div className="lim-event-tabs" role="tablist" aria-label="توزيع القياسات">
          <button type="button" role="tab" aria-selected={mode === "muscle"} onClick={() => setMode("muscle")}>العضلات</button>
          <button type="button" role="tab" aria-selected={mode === "fat"} onClick={() => setMode("fat")}>الدهون</button>
        </div>
        <Distribution mode={mode} values={values} />
        <p className="lim-event-anatomy-note">رسم توضيحي لتوزيع القياسات؛ اليمين واليسار من منظور صاحب القياس.</p>
      </section>

      <section className="lim-event-card lim-event-metabolism">
        <h3>الحرق ومؤشرات إضافية</h3>
        <div className="lim-event-bmr">
          <span className="lim-event-bmr-icon"><Flame /></span>
          <div><p>معدل الأيض الأساسي</p><strong dir="ltr">{bmr}</strong></div>
          <p>احتياج الجسم التقديري للطاقة في حالة الراحة</p>
        </div>
        <div className="lim-event-quick-grid">
          <QuickIndicator icon={<Activity />} field={eventResultCategories.quick[0]} values={values} />
          <QuickIndicator icon={<Bone />} field={eventResultCategories.quick[1]} values={values} />
          <QuickIndicator icon={<Network />} field={eventResultCategories.quick[2]} values={values} />
          <QuickIndicator icon={<Dna />} field={eventResultCategories.quick[3]} values={values} />
          <QuickIndicator icon={<Droplets />} field={eventResultCategories.quick[4]} values={values} />
          <QuickIndicator icon={<Droplets />} field={eventResultCategories.quick[5]} values={values} />
        </div>
        {(details.length > 0 || vitals.length > 0) && <details className="lim-event-details"><summary>عرض جميع التفاصيل <ChevronDown size={18} /></summary>
          {details.length > 0 && <div className="lim-event-details-grid">{details.map((field) => <ResultMetric key={field[0]} field={field} values={values} />)}</div>}
          {vitals.length > 0 && <><h4><HeartPulse size={19} />الضغط والنبض</h4><div className="lim-event-details-grid">{vitals.map((field) => <ResultMetric key={field[0]} field={field} values={values} />)}</div></>}
        </details>}
      </section>

      <footer className="lim-event-footer"><Sparkles size={17} /><p>التصنيفات حسب مرجع الجهاز. القياسات تقديرية وتُراجع مع المختص.</p><span>رقم التحليل: <bdi>{report.recordNo ?? "—"}</bdi></span></footer>
    </section>
  );
}
