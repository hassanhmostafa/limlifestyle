import { useEventLocale } from "@/contexts/EventLocale";
import React from "react";
import { CalendarDays } from "lucide-react";
import type { DashboardReading } from "@/components/BodyCompositionReport";
import {
  eventBodyFields,
  eventMetricBackground,
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
  phone?: string | null;
  mobile?: string | null;
  age?: number | null;
  sex?: string | null;
};
export function eventReadingDate(
  value: Date | string,
  language: "ar" | "en" = "ar"
) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "وقت القياس غير متوفر"
    : date.toLocaleString(language === "ar" ? "ar-SA" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Riyadh",
        calendar: "gregory",
      });
}
const metricIconSources = {
  height: "/brand/metrics/height.png",
  weight: "/brand/metrics/weight.png",
  bmi: "/brand/metrics/bmi.png",
  fatRate: "/brand/metrics/fatRate.png",
  skeletalMuscle: "/brand/metrics/skeletalMuscle.png",
  vfal: "/brand/metrics/vfal.png",
  whr: "/brand/metrics/whr.png",
  bodyAge: "/brand/metrics/bodyAge.png",
};

function MetricCard({
  field,
  values,
}: {
  field: EventResultField;
  values: Record<string, string>;
}) {
  const { t } = useEventLocale();
  const [key, label, unit] = field;
  const value = eventNumeric(values[key]);
  const status = eventMetricStatus(values, key);
  const reference = eventMetricReference(values, key);
  const iconSource = metricIconSources[key as keyof typeof metricIconSources];
  return (
    <article
      data-body-metric={key}
      style={{ background: eventMetricBackground(values, key) }}
      className={`lim-result-metric${status ? ` lim-result-metric-status-${status.code}` : ""}`}
    >
      <img
        className="lim-metric-icon"
        src={iconSource}
        alt=""
        aria-hidden="true"
      />
      <p>{t(label)}</p>
      <div className="lim-result-value">
        <strong dir="ltr">
          {t(
            value?.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? "—"
          )}
        </strong>
        {value !== null && unit && <small>{t(unit)}</small>}
      </div>
      {value === null ? (
        <span className="lim-result-unavailable">{t("غير متوفر")}</span>
      ) : status ? (
        <span className={`lim-result-status lim-result-status-${status.code}`}>
          {t(status.label)}
        </span>
      ) : key === "bodyAge" ? (
        <span className="lim-result-status lim-result-status-neutral">
          {t("تقدير الجهاز")}
        </span>
      ) : null}
      {value !== null && reference && (
        <span className="lim-result-reference">
          {t(reference.label)}: <bdi dir="ltr">{t(reference.value)}</bdi>
          {t(unit ? ` ${unit}` : "")}
        </span>
      )}
      {value !== null &&
        !reference &&
        key !== "height" &&
        key !== "bodyAge" && (
          <span className="lim-result-reference">
            {t("المدى الطبيعي غير متوفر")}
          </span>
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
  const { t, language, direction } = useEventLocale();
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
      dir={direction}
    >
      <header className="lim-results-header">
        <LimLogo />
        <div className="lim-results-title">
          <span>
            {t(
              reading.source === "x18_test"
                ? t("بيانات اختبار")
                : t("نتائج جهاز القياس")
            )}
          </span>
          <h2>{t("نتائج تحليل الجسم")}</h2>
          <p>
            <CalendarDays size={14} />
            {t(eventReadingDate(reading.recordedAt, language))}
          </p>
          <p className="lim-results-participant">
            {name && <b>{name}</b>}
            {(participant?.mobile || participant?.phone) && (
              <span data-participant-phone>
                {t("الجوال: ")}
                <bdi dir="ltr">
                  {t(participant.mobile || participant.phone)}
                </bdi>
              </span>
            )}
            {age != null && (
              <span>
                {t(age)}{t(" سنة")}
              </span>
            )}
            {sexLabel && <span>{t(sexLabel)}</span>}
          </p>
        </div>
      </header>
      <div className="lim-top-metrics">
        {eventBodyFields.map(field => (
          <MetricCard key={field[0]} field={field} values={values} />
        ))}
      </div>
      <section
        className="lim-distributions"
        aria-label={t("توزيع الدهون والعضلات")}
      >
        {(["muscle", "fat"] as const).map(mode => (
          <section
            key={mode}
            data-pdf-keep
            className={`lim-results-card lim-distribution-${mode}`}
          >
            <h3>
              {t(
                mode === "muscle"
                  ? t("توزيع العضلات بالجسم")
                  : t("توزيع الدهون بالجسم")
              )}
            </h3>
            <LIMAnatomyDistribution
              mode={mode}
              values={values}
              language={language}
            />
          </section>
        ))}
      </section>
      <footer className="lim-results-footer">
        <p>
          {t(
            reading.source === "x18_test"
              ? t(
                  "قيم اختبار مولّدة عشوائيًا ومرفوعة عبر رابط بيانات X18، وليست نتيجة من جهاز فعلي."
                )
              : t(
                  "القياسات تقديرية. التصنيف حسب المدى الموضح أو تقييم الجهاز عند غيابه. اليمين واليسار من منظور صاحب القياس."
                )
          )}
          <span className="lim-footer-legend">
           {t(" ")}
            {t(
              "الأخضر: طبيعي؛ البرتقالي إلى الأحمر: ابتعاد عن المدى فقط، وليس شدة حالة."
            )}
          </span>
        </p>
        <span>
          {t("رقم التحليل:")}
          <bdi>{t(reading.recordNo ?? "—")}</bdi>
        </span>
      </footer>
    </section>
  );
}
