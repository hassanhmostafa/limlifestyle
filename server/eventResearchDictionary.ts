import { EVENT_LIFESTYLE_VERSION, lifestyleSectionsForAnswers } from "../shared/eventLifestyle";
import { nursingCatalog } from "../shared/eventNursing";

type Description = [label: string, coding: string];
// Units follow the existing body-composition renderer, not guesses from a key.
const deviceFields: Record<string, Description> = {
  height: ["الطول", "cm"], weight: ["الوزن", "kg"], bmi: ["مؤشر كتلة الجسم", "kg/m²"],
  sbp: ["ضغط الدم الانقباضي", "mmHg"], dbp: ["ضغط الدم الانبساطي", "mmHg"], hr: ["النبض", "bpm"],
  temperature: ["درجة الحرارة", "°C"], fat: ["كتلة الدهون", "kg"], fatRate: ["نسبة الدهون", "%"],
  fatFree: ["الكتلة الخالية من الدهون", "kg"], muscle: ["كتلة العضلات", "kg"],
  skeletalMuscle: ["العضلات الهيكلية", "kg"], muscleRate: ["نسبة العضلات", "%"],
  waterRate: ["نسبة ماء الجسم", "%"], waterICW: ["الماء داخل الخلايا", "kg"],
  waterECW: ["الماء خارج الخلايا", "kg"], protein: ["كتلة البروتين", "kg"],
  bone: ["كتلة العظام", "kg"], mineral: ["كتلة المعادن", "kg"],
  bmr: ["معدل الأيض الأساسي", "kcal/day"], vfal: ["مستوى الدهون الحشوية", "مستوى الجهاز"],
  whr: ["نسبة الخصر إلى الورك", "نسبة بلا وحدة"], fatSubCutRate: ["نسبة الدهون تحت الجلد", "%"],
  idealWeight: ["الوزن المثالي بحسب الجهاز", "kg"], dci: ["الاحتياج اليومي للطاقة بحسب الجهاز", "kcal"],
  bodyAge: ["العمر الجسدي التقديري", "سنة"], obesity: ["مؤشر السمنة بحسب الجهاز", "%"],
  bodyScore: ["درجة الجهاز لتركيب الجسم", "درجة الجهاز؛ ليست مؤشر كتلة الجسم"],
  bodyShape: ["تصنيف شكل الجسم بحسب الجهاز", "نص الجهاز الأصلي"],
  impedance: ["الممانعة الكهربائية بحسب الجهاز", "الصيغة والوحدة كما وردتا من الجهاز"],
};
const domains: Record<string, string> = {
  nutrition: "التغذية", activity: "النشاط البدني", sleep: "النوم", mood: "المزاج وإدارة الضغوط",
  connection: "المعنى والترابط", substances: "تجنب المواد الضارة",
};
const fields: Record<string, Description> = {
  id: ["معرّف الزيارة", "عدد صحيح"], visitId: ["معرّف الزيارة", "عدد صحيح؛ كل صف يمثل زيارة"],
  eventCode: ["رمز الفعالية", "معرّف نصي"], participantId: ["رمز المشارك الثابت", "P-<id>؛ يربط الزيارات المتكررة"],
  age: ["عمر المشارك عند الزيارة", "سنة"], sex: ["الجنس المسجل", "male=ذكر | female=أنثى"],
  city: ["المدينة", "نص"], trackId: ["معرّف مسار الفعالية", "معرّف"],
  createdAt: ["تاريخ إنشاء الزيارة", "ISO 8601؛ حدود البحث بالتاريخ تستخدم توقيت السعودية +03:00"],
  nursingCompletedAt: ["وقت إكمال التمريض", "ISO 8601"], approvedAt: ["وقت اعتماد التقرير", "ISO 8601"],
  consultationCompletedAt: ["وقت إكمال الاستشارة", "ISO 8601"], reportCompletedAt: ["وقت إكمال رحلة التقرير", "ISO 8601"],
  questionnaireVersion: ["نسخة الاستبيان", "legacy=النسخة السابقة | none=غير مفعّل | تاريخ=إصدار الاستبيان"],
  scoringVersion: ["نسخة احتساب الدرجات", "نسخة اللقطة المعتمدة أو current-unarchived للحساب الحالي غير المؤرشف"],
  templateVersion: ["نسخة قالب التقرير المحفوظ", "معرّف النسخة"], reportRevision: ["إصدار اعتماد التقرير", "عدد صحيح"],
  scoreProvenance: ["مصدر الدرجات", "frozen-approved=اللقطة المعتمدة | current-unarchived=حساب العرض الحالي"],
  lifestyleScore: ["المؤشر العام لنمط الحياة", "0–100؛ فارغ عند عدم التفعيل أو عدم الاكتمال"],
  lifestyleBand: ["نطاق المؤشر العام", "التسمية العربية المحفوظة"],
  archiveId: ["معرّف أرشيف التقرير", "UUID؛ فارغ عند عدم وجود لقطة"],
  finalAdvice: ["نص التوصية المعتمدة", "يتطلب صلاحية التقارير الكاملة؛ فارغ قبل الاعتماد"],
  "clinical.weight": ["الوزن", "kg؛ أحدث قراءة جهاز متاحة، وإلا القياس اليدوي"],
  "clinical.bmi": ["مؤشر كتلة الجسم", "kg/m²؛ أحدث قراءة جهاز متاحة"],
  "clinical.waist": ["محيط الخصر", "cm"], "clinical.glucose": ["سكر الدم", "mg/dL؛ نوع القياس في measurements.blood_glucose.context"],
};

