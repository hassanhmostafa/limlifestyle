import React from "react";
import {
  lifestyleSectionsForAnswers,
  scoreEventLifestyle,
  type EventAnswers,
} from "@/lib/eventLifestyle";

const domains = [
  { key: "nutrition", label: "التغذية", color: "#197f6f" },
  { key: "activity", label: "النشاط البدني", color: "#398f99" },
  { key: "sleep", label: "النوم", color: "#677ab9" },
  { key: "mood", label: "المزاج وإدارة الضغوط", color: "#b07a46" },
  { key: "connection", label: "المعنى والترابط", color: "#8e73a9" },
  { key: "substances", label: "تجنب المواد الضارة", color: "#729249" },
] as const;

const priorityLabels: Record<string, string> = {
  nutrition: "التغذية",
  activity: "النشاط البدني",
  sleep: "النوم",
  stress: "إدارة الضغوط",
  mood: "إدارة الضغوط",
  connection: "المعنى والترابط",
  substances: "تجنب المواد الضارة",
};

const bands = [
  {
    min: 0,
    max: 25,
    label: "حاجة مرتفعة للدعم",
    shortLabel: "دعم أكبر",
    activeClass: "border-[#c75252] bg-[#fff1f1] text-[#8d2929]",
    dotClass: "bg-[#c75252]",
  },
  {
    min: 26,
    max: 50,
    label: "يحتاج إلى تحسين",
    shortLabel: "بحاجة لتحسين",
    activeClass: "border-[#d7903d] bg-[#fff7e9] text-[#8a5114]",
    dotClass: "bg-[#d7903d]",
  },
  {
    min: 51,
    max: 75,
    label: "جيد مع فرص للتحسين",
    shortLabel: "جيد",
    activeClass: "border-[#8aa33a] bg-[#f6fadf] text-[#52651f]",
    dotClass: "bg-[#8aa33a]",
  },
  {
    min: 76,
    max: 100,
    label: "ممتاز",
    shortLabel: "ممتاز",
    activeClass: "border-[#197f6f] bg-[#e8f7f2] text-[#126457]",
    dotClass: "bg-[#197f6f]",
  },
] as const;

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

