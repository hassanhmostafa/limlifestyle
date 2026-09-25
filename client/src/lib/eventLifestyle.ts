export type EventAnswer = string | string[] | number;
export type EventAnswers = Record<string, EventAnswer>;
export type EventOption = { value: string; label: string };
export type EventQuestion = {
  id: string;
  text: string;
  type: "radio" | "number" | "multi" | "priority" | "slider";
  options?: EventOption[];
  min?: number;
  max?: number;
  suffix?: string;
};
export type EventSection = { id: string; title: string; intro: string; questions: EventQuestion[] };

const frequency: EventOption[] = [
  { value: "0", label: "أبدًا" }, { value: "0.5", label: "أقل من مرة أسبوعيًا" }, { value: "2", label: "1-3 مرات أسبوعيًا" },
  { value: "5", label: "4-6 مرات أسبوعيًا" }, { value: "10.5", label: "1-2 مرة يوميًا" }, { value: "21", label: "3 مرات أو أكثر يوميًا" },
];
const recentFrequency: EventOption[] = [
  { value: "0", label: "أبدًا" }, { value: "1", label: "عدة أيام" }, { value: "2", label: "أكثر من نصف الأيام" }, { value: "3", label: "كل يوم تقريبًا" },
];
const substanceFrequency: EventOption[] = [
  { value: "0", label: "يوميًا أو شبه يومي" }, { value: "1", label: "أسبوعيًا" }, { value: "2", label: "أقل من مرة أسبوعيًا" }, { value: "3", label: "أبدًا" },
];

const pillars: EventOption[] = [
  { value: "nutrition", label: "التغذية" }, { value: "activity", label: "النشاط البدني" }, { value: "sleep", label: "النوم" },
  { value: "stress", label: "إدارة الضغوط" }, { value: "connection", label: "المعنى والترابط" }, { value: "substances", label: "تجنب المواد الضارة" },
];

export const eventLifestyleSections: EventSection[] = [
  { id: "readiness", title: "الاستعداد للتغيير", intro: "قيّم أهمية التغيير وثقتك بقدرتك عليه.", questions: [
    { id: "importance", text: "ما مدى أهمية إجراء تغييرات في نمط حياتك أو المحافظة عليها لتحسين صحتك؟", type: "slider", min: 0, max: 10 },
    { id: "confidence", text: "ما مدى ثقتك بقدرتك على إجراء هذه التغييرات أو المحافظة عليها؟", type: "slider", min: 0, max: 10 },
  ] },
  { id: "motivation", title: "أولوياتك", intro: "اختر ثلاثة مجالات مختلفة، بالترتيب من الأكثر أهمية لك.", questions: [
    { id: "priority1", text: "الأولوية الأولى", type: "priority", options: pillars },
    { id: "priority2", text: "الأولوية الثانية", type: "priority", options: pillars },
    { id: "priority3", text: "الأولوية الثالثة", type: "priority", options: pillars },
  ] },
  { id: "nutrition", title: "التغذية", intro: "فكّر في طعامك المعتاد خلال الأسابيع الأربعة الماضية.", questions: [
    { id: "fruit", text: "الفواكه", type: "radio", options: frequency }, { id: "vegetables", text: "الخضروات", type: "radio", options: frequency },
    { id: "wholeGrains", text: "الحبوب الكاملة ومنتجاتها", type: "radio", options: frequency }, { id: "refinedGrains", text: "الخبز أو الأرز أو المعكرونة البيضاء", type: "radio", options: frequency },
    { id: "preparedFood", text: "الوجبات الجاهزة أو المطاعم أو الوجبات السريعة", type: "radio", options: frequency }, { id: "sugary", text: "الأطعمة والمشروبات المحلاة", type: "radio", options: frequency },
    { id: "salty", text: "الأطعمة والوجبات الخفيفة مرتفعة الملح", type: "radio", options: frequency }, { id: "fried", text: "الأطعمة المقلية", type: "radio", options: frequency },
    { id: "proteins", text: "مصادر البروتين التي تناولتها 2-3 مرات أسبوعيًا أو أكثر", type: "multi", options: [
      { value: "redMeat", label: "اللحم الأحمر" }, { value: "processedMeat", label: "اللحوم المصنعة" }, { value: "poultry", label: "الدواجن" }, { value: "fish", label: "الأسماك والمأكولات البحرية" },
      { value: "legumes", label: "البقوليات" }, { value: "nuts", label: "المكسرات والبذور أو الأفوكادو" }, { value: "dairy", label: "الحليب ومنتجاته" }, { value: "eggs", label: "البيض" },
    ] },
  ] },
  { id: "sleep", title: "النوم", intro: "أجب بحسب نومك خلال الأسبوعين الماضيين.", questions: [
    { id: "sleepHours", text: "متوسط ساعات النوم خلال 24 ساعة", type: "radio", options: [
      { value: "0", label: "أقل من 5 ساعات" }, { value: "1", label: "نحو 5-6 ساعات" }, { value: "2", label: "نحو 6-7 ساعات" }, { value: "3", label: "نحو 7-8 ساعات" }, { value: "3.1", label: "نحو 8-9 ساعات" }, { value: "2.1", label: "نحو 9-10 ساعات" }, { value: "0.1", label: "أكثر من 10 ساعات" },
    ] },
    { id: "dayTired", text: "كم مرة شعرت بالتعب أو صعوبة البقاء مستيقظًا أثناء المهام اليومية؟", type: "radio", options: recentFrequency },
  ] },
  { id: "activity", title: "النشاط البدني", intro: "أجب بحسب أسبوع اعتيادي خلال آخر 30 يومًا.", questions: [
    { id: "activeDays", text: "أيام ممارسة نشاط متوسط إلى شديد في الأسبوع", type: "number", min: 0, max: 7, suffix: "يوم" },
    { id: "activeMinutes", text: "متوسط مدة النشاط في تلك الأيام", type: "number", min: 0, max: 300, suffix: "دقيقة" },
    { id: "strengthDays", text: "مرات تمارين تقوية العضلات في الأسبوع", type: "number", min: 0, max: 7, suffix: "مرة" },
  ] },
  { id: "mood", title: "المزاج والضغوط", intro: "خلال الأسبوعين الماضيين، كم مرة أزعجتك الأمور التالية؟", questions: [
    { id: "lowInterest", text: "قلة الاهتمام أو الاستمتاع بالأشياء", type: "radio", options: recentFrequency }, { id: "lowMood", text: "الشعور بالحزن أو الإحباط أو فقدان الأمل", type: "radio", options: recentFrequency },
    { id: "notOnTop", text: "الشعور بعدم القدرة على متابعة أمور حياتك", type: "radio", options: recentFrequency }, { id: "overwhelmed", text: "الشعور بالضغط أو الإرهاق النفسي", type: "radio", options: recentFrequency },
  ] },
  { id: "connection", title: "المعنى والترابط", intro: "أجب بحسب تجربتك خلال الأسبوعين الماضيين.", questions: [
    { id: "purpose", text: "شعرت أن لحياتك هدفًا أو معنى", type: "radio", options: recentFrequency }, { id: "support", text: "شعرت بالارتباط بشبكة دعم كالعائلة أو الأصدقاء أو المجتمع أو الجانب الروحي أو الطبيعة", type: "radio", options: recentFrequency },
  ] },
  { id: "substances", title: "استخدام المواد", intro: "إجاباتك سرية. فكّر في الأسابيع الأربعة الماضية.", questions: [
    { id: "tobacco", text: "استخدام التبغ أو النيكوتين، بما فيه التدخين الإلكتروني", type: "radio", options: substanceFrequency }, { id: "alcohol", text: "تناول 5 مشروبات كحولية أو أكثر في يوم واحد للرجل، أو 4 للمرأة", type: "radio", options: substanceFrequency },
    { id: "medMisuse", text: "استخدام دواء بوصفة لغير الغرض الموصوف أو بكمية أكبر", type: "radio", options: substanceFrequency }, { id: "cannabis", text: "استخدام القنب أو منتجاته", type: "radio", options: substanceFrequency }, { id: "otherDrugs", text: "استخدام مواد مخدرة أخرى", type: "radio", options: substanceFrequency },
  ] },
];

