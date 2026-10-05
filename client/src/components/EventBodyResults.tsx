import EventPdfButton from "@/components/EventPdfButton";
import React, { useState } from "react";
import { CalendarDays, Flame, HeartPulse, Scale, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardReading } from "@/components/BodyCompositionReport";
import {
  eventAdultWeightRange,
  eventMuscleBalance,
  eventNumeric,
  eventReadingValues,
  eventReferenceRange,
  eventResultCategories,
  type EventResultField,
} from "@/lib/eventResultsData";
import { LIMAnatomyDistribution } from "@/components/LIMAnatomyDistribution";
import "@/styles/event-results.css";

type Mode = "muscle" | "fat";
type MetricReference = { value: string; label: string };
type MetricStatus = { code: "0" | "1" | "2"; label: string };

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
  return parsed === null
    ? null
    : parsed.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function statusForMetric(
  values: Record<string, string>,
  key: string
): MetricStatus | null {
  const deviceStatus = values[`${key}_s`];
  if (deviceStatus === "0" || deviceStatus === "1" || deviceStatus === "2") {
    return {
      code: deviceStatus,
      label:
        deviceStatus === "0"
          ? "أقل من مرجع الجهاز"
          : deviceStatus === "1"
            ? "ضمن مرجع الجهاز"
            : "أعلى من مرجع الجهاز",
    };
  }

  const value = eventNumeric(values[key]);
  const fallbackRange =
    key === "weight"
      ? eventAdultWeightRange(values.height)
      : key === "bmi"
        ? "18.5 - 24.9"
        : null;
  const bounds = fallbackRange?.split("-").map(part => eventNumeric(part));
  if (
    value === null ||
    !bounds ||
    bounds.length !== 2 ||
    bounds[0] === null ||
    bounds[1] === null
  )
    return null;
  const code = value < bounds[0] ? "0" : value > bounds[1] ? "2" : "1";
  return {
    code,
    label:
      code === "0"
        ? "أقل من النطاق الإرشادي"
        : code === "1"
          ? "ضمن النطاق الإرشادي"
          : "أعلى من النطاق الإرشادي",
  };
}

function referenceForMetric(
  values: Record<string, string>,
  key: string
): MetricReference | null {
  const deviceRange = eventReferenceRange(values, key);
  if (deviceRange) return { value: deviceRange, label: "المدى المرجعي للجهاز" };
  if (key === "weight") {
    const calculatedRange = eventAdultWeightRange(values.height);
    return calculatedRange
      ? { value: calculatedRange, label: "النطاق الإرشادي حسب الطول" }
      : null;
  }
  if (key === "bmi")
    return { value: "18.5 - 24.9", label: "النطاق الإرشادي للبالغين" };
  return null;
}

function MetricCard({
  field,
  values,
  tone = "soft",
  neutral = false,
}: {
  field: EventResultField;
  values: Record<string, string>;
  tone?: "dark" | "soft";
  neutral?: boolean;
}) {
  const [key, label, unit] = field;
  const value = formatValue(values[key]);
  const status = neutral ? null : statusForMetric(values, key);
  const reference = neutral ? null : referenceForMetric(values, key);
  return (
    <article
      className={`lim-result-metric lim-result-metric-${tone}${status ? ` lim-result-metric-status-${status.code}` : ""}`}
    >
      <p>{label}</p>
      <div className="lim-result-value">
        <strong dir="ltr">{value ?? "—"}</strong>
        {value !== null && unit && <small>{unit}</small>}
      </div>
      {value === null ? (
        <span className="lim-result-unavailable">غير متوفر</span>
      ) : neutral ? (
        <span className="lim-result-status lim-result-status-neutral">
          قيمة تقديرية
        </span>
      ) : status ? (
        <span className={`lim-result-status lim-result-status-${status.code}`}>
          {status.label}
        </span>
      ) : null}
      {value !== null && reference && (
        <span className="lim-result-reference">
          {reference.label}: <bdi dir="ltr">{reference.value}</bdi>
          {unit ? ` ${unit}` : ""}
        </span>
      )}
    </article>
  );
}

function MuscleBalanceCard({ values }: { values: Record<string, string> }) {
  const balance = eventMuscleBalance(values);
  if (!balance) {
    return (
      <article className="lim-result-metric lim-muscle-balance">
        <span className="lim-balance-icon">
          <Scale />
        </span>
        <p>توازن العضلات</p>
        <div className="lim-result-value">
          <strong>—</strong>
        </div>
        <span className="lim-result-unavailable">
          القياسات القطاعية غير مكتملة
        </span>
      </article>
    );
  }

  const differenceDetails = [
    balance.armsDifference !== null
      ? `الذراعان ${balance.armsDifference}%`
      : null,
    balance.legsDifference !== null
      ? `الساقان ${balance.legsDifference}%`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`lim-result-metric lim-muscle-balance lim-muscle-balance-${balance.isClose ? "close" : "review"}`}
    >
      <span className="lim-balance-icon">
        <Scale />
      </span>
      <p>توازن العضلات</p>
      <div className="lim-result-value">
        <strong>{balance.isClose ? "متقارب" : "يحتاج مراجعة"}</strong>
      </div>
      <span
        className={`lim-result-status lim-result-status-${balance.isClose ? "1" : "2"}`}
      >
        أكبر فرق <bdi dir="ltr">{balance.maximumDifference}%</bdi>
      </span>
      <span className="lim-result-reference">{differenceDetails}</span>
      <small className="lim-balance-method">
        مقارنة اليمين واليسار نسبةً إلى الجانب الأعلى؛ حد العرض 10%، وليست
        تشخيصًا.
      </small>
    </article>
  );
}

