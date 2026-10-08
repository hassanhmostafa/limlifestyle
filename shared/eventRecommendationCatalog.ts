export type EventRecommendationCatalogEntry = {
  id: string;
  sourceId: string;
  label: string;
  sourceSummary: string;
  text: string;
};

/**
 * Controlled Arabic education cards. The model may select IDs only; it does not
 * receive authority to invent medical claims, prescriptions, or source text.
 */
export const eventRecommendationCatalog: readonly EventRecommendationCatalogEntry[] = [
  {
    id: "measurement-followup",
    sourceId: "RIPPE_LM4_2024_BEHAVIOR",
    label: "خطوة متابعة قابلة للقياس",
    sourceSummary: "منهج تغيير سلوكي تدريجي: اختيار خطوة واحدة واقعية ومتابعة التقدم دون اعتبار القياس تشخيصًا.",
    text: "استخدم القياسات المسجلة كنقطة متابعة مع فريق الفعالية، واختر خطوة عملية واحدة قابلة للقياس لتراجعها لاحقًا. هذه القراءات وحدها لا تُعد تشخيصًا طبيًا.",
  },
  {
    id: "nutrition-plants",
    sourceId: "RIPPE_LM4_2024_NUTRITION",
    label: "إضافة أطعمة نباتية وحبوب كاملة",
    sourceSummary: "تعليم نمط غذائي تدريجي يركز على إضافة خيارات نباتية وحبوب كاملة وفق التفضيلات والملاءمة الشخصية.",
    text: "ابدأ هذا الأسبوع بإضافة خضار أو فاكهة إلى وجبة معتادة، وجرّب استبدال جزء من الحبوب المكررة بحبوب كاملة غنية بالألياف بما يلائم تفضيلاتك وحساسياتك الغذائية.",
  },
  {
    id: "nutrition-sugary",
    sourceId: "RIPPE_LM4_2024_NUTRITION",
    label: "تقليل السكر المضاف تدريجيًا",
    sourceSummary: "تعليم سلوكي تدريجي لتبديل خيار متكرر عالي السكر بخيار أقل سكرًا مضافًا دون منع قاطع أو خطة علاجية.",
    text: "اختر مشروبًا أو وجبة محلاة متكررة واستبدلها تدريجيًا بخيار أقل إضافة للسكر يناسبك، مع الاستمرار في تحسين نمط الطعام ككل بدل التركيز على منع صنف واحد فقط.",
  },
  {
    id: "activity-gradual",
    sourceId: "WHO_PHYSICAL_ACTIVITY_2025",
    label: "بدء الحركة تدريجيًا",
    sourceSummary: "أي قدر من الحركة أفضل من عدمها، مع البدء التدريجي وتقليل الجلوس؛ ليست تصريحًا لبدء نشاط شديد.",
    text: "أي قدر من الحركة أفضل من عدمها. اختر نشاطًا مريحًا وآمنًا لك مثل المشي، وابدأ تدريجيًا مع تقليل فترات الجلوس الطويلة قدر الإمكان.",
  },
  {
    id: "activity-target",
    sourceId: "WHO_PHYSICAL_ACTIVITY_2025",
    label: "الاقتراب التدريجي من هدف النشاط",
    sourceSummary: "إرشاد نشاط بدني عام للبالغين: التدرج نحو 150 دقيقة أسبوعيًا من النشاط متوسط الشدة وتقوية العضلات، دون فحص طبي أو تصريح تمرين فردي.",
    text: "عند الملاءمة لك، ابنِ نشاطك تدريجيًا نحو 150 دقيقة أسبوعيًا من النشاط متوسط الشدة، مع تمارين تقوية للمجموعات العضلية الرئيسية يومين أو أكثر أسبوعيًا. لا تبدأ نشاطًا شديدًا اعتمادًا على قراءة تركيب الجسم وحدها.",
  },
  {
    id: "sleep-routine",
    sourceId: "CDC_ADULT_SLEEP",
    label: "روتين نوم منتظم",
    sourceSummary: "تثقيف CDC العام للبالغين: يحتاج البالغون عمومًا إلى سبع ساعات أو أكثر من النوم يوميًا مع روتين منتظم.",
    text: "حافظ على موعد نوم واستيقاظ منتظم قدر الإمكان، وهيّئ بيئة هادئة للنوم. يحتاج البالغون عمومًا إلى 7 ساعات أو أكثر من النوم يوميًا.",
  },
  {
    id: "tobacco-support",
    sourceId: "RIPPE_LM4_2024_TOBACCO",
    label: "طلب دعم للإقلاع عن النيكوتين",
    sourceSummary: "تشجيع سلوكي غير دوائي لطلب دعم موثوق للإقلاع عن التبغ أو النيكوتين.",
    text: "إذا كنت تستخدم التبغ أو النيكوتين، فاختر موعدًا أو خطوة صغيرة لطلب دعم الإقلاع من فريق صحي أو خدمة موثوقة، واطلب دعم الأسرة أو الأصدقاء. لا تتضمن هذه التوصية وصف أدوية.",
  },
  {
    id: "small-goal",
    sourceId: "RIPPE_LM4_2024_BEHAVIOR",
    label: "هدف صحي صغير",
    sourceSummary: "اختيار هدف صغير ومحدد وواقعي ومراجعته أسبوعيًا، مع وسائل بسيطة للتعامل مع الضغط لا تحل محل الرعاية المتخصصة.",
    text: "حوّل أولويتك إلى هدف صغير ومحدد وواقعي لهذا الأسبوع، وسجّل تقدمك بطريقة بسيطة. يمكن لتمرين تنفّس هادئ أو دقيقة يقظة ذهنية أن يدعم التعامل مع الضغوط دون أن يكون بديلًا للرعاية المتخصصة.",
  },
  {
    id: "support-connection",
    sourceId: "RIPPE_LM4_2024_CONNECTION",
    label: "تواصل داعم",
    sourceSummary: "تشجيع الدعم الاجتماعي أو المجتمعي كعنصر مساعد في الاستمرار على هدف صحي شخصي.",
    text: "اختر تواصلًا داعمًا واحدًا هذا الأسبوع، مثل مكالمة مع شخص موثوق أو نشاط مجتمعي مناسب لك، وشاركه الهدف الصحي الذي اخترته إذا رغبت.",
  },
] as const;

export const eventRecommendationById = new Map(
  eventRecommendationCatalog.map(item => [item.id, item])
);

export function composeEventLifestyleDraft(ids: readonly string[]) {
  const selected = ids
    .map(id => eventRecommendationById.get(id))
    .filter((item): item is EventRecommendationCatalogEntry => Boolean(item));
  return [
    "توصيات تثقيفية مبنية على بيانات هذه الزيارة؛ اختر منها ما يلائمك وناقش أي قلق صحي مع مختص.",
    ...selected.map((item, index) => `${index + 1}. ${item.text}`),
  ].join("\n");
}
