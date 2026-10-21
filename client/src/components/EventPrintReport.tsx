import { useEventLocale } from "@/contexts/EventLocale";
import React from "react";
import type { DashboardReading } from "@/components/BodyCompositionReport";
import {
  EventBodyResults,
  type EventParticipantIdentity,
} from "./EventBodyResults";
import EventLifestyleCharts from "./EventLifestyleCharts";
import LimLogo from "./LimLogo";
import type { EventAnswers } from "@/lib/eventLifestyle";
import type { Measurements } from "@shared/eventCare";
import { nursingCatalog } from "@shared/eventNursing";
import { lifestyleReport } from "@shared/eventLifestyleInsights";
import {
  eventReportDate,
  type EventReportProvenance,
} from "@shared/eventReportArchive";

type Care = {
  advice: string | null;
  doctorName: string | null;
  consultationMode?: "physician" | "automatic";
  nursingCompletedAt?: unknown;
  measurements: Measurements;
  nurseNotes?: string | null;
};

function PrintHeading({
  participant,
  provenance,
}: {
  participant: EventParticipantIdentity & { code: string };
  provenance?: EventReportProvenance;
}) {
  const { t } = useEventLocale();
  return (
    <header className="lim-print-heading" data-pdf-keep>
      <LimLogo />
      <div>
        <h1>{t("تقرير رحلتك الصحية")}</h1>
        <p>
          {t(participant.firstName || "المشارك")} ·{" "}
          <bdi>{t(participant.code)}</bdi>
        </p>
        {(participant.mobile || participant.phone) && (
          <p data-participant-phone>
            {t("الجوال: ")}
            <bdi dir="ltr">{t(participant.mobile || participant.phone)}</bdi>
          </p>
        )}
      </div>
      <span>
        {provenance ? (
          <>
            <b>
              {t("أُعيد توليده · ")}
              {t(eventReportDate(provenance.generatedAt))}
            </b>
            <br />
            <small dir="ltr">
              {t(provenance.templateVersion)} · r{t(provenance.reportRevision)}
            </small>
          </>
        ) : (
          t("فعاليات LIM")
        )}
      </span>
    </header>
  );
}

function AdvicePanel({ care }: { care: Care }) {
  const { t } = useEventLocale();
  return (
    <section className="lim-print-panel lim-print-advice" data-pdf-keep>
      <h2>
        {care.consultationMode === "automatic" ? (
          t("توصيات لنمط حياة صحي")
        ) : (
          <>
            {t("توصيات الطبيب ")}
            <span>{care.doctorName}</span>
          </>
        )}
      </h2>
      <div data-doctor-advice>
        {(care.advice || "لم تُضف توصيات.").split("\n").map((line, index) => (
          <span className="lim-print-advice-line" data-pdf-keep key={index}>
            {t(line || " ")}
          </span>
        ))}
      </div>
    </section>
  );
}

function NursingPanel({ care }: { care: Care }) {
  const { t } = useEventLocale();
  if (!care.nursingCompletedAt) return null;
  return (
    <section className="lim-print-panel lim-print-nursing-panel" data-pdf-keep>
      <h2>{t("قياسات التمريض")}</h2>
      <dl className="lim-print-nursing">
        {Object.entries(care.measurements).flatMap(([id, values]) => {
          const test = nursingCatalog.find(item => item.id === id);
          return Object.entries(values)
            .filter(([, value]) => value !== "")
            .map(([key, value]) => {
              const field = test?.fields.find(item => item.key === key);
              return (
                <div key={`${id}-${key}`} data-pdf-keep>
                  <dt>
                    {t(test?.name ?? id)} — {t(field?.label ?? key)}
                  </dt>
                  <dd>
                    <bdi>
                      {t(value)} {t(field?.unit)}
                    </bdi>
                  </dd>
                </div>
              );
            });
        })}
      </dl>
      {care.nurseNotes && (
        <p className="lim-print-notes">{t(care.nurseNotes)}</p>
      )}
    </section>
  );
}

function Disclaimer() {
  const { t } = useEventLocale();
  return (
    <footer className="lim-print-disclaimer">
      {t("نتائج التقييم والقياسات كما سُجلت؛ لا تُعد تشخيصًا طبيًا بمفردها.")}
    </footer>
  );
}

export default function EventPrintReport({
  participant,
  readings,
  answers,
  lifestyleEnabled,
  care,
  frozenLifestyleReport,
  provenance,
}: {
  participant: EventParticipantIdentity & { code: string };
  readings: DashboardReading[];
  answers: EventAnswers;
  lifestyleEnabled: boolean;
  care: Care;
  frozenLifestyleReport?: ReturnType<typeof lifestyleReport>;
  provenance?: EventReportProvenance;
}) {
  const { language, direction } = useEventLocale();
  return (
    <article
      translate="no"
      lang={language}
      data-print-report
      data-lifestyle-enabled={lifestyleEnabled ? "true" : "false"}
      className="lim-print-report"
      dir={direction}
      aria-hidden="true"
    >
      {lifestyleEnabled && (
        <section
          className="lim-print-logical-page lim-print-questionnaire-page"
          data-pdf-logical-page="questionnaire"
        >
          <PrintHeading participant={participant} provenance={provenance} />
          <AdvicePanel care={care} />
          <EventLifestyleCharts
            answers={answers}
            compact
            frozenReport={frozenLifestyleReport}
          />
        </section>
      )}
      <section
        className="lim-print-logical-page lim-print-body-page"
        data-pdf-logical-page="body"
      >
        {!lifestyleEnabled && (
          <PrintHeading participant={participant} provenance={provenance} />
        )}
        {!lifestyleEnabled && <AdvicePanel care={care} />}
        <EventBodyResults readings={readings} participant={participant} />
        <NursingPanel care={care} />
        <Disclaimer />
      </section>
    </article>
  );
}