function describeColumn(column: string): Description {
  if (fields[column]) return fields[column];
  const domain = /^lifestyleDomains\.(\w+)$/.exec(column)?.[1];
  if (domain) return [domains[domain] ?? domain, "0–10؛ فارغ عند عدم التفعيل أو عدم الاكتمال"];
  const nursing = /^measurements\.([^.]+)\.([^.]+)$/.exec(column);
  if (nursing) {
    const test = nursingCatalog.find(test => test.id === nursing[1]);
    const field = test?.fields.find(field => field.key === nursing[2]);
    if (test && field) return [`${test.name} — ${field.label}`, field.unit ?? field.options?.join(" | ") ?? "نص مسجل"];
  }
  const reading = /^readings\.\d+\.(?:machineMetrics\.)?(.+)$/.exec(column)?.[1];
  if (reading) {
    if (deviceFields[reading]) return deviceFields[reading];
    if (reading === "source") return ["مصدر القراءة", "x18 / x18_test / simulator"];
    if (reading === "recordedAt") return ["وقت تسجيل قراءة الجهاز", "ISO 8601"];
    if (/_(s|n)$/.test(reading)) return [`رمز أو نطاق الجهاز: ${reading}`, "كما ورد من الجهاز؛ لا يُعامل كقيمة قياس رئيسية"];
    const segment = /^(muscle|fat)(LeftArm|RightArm|LeftLeg|RightLeg|Trunk)(Rate)?$/.exec(reading);
    if (segment) {
      const locations: Record<string, string> = { LeftArm: "الذراع الأيسر", RightArm: "الذراع الأيمن", LeftLeg: "الساق اليسرى", RightLeg: "الساق اليمنى", Trunk: "الجذع" };
      return [`${segment[1] === "muscle" ? "العضلات" : "الدهون"} — ${locations[segment[2]]}`, segment[3] ? "%" : "kg"];
    }
    return [`حقل الجهاز: ${reading}`, "قيمة الجهاز الأصلية؛ الوحدة غير موثقة في القالب"];
  }
  if (/^questionnaireIds(?:\.\d+)?$/.test(column)) return ["الاستبيانات المفعّلة", "lifestyle=استبيان نمط الحياة؛ فهرس مصفوفة يبدأ من 1"];
  if (/^testIds(?:\.\d+)?$/.test(column)) return ["اختبارات التمريض", nursingCatalog.map(test => `${test.id}=${test.name}`).join(" | ")];
  if (column === "readings") return ["قراءات الجهاز", "فارغ = لا توجد قراءة مسجلة"];
  return [column, "القيمة الأصلية؛ فارغ = لم يُسجل؛ ليست صفرًا"];
}

/** Every actual export column has an exact entry, including legacy question coding. */
export function buildResearchDictionary(columns: string[], records: Record<string, unknown>[]) {
  const result: string[][] = [["version", "variable", "Arabic label / meaning", "coding / unit"]];
  const versions = Array.from(new Set(records.map(record => String(record.questionnaireVersion ?? "legacy"))));
  for (const column of columns) {
    const answerId = /^answers\.([^.]+)/.exec(column)?.[1];
    if (answerId) {
      for (const version of versions.length ? versions : [EVENT_LIFESTYLE_VERSION]) {
        const representative = records.find(record => String(record.questionnaireVersion ?? "legacy") === version);
        const answers = { ...(representative?.answers as Record<string, any> ?? {}), _questionnaireVersion: version };
        const question = lifestyleSectionsForAnswers(answers).flatMap(section => section.questions).find(question => question.id === answerId);
        result.push([version, column, question?.text ?? answerId,
          question?.options?.map(option => `${option.value}=${option.label}`).join(" | ") ?? question?.suffix ?? "القيمة الأصلية؛ فارغ = لم يُسجل"]);
      }
    } else {
      result.push(["research-v1", column, ...describeColumn(column)]);
    }
  }
  return result;
}
