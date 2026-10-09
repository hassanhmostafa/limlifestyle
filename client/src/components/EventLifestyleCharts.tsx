import React from "react";
import type { EventAnswers } from "@/lib/eventLifestyle";
import {
  lifestyleDomains,
  lifestyleReport,
  lifestyleScoreBands,
  type LifestyleNextStep,
  type LifestylePillarInsight,
  type LifestyleStrength,
} from "@shared/eventLifestyleInsights";

function clampScore(value: unknown, maximum = 10) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(maximum, numeric));
}

function SummaryScore({ label, value, copy }: { label: string; value: number; copy: string }) {
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

function ScoreCard({ score, band }: { score: number; band: (typeof lifestyleScoreBands)[number] }) {
  return (
    <div
      className="min-w-0 rounded-2xl px-3 py-3 text-center text-white"
      style={{ background: band.cardBackground }}
      data-lifestyle-score-card
      data-lifestyle-band={band.min}
    >
      <p className="text-[11px] font-bold text-white/85">المؤشر العام</p>
      <p className="mt-0.5 text-3xl font-black" dir="ltr">
        {score}
        <span className="text-xs font-bold text-white/85"> / 100</span>
      </p>
      <p className="mt-1 text-[11px] font-black leading-4 text-white">{band.label}</p>
    </div>
  );
}

/** Shared colored legend for screen and PDF. Every row stays visibly band-coded. */
export function LifestyleBandReference({ score }: { score: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#dbe8e4] bg-[#fbfdfc] p-2" data-lifestyle-reference>
      <p className="mb-1 px-1 text-[10px] font-black text-[#56746c]">مرجع المؤشر العام</p>
      <div className="grid gap-1" role="list">
        {lifestyleScoreBands.map(band => {
          const active = score >= band.min && score <= band.max;
          return (
            <div
              key={band.min}
              role="listitem"
              aria-current={active ? "true" : undefined}
              className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px] leading-4"
              style={{ background: band.background, color: band.color, outline: active ? `2px solid ${band.color}` : "1px solid transparent" }}
              data-lifestyle-band-row={band.min}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: band.color }} aria-hidden="true" />
              <bdi className="font-black whitespace-nowrap" dir="ltr">{band.min}–{band.max}</bdi>
              <span className="min-w-0 font-bold">{band.label}</span>
              {active && <span className="font-black" aria-label="الفئة المختارة">✓</span>}
            </div>
          );
        })}
      </div>
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
          <div role="meter" aria-label={insight.label} aria-valuemin={0} aria-valuemax={10} aria-valuenow={insight.score} className="h-2.5 overflow-hidden rounded-full bg-[#e8efed]">
            <div
              style={{ width: `${Math.max(0, Math.min(100, insight.score * 10))}%`, backgroundColor: lifestyleDomains.find(domain => domain.key === insight.key)?.color }}
              className="h-full rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Readable cards on mobile and a compact three-column list in PDF/desktop. */
