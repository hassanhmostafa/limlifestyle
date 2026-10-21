export type EventRecommendationCatalogEntry = {
  id: string;
  sourceId: string;
  label: string;
  sourceSummary: string;
  text: string;
  /** Source location is for clinician review; SMART schedules are applied examples. */
  sourceLocation?: string;
};

/**
 * Controlled Arabic education cards. The model may select IDs only; it does not
 * receive authority to invent medical claims, prescriptions, or source text.
 */
export const eventRecommendationCatalog: readonly EventRecommendationCatalogEntry[] =
  [
    {
      id: "measurement-followup",
      sourceId: "ACLM_BOARD4_BEHAVIOR",
      label: "خطوة متابعة قابلة للقياس",
      sourceSummary:
        "منهج تغيير سلوكي تدريجي: اختيار خطوة واحدة واقعية ومتابعة التقدم دون اعتبار القياس تشخيصًا.",
      text: "المتابعة: دوّن القياسات المسجلة اليوم، واختر مع الفريق الصحي مؤشرًا واحدًا لمراجعته في موعد محدد خلال الأسبوعين القادمين؛ سجّل الموعد في تقويمك. هذه القراءات وحدها ليست تشخيصًا.",
    },
    {
      id: "nutrition-plants",
      sourceId: "ACLM_BOARD4_NUTRITION",
      label: "إضافة أطعمة نباتية وحبوب كاملة",
      sourceSummary:
        "تعليم نمط غذائي تدريجي يركز على إضافة خيارات نباتية وحبوب كاملة وفق التفضيلات والملاءمة الشخصية.",
      text: "التغذية: أضف حصة من الخضراوات إلى الغداء يوميًا خلال الأسبوع القادم، وسجّل عدد الأيام التي التزمت فيها. أضف حصة يومية أخرى كل أسبوع حسب ملاءمتك، حتى يبلغ مجموع الفواكه والخضراوات نحو خمس حصص يوميًا؛ راجع تقدمك بعد أسبوع مع مراعاة حساسياتك وخطتك الغذائية.",
    },
    {
      id: "nutrition-sugary",
      sourceId: "ACLM_BOARD4_NUTRITION",
      label: "تقليل السكر المضاف تدريجيًا",
      sourceSummary:
        "تعليم سلوكي تدريجي لتبديل خيار متكرر عالي السكر بخيار أقل سكرًا مضافًا دون منع قاطع أو خطة علاجية.",
      text: "تقليل السكر المضاف: خلال الأسبوع القادم، استبدل مشروبًا محلى واحدًا بالماء أو مشروب غير محلى في خمسة أيام، وسجّل مرات الاستبدال. راجع النتيجة في نهاية الأسبوع واختر خطوة الأسبوع التالي.",
    },
    {
      id: "activity-gradual",
      sourceId: "ACLM_BOARD4_ACTIVITY",
      label: "بدء الحركة تدريجيًا",
      sourceSummary:
        "أي قدر من الحركة أفضل من عدمها، مع البدء التدريجي وتقليل الجلوس؛ ليست تصريحًا لبدء نشاط شديد.",
      text: "النشاط البدني: إذا كان المشي ملائمًا لحالتك، ابدأ بعشر دقائق بعد إحدى الوجبات، خمسة أيام خلال الأسبوع القادم. سجّل الدقائق، وزد خمس دقائق للمرة أسبوعيًا بحسب قدرتك وراحة جسمك، حتى تصل إلى ثلاثين دقيقة خمسة أيام أسبوعيًا. راجع التحمل أسبوعيًا؛ لا تُعد هذه المسودة تصريحًا طبيًا للتمرين.",
    },
    {
      id: "activity-target",
      sourceId: "ACLM_BOARD4_ACTIVITY",
      label: "الاقتراب التدريجي من هدف النشاط",
      sourceSummary:
        "إرشاد نشاط بدني عام للبالغين: التدرج نحو 150 دقيقة أسبوعيًا من النشاط متوسط الشدة وتقوية العضلات، دون فحص طبي أو تصريح تمرين فردي.",
      text: "المحافظة على النشاط: دوّن دقائق نشاطك خلال الأيام السبعة القادمة، وحدّد مع الطبيب مقدار الزيادة المناسب تدريجيًا للوصول إلى 150 دقيقة أسبوعيًا من النشاط متوسط الشدة. عند ملاءمة حالتك، حدّد يومين لتمارين تقوية العضلات؛ راجع الالتزام بعد أسبوع. لا تبدأ نشاطًا شديدًا اعتمادًا على قراءة تركيب الجسم وحدها.",
    },
    {
      id: "sleep-routine",
      sourceId: "ACLM_BOARD4_SLEEP",
      label: "روتين نوم منتظم",
      sourceSummary:
        "مرجع مراجعة طب نمط الحياة، فصل النوم: يحتاج البالغون عمومًا إلى سبع ساعات أو أكثر من النوم يوميًا مع روتين منتظم.",
      text: "النوم: اختر وقت استيقاظ ثابتًا يناسب التزاماتك، والتزم به خلال الأيام السبعة القادمة. سجّل وقت الاستيقاظ يوميًا وراجع الالتزام في نهاية الأسبوع، مع تخصيص وقت كافٍ للنوم؛ يحتاج البالغون عمومًا إلى سبع ساعات أو أكثر يوميًا.",
    },
    {
      id: "tobacco-support",
      sourceId: "ACLM_BOARD4_TOBACCO",
      label: "طلب دعم للإقلاع عن النيكوتين",
      sourceSummary:
        "تشجيع سلوكي غير دوائي لطلب دعم موثوق للإقلاع عن التبغ أو النيكوتين.",
      text: "التبغ والنيكوتين: إذا كنت تستخدمهما، تواصل خلال الأيام السبعة القادمة مع خدمة موثوقة للإقلاع أو الفريق الصحي، وحدّد موعد متابعة وخطوة أولى تناسبك. سجّل موعد التواصل واطلب دعم شخص تثق به؛ لا تتضمن هذه المسودة وصف دواء.",
    },
    {
      id: "small-goal",
      sourceId: "ACLM_BOARD4_BEHAVIOR",
      label: "هدف صحي صغير",
      sourceSummary:
        "اختيار هدف صغير ومحدد وواقعي ومراجعته أسبوعيًا، مع وسائل بسيطة للتعامل مع الضغط لا تحل محل الرعاية المتخصصة.",
      text: "إدارة الضغوط: خصص دقيقتين لتمرين تنفس هادئ في وقت تختاره، خمسة أيام خلال الأسبوع القادم. ضع علامة بعد كل مرة وراجع مدى ملاءمة الخطوة لك في نهاية الأسبوع؛ هذه خطوة مساعدة وليست بديلًا للرعاية المتخصصة.",
    },
    {
      id: "support-connection",
      sourceId: "PRIMARYCARE_CONNECTION",
      sourceLocation: "فصل 9، الصفحات المطبوعة 137–139، صفحات PDF 168–170",
      label: "تواصل داعم",
      sourceSummary:
        "تشجيع الدعم الاجتماعي أو المجتمعي كعنصر مساعد في الاستمرار على هدف صحي شخصي.",
      text: "الترابط والدعم: حدّد خلال الأسبوع القادم موعدًا لمكالمة مدتها عشر دقائق مع شخص موثوق، أو نشاط اجتماعي مناسب تختاره. سجّل إتمامه وراجع في نهاية الأسبوع إن كنت ترغب في تكراره.",
    },
    {
      id: "body-composition-context",
      sourceId: "NICE_NG246_ASSESSMENT",
      label: "فهم قياس الجسم ومتابعة الخصر",
      sourceLocation: "NG246 1.9.8–1.9.9، صفحة PDF 35؛ 1.9.14–1.9.15",
      sourceSummary: "BIA لا يحل محل BMI لتقييم السمنة العامة؛ يُقاس الخصر مع الطول عند BMI أقل من 35. لا يُفسَّر مؤشر الجهاز للدهون الحشوية أو العمر الجسدي كتشخيص.",
      text: "متابعة قياسات الجسم: خلال هذا الأسبوع، راجع الوزن والطول ومؤشر الكتلة المسجلة مع الفريق الصحي، واطلب قياس محيط الخصر بشريط قياس إذا كان مؤشر الكتلة أقل من 35. دوّن القياس للمقارنة في موعد متابعة بعد أربعة أسابيع. نتائج تركيب الجسم تقديرية؛ لا تجعل العمر الجسدي أو رقم الدهون الحشوية هدفًا علاجيًا، ولا تعتبر الكتلة العضلية وحدها قياسًا للقوة.",
    },
    {
      id: "body-weight-plan",
      sourceId: "NICE_NG246_DIET",
      label: "خطة غذائية متوازنة لزيادة الوزن لدى البالغين دون 65",
      sourceLocation: "NG246 1.16، صفحتا PDF 75–76",
      sourceSummary: "تدخل غذائي متوازن يحقق عجزًا في الطاقة مع التخصيص والدعم؛ لا يُحدَّد عجز أو هدف وزن فردي من BIA وحده.",
      text: "تحسين الوزن: خلال الأسبوعين القادمين، حدّد موعدًا مع الطبيب أو اختصاصي التغذية للاتفاق على خطة غذائية متوازنة بكميات تحقق خفضًا معتدلًا للطاقة يناسب حالتك، وسجّل الطعام ثلاثة أيام قبل الموعد. بعد الاتفاق، تابع الوزن مرة أسبوعيًا في ظروف متشابهة وراجع الخطة بعد أربعة أسابيع؛ تجنب الحميات القاسية أو تحديد سعرات اعتمادًا على الجهاز وحده.",
    },
    {
      id: "body-aerobic",
      sourceId: "EASO_EXERCISE_2021",
      label: "نشاط هوائي لزيادة الوزن والسمنة",
      sourceLocation: "Oppert et al., Obesity Reviews 22:e13273، جدول 3، صفحة PDF 5؛ دليل EASO صفحة 1",
      sourceSummary: "يوصي EASO للبالغين بزيادة الوزن والسمنة بـ150–200 دقيقة أسبوعيًا من النشاط الهوائي متوسط الشدة لخفض الوزن والدهون. تدرج البداية التالي صياغة SMART تطبيقية.",
      text: "خفض الدهون وزيادة اللياقة: إذا كان المشي مناسبًا لحالتك ونشاطك الحالي أقل من الهدف، ابدأ بعشر دقائق بوتيرة متوسطة، خمسة أيام هذا الأسبوع، ثم زد خمس دقائق للجلسة أسبوعيًا حسب التحمل حتى تصل إلى ثلاثين دقيقة خمسة أيام أسبوعيًا في الأسبوع الخامس. سجّل الدقائق وراجع التحمل أسبوعيًا. إذا كنت تحقق هذا القدر بالفعل فحافظ عليه وناقش التطوير مع الطبيب؛ قد تتحسن الدهون واللياقة دون نزول كبير في الوزن.",
    },
    {
      id: "body-resistance",
      sourceId: "EASO_EXERCISE_2021",
      label: "المحافظة على العضلات أثناء خفض الوزن",
      sourceLocation: "جدول 3، صفحة PDF 5، توصيتا حفظ الكتلة الخالية من الدهون وقوة العضلات",
      sourceSummary: "المقاومة تحافظ على الكتلة الخالية من الدهون أثناء خفض الوزن وتحسن القوة. جلستان مدة كل منهما 20 دقيقة بداية تطبيقية وليستا جرعة منقولة من الجدول.",
      text: "المحافظة على العضلات: خلال الأسبوعين القادمين، ثبّت جلستَي مقاومة في يومين غير متتاليين أسبوعيًا، مدة كل منهما نحو عشرين دقيقة، بتمارين للعضلات الرئيسية تناسب قدرتك. ابدأ بمقاومة تتيح الحركة الصحيحة وتدرج بعد إتقانها بإرشاد مختص. سجّل الجلسات وراجع التقدم بعد أربعة أسابيع؛ هذا هدف للمحافظة على العضلات ولا يعني أن الجهاز شخّص ضعفًا عضليًا.",
    },
    {
      id: "older-nutrition-review",
      sourceId: "ESPEN_GERIATRICS_2022",
      label: "مراجعة التغذية لمن بلغ 65 عامًا",
      sourceLocation: "ESPEN practical guideline، تعريف الفئة صفحة PDF 2، قسم إنقاص الوزن صفحتا PDF 25–26",
      sourceSummary: "كبار السن 65 عامًا فأكثر؛ تجنب القيود الغذائية العامة، ولا تُنظر حمية إنقاص الوزن إلا في السمنة المصحوبة بمشكلات مرتبطة بالوزن ومع التمرين والتقييم الفردي.",
      text: "التغذية والمحافظة على الوظيفة: خلال الأسبوعين القادمين، رتّب مراجعة تغذوية لتقييم الشهية وتغير الوزن والقوة والقدرة على أداء الأنشطة اليومية. أحضر سجل الطعام لثلاثة أيام وقائمة الأدوية. لا تبدأ حمية لإنقاص الوزن من نتيجة الجهاز وحدها؛ اتفق مع الطبيب على ملاءمتها وخطة غذاء وتمرين فردية، وحدّد موعد متابعة قبل بدء الخطة.",
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
    "نتائج BIA تقديرات وليست تشخيصًا؛ لا يُستنتج ضعف العضلات من كتلتها وحدها، ولا يُعد العمر الجسدي أو مؤشر الدهون الحشوية هدفًا علاجيًا.",
    "توصيات تثقيفية مبنية على بيانات هذه الزيارة؛ اختر منها ما يلائمك وناقش أي قلق صحي مع مختص.",
    ...selected.map((item, index) => `${index + 1}. ${item.text}`),
    "مواعيد البداية والتدرج أمثلة تطبيقية لأهداف SMART تُعدَّل حسب القدرة وتفضيلات الشخص؛ ليست جرعات منقولة حرفيًا من المراجع.",
  ].join("\n");
}

