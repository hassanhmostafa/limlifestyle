import React from "react";
import type { EventAnswers } from "@/lib/eventLifestyle";
import {
  lifestyleDomains,
  lifestyleReport,
  lifestyleScoreBands,
  type LifestylePillarInsight,
} from "@shared/eventLifestyleInsights";

function clampScore(value: unknown, maximum = 10) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(maximum, numeric));
}

function SummaryScore({
  label,
  value,
  copy,
}: {
  label: string;
  value: number;
  copy: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dbe8e4] bg-[#f8fbfa] p-3 text-center">
      <p className="text-xs font-bold text-[#607b74]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#153f38]" dir="ltr">
        {value} <span className="text-xs font-bold text-[#769089]">/ 10</span>
      </p>
      <p className="mt-1 text-[11px] leading-5 text-[#708780]">{copy}</p>
    </div>
  );
}

function ScoreCard({ score, label }: { score: number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#123f37] px-3 py-3 text-center text-white" data-lifestyle-score-card>
      <p className="text-[11px] font-bold text-[#cfe1dc]">المؤشر العام</p>
      <p className="mt-0.5 text-3xl font-black" dir="ltr">
        {score}
        <span className="text-xs font-bold text-[#cfe1dc]"> / 100</span>
      </p>
      <p className="mt-1 text-[11px] font-bold leading-4 text-[#dff33d]">{label}</p>
    </div>
  );
}

