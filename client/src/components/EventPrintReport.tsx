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
  care: {
    advice: string | null;
    doctorName: string | null;
    nursingCompletedAt?: unknown;
    measurements: Measurements;
    nurseNotes?: string | null;
  };
}) {
  return (
    <article
      data-print-report
      className="lim-print-report"
      dir="rtl"
      aria-hidden="true"
    >
      <header className="lim-print-heading" data-pdf-keep>
        <LimLogo />
        <div>
          <h1>تقرير رحلتك الصحية</h1>
          <p>
            {participant.firstName || "المشارك"} · <bdi>{participant.code}</bdi>
          </p>
        </div>
        <span>فعاليات LIM</span>
      </header>
      <EventBodyResults readings={readings} participant={participant} />
      <div className="lim-print-columns">
        {lifestyleEnabled && <EventLifestyleCharts answers={answers} compact />}
        {Boolean(care.nursingCompletedAt) && (
          <section className="lim-print-panel">
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
                        <dt>
                          {test?.name ?? id} — {field?.label ?? key}
                        </dt>
                        <dd>
                          <bdi>
                            {value} {field?.unit}
                          </bdi>
                        </dd>
                      </div>
                    );
                  });
              })}
            </dl>
            {care.nurseNotes && (
              <p className="lim-print-notes">{care.nurseNotes}</p>
            )}
          </section>
        )}
      </div>
      <section className="lim-print-panel lim-print-advice">
        <h2>
          توصيات الطبيب <span>{care.doctorName}</span>
        </h2>
        <div data-doctor-advice>
          {(care.advice || "لم تُضف توصيات.").split("\n").map((line, index) => (
            <span className="lim-print-advice-line" data-pdf-keep key={index}>
              {line || " "}
            </span>
          ))}
        </div>
      </section>
      <footer className="lim-print-disclaimer">
        نتائج التقييم والقياسات كما سُجلت؛ لا تُعد تشخيصًا طبيًا بمفردها.
      </footer>
    </article>
  );
}