/** Uploaded project editions, rather than inferred titles from legacy IDs. */
export const eventRecommendationSources: Record<string, string> = {
  ACLM_BOARD4_BEHAVIOR: "Foundations of Lifestyle Medicine Board Review Manual, 4th ed. — SMART، صفحة PDF 44",
  ACLM_BOARD4_NUTRITION: "Foundations of Lifestyle Medicine Board Review Manual, 4th ed. — Nutrition",
  ACLM_BOARD4_ACTIVITY: "Foundations of Lifestyle Medicine Board Review Manual, 4th ed. — Physical Activity",
  ACLM_BOARD4_SLEEP: "Foundations of Lifestyle Medicine Board Review Manual, 4th ed. — Sleep Health",
  ACLM_BOARD4_TOBACCO: "Foundations of Lifestyle Medicine Board Review Manual, 4th ed. — Tobacco Cessation",
  PRIMARYCARE_CONNECTION: "Lifestyle Medicine and the Primary Care Provider — Chapter 9: Social Connections and Positive Activities",
  ACLM_BOARD4_CONNECTION: "Foundations of Lifestyle Medicine Board Review Manual, 4th ed. — Social Connection",
  NICE_NG246_ASSESSMENT: "NICE NG246 — Overweight and obesity management: assessment",
  NICE_NG246_DIET: "NICE NG246 — Dietary approaches",
  EASO_EXERCISE_2021: "Oppert et al. Exercise training in the management of overweight and obesity in adults. Obesity Reviews 2021;22:e13273؛ دليل EASO للممارسين",
  ESPEN_GERIATRICS_2022: "ESPEN practical guideline: Clinical nutrition and hydration in geriatrics (2022)",
};

export function recommendationReviewSources(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string")
    .map(id => eventRecommendationById.get(id))
    .filter((item): item is EventRecommendationCatalogEntry => Boolean(item))
    .map(item => ({ id: item.id, label: item.label,
      title: eventRecommendationSources[item.sourceId] ?? item.sourceId,
      location: item.sourceLocation, rationale: item.sourceSummary }));
}