const numberAnswer = (answers: EventAnswers, id: string) => Number(answers[id] ?? 0);
const round = (value: number) => Math.round(Math.max(0, Math.min(10, value)) * 10) / 10;

export function scoreEventLifestyle(answers: EventAnswers) {
  const foodIds = ["fruit", "vegetables", "wholeGrains", "refinedGrains", "preparedFood", "sugary", "salty", "fried"];
  const proteins = Array.isArray(answers.proteins) ? answers.proteins as string[] : [];
  const totalFood = foodIds.reduce((sum, id) => sum + numberAnswer(answers, id), 0) + proteins.length * 3;
  const wholePlant = numberAnswer(answers, "fruit") + numberAnswer(answers, "vegetables") + numberAnswer(answers, "wholeGrains") + (proteins.includes("legumes") ? 3 : 0) + (proteins.includes("nuts") ? 3 : 0);
  const nutrition = round(totalFood ? (wholePlant / totalFood) * 10 : 0);
  const sleep = round(((Math.floor(numberAnswer(answers, "sleepHours")) + (3 - numberAnswer(answers, "dayTired"))) / 6) * 10);
  const weeklyMinutes = Math.min(300, numberAnswer(answers, "activeDays") * numberAnswer(answers, "activeMinutes"));
  const aerobic = weeklyMinutes === 0 ? 0 : weeklyMinutes < 90 ? 1 : weeklyMinutes < 150 ? 2 : weeklyMinutes < 300 ? 3 : 4;
  const strengthRaw = numberAnswer(answers, "strengthDays");
  const strength = strengthRaw === 0 ? 0 : strengthRaw === 1 ? 1 : strengthRaw === 2 ? 2 : 3;
  const activity = round(((aerobic + strength) / 7) * 10);
  const moodRaw = ["lowInterest", "lowMood", "notOnTop", "overwhelmed"].reduce((sum, id) => sum + numberAnswer(answers, id), 0);
  const mood = round(((12 - moodRaw) / 12) * 10);
  const connection = round(((numberAnswer(answers, "purpose") + numberAnswer(answers, "support")) / 6) * 10);
  const substances = round((["tobacco", "alcohol", "medMisuse", "cannabis", "otherDrugs"].reduce((sum, id) => sum + numberAnswer(answers, id), 0) / 15) * 10);
  const domains = { nutrition, activity, sleep, mood, connection, substances };
  return { domains, overall: Math.round((Object.values(domains).reduce((sum, value) => sum + value, 0) / 60) * 100), readiness: round((numberAnswer(answers, "importance") + numberAnswer(answers, "confidence")) / 2) };
}
