import type { EventAnswers } from "../shared/eventLifestyle";
import { eventLifestyleSections } from "../shared/eventLifestyle";

export const PHYSICIAN_PLAN_VERSION = "physician-fitt-smart-2026-11-12";
export const PHYSICIAN_PLAN_SOURCES = [
  "UPLOADED_FITT_SMART_EXAMPLES",
];
const labels: Record<string, string> = {
  nutrition: "التغذية",
  activity: "النشاط البدني",
  sleep: "النوم",
  stress: "إدارة الضغوط",
  connection: "المعنى والترابط",
  substances: "تجنب المواد الضارة",
};
const fields: Record<string, string[]> = {
  nutrition: [
    "fruit",
    "vegetables",
    "wholeGrains",
    "refinedGrains",
    "preparedFood",
    "sugary",
    "salty",
    "fried",
    "proteins",
  ],
  activity: ["activeDays", "activeMinutes", "strengthDays"],
  sleep: ["sleepHours", "dayTired"],
  stress: ["lowInterest", "lowMood", "notOnTop", "overwhelmed"],
  connection: ["purpose", "support"],
  substances: ["tobacco", "alcoholUse", "medMisuse", "cannabis", "otherDrugs"],
};
const questions = eventLifestyleSections.flatMap(s => s.questions);
function evidence(a: EventAnswers, pillar: string) {
  return fields[pillar].flatMap(id => {
    const q = questions.find(q => q.id === id),
      v = a[id];
    if (!q || v === undefined || v === "") return [];
    const values = Array.isArray(v) ? v : [v];
    const text = values
      .map(
        x =>
          q.options?.find(o => o.value === String(x))?.label ??
          (typeof x === "number" || /^\d+(\.\d+)?$/.test(String(x))
            ? String(x)
            : "غير محدد")
      )
      .join("، ");
    return [`${q.text}: ${text}${q.suffix ? " " + q.suffix : ""}`];
  });
}
function n(a: EventAnswers, id: string) {
  const v = a[id];
  return v !== undefined && v !== "" && Number.isFinite(Number(v))
    ? Number(v)
    : undefined;
}
export function composePhysicianPlan(a: EventAnswers) {
  const priorities = [a.priority1, a.priority2, a.priority3];
  if (
    priorities.some(p => typeof p !== "string" || !labels[p]) ||
    new Set(priorities).size !== 3
  )
    throw new Error("اختر ثلاث أولويات مختلفة قبل إنشاء مسودة الطبيب.");
  const sections = priorities.map((p, index) => {
    const pillar = p as string,
      basis = evidence(a, pillar),
      goals: string[] = [];
    let f = "",
      i = "",
      t = "",
      type = "",
      progress = "ابدأ بتغيير أو تغييرين يختارهما المشارك مع الطبيب.",
      monitor = "سجل التنفيذ وراجع ملاءمة الخطة مع الطبيب.";
    if (pillar === "nutrition") {
      f = "يوميًا ضمن الوجبات المعتادة";
      i =
        "تغيير أو تغييران مناسبـان للنمط الحالي؛ يحدد الطبيب الكميات حسب الاحتياج";
      t = "مرحلة أولية 4 أسابيع";
      type = "نمط غذائي كثيف المغذيات يغلب عليه الغذاء النباتي الكامل";
      if (n(a, "vegetables") !== undefined && n(a, "vegetables")! < 10.5)
        goals.push(
          "أضف الخضروات إلى الغداء والعشاء في 5 أيام أسبوعيًا لمدة 4 أسابيع."
        );
      if (n(a, "sugary") !== undefined && n(a, "sugary")! > 0)
        goals.push(
          "في الأيام التي تتناول فيها طعامًا أو شرابًا محلى، استبدل اختيارًا معتادًا بفاكهة أو مشروب غير محلى، وسجل التنفيذ لمدة 4 أسابيع."
        );
      if (n(a, "fruit") !== undefined && n(a, "fruit")! < 10.5)
        goals.push(
          "استبدل وجبة خفيفة حلوة معتادة بفاكهة في 5 أيام أسبوعيًا لمدة 4 أسابيع، إن كانت ضمن نمطك الحالي."
        );
      if (n(a, "preparedFood") !== undefined && n(a, "preparedFood")! >= 5)
        goals.push("حضّر غداء منزليًا في 4 أيام أسبوعيًا لمدة 4 أسابيع.");
      if (Array.isArray(a.proteins) && !a.proteins.includes("legumes"))
        goals.push(
          "أدرج البقوليات في 3 وجبات أسبوعيًا لمدة 4 أسابيع، إذا كانت مناسبة لك."
        );
      if (n(a, "wholeGrains") !== undefined && n(a, "wholeGrains")! < 10.5)
        goals.push(
          "استبدل حبوبًا مكررة معتادة بحبوب كاملة مناسبة في وجبة واحدة، 5 أيام أسبوعيًا لمدة 4 أسابيع."
        );
      monitor =
        "سجل الوجبات والمشروبات 3 أيام أسبوعيًا، وراجع الجوع والشبع وجودة الغذاء.";
    } else if (pillar === "activity") {
      const days = n(a, "activeDays"),
        minutes = n(a, "activeMinutes"),
        strength = n(a, "strengthDays");
      const known = days !== undefined && minutes !== undefined,
        total = known ? days! * minutes! : undefined;
      f =
        "نشاط هوائي 5 أيام أسبوعيًا؛ ومقاومة 2–3 أيام غير متتالية حسب الملاءمة";
      i =
        "متوسط: يمكن التحدث أثناء النشاط، وجهد مدرك 3–4 من 10؛ مقاومة خفيفة إلى متوسطة حسب التحمل";
      t =
        total !== undefined && total < 150
          ? "ابدأ بالمشي 15 دقيقة للجلسة، ثم زد تدريجيًا إلى 30 دقيقة"
          : "المحافظة على النشاط الملائم؛ يحدد الطبيب مدة البداية من المستوى الحالي";
      type = "مشي أو دراجة أو سباحة وتمارين العضلات الرئيسية";
      if (total !== undefined && total < 150) {
        goals.push(
          "امشِ 15 دقيقة في 5 أيام أسبوعيًا لمدة أسبوعين، بعد تأكيد الطبيب ملاءمة البداية.",
          "زد مدة المشي 5 دقائق أسبوعيًا بعد مرحلة البداية حتى تصل إلى 30 دقيقة في 5 أيام أسبوعيًا خلال 5 أسابيع، حسب التحمل."
        );
      }
      if (total !== undefined && total >= 150)
        goals.push(
          `حافظ على نشاطك المعتاد المسجل (${days} أيام × ${minutes} دقيقة) أسبوعيًا لمدة 4 أسابيع، بعد مراجعة ملاءمته مع الطبيب.`
        );
      if (strength !== undefined && strength < 2)
        goals.push(
          "نفذ جلستي مقاومة مدة كل منهما 25 دقيقة في يومين غير متتاليين أسبوعيًا لمدة 4 أسابيع، حسب التحمل وبعد مراجعة الطبيب."
        );
      progress =
        "زد المدة قبل الشدة؛ ابدأ المقاومة بـ1–2 مجموعة من 8–12 تكرارًا حسب التحمل.";
      monitor = "سجل الدقائق والجلسات والجهد المدرك وأي أعراض.";
    } else if (pillar === "sleep") {
      f = "كل ليلة";
      i = "فرصة نوم 7–9 ساعات لمعظم البالغين؛ يراجع الطبيب ملاءمتها";
      t = "وقت نوم واستيقاظ ثابت مع مراجعة بعد 4 أسابيع";
      type = "تنظيم مواعيد النوم وبيئته وروتين التهدئة";
      if (a.sleepHours !== undefined)
        goals.push(
          "حدد مع الطبيب وقت استيقاظ يناسبك، والتزم به ضمن هامش 30 دقيقة في 6 أيام أسبوعيًا لمدة 4 أسابيع."
        );
      if (["0", "1", "2"].includes(String(a.sleepHours)))
        goals.push(
          "خصص نافذة نوم 8 ساعات في 5 ليالٍ أسبوعيًا لمدة 4 أسابيع، بعد الاتفاق على توقيتها."
        );
      if (a.dayTired !== undefined && a.dayTired !== "0")
        goals.push(
          "سجل وقت النوم والاستيقاظ وجودة النوم كل صباح لمدة أسبوعين لمراجعتها مع الطبيب."
        );
      monitor = "مفكرة نوم 7 أيام مع متابعة الأداء واليقظة نهارًا.";
    } else if (pillar === "stress") {
      f = "يوميًا";
      i = "ممارسة بسيطة يمكن تحملها";
      t = "5–10 دقائق في البداية؛ حتى 10–20 دقيقة يوميًا إذا رغبت";
      type = "تنفس بطيء أو استرخاء أو تدوين بحسب تفضيل المشارك";
      if (
        ["notOnTop", "overwhelmed", "lowMood", "lowInterest"].some(
          id => n(a, id)! > 0
        )
      )
        goals.push(
          "مارس التنفس البطيء 5 دقائق بعد العمل أو في وقت ثابت يناسبك، 5 أيام أسبوعيًا لمدة 4 أسابيع.",
          "دوّن عامل ضغط واحدًا وطريقة التعامل معه في 3 أيام أسبوعيًا لمدة 4 أسابيع."
        );
      progress = "زد الانتظام قبل زيادة المدة.";
      monitor = "سجل الممارسة والضغط المدرك وتأثيره في الأداء.";
    } else if (pillar === "connection") {
      f = "تواصل ذو معنى عدة مرات أسبوعيًا";
      i = "تواصل داعم وآمن عاطفيًا";
      t = "ابدأ بـ10–30 دقيقة لكل تواصل";
      type = "تواصل مع الأسرة أو الأصدقاء أو نشاط مجتمعي مناسب";
      if (a.support !== undefined || a.purpose !== undefined)
        goals.push(
          "تواصل مع قريب أو صديق داعم مرتين أسبوعيًا لمدة 4 أسابيع.",
          "حدد نشاطًا عائليًا مناسبًا لمدة 30 دقيقة كل نهاية أسبوع لمدة 4 أسابيع."
        );
      if (n(a, "support") !== undefined && n(a, "support")! < 2)
        goals.push(
          "حدد شخصًا واحدًا موثوقًا يمكنك طلب الدعم منه خلال أسبوعين."
        );
      progress = "ابنِ الانتظام وجودة التواصل تدريجيًا.";
      monitor = "تابع الدعم المدرك والشعور بالوحدة والمشاركة.";
    } else {
      f = "تجنب التبغ والمواد غير الطبية يوميًا";
      i =
        a.tobacco === "3"
          ? "المحافظة على عدم الاستخدام"
          : "الهدف النهائي التوقف الكامل عن التبغ والنيكوتين";
      t =
        a.tobacco === "3"
          ? "استمرار المحافظة والمتابعة خلال 4 أسابيع"
          : "تحديد موعد للإقلاع ثم الاستمرار والمتابعة";
      type =
        "مشورة الإقلاع وتحديد المحفزات ودعم الانسحاب؛ العلاج يقرره الطبيب عند الحاجة";
      if (a.tobacco !== undefined && a.tobacco !== "3")
        goals.push(
          "سجل مرات استخدام التبغ ومحفزاته يوميًا لمدة 7 أيام.",
          "حدد موعدًا للإقلاع خلال 14 يومًا بالتعاون مع الطبيب.",
          "احضر استشارة للإقلاع خلال أسبوعين."
        );
      if (
        ["alcoholUse", "medMisuse", "cannabis", "otherDrugs"].some(
          id => a[id] !== undefined && a[id] !== "3"
        )
      )
        goals.push(
          "احضر تقييمًا لدى مختص لاستخدام المواد خلال أسبوعين؛ يحدد الطبيب خطة التوقف الآمنة."
        );
      if (a.tobacco === "3")
        goals.push(
          "حافظ على عدم استخدام التبغ يوميًا لمدة 4 أسابيع، وسجل أي تعرض أو رغبة لمناقشتها مع الطبيب."
        );
      progress = "استعداد ثم محاولة إقلاع ودعم ومنع العودة.";
      monitor = "حالة الاستخدام والرغبة وأعراض الانسحاب والعودة للاستخدام.";
    }
    if (basis.length && goals.length < 2) {
      const maintenance: Record<string, string[]> = {
        nutrition: [
          "سجل وجباتك ومشروباتك 3 أيام أسبوعيًا لمدة 4 أسابيع لمراجعة الحفاظ على النمط الغذائي المناسب.",
          "تناول وجبة رئيسية واحدة دون شاشات يوميًا لمدة 4 أسابيع.",
        ],
        activity: ["سجل كل جلسة نشاط ومدتها وجهدها المدرك لمدة 4 أسابيع."],
        sleep: [
          "سجل وقت النوم والاستيقاظ وجودة النوم كل صباح لمدة أسبوعين.",
          "خصص 15 دقيقة للتهدئة قبل النوم في 5 ليالٍ أسبوعيًا لمدة 4 أسابيع.",
        ],
        stress: [
          "خصص 30 دقيقة لنشاط هواية محبب مرة أسبوعيًا لمدة 4 أسابيع.",
          "مارس الاسترخاء العضلي التدريجي 10 دقائق في 3 أمسيات أسبوعيًا لمدة 4 أسابيع.",
        ],
        substances: [
          "سجل حالة استخدام المواد أو عدم استخدامها مرة يوميًا لمدة 4 أسابيع لمراجعتها مع الطبيب.",
        ],
      };
      for (const goal of maintenance[pillar] ?? [])
        if (goals.length < 2 && !goals.includes(goal)) goals.push(goal);
    }
    if (!basis.length) {
      f = "يُحدد مع الطبيب بعد استكمال الإجابات";
      i = "غير محددة لغياب بيانات خط الأساس";
      t = "يحدد التوقيت والمدة مع الطبيب";
      type = "استكمال تقييم الركيزة المختارة";
      progress = "يحدد بعد توثيق خط الأساس.";
      monitor = "استكمال الإجابات مع الطبيب.";
    }
    if (goals.length === 0)
      goals.push(
        "سجل خط الأساس لهذا المجال لمدة 7 أيام، ثم اتفق مع الطبيب خلال أسبوعين على هدف محدد قابل للقياس يناسب إجاباتك واستعدادك."
      );
    return `${index + 1}. ${labels[pillar]}\nبناءً على إجاباتك: ${basis.length ? basis.join("؛ ") : "لا تتوفر إجابات كافية؛ استكمل التقييم مع الطبيب قبل تخصيص الوصفة."}\nالوصفة FITT:\nF — التكرار: ${f}\nI — الشدة/المقدار: ${i}\nT — المدة/التوقيت: ${t}\nT — النوع: ${type}\nالتدرج: ${progress}\nالمتابعة: ${monitor}\nاقتراحات أهداف SMART — اختر المناسب مع الطبيب:\n${goals.map((g, j) => `${j + 1}) ${g}`).join("\n")}\nالمصدر: أمثلة لمسودة الطبيب، قسم ${labels[pillar]} (ص ${{ nutrition: "1–2", activity: "2–3", sleep: "3–4", stress: "4", substances: "4–5", connection: "5–6" }[pillar]}).`;
  });
  return {
    advice: [
      "مسودة الطبيب — الأولويات الثلاث المختارة",
      "اختر هدفًا أو هدفين للبدء من الاقتراحات التالية، وعدّل الوصفة والأهداف بالتعاون مع المشارك قبل الاعتماد. لا تمثل جميع الخيارات خطة مطلوب تنفيذها دفعة واحدة.",
      ...sections,
    ].join("\n\n"),
    priorities: priorities as string[],
  };
}