export function LifestyleBandReference({ score }: { score: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#dbe8e4] bg-[#fbfdfc] p-2" data-lifestyle-reference>
      <p className="mb-1 px-1 text-[10px] font-black text-[#56746c]">مرجع المؤشر العام</p>
      <table className="w-full border-separate border-spacing-y-1 text-right text-[10px] leading-4">
        <tbody>
          {lifestyleScoreBands.map(band => {
            const active = score >= band.min && score <= band.max;
            return (
              <tr
                key={band.min}
                aria-current={active ? "true" : undefined}
                className={active ? "font-black" : "text-[#5e756f]"}
                style={{ background: active ? band.background : "transparent", color: active ? band.color : undefined }}
              >
                <td className="rounded-r-lg px-1.5 py-1.5 font-bold" dir="ltr">
                  {band.min}–{band.max}
                </td>
                <td className="rounded-l-lg px-1.5 py-1.5">{band.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PillarBars({ insights }: { insights: LifestylePillarInsight[] }) {
  return (
    <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2" data-lifestyle-pillars>
      {insights.map(insight => (
        <div key={insight.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-[#365b53]">{insight.label}</span>
            <strong className="text-[#153f38]" dir="ltr">{insight.score} / 10</strong>
          </div>
          <div
            role="meter"
            aria-label={insight.label}
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={insight.score}
            className="h-2.5 overflow-hidden rounded-full bg-[#e8efed]"
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, insight.score * 10))}%`,
                backgroundColor: lifestyleDomains.find(domain => domain.key === insight.key)?.color,
              }}
              className="h-full rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LifestyleImprovementTable({ insights }: { insights: LifestylePillarInsight[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e2ece9]" data-lifestyle-improvements>
      <table className="w-full table-fixed border-collapse text-right text-[11px] leading-5 sm:text-xs">
        <thead className="bg-[#eef7f4] text-[#1b5d51]">
          <tr>
            <th className="w-[24%] px-2 py-2 text-right font-black">الركيزة</th>
            <th className="w-[15%] px-2 py-2 text-center font-black">الدرجة</th>
            <th className="w-[61%] px-2 py-2 text-right font-black">جوانب التحسين بناء على إجاباتك</th>
          </tr>
        </thead>
        <tbody>
          {insights.map(insight => (
            <tr key={insight.key} className="border-t border-[#e6eeeb] align-top">
              <td className="px-2 py-2 font-bold text-[#315c52]">{insight.label}</td>
              <td className="px-2 py-2 text-center font-black text-[#163f38]" dir="ltr">{insight.score}/10</td>
              <td className={`px-2 py-2 ${insight.state === "missing" ? "text-[#6f817c]" : "text-[#4b6962]"}`}>
                {insight.explanation}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncompleteLifestyle({ compact }: { compact: boolean }) {
  return (
    <section className={compact ? "lim-print-panel" : "rounded-2xl bg-white p-5"} data-lifestyle-incomplete>
      <h2 className={compact ? undefined : "font-bold"}>نتائج استبيان نمط الحياة</h2>
      <p className="mt-3 text-slate-600">
        الاستبيان مفعّل لهذه الزيارة، لكن الإجابات غير مكتملة؛ لذلك لا تظهر درجات أو جوانب تحسين مكتملة.
      </p>
    </section>
  );
}

export default function EventLifestyleCharts({
  answers,
  compact = false,
}: {
  answers: EventAnswers;
  compact?: boolean;
}) {
  const report = lifestyleReport(answers);
  if (!report.complete) return <IncompleteLifestyle compact={compact} />;

  const importance = clampScore(answers.importance);
  const confidence = clampScore(answers.confidence);
  const readiness = clampScore(report.score.readiness);

  if (compact)
    return (
      <section className="lim-print-panel lim-print-lifestyle" data-pdf-keep>
        <div className="lim-print-lifestyle-score">
          <ScoreCard score={report.score.overall} label={report.band.label} />
          <LifestyleBandReference score={report.score.overall} />
        </div>
        <div className="mt-2">
          <h2>نتائج استبيان نمط الحياة</h2>
          <p className="lim-print-band">{report.band.label}</p>
          <PillarBars insights={report.insights} />
        </div>
        <section className="mt-3" data-pdf-keep>
          <h3 className="mb-2 text-[12px] font-black text-[#153f38]">جوانب التحسين بناء على إجاباتك</h3>
          <LifestyleImprovementTable insights={report.insights} />
        </section>
        <p className="mt-2 text-[9px] text-[#5c7168]">
          المؤشر والملخص توعويان مبنيان على الإجابات المسجلة، ولا يُعدان تشخيصًا طبيًا.
        </p>
      </section>
    );

  return (
    <section
      data-pdf-keep
      aria-label="ملخص نتائج نمط الحياة"
      className="rounded-[28px] border border-[#dce9e5] bg-white p-5 shadow-[0_10px_30px_rgba(18,58,52,.06)] print:break-inside-avoid print:border-slate-300 print:p-4 print:shadow-none"
    >
      <div className="border-b border-[#e2ece9] pb-4">
        <p className="text-xs font-bold text-[#197f6f]">ملخص الصحة الشاملة</p>
        <h2 className="mt-1 text-xl font-black text-[#153f38]">نتائج استبيان نمط الحياة</h2>
        <p className="mt-1 text-xs leading-5 text-[#6e8580]">صورة مبسطة تساعدك على اختيار الخطوة الصحية التالية.</p>
        <div data-lifestyle-score-overview className="mt-4 grid grid-cols-[minmax(0,1fr)_112px] items-start gap-2.5" dir="rtl">
          <ScoreCard score={report.score.overall} label={report.band.label} />
          <LifestyleBandReference score={report.score.overall} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SummaryScore label="أهمية التغيير" value={importance} copy="مدى أهمية التحسين لك" />
        <SummaryScore label="الثقة بالقدرة" value={confidence} copy="ثقتك بقدرتك على التغيير" />
        <SummaryScore label="الاستعداد" value={readiness} copy="متوسط الأهمية والثقة" />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black text-[#153f38]">المحاور الستة</h3>
        <div className="mt-3"><PillarBars insights={report.insights} /></div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black text-[#153f38]">جوانب التحسين بناء على إجاباتك</h3>
        <div className="mt-3"><LifestyleImprovementTable insights={report.insights} /></div>
      </div>

      <p className="mt-4 border-t border-[#e2ece9] pt-3 text-[11px] leading-5 text-[#718680]">
        هذا ملخص توعوي مبني على إجاباتك، ولا يُعد تشخيصًا طبيًا أو بديلًا عن تقييم المختص. لا يعرض الملخص إجاباتك الحساسة بالتفصيل.
      </p>
    </section>
  );
}
