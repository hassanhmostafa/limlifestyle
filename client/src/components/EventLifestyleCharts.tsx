import {
  eventLifestyleSections,
  scoreEventLifestyle,
  type EventAnswers,
} from "@/lib/eventLifestyle";
const labels = {
  nutrition: "التغذية",
  activity: "النشاط البدني",
  sleep: "النوم",
  mood: "المزاج والضغوط",
  connection: "المعنى والترابط",
  substances: "تجنب المواد الضارة",
};
const colors = [
  "#197f6f",
  "#398f99",
  "#677ab9",
  "#b07a46",
  "#8e73a9",
  "#729249",
];
export default function EventLifestyleCharts({
  answers,
}: {
  answers: EventAnswers;
}) {
  const complete = eventLifestyleSections.every(s =>
    s.questions.every(q =>
      q.type === "multi"
        ? Array.isArray(answers[q.id])
        : answers[q.id] !== undefined && answers[q.id] !== ""
    )
  );
  if (!complete)
    return (
      <section className="rounded-2xl bg-white p-5">
        <h2 className="font-bold">ملخص نمط الحياة</h2>
        <p className="mt-3 text-slate-600">
          لم يُحفظ استبيان كامل لهذه الزيارة؛ تظهر الرسوم عند اكتماله.
        </p>
      </section>
    );
  const score = scoreEventLifestyle(answers);
  return (
    <section
      aria-label="رسوم نتائج نمط الحياة"
      className="space-y-5 rounded-3xl bg-white p-5"
    >
      <h2 className="text-xl font-bold">نتائج استبيان نمط الحياة</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#123f37] p-4 text-white">
          <p>المؤشر العام</p>
          <strong className="text-4xl">{score.overall}</strong>
          <span> / 100</span>
        </div>
        <div className="rounded-2xl bg-lime-50 p-4">
          <p>الاستعداد للتغيير</p>
          <strong className="text-4xl">{score.readiness}</strong>
          <span> / 10</span>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        كلما ارتفعت الدرجة كان الاتجاه أفضل ضمن طريقة الحساب الحالية.
      </p>
      <div className="space-y-5">
        {Object.entries(score.domains).map(([key, value], i) => (
          <div key={key}>
            <div className="mb-2 flex justify-between gap-3">
              <span className="font-bold">
                {labels[key as keyof typeof labels]}
              </span>
              <strong dir="ltr">{value} / 10</strong>
            </div>
            <div
              role="meter"
              aria-label={labels[key as keyof typeof labels]}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-valuenow={value}
              className="h-5 overflow-hidden rounded-full bg-slate-100"
            >
              <div
                style={{ width: `${value * 10}%`, backgroundColor: colors[i] }}
                className="h-full rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs leading-6 text-slate-500">
        ملخص توعوي حسب طريقة الحساب الحالية في التطبيق، وليس مقياسًا تشخيصيًا
        معتمدًا. راجع الإجابات التفصيلية أدناه عند تقديم النصائح.
      </p>
    </section>
  );
}