/**
 * Participant-facing Events body-composition report. Only the measurements
 * approved for health-education events are shown; every other raw X18 field
 * stays available to the clinical data layer but is intentionally omitted.
 */
export function EventBodyResults({
  readings,
  participant,
}: {
  readings: DashboardReading[];
  participant?: EventParticipantIdentity;
}) {
  const [mode, setMode] = useState<Mode>("muscle");
  const reading = readings[0];
  if (!reading) return null;

  const values = eventReadingValues(reading);
  // A physical X18 report is authoritative whenever it supplies demographics.
  // Events still shows the check-in form identity when the device intentionally
  // leaves a field empty, so a participant never sees a blank report header.
  const participantName =
    reading.patientName?.trim() || participant?.firstName?.trim() || null;
  const participantAge = reading.patientAge ?? participant?.age ?? null;
  const participantSex = reading.patientSex ?? participant?.sex ?? null;
  const participantSexLabel =
    participantSex === "1" || participantSex === "male"
      ? "ذكر"
      : participantSex === "2" || participantSex === "female"
        ? "أنثى"
        : participantSex || null;
  const bmr = formatValue(values.bmr);

  return (
    <section data-pdf-report className="lim-results-page" dir="rtl">
      <header className="lim-results-header">
        <div className="lim-results-brand" aria-label="ليم LIM">
          <span>
            <HeartPulse size={22} />
          </span>
          <b>
            ليم <em>LIM</em>
          </b>
        </div>
        <div className="lim-results-title">
          <span>
            {reading.source === "x18_test"
              ? "بيانات اختبار"
              : "نتائج جهاز القياس"}
          </span>
          <h2>نتائج تحليل الجسم</h2>
          <p>
            <CalendarDays size={16} />
            {eventReadingDate(reading.recordedAt)}
          </p>
          {(participantName ||
            participantAge !== null ||
            participantSexLabel) && (
            <p className="lim-results-participant">
              {participantName && <b>{participantName}</b>}
              {participantAge !== null && <span>{participantAge} سنة</span>}
              {participantSexLabel && <span>{participantSexLabel}</span>}
            </p>
          )}
        </div>
        <EventPdfButton
          className="lim-download-button lim-print-hide"
          filename="lim-body-results.pdf"
        />
      </header>

      <div className="lim-top-metrics">
        {eventResultCategories.primary.map(field => (
          <MetricCard
            key={field[0]}
            field={field}
            values={values}
            tone="dark"
          />
        ))}
      </div>

      <section
        className={`lim-results-card lim-distribution-card lim-distribution-${mode}`}
      >
        <div className="lim-card-heading">
          <h3>توزيع الدهون والعضلات</h3>
          {participantSexLabel && (
            <span>بيانات القياس: {participantSexLabel}</span>
          )}
        </div>
        <Tabs value={mode} onValueChange={value => setMode(value as Mode)}>
          <TabsList className="lim-distribution-tabs">
            <TabsTrigger value="muscle">العضلات</TabsTrigger>
            <TabsTrigger value="fat">الدهون</TabsTrigger>
          </TabsList>
        </Tabs>
        <LIMAnatomyDistribution mode={mode} values={values} language="ar" />
        <p className="lim-anatomy-note">
          رسم توضيحي لتوزيع القياسات القطاعية؛ اليمين واليسار من منظور صاحب
          القياس.
        </p>
      </section>

      <section className="lim-results-card">
        <h3>المؤشرات المعتمدة</h3>
        <div className="lim-indicators-grid">
          {eventResultCategories.indicators.map(field => (
            <MetricCard
              key={field[0]}
              field={field}
              values={values}
              neutral={field[0] === "bodyAge"}
            />
          ))}
          <MuscleBalanceCard values={values} />
        </div>
      </section>

      <section className="lim-results-card lim-metabolism-card">
        <h3>الحرق ومؤشرات إضافية</h3>
        <div className="lim-bmr-banner">
          <span className="lim-bmr-icon">
            <Flame />
          </span>
          <div>
            <p>معدل الأيض الأساسي</p>
            <strong dir="ltr">{bmr ?? "—"}</strong>
            <small>{bmr === null ? "غير متوفر" : "سعرة / يوم"}</small>
          </div>
          <div className="lim-bmr-explanation">
            <span className="lim-result-status lim-result-status-neutral">
              قيمة تقديرية
            </span>
            <p>
              تقدير للطاقة التي يستهلكها الجسم في الراحة، وليس هدفًا يوميًا
              للسعرات.
            </p>
          </div>
        </div>
      </section>

      <footer className="lim-results-footer">
        <Sparkles size={17} />
        <p>
          {reading.source === "x18_test"
            ? "قيم اختبار مولّدة عشوائيًا ومرفوعة عبر رابط بيانات X18، وليست نتيجة من جهاز فعلي."
            : "ألوان التصنيف والمدى المرجعي مأخوذة من الجهاز عند توفرها. يُستخدم نطاق BMI للبالغين ونطاق الوزن المحسوب حسب الطول فقط عند غياب مرجع الجهاز. جميع القياسات تقديرية وتُراجع مع المختص."}
        </p>
        <span>
          رقم التحليل: <bdi>{reading.recordNo ?? "—"}</bdi>
        </span>
      </footer>
    </section>
  );
}
