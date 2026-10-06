import React from "react";
import {
  CalendarDays,
  Ruler,
  Scale,
  Gauge,
  Droplets,
  Dumbbell,
  HeartPulse,
  ScanLine,
  CalendarClock,
} from "lucide-react";
import type { DashboardReading } from "@/components/BodyCompositionReport";
import {
  eventBodyFields,
  eventMetricReference,
  eventMetricStatus,
  eventNumeric,
  eventReadingValues,
  type EventResultField,
} from "@/lib/eventResultsData";
import { LIMAnatomyDistribution } from "@/components/LIMAnatomyDistribution";
import LimLogo from "@/components/LimLogo";
import "@/styles/event-results.css";

export type EventParticipantIdentity = {
  firstName?: string | null;
  age?: number | null;
  sex?: string | null;
};
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
const metricIcons = {
  height: Ruler,
  weight: Scale,
  bmi: Gauge,
  fatRate: Droplets,
  skeletalMuscle: Dumbbell,
  vfal: HeartPulse,
  whr: ScanLine,
  bodyAge: CalendarClock,
};

function MetricCard({
  field,
  values,
}: {
  field: EventResultField;
  values: Record<string, string>;
}) {
  const [key, label, unit] = field;
  const value = eventNumeric(values[key]);
  const status = eventMetricStatus(values, key);
  const reference = eventMetricReference(values, key);
  const Icon = metricIcons[key as keyof typeof metricIcons];
  return (
    <article
      data-body-metric={key}
      className={`lim-result-metric${status ? ` lim-result-metric-status-${status.code}` : ""}`}
    >
      <Icon className="lim-metric-icon" aria-hidden="true" />
      <p>{label}</p>
      <div className="lim-result-value">
        <strong dir="ltr">
          {value?.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? "—"}
        </strong>
        {value !== null && unit && <small>{unit}</small>}
      </div>
      {value === null ? (
        <span className="lim-result-unavailable">غير متوفر</span>
      ) : status ? (
        <span className={`lim-result-status lim-result-status-${status.code}`}>
          {status.label}
        </span>
      ) : key === "bodyAge" ? (
        <span className="lim-result-status lim-result-status-neutral">
          تقدير الجهاز
        </span>
      ) : null}
      {value !== null && reference && (
        <span className="lim-result-reference">
          {reference.label}: <bdi dir="ltr">{reference.value}</bdi>
          {unit ? ` ${unit}` : ""}
        </span>
      )}
      {value !== null &&
        !reference &&
        key !== "height" &&
        key !== "bodyAge" && (
          <span className="lim-result-reference">المدى الطبيعي غير متوفر</span>
        )}
    </article>
  );
}

/** Same record, cards and reference rules in every Events view, including PDF. */
export function EventBodyResults({
  readings,
  participant,
}: {
  readings: DashboardReading[];
  participant?: EventParticipantIdentity;
}) {
  const reading = readings[0];
  if (!reading) return null;
  const values = eventReadingValues(reading);
  const name = reading.patientName?.trim() || participant?.firstName?.trim();
  const age = reading.patientAge ?? participant?.age;
  const sex = reading.patientSex ?? participant?.sex;
  const sexLabel =
    sex === "1" || sex === "male"
      ? "ذكر"
      : sex === "2" || sex === "female"
        ? "أنثى"
        : sex;
  return (
    <section
      data-pdf-report
      data-body-record={reading.recordNo ?? reading.id}
      className="lim-results-page lim-body-unified"
      dir="rtl"
    >
      <header className="lim-results-header">
        <LimLogo />
        <div className="lim-results-title">
          <span>
            {reading.source === "x18_test"
              ? "بيانات اختبار"
              : "نتائج جهاز القياس"}
          </span>
          <h2>نتائج تحليل الجسم</h2>
          <p>
            <CalendarDays size={14} />
            {eventReadingDate(reading.recordedAt)}
          </p>
          <p className="lim-results-participant">
            {name && <b>{name}</b>}
            {age != null && <span>{age} سنة</span>}
            {sexLabel && <span>{sexLabel}</span>}
          </p>
        </div>
      </header>
      <div className="lim-top-metrics">
        {eventBodyFields.map(field => (
          <MetricCard key={field[0]} field={field} values={values} />
        ))}
      </div>
      <section className="lim-distributions" aria-label="توزيع الدهون والعضلات">
        {(["muscle", "fat"] as const).map(mode => (
          <section
            key={mode}
            data-pdf-keep
            className={`lim-results-card lim-distribution-${mode}`}
          >
            <h3>
              {mode === "muscle"
                ? "توزيع العضلات بالجسم"
                : "توزيع الدهون بالجسم"}
            </h3>
            <LIMAnatomyDistribution mode={mode} values={values} language="ar" />
          </section>
        ))}
      </section>
      <footer className="lim-results-footer">
        <p>
          {reading.source === "x18_test"
            ? "قيم اختبار مولّدة عشوائيًا ومرفوعة عبر رابط بيانات X18، وليست نتيجة من جهاز فعلي."
            : "القياسات تقديرية. التصنيف حسب المدى الموضح أو تقييم الجهاز عند غيابه. اليمين واليسار من منظور صاحب القياس."}
        </p>
        <span>
          رقم التحليل: <bdi>{reading.recordNo ?? "—"}</bdi>
        </span>
      </footer>
    </section>
  );
}