export default function EventLifestyleCharts({
  answers,
  compact = false,
}: {
  answers: EventAnswers;
  compact?: boolean;
}) {
  const complete = lifestyleSectionsForAnswers(answers).every(section =>
    section.questions.every(question =>
      question.type === "multi"
        ? Array.isArray(answers[question.id])
        : answers[question.id] !== undefined && answers[question.id] !== ""
    )
  );

  if (!complete)
    return (
      <section className="rounded-2xl bg-white p-5">
        <h2 className="font-bold">ملخص نمط الحياة</h2>
        <p className="mt-3 text-slate-600">
          لم يُحفظ استبيان كامل لهذه الزيارة؛ يظهر الملخص عند اكتماله.
        </p>
      </section>
    );

  const score = scoreEventLifestyle(answers);
  const importance = clampScore(answers.importance);
  const confidence = clampScore(answers.confidence);
  const readiness = clampScore(score.readiness);
  const activeBand = bands.find(
    band => score.overall >= band.min && score.overall <= band.max
  )!;
  const rankedDomains = domains
    .map(domain => ({ ...domain, value: score.domains[domain.key] }))
    .sort((left, right) => right.value - left.value);
  const strengths = rankedDomains.slice(0, 2);
  const opportunities = rankedDomains.slice(-2).reverse();
  const priorities = [answers.priority1, answers.priority2, answers.priority3]
    .map(value =>
      typeof value === "string" ? priorityLabels[value] : undefined
    )
    .filter((value): value is string => Boolean(value));

  if (compact) return <section className="lim-print-panel" data-pdf-keep>
    <h2>نمط الحياة <bdi>{score.overall} / 100</bdi></h2>
    <p className="lim-print-band">{activeBand.label}</p>
    <div className="lim-print-bars">{domains.map(domain => <div key={domain.key}>
      <div><span>{domain.label}</span><bdi>{score.domains[domain.key]} / 10</bdi></div>
      <div className="lim-print-track"><i style={{ width: `${clampScore(score.domains[domain.key]) * 10}%`, background: domain.color }} /></div>
    </div>)}</div>
    <p>أهمية التغيير: {importance}/10 · الثقة: {confidence}/10 · الاستعداد: {readiness}/10</p>
    {priorities.length > 0 && <p>أولوياتك: {priorities.join("، ")}</p>}
    <p>جوانب قوية: {strengths.map(item => item.label).join("، ")}</p>
    <p>فرص التحسين: {opportunities.map(item => item.label).join("، ")}</p>
    <small>ملخص توعوي مبني على إجاباتك، وليس تشخيصًا طبيًا.</small>
  </section>;

  return (
    <section
      data-pdf-keep
      aria-label="ملخص نتائج نمط الحياة"
      className="rounded-[28px] border border-[#dce9e5] bg-white p-5 shadow-[0_10px_30px_rgba(18,58,52,.06)] print:break-inside-avoid print:border-slate-300 print:p-4 print:shadow-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e2ece9] pb-4">
        <div>
          <p className="text-xs font-bold text-[#197f6f]">ملخص الصحة الشاملة</p>
          <h2 className="mt-1 text-xl font-black text-[#153f38]">
            نتائج استبيان نمط الحياة
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#6e8580]">
            صورة مبسطة تساعدك على اختيار الخطوة الصحية التالية.
          </p>
        </div>
        <div className="min-w-28 rounded-2xl bg-[#123f37] px-4 py-3 text-center text-white">
          <p className="text-[11px] font-bold text-[#cfe1dc]">المؤشر العام</p>
          <p className="mt-0.5 text-3xl font-black" dir="ltr">
            {score.overall}
            <span className="text-xs font-bold text-[#cfe1dc]"> / 100</span>
          </p>
          <p className="mt-1 text-[11px] font-bold text-[#dff33d]">
            {activeBand.label}
          </p>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-4 gap-1"
        aria-label="تصنيف المؤشر العام"
      >
        {bands.map(band => {
          const active = band === activeBand;
          return (
            <div
              key={band.min}
              aria-current={active ? "true" : undefined}
              className={`rounded-xl border px-1.5 py-2 text-center ${
                active
                  ? `${band.activeClass} font-black shadow-sm`
                  : "border-[#e1eae7] bg-[#fafcfb] text-[#80938e]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mx-auto mb-1 block h-1.5 w-5 rounded-full ${band.dotClass}`}
              />
              <span className="block text-[10px] leading-4 sm:text-[11px]">
                {band.shortLabel}
              </span>
              <span className="block text-[9px]" dir="ltr">
                {band.min}–{band.max}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SummaryScore
          label="أهمية التغيير"
          value={importance}
          copy="مدى أهمية التحسين لك"
        />
        <SummaryScore
          label="الثقة بالقدرة"
          value={confidence}
          copy="ثقتك بقدرتك على التغيير"
        />
        <SummaryScore
          label="الاستعداد"
          value={readiness}
          copy="متوسط الأهمية والثقة"
        />
      </div>

      {priorities.length > 0 && (
        <div className="mt-4 rounded-2xl bg-[#f3f8f6] p-4">
          <h3 className="text-sm font-black text-[#153f38]">أولوياتك الصحية</h3>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {priorities.map((priority, index) => (
              <li
                key={`${priority}-${index}`}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#365b53]"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#dff33d] text-[11px] font-black text-[#153f38]">
                  {index + 1}
                </span>
                {priority}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-black text-[#153f38]">المحاور الستة</h3>
        <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          {domains.map(domain => {
            const value = score.domains[domain.key];
            return (
              <div key={domain.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-[#365b53]">
                    {domain.label}
                  </span>
                  <strong className="text-[#153f38]" dir="ltr">
                    {value} / 10
                  </strong>
                </div>
                <div
                  role="meter"
                  aria-label={domain.label}
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={value}
                  className="h-2.5 overflow-hidden rounded-full bg-[#e8efed]"
                >
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, value * 10))}%`,
                      backgroundColor: domain.color,
                    }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#b9dfd5] bg-[#eef9f5] p-4">
          <h3 className="text-sm font-black text-[#126457]">جوانب قوية لديك</h3>
          <p className="mt-2 text-xs leading-6 text-[#4e7068]">
            {strengths.map(item => item.label).join("، ")}. استمر على العادات
            الجيدة التي تدعم هذين الجانبين.
          </p>
        </div>
        <div className="rounded-2xl border border-[#e5d8ae] bg-[#fffaf0] p-4">
          <h3 className="text-sm font-black text-[#75571a]">
            فرصتك القادمة للتحسين
          </h3>
          <p className="mt-2 text-xs leading-6 text-[#756846]">
            يمكنك البدء بخطوة صغيرة في{" "}
            {opportunities.map(item => item.label).join(" أو ")}، واختيار ما
            يناسب ظروفك بالتعاون مع المختص.
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-[#e2ece9] pt-3 text-[11px] leading-5 text-[#718680]">
        هذا ملخص توعوي مبني على إجاباتك، ولا يُعد تشخيصًا طبيًا أو بديلًا عن
        تقييم المختص. لا يعرض الملخص إجاباتك الحساسة بالتفصيل.
      </p>
    </section>
  );
}
