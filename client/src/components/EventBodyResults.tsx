import React, { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardReading } from "@/components/BodyCompositionReport";
import {
  eventNumeric,
  eventReadingValues,
  eventResultCategories,
  type EventResultField,
} from "@/lib/eventResultsData";
import "@/styles/event-results.css";

type Mode = "muscle" | "fat";
export type EventParticipantIdentity = {
  firstName?: string | null;
  age?: number | null;
  sex?: "male" | "female" | string | null;
};

/** Formats timestamps using the same Riyadh/Gregorian presentation as the supplied Events project. */
export function eventReadingDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "وقت القياس غير متوفر"
    : date.toLocaleString("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
      calendar: "gregory",
    });
}

function formatValue(value: string | undefined) {
  const parsed = eventNumeric(value);
  return parsed === null ? null : parsed.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function statusLabel(status: string | undefined) {
  return status === "0" ? "منخفض" : status === "1" ? "ضمن مرجع الجهاز" : status === "2" ? "مرتفع" : "";
}

function MetricCard({ field, values, tone = "soft" }: { field: EventResultField; values: Record<string, string>; tone?: "dark" | "soft" }) {
  const [key, label, unit] = field;
  const value = formatValue(values[key]);
  const status = values[`${key}_s`];
  const badge = statusLabel(status);
  return (
    <article className={`lim-result-metric lim-result-metric-${tone}`}>
      <p>{label}</p>
      <div className="lim-result-value">
        <strong dir="ltr">{value ?? "—"}</strong>
        {value !== null && unit && <small>{unit}</small>}
      </div>
      {value === null ? (
        <span className="lim-result-unavailable">غير متوفر</span>
      ) : badge ? (
        <span className={`lim-result-status lim-result-status-${status}`}>{badge}</span>
      ) : null}
    </article>
  );
}

function SegmentCard({ label, value, area, mode }: { label: string; value?: string; area: string; mode: Mode }) {
  const formatted = formatValue(value);
  return (
    <div className={`lim-segment-card lim-segment-${area} lim-segment-${mode}`}>
      <span>{label}</span>
      <strong dir="ltr">{formatted === null ? "غير متوفر" : `${formatted} kg`}</strong>
      <i className="lim-segment-target" aria-hidden="true" />
    </div>
  );
}

function Distribution({ mode, values }: { mode: Mode; values: Record<string, string> }) {
  return (
    <div className="lim-anatomy-stage">
      <SegmentCard area="left-arm" mode={mode} label="الذراع اليمنى" value={values[`${mode}RightArm`]} />
      <SegmentCard area="right-arm" mode={mode} label="الذراع اليسرى" value={values[`${mode}LeftArm`]} />
      <SegmentCard area="trunk" mode={mode} label="الجذع" value={values[`${mode}Trunk`]} />
      <SegmentCard area="left-leg" mode={mode} label="الساق اليمنى" value={values[`${mode}RightLeg`]} />
      <SegmentCard area="right-leg" mode={mode} label="الساق اليسرى" value={values[`${mode}LeftLeg`]} />
      <div className="lim-anatomy-figure">
        <img
          src={`/api/events/anatomy/${mode}`}
          alt={mode === "muscle" ? "رسم توضيحي محايد لتوزيع العضلات" : "رسم توضيحي محايد لتوزيع الدهون"}
          decoding="async"
          loading="eager"
        />
      </div>
    </div>
  );
}

function QuickIndicator({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value?: string; unit?: string }) {
  const formatted = formatValue(value);
  return (
    <article className="lim-quick-indicator">
      <span className="lim-quick-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong dir="ltr">{formatted ?? "—"} {formatted !== null ? unit : ""}</strong>
        {formatted === null && <small>غير متوفر</small>}
      </div>
    </article>
  );
}

/**
 * The supplied LIM Events body-result frontend, adapted solely at its data seam:
 * reads come from the existing shared `health_readings` X18 data rather than the
 * original archive's separate password/login gateway.
 */
export function EventBodyResults({ readings, participant }: { readings: DashboardReading[]; participant?: EventParticipantIdentity }) {
  const [mode, setMode] = useState<Mode>("muscle");
  const reading = readings[0];
  if (!reading) return null;

  const values = eventReadingValues(reading);
  // A physical X18 report is authoritative whenever it supplies demographics.
  // Events still shows the check-in form identity when the device intentionally
  // leaves a field empty, so a participant never sees a blank report header.
  const participantName = reading.patientName?.trim() || participant?.firstName?.trim() || null;
  const participantAge = reading.patientAge ?? participant?.age ?? null;
  const participantSex = reading.patientSex ?? participant?.sex ?? null;
  const participantSexLabel = participantSex === "1" || participantSex === "male" ? "ذكر" : participantSex === "2" || participantSex === "female" ? "أنثى" : participantSex || null;
  const bmr = formatValue(values.bmr);
  const moreFields = eventResultCategories.additional.filter(([key]) => !["bmr", "vfal", "bone", "fatFree", "protein", "waterICW", "waterECW"].includes(key));
  const hasVitals = eventResultCategories.vitals.some(([key]) => eventNumeric(values[key]) !== null);

  return (
    <section className="lim-results-page" dir="rtl">
      <header className="lim-results-header">
        <div className="lim-results-brand" aria-label="ليم LIM">
          <span><HeartPulse size={22} /></span>
          <b>ليم <em>LIM</em></b>
        </div>
        <div className="lim-results-title">
          <span>{reading.source === "x18_test" ? "بيانات اختبار" : "نتائج جهاز القياس"}</span>
          <h2>نتائج تحليل الجسم</h2>
          <p><CalendarDays size={16} />{eventReadingDate(reading.recordedAt)}</p>
          {(participantName || participantAge !== null || participantSexLabel) && <p className="lim-results-participant">
            {participantName && <b>{participantName}</b>}
            {participantAge !== null && <span>{participantAge} سنة</span>}
            {participantSexLabel && <span>{participantSexLabel}</span>}
          </p>}
        </div>
        <button type="button" className="lim-download-button lim-print-hide" onClick={() => window.print()}>
          <Download size={19} /> تحميل التقرير
        </button>
      </header>

      <div className="lim-top-metrics">
        {eventResultCategories.primary.map((field) => <MetricCard key={field[0]} field={field} values={values} tone="dark" />)}
      </div>

      <section className="lim-results-card">
        <h3>تكوين الجسم</h3>
        <div className="lim-composition-grid">
          {eventResultCategories.composition.map((field) => <MetricCard key={field[0]} field={field} values={values} />)}
        </div>
      </section>

      <section className={`lim-results-card lim-distribution-card lim-distribution-${mode}`}>
        <h3>توزيع الدهون والعضلات</h3>
        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <TabsList className="lim-distribution-tabs">
            <TabsTrigger value="muscle">العضلات</TabsTrigger>
            <TabsTrigger value="fat">الدهون</TabsTrigger>
          </TabsList>
        </Tabs>
        <Distribution mode={mode} values={values} />
        <p className="lim-anatomy-note">رسم توضيحي لتوزيع القياسات؛ اليمين واليسار من منظور صاحب القياس.</p>
      </section>

      <section className="lim-results-card lim-metabolism-card">
        <h3>الحرق ومؤشرات إضافية</h3>
        <div className="lim-bmr-banner">
          <span className="lim-bmr-icon"><Flame /></span>
          <div>
            <p>معدل الأيض الأساسي</p>
            <strong dir="ltr">{bmr ?? "—"}</strong>
            <small>{bmr === null ? "غير متوفر" : "سعرة / يوم"}</small>
          </div>
          <p>احتياج الجسم التقديري للطاقة في حالة الراحة</p>
        </div>
        <div className="lim-quick-grid">
          <QuickIndicator icon={<Activity />} label="الدهون الحشوية" value={values.vfal} unit="مستوى" />
          <QuickIndicator icon={<Bone />} label="كتلة العظام" value={values.bone} unit="kg" />
          <QuickIndicator icon={<Network />} label="الكتلة الخالية من الدهون" value={values.fatFree} unit="kg" />
          <QuickIndicator icon={<Dna />} label="كتلة البروتين" value={values.protein} unit="kg" />
          <QuickIndicator icon={<Droplets />} label="الماء داخل الخلايا" value={values.waterICW} unit="kg" />
          <QuickIndicator icon={<Droplets />} label="الماء خارج الخلايا" value={values.waterECW} unit="kg" />
        </div>
        {(moreFields.length > 0 || hasVitals) && (
          <details className="lim-more-details">
            <summary>عرض جميع التفاصيل <ChevronDown size={18} /></summary>
            {moreFields.length > 0 && <div className="lim-details-grid">{moreFields.map((field) => <MetricCard key={field[0]} field={field} values={values} />)}</div>}
            {hasVitals && <><h4><HeartPulse size={19} /> الضغط والنبض</h4><div className="lim-details-grid">{eventResultCategories.vitals.map((field) => <MetricCard key={field[0]} field={field} values={values} />)}</div></>}
          </details>
        )}
      </section>

      <footer className="lim-results-footer">
        <Sparkles size={17} />
        <p>{reading.source === "x18_test" ? "قيم اختبار مولّدة عشوائيًا ومرفوعة عبر رابط بيانات X18، وليست نتيجة من جهاز فعلي." : "التصنيفات حسب مرجع الجهاز. القياسات تقديرية وتُراجع مع المختص."}</p>
        <span>رقم التحليل: <bdi>{reading.recordNo ?? "—"}</bdi></span>
      </footer>
    </section>
  );
}
