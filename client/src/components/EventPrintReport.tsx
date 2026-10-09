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

type Care = {
  advice: string | null;
  doctorName: string | null;
  consultationMode?: "physician" | "automatic";
  nursingCompletedAt?: unknown;
  measurements: Measurements;
  nurseNotes?: string | null;
};

function PrintHeading({ participant }: { participant: EventParticipantIdentity & { code: string } }) {
  return (
    <header className="lim-print-heading" data-pdf-keep>
      <LimLogo />
      <div>
        <h1>تقرير رحلتك الصحية</h1>
        <p>{participant.firstName || "المشارك"} · <bdi>{participant.code}</bdi></p>
      </div>
      <span>فعاليات LIM</span>
    </header>
  );
}

function AdvicePanel({ care }: { care: Care }) {
  return (
    <section className="lim-print-panel lim-print-advice" data-pdf-keep>
      <h2>
        {care.consultationMode === "automatic"
          ? "توصيات لنمط حياة صحي"
          : <>توصيات الطبيب <span>{care.doctorName}</span></>}
      </h2>
      <div data-doctor-advice>
        {(care.advice || "لم تُضف توصيات.").split("\n").map((line, index) => (
          <span className="lim-print-advice-line" data-pdf-keep key={index}>{line || " "}</span>
        ))}
      </div>
    </section>
  );
}

function NursingPanel({ care }: { care: Care }) {
  if (!care.nursingCompletedAt) return null;
  return (
    <section className="lim-print-panel lim-print-nursing-panel" data-pdf-keep>
      <h2>قياسات التمريض</h2>
      <dl className="lim-print-nursing">
        {Object.entries(care.measurements).flatMap(([id, values]) => {
          const test = nursingCatalog.find(item => item.id === id);
          return Object.entries(values)
            .filter(([, value]) => value !== "")
            .map(([key, value]) => {
              const field = test?.fields.find(item => item.key === key);
              return (
                <div key={`${id}-${key}`} data-pdf-keep>
                  <dt>{test?.name ?? id} — {field?.label ?? key}</dt>
                  <dd><bdi>{value} {field?.unit}</bdi></dd>
                </div>
              );
            });
        })}
      </dl>
      {care.nurseNotes && <p className="lim-print-notes">{care.nurseNotes}</p>}
    </section>
  );
}

function Disclaimer() {
  return <footer className="lim-print-disclaimer">نتائج التقييم والقياسات كما سُجلت؛ لا تُعد تشخيصًا طبيًا بمفردها.</footer>;
}

export default function EventPrintReport({
  participant,
  readings,
  answers,
  lifestyleEnabled,
  care,
}: {
  participant: EventParticipantIdentity & { code: string };
  readings: DashboardReading[];
  answers: EventAnswers;
  lifestyleEnabled: boolean;
  care: Care;
}) {
  return (
    <article data-print-report className="lim-print-report" dir="rtl" aria-hidden="true">
      {lifestyleEnabled && (
        <section className="lim-print-logical-page lim-print-questionnaire-page" data-pdf-logical-page="questionnaire">
          <PrintHeading participant={participant} />
          <AdvicePanel care={care} />
          <EventLifestyleCharts answers={answers} compact />
          <Disclaimer />
        </section>
      )}
      <section className="lim-print-logical-page lim-print-body-page" data-pdf-logical-page="body">
        {!lifestyleEnabled && <PrintHeading participant={participant} />}
        {!lifestyleEnabled && <AdvicePanel care={care} />}
        <EventBodyResults readings={readings} participant={participant} />
        <NursingPanel care={care} />
        <Disclaimer />
      </section>
    </article>
  );
}