export function LifestyleImprovementList({ insights }: { insights: LifestylePillarInsight[] }) {
  return (
    <div className="grid gap-2" data-lifestyle-improvements>
      {insights.map(insight => (
        <article key={insight.key} className="grid grid-cols-[minmax(92px,24%)_48px_minmax(0,1fr)] items-start gap-2 rounded-xl border border-[#e2ece9] bg-white px-2.5 py-2.5" data-lifestyle-improvement={insight.key}>
          <strong className="text-[13px] leading-5 text-[#315c52]">{insight.label}</strong>
          <span className="rounded-md bg-[#f0f6f4] px-1 py-0.5 text-center text-[11px] font-black text-[#163f38]" dir="ltr">{insight.score}/10</span>
          <div className={insight.state === "missing" ? "text-[#6f817c]" : "text-[#4b6962]"}>
            {insight.state === "finding" ? (
              <ul className="grid list-disc gap-1 pr-4 text-[14px] leading-6 marker:text-[#197f6f]">
                {insight.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}
              </ul>
            ) : (
              <p className="text-[14px] leading-6">{insight.bullets[0]}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function StrengthsPanel({ strengths, compact }: { strengths: LifestyleStrength[]; compact: boolean }) {
  if (!strengths.length) return null;
  return (
    <section className={compact ? "lim-print-strengths" : "rounded-2xl border border-[#dbe8e4] bg-[#f6fbf8] p-4"} data-lifestyle-strengths>
      <h3 className={compact ? "text-[12px] font-black text-[#153f38]" : "text-sm font-black text-[#153f38]"}>نقاط القوة في نمط حياتك</h3>
      <ul className={compact ? "mt-1 grid gap-1 text-[11px] leading-5 text-[#41665c]" : "mt-2 grid gap-1 text-[14px] leading-6 text-[#41665c]"}>
        {strengths.map(strength => <li key={strength.key}>• {strength.message}</li>)}
      </ul>
      <p className={compact ? "mt-1 text-[10px] text-[#5c7168]" : "mt-2 text-xs text-[#5c7168]"}>استمر في البناء تدريجيًا على هذه الجوانب بما يناسبك.</p>
    </section>
  );
}

function NextStepsPanel({ steps, compact }: { steps: LifestyleNextStep[]; compact: boolean }) {
  if (!steps.length) return null;
  return (
    <section className={compact ? "lim-print-next-steps" : "rounded-2xl border border-[#dce8c4] bg-[#fbfff0] p-4"} data-lifestyle-next-steps>
      <h3 className={compact ? "text-[12px] font-black text-[#153f38]" : "text-sm font-black text-[#153f38]"}>خطواتك الصحية القادمة</h3>
      <ol className={compact ? "mt-1 grid list-decimal gap-1 pr-4 text-[11px] leading-5 text-[#41665c]" : "mt-2 grid list-decimal gap-1.5 pr-5 text-[14px] leading-6 text-[#41665c]"}>
        {steps.map(step => <li key={step.key}>{step.text}</li>)}
      </ol>
    </section>
  );
}

function IncompleteLifestyle({ compact }: { compact: boolean }) {
  return (
    <section className={compact ? "lim-print-panel" : "rounded-2xl bg-white p-5"} data-lifestyle-incomplete>
      <h2 className={compact ? undefined : "font-bold"}>نتائج استبيان نمط الحياة</h2>
      <p className="mt-3 text-slate-600">الاستبيان مفعّل لهذه الزيارة، لكن الإجابات غير مكتملة؛ لذلك لا تظهر درجات أو جوانب تحسين مكتملة.</p>
    </section>
  );
}

export default function EventLifestyleCharts({ answers, compact = false }: { answers: EventAnswers; compact?: boolean }) {
  const report = lifestyleReport(answers);
  if (!report.complete) return <IncompleteLifestyle compact={compact} />;

  const importance = clampScore(answers.importance);
  const confidence = clampScore(answers.confidence);
  const readiness = clampScore(report.score.readiness);

  if (compact) return (
    <section className="lim-print-panel lim-print-lifestyle" data-pdf-keep>
      <div className="lim-print-lifestyle-score">
        <ScoreCard score={report.score.overall} band={report.band} />
        <LifestyleBandReference score={report.score.overall} />
      </div>
      <div className="mt-2">
        <h2>نتائج استبيان نمط الحياة</h2>
        <PillarBars insights={report.insights} />
      </div>
      <StrengthsPanel strengths={report.strengths} compact />
      <section className="lim-print-improvements" data-pdf-keep>
        <h3>جوانب التحسين بناء على إجاباتك</h3>
        <LifestyleImprovementList insights={report.insights} />
      </section>
      <NextStepsPanel steps={report.nextSteps} compact />
      <p className="lim-print-lifestyle-disclaimer">المؤشر والملخص توعويان مبنيان على الإجابات المسجلة، ولا يُعدان تشخيصًا طبيًا.</p>
    </section>
  );

  return (
    <section data-pdf-keep aria-label="ملخص نتائج نمط الحياة" className="rounded-[28px] border border-[#dce9e5] bg-white p-5 shadow-[0_10px_30px_rgba(18,58,52,.06)] print:break-inside-avoid print:border-slate-300 print:p-4 print:shadow-none">
      <div className="border-b border-[#e2ece9] pb-4">
        <p className="text-xs font-bold text-[#197f6f]">ملخص الصحة الشاملة</p>
        <h2 className="mt-1 text-xl font-black text-[#153f38]">نتائج استبيان نمط الحياة</h2>
        <p className="mt-1 text-xs leading-5 text-[#6e8580]">صورة مبسطة تساعدك على اختيار الخطوة الصحية التالية.</p>
        <div data-lifestyle-score-overview className="mt-4 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-2.5" dir="rtl">
          <ScoreCard score={report.score.overall} band={report.band} />
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
      <div className="mt-5"><StrengthsPanel strengths={report.strengths} compact={false} /></div>
      <div className="mt-5">
        <h3 className="text-sm font-black text-[#153f38]">جوانب التحسين بناء على إجاباتك</h3>
        <div className="mt-3"><LifestyleImprovementList insights={report.insights} /></div>
      </div>
      <div className="mt-5"><NextStepsPanel steps={report.nextSteps} compact={false} /></div>
      <p className="mt-4 border-t border-[#e2ece9] pt-3 text-[11px] leading-5 text-[#718680]">هذا ملخص توعوي مبني على إجاباتك، ولا يُعد تشخيصًا طبيًا أو بديلًا عن تقييم المختص. لا يعرض الملخص إجاباتك الحساسة بالتفصيل.</p>
    </section>
  );
}
