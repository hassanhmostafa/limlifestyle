export type NursingField = {
  key: string;
  label: string;
  unit?: string;
  options?: string[];
};
export type NursingTest = {
  id: string;
  name: string;
  group: string;
  fields: NursingField[];
  note?: string;
};
const value = (unit: string): NursingField[] => [
  { key: "value", label: "القراءة", unit },
];
export const nursingCatalog: NursingTest[] = [
  {
    id: "blood_glucose",
    name: "سكر الدم",
    group: "تحاليل سريعة",
    fields: [
      ...value("mg/dL"),
      {
        key: "context",
        label: "نوع القياس",
        options: ["صائم", "عشوائي", "بعد الأكل"],
      },
    ],
  },
  {
    id: "hba1c",
    name: "السكر التراكمي HbA1c",
    group: "تحاليل سريعة",
    fields: value("%"),
  },
  {
    id: "blood_pressure",
    name: "ضغط الدم",
    group: "علامات حيوية",
    fields: [
      { key: "systolic", label: "الانقباضي", unit: "mmHg" },
      { key: "diastolic", label: "الانبساطي", unit: "mmHg" },
      { key: "arm", label: "الذراع", options: ["اليمنى", "اليسرى"] },
    ],
  },
  {
    id: "pulse",
    name: "معدل النبض",
    group: "علامات حيوية",
    fields: value("نبضة/دقيقة"),
  },
  {
    id: "oxygen_saturation",
    name: "تشبع الأكسجين SpO₂",
    group: "علامات حيوية",
    fields: value("%"),
  },
  {
    id: "temperature",
    name: "درجة الحرارة",
    group: "علامات حيوية",
    fields: [
      ...value("°C"),
      {
        key: "site",
        label: "موضع القياس",
        options: ["الأذن", "الجبهة", "الفم", "الإبط", "غير ذلك"],
      },
    ],
  },
  {
    id: "waist",
    name: "محيط الخصر",
    group: "قياسات الجسم",
    fields: value("cm"),
  },
  { id: "hip", name: "محيط الورك", group: "قياسات الجسم", fields: value("cm") },
  {
    id: "neck",
    name: "محيط الرقبة",
    group: "قياسات الجسم",
    fields: value("cm"),
  },
  {
    id: "weight",
    name: "الوزن",
    group: "قياسات الجسم",
    fields: value("kg"),
    note: "قياس يدوي مستقل؛ لا يستبدل قراءة جهاز تحليل الجسم.",
  },
  { id: "height", name: "الطول", group: "قياسات الجسم", fields: value("cm") },
  {
    id: "handgrip",
    name: "قوة قبضة اليد",
    group: "اختبارات وظيفية",
    fields: [
      { key: "hand", label: "اليد", options: ["اليمنى", "اليسرى"] },
      { key: "trial_1", label: "المحاولة الأولى", unit: "kg" },
      { key: "trial_2", label: "المحاولة الثانية", unit: "kg" },
      { key: "trial_3", label: "المحاولة الثالثة", unit: "kg" },
    ],
    note: "عدد المحاولات وطريقة اعتماد النتيجة يحددهما بروتوكول الفعالية.",
  },
  {
    id: "bone_screening",
    name: "فحص كثافة العظام",
    group: "اختبارات وظيفية",
    fields: [
      { key: "device", label: "الجهاز / طريقة الفحص" },
      { key: "site", label: "موضع الفحص" },
      { key: "metric", label: "اسم المؤشر في التقرير" },
      { key: "result", label: "النتيجة كما وردت بالتقرير" },
      { key: "unit", label: "الوحدة كما وردت بالتقرير" },
    ],
    note: "تُضبط الخانات حسب الجهاز قبل التشغيل؛ كتلة العظام من تحليل الجسم ليست قياس كثافة العظام.",
  },
  {
    id: "total_cholesterol",
    name: "الكوليسترول الكلي",
    group: "تحاليل سريعة",
    fields: value("mg/dL"),
  },
  {
    id: "ldl",
    name: "الكوليسترول LDL",
    group: "تحاليل سريعة",
    fields: value("mg/dL"),
  },
  {
    id: "hdl",
    name: "الكوليسترول HDL",
    group: "تحاليل سريعة",
    fields: value("mg/dL"),
  },
  {
    id: "triglycerides",
    name: "الدهون الثلاثية",
    group: "تحاليل سريعة",
    fields: value("mg/dL"),
  },
  {
    id: "hemoglobin",
    name: "الهيموغلوبين",
    group: "تحاليل سريعة",
    fields: value("g/dL"),
  },
  {
    id: "uric_acid",
    name: "حمض اليوريك",
    group: "تحاليل سريعة",
    fields: value("mg/dL"),
  },
  {
    id: "peak_flow",
    name: "ذروة تدفق الزفير",
    group: "اختبارات وظيفية",
    fields: value("L/min"),
  },
];
