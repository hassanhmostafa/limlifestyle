/** Reviewed display translations. Answer codes, stored snapshots and clinical values are never rewritten. */
export type EventLanguage = "ar" | "en";
export const eventEnglish: Readonly<Record<string, string>> = {
  "يُجهّز الملف تلقائيًا؛ يمكنك حفظه عند اكتمال التجهيز أو استخدام نافذة الطباعة.":
    "The file is prepared automatically. Save it when ready, or use the browser print dialog.",
  "حفظ التقرير والاستبيان (PDF)": "Save report + questionnaire (PDF)",
  "حفظ التقرير (PDF)": "Save report (PDF)",
  "طباعة / حفظ PDF من المتصفح": "Print / Save PDF in browser",
  جدة: "Jeddah",
  "تم إنشاء جلستك الصحية": "Your health session has been created",
  "تعذر حفظ الجلسة بعد التحقق. بياناتك محفوظة؛ اطلب رمزًا جديدًا وأعد المحاولة.":
    "Could not save your session after verification. Your details are still here; request a new code and try again.",
  "تعذر حفظ التسجيل حاليًا. حاول مرة أخرى، وإذا استمرت المشكلة تواصل مع منظم الفعالية. بياناتك ما زالت محفوظة في النموذج.":
    "Registration could not be saved. Try again, or contact the event organizer if the problem continues. Your details are still in the form.",
  "تم حفظ تقييم نمط الحياة": "Lifestyle assessment saved",
  "اكتملت رحلتك الصحية": "Your health journey is complete",
  "حُفظت نسخة التقرير وتمت مزامنتها.": "Report copy saved and synchronized.",
  "جارٍ حفظ نسخة التقرير الأصلية…": "Saving the original report…",
  "حُفظت نسخة التقرير الأصلية.": "Original report saved.",
  "يجري حفظ النسخة الأصلية في محاولة أخرى. احتفظ بهذا الملف وأعد المحاولة بعد دقائق إذا لم تتغير الحالة.":
    "Another attempt is saving the original. Keep this file and retry in a few minutes if the status does not change.",
  "نسخة التقرير الأصلية بانتظار الحفظ. يمكنك إعادة المحاولة بنفس الملف.":
    "The original report is awaiting storage. You can retry with the same file.",
  "تعذر حفظ الأصل. يمكنك إعادة المحاولة بنفس الملف دون إعادة توليد التوصيات.":
    "Could not save the original. Retry with the same file without generating new recommendations.",
  "حُفظت النسخة الأصلية؛ المزامنة بانتظار الاتصال.":
    "Original saved; synchronization is waiting for a connection.",
  "نسخة التقرير بانتظار الحفظ والمزامنة. احتفظ بالملف وأعد المحاولة.":
    "The report is awaiting storage and synchronization. Keep the file and try again.",
  "تعذر حفظ الأرشيف حاليًا. الملف والتوصيات المعتمدة لم تتغير.":
    "The archive is temporarily unavailable. The file and approved recommendations are unchanged.",
  "جارٍ التحقق من نسخة التقرير…": "Checking the report copy…",
  "تعذر التحقق من الأرشيف. أعد المحاولة.":
    "Could not check the archive. Try again.",
  "نسخة التقرير الأصلية بانتظار الحفظ.":
    "The original report is awaiting storage.",
  "لا توجد نسخة PDF أصلية مؤرشفة لهذه الزيارة القديمة.":
    "No original PDF was archived for this older visit.",
  "البيانات الشخصية": "Personal details",
  "تم حفظ بياناتك": "Your details are saved",
  "تقييم نمط الحياة": "Lifestyle assessment",
  "نحو 10 دقائق": "About 10 minutes",
  "تحليل عناصر الجسم": "Body composition analysis",
  "امسح رمز جوالك قبل القياس": "Scan your phone code before measurement",
  "محطة التمريض": "Nursing station",
  "تم اعتماد القياسات": "Measurements approved",
  "توجّه لمحطة التمريض": "Go to the nursing station",
  "توصيات لنمط حياة صحي": "Healthy lifestyle recommendations",
  "الاستشارة الطبية": "Medical consultation",
  "تظهر بعد اعتماد التمريض": "Available after nursing approval",
  "تظهر بعد تحليل الجسم": "Available after body analysis",
  "نتائجك جاهزة للاستشارة": "Your results are ready for consultation",
  "يمكن المتابعة أثناء انتظار النتيجة":
    "You can continue while waiting for results",
  "التقرير النهائي": "Final report",
  "التوصيات جاهزة": "Recommendations ready",
  "اعتمد الطبيب التقرير": "Doctor approved the report",
  "يظهر بعد اكتمال التوصيات": "Available when recommendations are complete",
  "يظهر بعد اعتماد الطبيب": "Available after doctor approval",
  "بوستر الفعالية": "Event poster",
  "انتهى التسجيل في هذه الفعالية. شكرًا لاهتمامك.":
    "Registration for this event has closed. Thank you for your interest.",
  "تعذر تحميل إعدادات التسجيل.": "Could not load registration settings.",
  "إعادة المحاولة": "Try again",
  "التحقق بالجوال غير متاح حاليًا. يرجى التواصل مع منظم الفعالية لإكمال التسجيل.":
    "Phone verification is temporarily unavailable. Contact the event organizer to complete registration.",
  "اكتملت التوصيات التثقيفية؛ يمكنك الاطلاع على التقرير الآن.":
    "Your educational recommendations are ready. You can view the report now.",
  "اعتمد الطبيب تقريرك؛ يمكنك الاطلاع عليه الآن.":
    "Your doctor has approved your report. You can view it now.",
  "تم اعتماد قياساتك، توجّه إلى الطبيب.":
    "Your measurements are approved. Go to the doctor.",
  "توجّه إلى محطة التمريض وقدّم رمزك للفريق لإدخال القياسات.":
    "Go to the nursing station and show your code so the team can enter your measurements.",
  "قدّم رمزك للطبيب لمراجعة نتائجك وإضافة النصائح. يظهر التقرير بعد اعتماد الطبيب.":
    "Show your code to the doctor to review your results and add advice. Your report will appear after approval.",
  "تحديث الحالة": "Refresh status",
  "متابعة حالة التقرير": "Check report status",
  "متابعة إلى الطبيب": "Continue to the doctor",
  "إعداد التوصيات": "Prepare recommendations",
  "إعادة محاولة إعداد التوصيات": "Retry preparing recommendations",
  "عرض التقرير النهائي": "View final report",
  "تعذر تحديث الحالة، حاول مرة أخرى.":
    "Could not refresh the status. Try again.",
  "نصائح الطبيب": "Doctor's advice",
  "اعتمدها:": "Approved by:",
  "قياسات التمريض": "Nursing measurements",
  "التقرير النهائي بانتظار اعتماد الطبيب.":
    "The final report is awaiting doctor approval.",
  "جارٍ استرجاع جلسة الفعالية…": "Restoring your event session…",
  "رحلتك الصحية في الفعالية": "Your event health journey",
  "فعاليات LIM": "LIM Events",
  "الخطوة الأولى": "First step",
  "ابدأ رحلتك بصورة أوضح لصحتك":
    "Start your journey with a clearer picture of your health",
  "سجّل بياناتك الأساسية، ثم أكمل التقييم والقياسات واحفظ تقريرك في جوالك.":
    "Enter your basic details, complete the assessment and measurements, then save your report on your phone.",
  "بيانات المشارك": "Participant details",
  "تُحفظ في جلسة الفعالية الخاصة بك. لا يلزم تسجيل دخول تطبيق LIM هنا.":
    "Saved in your event session. No LIM app sign-in is required here.",
  "الاسم الأول (اختياري)": "First name (optional)",
  "مثال: عبداللطيف": "Example: Alex",
  العمر: "Age",
  الجنس: "Sex",
  ذكر: "Male",
  أنثى: "Female",
  "رقم الجوال": "Mobile number",
  "المدينة (اختياري)": "City (optional)",
  "أوافق على استخدام بياناتي لإتمام التقييم وربط نتائج الفحص بهذه الجلسة وإتاحتها لفريق التمريض والطبيب المصرح لهم في هذه الفعالية.":
    "I consent to the use of my data to complete the assessment, link screening results to this session, and make them available to authorized nursing staff and doctors at this event.",
  "قرأت وأوافق على": "I have read and agree to the",
  "الشروط والأحكام": "Terms and Conditions",
  و: "and",
  "سياسة الخصوصية": "Privacy Policy",
  ". الموافقة مطلوبة لإنشاء الجلسة.":
    ". Consent is required to create a session.",
  "إنشاء جلستي الصحية": "Create my health session",
  "أهلًا {{value}}": "Welcome {{value}}",
  "أهلًا بك": "Welcome",
  "رحلتك الصحية اليوم": "Your health journey today",
  اكتملت: "Completed",
  من: "of",
  "أكمل كل خطوة بالترتيب. تُحفظ بيانات النموذج في هذه الجلسة فقط.":
    "Complete each step in order. Form details are saved in this session only.",
  مكتملة: "Complete",
  "رمز الجلسة": "Session code",
  "جلسة جديدة": "New session",
  "0 — غير مهم إطلاقًا": "0 — Not important at all",
  "0 — غير واثق إطلاقًا": "0 — Not confident at all",
  "10 — مهم جدًا": "10 — Very important",
  "10 — واثق جدًا": "10 — Very confident",
  "لا أتناول أيًا من هذه المصادر بهذا التكرار":
    "I do not eat any of these sources this often",
  التالي: "Next",
  "حفظ التقييم": "Save assessment",
  "متابعة الرحلة": "Continue journey",
  "رمز جوالك للفحص": "Your screening phone code",
  "امسح الرمز بقارئ جهاز تحليل الجسم قبل بدء القياس.":
    "Scan this code with the body analyzer's reader before starting the measurement.",
  "سيظهر الرقم نفسه في خانة": "The same number will appear in the",
  "على الجهاز:": "field on the device:",
  "تعذر تجهيز رمز الجهاز لهذه الجلسة.":
    "Could not prepare a device code for this session.",
  "بانتظار نتيجة الجهاز": "Waiting for device results",
  "بعد القياس يرسل X18 النتيجة مباشرة إلى نظام LIM. ستظهر هنا تلقائيًا، ويمكنك المتابعة إلى الاستشارة أثناء الانتظار.":
    "After measurement, X18 sends the result directly to LIM. It will appear here automatically. You can continue to the consultation while waiting.",
  "تحديث النتائج": "Refresh results",
  "التقرير الصحي": "Health report",
  المشارك: "Participant",
  "الجوال:": "Mobile:",
  "هذا التقرير يعرض نتائج التقييم والقياسات كما سُجلت، ولا يُعد تشخيصًا طبيًا.":
    "This report displays the assessment and measurements as recorded. It is not a medical diagnosis.",
  "جارٍ حفظ الأرشيف…": "Saving archive…",
  "إعادة محاولة حفظ النسخة الأصلية": "Retry saving the original",
  "اكتملت الرحلة": "Journey complete",
  "إنهاء الرحلة": "Finish journey",
  "تُحفظ كل خطوة تلقائيًا": "Each step is saved automatically",
  "العودة إلى الرحلة": "Back to journey",
  "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.":
    "The code has expired. Request a new one.",
  "التحقق من رقم الجوال": "Mobile number verification",
  "تأكيد الجوال برمز OTP": "Verify your mobile with an OTP",
  "✓ تم التحقق من رقم الجوال": "✓ Mobile number verified",
  "نرسل رمزًا برسالة SMS للتأكد من رقمك. لا تحتاج كتابة رقم الجوال مرة ثانية.":
    "We send an SMS code to verify your number. You do not need to enter your mobile number again.",
  "تعذر إرسال رمز التحقق حاليًا. حاول مرة أخرى بعد قليل.":
    "Could not send a verification code right now. Try again shortly.",
  "جارٍ إرسال الرمز…": "Sending code…",
  "إعادة الإرسال بعد {{value}} ثانية": "Resend in {{value}} seconds",
  "إعادة إرسال الرمز": "Resend code",
  "إرسال رمز التحقق": "Send verification code",
  "تم إرسال الرمز إلى": "Code sent to",
  "رمز التحقق (٤ أرقام)": "Verification code (4 digits)",
  "تعذر تأكيد رمز التحقق حاليًا. حاول مرة أخرى بعد قليل.":
    "Could not verify the code right now. Try again shortly.",
  "جارٍ التحقق…": "Verifying…",
  "تأكيد الرمز": "Verify code",
  "وقت القياس غير متوفر": "Measurement time unavailable",
  "غير متوفر": "Unavailable",
  "تقدير الجهاز": "Device estimate",
  "المدى الطبيعي غير متوفر": "Reference range unavailable",
  "بيانات اختبار": "Test data",
  "نتائج جهاز القياس": "Device results",
  "نتائج تحليل الجسم": "Body composition results",
  سنة: "years",
  "توزيع الدهون والعضلات": "Fat and muscle distribution",
  "توزيع العضلات بالجسم": "Muscle distribution",
  "توزيع الدهون بالجسم": "Fat distribution",
  "قيم اختبار مولّدة عشوائيًا ومرفوعة عبر رابط بيانات X18، وليست نتيجة من جهاز فعلي.":
    "Random test values submitted through the X18 data endpoint; not results from a physical device.",
  "القياسات تقديرية. التصنيف حسب المدى الموضح أو تقييم الجهاز عند غيابه. اليمين واليسار من منظور صاحب القياس.":
    "Measurements are estimates. Categories use the displayed range, or the device assessment when no range is provided. Left and right are from the participant's perspective.",
  "الأخضر: طبيعي؛ البرتقالي إلى الأحمر: ابتعاد عن المدى فقط، وليس شدة حالة.":
    "Green: within range; orange to red: distance from range only, not condition severity.",
  "رقم التحليل:": "Measurement ID:",
  "المؤشر العام": "Overall index",
  "مرجع المؤشر العام": "Overall index reference",
  "الفئة المختارة": "Selected category",
  "نقاط القوة في نمط حياتك": "Your lifestyle strengths",
  "استمر في البناء تدريجيًا على هذه الجوانب بما يناسبك.":
    "Keep building on these areas gradually in a way that suits you.",
  "نتائج استبيان نمط الحياة": "Lifestyle questionnaire results",
  "الاستبيان مفعّل لهذه الزيارة، لكن الإجابات غير مكتملة؛ لذلك لا تظهر درجات أو جوانب تحسين مكتملة.":
    "The questionnaire is enabled for this visit, but answers are incomplete. Complete scores and improvement areas are therefore unavailable.",
  "جوانب التحسين بناء على إجاباتك": "Areas to improve based on your answers",
  "المؤشر والملخص توعويان مبنيان على الإجابات المسجلة، ولا يُعدان تشخيصًا طبيًا.":
    "The index and summary are educational, based on recorded answers, and are not a medical diagnosis.",
  "ملخص نتائج نمط الحياة": "Lifestyle results summary",
  "ملخص الصحة الشاملة": "Whole health summary",
  "صورة مبسطة تساعدك على اختيار الخطوة الصحية التالية.":
    "A simple overview to help you choose your next healthy step.",
  "أهمية التغيير": "Importance of change",
  "مدى أهمية التحسين لك": "How important improvement is to you",
  "الثقة بالقدرة": "Confidence",
  "ثقتك بقدرتك على التغيير": "Your confidence in making changes",
  الاستعداد: "Readiness",
  "متوسط الأهمية والثقة": "Average importance and confidence",
  "المحاور الستة": "The six pillars",
  "هذا ملخص توعوي مبني على إجاباتك، ولا يُعد تشخيصًا طبيًا أو بديلًا عن تقييم المختص. لا يعرض الملخص إجاباتك الحساسة بالتفصيل.":
    "This educational summary is based on your answers. It is not a medical diagnosis or a substitute for professional assessment. Sensitive answers are not shown in detail.",
  "تقرير رحلتك الصحية": "Your health journey report",
  "أُعيد توليده ·": "Regenerated ·",
  "توصيات الطبيب": "Doctor's recommendations",
  "لم تُضف توصيات.": "No recommendations added.",
  "نتائج التقييم والقياسات كما سُجلت؛ لا تُعد تشخيصًا طبيًا بمفردها.":
    "Assessment and measurements as recorded; they are not a medical diagnosis on their own.",
  "تحميل التقرير للطباعة (PDF)": "Download report for printing (PDF)",
  "تعذر تجهيز التقرير. أعد المحاولة.":
    "Could not prepare the report. Try again.",
  "تعذر العثور على التقرير": "Could not find the report",
  "تعذر تجهيز PDF. حاول مرة أخرى من Safari أو Chrome.":
    "Could not prepare the PDF. Try again in Safari or Chrome.",
  "تم تنزيل الملفين. أرفقهما في محادثة واتساب التي تختارها.":
    "Both files were downloaded. Attach them to your chosen WhatsApp chat.",
  "تم تنزيل التقرير. أرفقه في محادثة واتساب التي تختارها.":
    "The report was downloaded. Attach it to your chosen WhatsApp chat.",
  "تقرير ليم الصحي": "LIM health report",
  "تعذرت المشاركة المباشرة؛ تم تنزيل الملفين لإرفاقهما في واتساب.":
    "Direct sharing was unavailable; both files were downloaded to attach in WhatsApp.",
  "تعذرت المشاركة المباشرة؛ تم تنزيل التقرير لإرفاقه في واتساب.":
    "Direct sharing was unavailable; the report was downloaded to attach in WhatsApp.",
  "جارٍ فتح التقرير…": "Opening report…",
  "التقرير وملف الإجابات يحملان معرّف الفحص نفسه، وتتم مشاركتهما معًا.":
    "The report and answer file have the same screening identifier and are shared together.",
  "جارٍ تجهيز التقرير…": "Preparing report…",
  "جارٍ تجهيز الاستبيان…": "Preparing questionnaire…",
  "إعادة تجهيز التقرير + الاستبيان للمشاركة":
    "Prepare report + questionnaire again for sharing",
  "مشاركة التقرير + الاستبيان عبر الواتساب":
    "Share report + questionnaire via WhatsApp",
  "إعادة تجهيز التقرير": "Prepare report again",
  "يُجهّز الملف تلقائيًا؛ بعد ذلك اضغط المشاركة واختر واتساب.":
    "The file is prepared automatically. Then tap Share and choose WhatsApp.",
  "5 أكتوبر 2026": "5 October 2026",
  "العودة إلى التسجيل": "Back to registration",
  "آخر تحديث:": "Last updated:",
  ". للاستفسار أو ممارسة حقوقك، تواصل مع منظم الفعالية أو فريق LIM الموجود في موقع الفعالية.":
    ". For questions or to exercise your rights, contact the event organizer or the LIM team at the venue.",
  "توضح هذه الشروط طبيعة تجربة LIM الصحية في الفعالية وحدود استخدامها.":
    "These terms explain the nature and limits of the LIM health experience at this event.",
  "1. طبيعة الخدمة": "1. Nature of the service",
  "تقدم LIM تقييمًا تثقيفيًا لنمط الحياة وقراءات تقديرية من أجهزة القياس، مع إمكانية مراجعتها من فريق التمريض والطبيب المصرح لهما في الفعالية. النتائج والتوصيات للتوعية ولا تُعد تشخيصًا أو وصفة علاجية أو بديلًا للرعاية الطبية.":
    "LIM provides an educational lifestyle assessment and estimated device readings, which may be reviewed by authorized event nursing staff and doctors. Results and recommendations are for education. They are not a diagnosis, prescription, or substitute for medical care.",
  "2. أهلية المشاركة": "2. Eligibility",
  "التسجيل مخصص للبالغين بعمر 18 سنة فأكثر. يلتزم المشارك بإدخال معلومات صحيحة تخصه واستخدام رقم جوال يمكنه استلام رمز التحقق عليه.":
    "Registration is for adults aged 18 and over. Participants must provide accurate information about themselves and use a mobile number that can receive a verification code.",
  "3. القياسات والنتائج": "3. Measurements and results",
  "قد تتأثر قياسات تركيب الجسم بالسوائل والطعام والنشاط ووقت القياس وحالة الجهاز. تُعرض القيم والمعدلات المرجعية كما يرسلها الجهاز، ويجب مناقشة أي نتيجة مقلقة مع مختص صحي.":
    "Body composition measurements may be affected by hydration, food, activity, measurement time, and device condition. Values and reference ranges are displayed as supplied by the device. Discuss any concerning result with a health professional.",
  "4. الحالات الطارئة": "4. Emergencies",
  "الخدمة غير مخصصة للطوارئ. عند وجود ألم شديد، ضيق تنفس، فقدان وعي أو أعراض عاجلة، اطلب المساعدة الطبية الطارئة مباشرة.":
    "This service is not for emergencies. For severe pain, difficulty breathing, loss of consciousness, or urgent symptoms, seek emergency medical help immediately.",
  "5. الاستخدام المقبول": "5. Acceptable use",
  "لا يجوز إساءة استخدام رموز الجلسات أو محاولة الوصول إلى بيانات الآخرين أو تعطيل الخدمة. يحتفظ النظام بحق إيقاف الجلسة عند الاشتباه في إساءة الاستخدام.":
    "Do not misuse session codes, attempt to access other people's data, or disrupt the service. A session may be suspended if misuse is suspected.",
  "6. خدمات الأطراف المساندة": "6. Supporting services",
  "قد تعتمد التجربة على مزود رسالة التحقق، والاستضافة، وجهاز القياس. تُستخدم هذه الخدمات بالقدر اللازم لتشغيل الرحلة الصحية.":
    "The experience may rely on an SMS provider, hosting, and measurement equipment. These services are used as necessary to operate the health journey.",
  "7. التعديلات": "7. Changes",
  "قد تُحدّث هذه الشروط لتحسين الخدمة أو الامتثال للمتطلبات النظامية. تظهر نسخة النص وتاريخ تحديثها في هذه الصفحة.":
    "These terms may be updated to improve the service or meet regulatory requirements. The text version and update date appear on this page.",
  "نلتزم بجمع أقل قدر لازم من البيانات وحمايتها وقصر الوصول عليها على المصرح لهم.":
    "We aim to collect only necessary data, protect it, and limit access to authorized people.",
  "موافقة واضحة": "Clear consent",
  "لن تُنشأ الجلسة قبل موافقتك الصريحة.":
    "A session will not be created without your explicit consent.",
  "وصول محدود": "Limited access",
  "لفريق الفعالية المصرح له وضمن الحاجة المهنية.":
    "For authorized event staff according to their professional need.",
  "1. البيانات التي نجمعها": "1. Data we collect",
  "قد تشمل الاسم الأول الاختياري، العمر، الجنس، رقم الجوال، المدينة، إجابات تقييم نمط الحياة، نتائج جهاز تركيب الجسم، قياسات التمريض، وملاحظات الطبيب، إضافة إلى بيانات تقنية لازمة لأمن الجلسة.":
    "Data may include optional first name, age, sex, mobile number, city, lifestyle assessment answers, body composition results, nursing measurements, and doctor's notes, along with technical data needed to secure the session.",
  "2. لماذا نستخدمها": "2. Why we use it",
  "لإنشاء جلسة الفعالية، التحقق من رقم الجوال، ربط القياسات بالمشارك الصحيح، عرض التقرير، تمكين فريق الرعاية المصرح له من المراجعة، وحماية الخدمة وتحسين جودتها.":
    "To create your event session, verify your mobile number, link measurements to the correct participant, display your report, enable review by authorized care staff, protect the service, and improve its quality.",
  "3. من يستطيع الاطلاع": "3. Who can access it",
  "يقتصر الاطلاع على فريق التمريض والطبيب وموظفي التشغيل المصرح لهم بحسب دورهم والفعالية المكلفين بها. قد نستعين بمزودي خدمة تقنيين لمعالجة الحد الأدنى اللازم للتشغيل.":
    "Access is limited to authorized nursing staff, doctors, and operational staff according to their role and assigned event. Technical service providers may process the minimum data needed for operation.",
  "4. المعالجة الآلية للتوصيات": "4. Automated recommendations",
  "قد تختار الفعالية وضع توصيات نمط الحياة التلقائية بعد اكتمال قياسات التمريض. في هذا الوضع تُعالج إجابات الاستبيان والقياسات المرتبطة بهذه الزيارة لاختيار توصيات تثقيفية من قائمة معتمدة مسبقًا. لا تستخدم هذه المعالجة ملاحظات التمريض الحرة أو رقم الجوال أو الاسم لإنشاء التوصية، ولا تُعد تشخيصًا أو وصفة علاجية أو بديلًا عن الرعاية الطبية.":
    "The event may enable automatic lifestyle recommendations after nursing measurements are complete. In this mode, questionnaire answers and measurements linked to this visit are processed to select educational recommendations from a preapproved list. Free-text nursing notes, mobile number, and name are not used to generate recommendations. This processing is not a diagnosis, prescription, or substitute for medical care.",
  "5. التحليل والبحث": "5. Analysis and research",
  "قد تُستخدم بيانات مجمعة أو منزوعة الهوية لإحصاءات الفعالية وتحسين الخدمة. لا تشمل موافقة الخدمة استخدام بيانات تعريفية في بحث علمي مستقل؛ ويتطلب ذلك إجراءً وموافقة منفصلين عند انطباقه.":
    "Aggregated or deidentified data may be used for event statistics and service improvement. Service consent does not cover using identifiable data in independent scientific research; a separate process and consent are required where applicable.",
  "6. مدة الاحتفاظ والحماية": "6. Retention and protection",
  "تُحفظ البيانات للمدة اللازمة لتقديم الخدمة وإصدار التقرير والوفاء بالمتطلبات النظامية، وفق ضوابط الاحتفاظ المعتمدة. نستخدم وسائل تنظيمية وتقنية لتقليل الوصول غير المصرح به، ولا توجد وسيلة إلكترونية تضمن انعدام المخاطر بالكامل.":
    "Data is retained for the time needed to provide the service, issue the report, and meet regulatory requirements under approved retention rules. Organizational and technical measures reduce unauthorized access, but no electronic method can guarantee zero risk.",
  "7. حقوقك": "7. Your rights",
  "يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو طلب إتلافها أو سحب الموافقة، مع مراعاة المتطلبات النظامية وآثار سحب الموافقة على استمرار الخدمة. تواصل مع منظم الفعالية أو فريق LIM لتقديم الطلب.":
    "You may request access, correction, deletion, or withdrawal of consent, subject to regulatory requirements and the effect of withdrawal on continued service. Contact the event organizer or LIM team to submit a request.",
  الطول: "Height",
  سم: "cm",
  الوزن: "Weight",
  كجم: "kg",
  "مؤشر كتلة الجسم": "Body mass index",
  "نسبة الدهون": "Body fat",
  "العضلات الهيكلية": "Skeletal muscle",
  "الدهون الحشوية": "Visceral fat",
  مستوى: "level",
  "نسبة الخصر إلى الورك": "Waist-to-hip ratio",
  "العمر الجسدي التقديري": "Estimated body age",
  "الطبيعي حسب نتائجك": "Your reference range",
  منخفض: "Low",
  مرتفع: "High",
  طبيعي: "Within range",
  أبدًا: "Never",
  "أقل من مرة أسبوعيًا": "Less than once a week",
  "1-3 مرات أسبوعيًا": "1–3 times a week",
  "4-6 مرات أسبوعيًا": "4–6 times a week",
  "1-2 مرة يوميًا": "1–2 times a day",
  "3 مرات أو أكثر يوميًا": "3 or more times a day",
  "عدة أيام": "Several days",
  "أكثر من نصف الأيام": "More than half the days",
  "كل يوم تقريبًا": "Nearly every day",
  "يوميًا أو شبه يومي": "Daily or almost daily",
  أسبوعيًا: "Weekly",
  التغذية: "Nutrition",
  "النشاط البدني": "Physical activity",
  النوم: "Sleep",
  "إدارة الضغوط": "Stress management",
  "المعنى والترابط": "Meaning and connection",
  "تجنب المواد الضارة": "Avoiding harmful substances",
  "الاستعداد للتغيير": "Readiness for change",
  "قيّم أهمية التغيير وثقتك بقدرتك عليه.":
    "Rate the importance of change and your confidence in making it.",
  "ما مدى أهمية إجراء تغييرات في نمط حياتك أو المحافظة عليها لتحسين صحتك؟":
    "How important is making or maintaining lifestyle changes to improve your health?",
  "ما مدى ثقتك بقدرتك على إجراء هذه التغييرات أو المحافظة عليها؟":
    "How confident are you in making or maintaining these changes?",
  أولوياتك: "Your priorities",
  "اختر ثلاثة مجالات مختلفة، بالترتيب من الأكثر أهمية لك.":
    "Choose three different areas, from most to least important to you.",
  "الأولوية الأولى": "First priority",
  "الأولوية الثانية": "Second priority",
  "الأولوية الثالثة": "Third priority",
  "فكّر في طعامك المعتاد خلال الأسابيع الأربعة الماضية.":
    "Think about your usual diet over the past four weeks.",
  الفواكه: "Fruit",
  الخضروات: "Vegetables",
  "الحبوب الكاملة ومنتجاتها": "Whole grains and whole-grain products",
  "الخبز أو الأرز أو المعكرونة البيضاء": "White bread, rice, or pasta",
  "الوجبات الجاهزة أو المطاعم أو الوجبات السريعة":
    "Prepared, restaurant, or fast-food meals",
  "الأطعمة والمشروبات المحلاة": "Sweetened foods and drinks",
  "الأطعمة والوجبات الخفيفة مرتفعة الملح": "High-salt foods and snacks",
  "الأطعمة المقلية": "Fried foods",
  "مصادر البروتين التي تناولتها 2-3 مرات أسبوعيًا أو أكثر":
    "Protein sources eaten 2–3 times a week or more",
  "اللحم الأحمر": "Red meat",
  "اللحوم المصنعة": "Processed meat",
  الدواجن: "Poultry",
  "الأسماك والمأكولات البحرية": "Fish and seafood",
  البقوليات: "Legumes",
  "المكسرات والبذور أو الأفوكادو": "Nuts, seeds, or avocado",
  "الحليب ومنتجاته": "Milk and dairy products",
  البيض: "Eggs",
  "أجب بحسب نومك خلال الأسبوعين الماضيين.":
    "Answer about your sleep over the past two weeks.",
  "متوسط ساعات النوم خلال 24 ساعة": "Average hours of sleep per 24 hours",
  "أقل من 5 ساعات": "Less than 5 hours",
  "نحو 5-6 ساعات": "About 5–6 hours",
  "نحو 6-7 ساعات": "About 6–7 hours",
  "نحو 7-8 ساعات": "About 7–8 hours",
  "نحو 8-9 ساعات": "About 8–9 hours",
  "نحو 9-10 ساعات": "About 9–10 hours",
  "أكثر من 10 ساعات": "More than 10 hours",
  "كم مرة شعرت بالتعب أو صعوبة البقاء مستيقظًا أثناء المهام اليومية؟":
    "How often did you feel tired or have trouble staying awake during daily tasks?",
  "أجب بحسب أسبوع اعتيادي خلال آخر 30 يومًا.":
    "Answer about a typical week in the past 30 days.",
  "أيام ممارسة نشاط متوسط إلى شديد في الأسبوع":
    "Days of moderate to vigorous activity per week",
  يوم: "days",
  "متوسط مدة النشاط في تلك الأيام": "Average activity duration on those days",
  دقيقة: "minutes",
  "مرات تمارين تقوية العضلات في الأسبوع":
    "Muscle-strengthening sessions per week",
  مرة: "times",
  "المزاج والضغوط": "Mood and stress",
  "خلال الأسبوعين الماضيين، كم مرة أزعجتك الأمور التالية؟":
    "Over the past two weeks, how often were you bothered by the following?",
  "قلة الاهتمام أو الاستمتاع بالأشياء":
    "Little interest or pleasure in doing things",
  "الشعور بالحزن أو الإحباط أو فقدان الأمل":
    "Feeling sad, discouraged, or hopeless",
  "الشعور بعدم القدرة على متابعة أمور حياتك":
    "Feeling unable to keep up with things in your life",
  "الشعور بالضغط أو الإرهاق النفسي":
    "Feeling stressed or emotionally overwhelmed",
  "أجب بحسب تجربتك خلال الأسبوعين الماضيين.":
    "Answer about your experience over the past two weeks.",
  "شعرت أن لحياتك هدفًا أو معنى":
    "Feeling that your life had purpose or meaning",
  "شعرت بالارتباط بشبكة دعم كالعائلة أو الأصدقاء أو المجتمع أو الجانب الروحي أو الطبيعة":
    "Feeling connected to support such as family, friends, community, spirituality, or nature",
  "استخدام المواد": "Substance use",
  "إجاباتك سرية. فكّر في الأسابيع الأربعة الماضية.":
    "Your answers are confidential. Think about the past four weeks.",
  "استخدام التبغ أو النيكوتين، بما فيه التدخين الإلكتروني":
    "Tobacco or nicotine use, including vaping",
  "تناول 5 مشروبات كحولية أو أكثر في يوم واحد للرجل، أو 4 للمرأة":
    "Having 5 or more alcoholic drinks in one day for men, or 4 for women",
  "استخدام دواء بوصفة لغير الغرض الموصوف أو بكمية أكبر":
    "Using prescription medicine for a nonprescribed purpose or in a larger amount",
  "استخدام القنب أو منتجاته": "Cannabis or cannabis product use",
  "استخدام مواد مخدرة أخرى": "Other drug use",
  "من 0 إلى 10، ما مدى أهمية أن تُجري تغييرات في نمط حياتك، أو تستمر في التغييرات التي بدأت بها، لتحسين صحتك؟":
    "From 0 to 10, how important is it to make lifestyle changes, or maintain changes you have started, to improve your health?",
  "من 0 إلى 10، ما مدى ثقتك بقدرتك على إجراء هذه التغييرات أو الاستمرار عليها لتحسين صحتك؟":
    "From 0 to 10, how confident are you in making or maintaining these changes to improve your health?",
  "الفواكه: مثل التفاح، الموز، البرتقال، البطيخ، التوت أو أي نوع آخر من الفاكهة.":
    "Fruit: for example apples, bananas, oranges, watermelon, berries, or any other fruit.",
  "الخضروات: مثل الخضروات الورقية، البروكلي، الجزر، البطاطس، البازلاء، أو الأطباق التي تتكون بشكل أساسي من الخضروات.":
    "Vegetables: for example leafy greens, broccoli, carrots, potatoes, peas, or dishes made mainly of vegetables.",
  "الحبوب الكاملة: مثل الشوفان، الأرز البني، خبز أو حبوب الإفطار المصنوعة من الحبوب الكاملة، ودقيق الحبوب الكاملة.":
    "Whole grains: for example oats, brown rice, whole-grain bread or breakfast cereals, and whole-grain flour.",
  "الخبز أو الأرز أو المعكرونة البيضاء والأطعمة المصنوعة من الدقيق الأبيض: مثل الخبز الأبيض، الأرز الأبيض، المعكرونة، المخبوزات والوجبات الخفيفة المصنوعة من الدقيق الأبيض.":
    "White bread, rice, or pasta and foods made with white flour: for example white bread, white rice, pasta, baked goods, and snacks made with white flour.",
  "الوجبات الجاهزة أو من المطاعم: مثل الوجبات الجاهزة أو المجمدة، الوجبات السريعة، طلبات التوصيل، أو الوجبات التي تتناولها من المطاعم.":
    "Prepared or restaurant meals: for example ready-made or frozen meals, fast food, deliveries, or meals eaten at restaurants.",
  "الأطعمة والمشروبات الغنية بالسكر المضاف: مثل حبوب الإفطار المحلاة، الزبادي المحلى، الحلويات، المشروبات الغازية، الشاي أو القهوة المحلاة ومشروبات الطاقة.":
    "Foods and drinks high in added sugar: for example sweetened breakfast cereals, sweetened yogurt, sweets, soft drinks, sweetened tea or coffee, and energy drinks.",
  "الأطعمة الغنية بالملح: مثل الشيبس والمقرمشات المالحة، الشوربات المعلبة، الصلصات، تتبيلات السلطة، وغيرها من الأطعمة التي يُضاف إليها الملح.":
    "High-salt foods: for example chips, salty crackers, canned soups, sauces, salad dressings, and other foods with added salt.",
  "الأطعمة المقلية: مثل البطاطس المقلية، الدجاج أو اللحوم المقلية، وغيرها من الأطعمة المقلية.":
    "Fried foods: for example French fries, fried chicken or meat, and other fried foods.",
  "خلال الفترة الأخيرة، أي من مصادر البروتين التالية تتناول عادة مرتين إلى 3 مرات أسبوعيًا أو أكثر؟ يمكنك اختيار أكثر من إجابة.":
    "Recently, which protein sources do you usually eat 2–3 times a week or more? You may choose more than one answer.",
  "في الأسبوع المعتاد، كم يومًا مارست نشاطًا بدنيًا متوسطًا إلى شديدًا؟ مثل المشي السريع، الجري، الرقص، السباحة أو ركوب الدراجة، أو أي نشاط يجعلك تتعرق بشكل خفيف أو واضح.":
    "In a typical week, on how many days did you do moderate to vigorous physical activity? Examples include brisk walking, running, dancing, swimming, cycling, or any activity that makes you sweat lightly or noticeably.",
  "في الأيام التي تمارس فيها هذا النشاط، كم دقيقة تمارس الرياضة في المتوسط؟":
    "On days when you do this activity, how many minutes do you exercise on average?",
  "خلال الشهر الماضي، كم مرة في الأسبوع مارست تمارين أو أنشطة لتقوية العضلات؟":
    "Over the past month, how many times per week did you do muscle-strengthening exercises or activities?",
  "قلة الرغبة أو الاستمتاع بالقيام بالأشياء التي كنت تستمتع بها عادةً.":
    "Little interest or pleasure in doing things you usually enjoyed.",
  "الشعور بالحزن أو الإحباط أو فقدان الأمل.":
    "Feeling sad, discouraged, or hopeless.",
  "الشعور بأنك غير قادر على التعامل مع مسؤوليات وأمور حياتك بالشكل الذي تريده.":
    "Feeling unable to manage your responsibilities and daily life as you would like.",
  "الشعور بالتوتر أو بأن الضغوط أصبحت أكثر من قدرتك على التعامل معها.":
    "Feeling tense or that stress exceeded your ability to cope.",
  "كم مرة شعرت أن لحياتك هدفًا أو معنى؟":
    "How often did you feel your life had purpose or meaning?",
  "كم مرة شعرت بأن لديك تواصلاً أو ترابطًا مع مصدر للدعم؟ مثل العائلة أو الأصدقاء أو المجتمع أو الجانب الديني أو الطبيعة أو التأمل.":
    "How often did you feel connected to a source of support, such as family, friends, community, religion, nature, or meditation?",
  "خلال آخر 4 أسابيع، كم مرة استخدمت التبغ أو أي منتج يحتوي على النيكوتين؟ مثل السجائر، السجائر الإلكترونية أو الفيب، أو منتجات التبغ الأخرى.":
    "Over the past 4 weeks, how often did you use tobacco or any nicotine product, such as cigarettes, e-cigarettes, vapes, or other tobacco products?",
  "خلال آخر 4 أسابيع، كم مرة تناولت مشروبات كحولية؟":
    "Over the past 4 weeks, how often did you drink alcohol?",
  "خلال آخر 4 أسابيع، استخدام دواء مقيد بوصفة لغير الغرض الموصوف أو بكمية أكبر؟":
    "Over the past 4 weeks, how often did you use prescription medicine for a nonprescribed purpose or in a larger amount?",
  "خلال آخر 4 أسابيع، كم مرة استخدمت القنب (الماريجوانا) أو أي منتج مصنوع منه؟":
    "Over the past 4 weeks, how often did you use cannabis (marijuana) or any cannabis product?",
  "خلال آخر 4 أسابيع، كم مرة استخدمت أي مادة مخدرة أخرى؟ مثل الكوكايين، الهيروين، الميثامفيتامين (الكريستال ميث)، المواد المهلوسة، الإكستاسي/MDMA، أو مواد مشابهة.":
    "Over the past 4 weeks, how often did you use any other drug, such as cocaine, heroin, methamphetamine (crystal meth), hallucinogens, ecstasy/MDMA, or similar substances?",
  "عندما تفكر في تحسين صحتك، ما الجانب الذي ترغب في تحسينه أولًا؟ ثم اختر الأولوية الثانية والثالثة.":
    "When thinking about improving your health, which area would you like to improve first? Then choose your second and third priorities.",
  "فكّر في طعامك وشرابك المعتاد خلال آخر 4 أسابيع. كم مرة كنت تتناول كلاً مما يلي؟":
    "Think about your usual food and drink over the past 4 weeks. How often did you have each of the following?",
  "فكّر في نشاطك المعتاد خلال آخر 30 يومًا:":
    "Think about your usual activity over the past 30 days:",
  "خلال الأسبوعين الماضيين:": "Over the past two weeks:",
  "فكّر في آخر 4 أسابيع عند الإجابة عن الأسئلة التالية. لا توجد إجابات صحيحة أو خاطئة، والمهم أن تكون إجابتك صادقة.":
    "Think about the past 4 weeks when answering the following questions. There are no right or wrong answers; what matters is answering honestly.",
  "النشاط البدني/الرياضة": "Physical activity / exercise",
  "التعامل مع التوتر والضغوط النفسية": "Managing stress and emotional pressure",
  "تجنب المواد الضارة مثل التدخين والمخدرات والكحول":
    "Avoiding harmful substances such as tobacco, drugs, and alcohol",
  "العلاقات والترابط مع الآخرين أو المجتمع أو الجانب الديني أو الطبيعة":
    "Connection with other people, community, religion, or nature",
  "اللحوم الحمراء مثل لحم البقر أو الضأن": "Red meat such as beef or lamb",
  "اللحوم المصنعة مثل المرتديلا والنقانق والبيبروني":
    "Processed meat such as mortadella, sausages, and pepperoni",
  الدجاج: "Chicken",
  "الفاصوليا والبازلاء والعدس ومنتجاتها":
    "Beans, peas, lentils, and their products",
  "المكسرات والبذور والأفوكادو": "Nuts, seeds, and avocado",
  "الحليب ومنتجات الألبان": "Milk and dairy products",
  "البيض والأطباق التي تحتوي عليه": "Eggs and dishes containing eggs",
  "الاستعداد لتغيير نمط الحياة": "Readiness for lifestyle change",
  "ما أولوياتك الصحية؟": "What are your health priorities?",
  "النشاط البدني والرياضة": "Physical activity and exercise",
  "المزاج والضغوط النفسية": "Mood and emotional stress",
  "معنى الحياة والترابط مع الآخرين":
    "Meaning in life and connection with others",
  "التدخين واستخدام المواد": "Smoking and substance use",
  "لحوم الصيد": "Game meat",
  "المزاج وإدارة الضغوط": "Mood and stress management",
  "سلوكيات صحية مثالية": "Optimal health behaviors",
  "سلوكيات صحية متوسطة": "Moderate health behaviors",
  "سلوكيات صحية دون المستوى الأمثل": "Suboptimal health behaviors",
  "سلوكيات صحية عالية الخطورة": "High-risk health behaviors",
  "لا تتوفر إجابات لهذا الجانب في الاستبيان.":
    "No answers are available for this area.",
  "تتوفر إجابات جزئية فقط لهذا الجانب؛ لا يمكن استنتاج جانب محدد للتحسين من الأسئلة غير المجاب عنها.":
    "Only partial answers are available for this area. Specific improvements cannot be inferred from unanswered questions.",
  "لم يظهر جانب محدد للتحسين بناء على إجاباتك.":
    "No specific area for improvement was identified from your answers.",
  "تناول الفواكه والخضراوات أقل تكرارًا.":
    "Fruit and vegetables are eaten less frequently.",
  "تناول الفواكه أقل تكرارًا.": "Fruit is eaten less frequently.",
  "تناول الخضراوات أقل تكرارًا.": "Vegetables are eaten less frequently.",
  "تناول الحبوب الكاملة غير منتظم.": "Whole-grain intake is irregular.",
  "تكرار الحبوب المكررة والأطعمة المالحة مرتفع.":
    "Refined grains and salty foods are eaten frequently.",
  "تكرار الحبوب المكررة مرتفع.": "Refined grains are eaten frequently.",
  "تكرار الأطعمة المالحة مرتفع.": "Salty foods are eaten frequently.",
  "توجد فرصة لتقليل الأطعمة المقلية.":
    "There is an opportunity to reduce fried foods.",
  "تكرار الوجبات الجاهزة أو من المطاعم مرتفع.":
    "Prepared or restaurant meals are eaten frequently.",
  "تكرار الأطعمة أو المشروبات المحلاة مرتفع.":
    "Sweetened foods or drinks are consumed frequently.",
  "لم تُحدَّد البقوليات أو المكسرات والبذور ضمن مصادر البروتين المتكررة.":
    "Legumes or nuts and seeds were not selected as regular protein sources.",
  "النشاط البدني أقل من المستوى المستهدف أسبوعيًا.":
    "Weekly physical activity is below the target level.",
  "تمارين تقوية العضلات أقل من يومين أسبوعيًا.":
    "Muscle-strengthening activity is less than two days a week.",
  "متوسط النوم: {{value}}.": "Average sleep: {{value}}.",
  "التعب أو صعوبة البقاء مستيقظًا: {{value}}.":
    "Tiredness or difficulty staying awake: {{value}}.",
  "قلة الاستمتاع": "Lack of enjoyment",
  "الحزن أو الإحباط": "Sadness or discouragement",
  "التعامل مع المسؤوليات": "Managing responsibilities",
  "الشعور بالضغط": "Feeling stressed",
  "الشعور بالهدف والمعنى": "Purpose and meaning",
  "التواصل مع مصادر الدعم": "Connection to sources of support",
  "التبغ أو النيكوتين": "Tobacco or nicotine",
  "تناول المشروبات الكحولية": "Alcohol use",
  "الإفراط في تناول الكحول في يوم واحد": "Heavy drinking in one day",
  "إساءة استخدام الأدوية الموصوفة": "Misuse of prescription medicines",
  "{{value}} من الركائز الأعلى تقييمًا لديك.":
    "{{value}} is one of your highest-rated pillars.",
  "أضف حصة من الخضراوات إلى وجبة الغداء يوميًا هذا الأسبوع.":
    "Add a serving of vegetables to lunch each day this week.",
  "أضف حصة من الفاكهة إلى وجبة خفيفة يوميًا هذا الأسبوع.":
    "Add a serving of fruit to a snack each day this week.",
  "استبدل خيارًا واحدًا من الحبوب المكررة بخيار كامل هذا الأسبوع.":
    "Replace one refined-grain choice with a whole-grain option this week.",
  "اختر وجبة غير مقلية في مرتين هذا الأسبوع.":
    "Choose a nonfried meal twice this week.",
  "اختر وجبة أقل ملوحة في مرتين هذا الأسبوع.":
    "Choose a lower-salt meal twice this week.",
  "حضّر أو اختر وجبة منزلية بدل وجبة جاهزة مرة واحدة هذا الأسبوع.":
    "Prepare or choose a home-cooked meal instead of a ready-made meal once this week.",
  "استبدل مشروبًا أو وجبة خفيفة محلاة بخيار أقل تحلية مرتين هذا الأسبوع.":
    "Replace a sweetened drink or snack with a less sweet option twice this week.",
  "أضف البقوليات أو المكسرات والبذور إلى وجبة واحدة هذا الأسبوع.":
    "Add legumes or nuts and seeds to one meal this week.",
  "ابدأ بالمشي لمدة 10 دقائق بعد إحدى الوجبات، خمسة أيام هذا الأسبوع، حسب قدرتك.":
    "Start with a 10-minute walk after a meal, five days this week, according to your ability.",
  "أضف جلستين قصيرتين لتقوية العضلات هذا الأسبوع، حسب قدرتك.":
    "Add two short muscle-strengthening sessions this week, according to your ability.",
  "حافظ على وقت استيقاظ ثابت خلال أيام الأسبوع.":
    "Keep a consistent wake-up time throughout the week.",
  "حدّد وقتًا قصيرًا هذا الأسبوع للتواصل مع شخص أو مصدر دعم تثق به.":
    "Set aside a short time this week to connect with someone or a source of support you trust.",
  "خصّص عشر دقائق هذا الأسبوع لنشاط مهدئ تختاره بما يناسبك.":
    "Set aside ten minutes this week for a calming activity of your choice.",
  القراءة: "Reading",
  "سكر الدم": "Blood glucose",
  "تحاليل سريعة": "Point-of-care tests",
  "نوع القياس": "Measurement type",
  صائم: "Fasting",
  عشوائي: "Random",
  "بعد الأكل": "After a meal",
  "السكر التراكمي HbA1c": "HbA1c",
  "ضغط الدم": "Blood pressure",
  "علامات حيوية": "Vital signs",
  الانقباضي: "Systolic",
  الانبساطي: "Diastolic",
  الذراع: "Arm",
  اليمنى: "Right",
  اليسرى: "Left",
  "معدل النبض": "Pulse rate",
  "نبضة/دقيقة": "bpm",
  "تشبع الأكسجين SpO₂": "Oxygen saturation SpO₂",
  "درجة الحرارة": "Temperature",
  "موضع القياس": "Measurement site",
  الأذن: "Ear",
  الجبهة: "Forehead",
  الفم: "Mouth",
  الإبط: "Armpit",
  "غير ذلك": "Other",
  "محيط الخصر": "Waist circumference",
  "قياسات الجسم": "Body measurements",
  "محيط الورك": "Hip circumference",
  "محيط الرقبة": "Neck circumference",
  "قياس يدوي مستقل؛ لا يستبدل قراءة جهاز تحليل الجسم.":
    "Separate manual measurement; does not replace the body analyzer reading.",
  "قوة قبضة اليد": "Handgrip strength",
  "اختبارات وظيفية": "Functional tests",
  اليد: "Hand",
  "المحاولة الأولى": "First attempt",
  "المحاولة الثانية": "Second attempt",
  "المحاولة الثالثة": "Third attempt",
  "عدد المحاولات وطريقة اعتماد النتيجة يحددهما بروتوكول الفعالية.":
    "The event protocol determines the number of attempts and how the result is selected.",
  "فحص كثافة العظام": "Bone density screening",
  "الجهاز / طريقة الفحص": "Device / screening method",
  "موضع الفحص": "Screening site",
  "اسم المؤشر في التقرير": "Indicator name in the report",
  "النتيجة كما وردت بالتقرير": "Result as reported",
  "الوحدة كما وردت بالتقرير": "Unit as reported",
  "تُضبط الخانات حسب الجهاز قبل التشغيل؛ كتلة العظام من تحليل الجسم ليست قياس كثافة العظام.":
    "Fields are configured for the device before use. Bone mass from body analysis is not a bone density measurement.",
  "الكوليسترول الكلي": "Total cholesterol",
  "الكوليسترول LDL": "LDL cholesterol",
  "الكوليسترول HDL": "HDL cholesterol",
  "الدهون الثلاثية": "Triglycerides",
  الهيموغلوبين: "Hemoglobin",
  "حمض اليوريك": "Uric acid",
  "ذروة تدفق الزفير": "Peak expiratory flow",
  "المتابعة: دوّن القياسات المسجلة اليوم، واختر مع الفريق الصحي مؤشرًا واحدًا لمراجعته في موعد محدد خلال الأسبوعين القادمين؛ سجّل الموعد في تقويمك. هذه القراءات وحدها ليست تشخيصًا.":
    "Follow-up: Write down today's recorded measurements and choose one indicator with your health team to review at an appointment within the next two weeks. Add the appointment to your calendar. These readings alone are not a diagnosis.",
  "التغذية: أضف حصة من الخضراوات إلى الغداء يوميًا خلال الأسبوع القادم، وسجّل عدد الأيام التي التزمت فيها. أضف حصة يومية أخرى كل أسبوع حسب ملاءمتك، حتى يبلغ مجموع الفواكه والخضراوات نحو خمس حصص يوميًا؛ راجع تقدمك بعد أسبوع مع مراعاة حساسياتك وخطتك الغذائية.":
    "Nutrition: Add a serving of vegetables to lunch every day over the coming week and record how many days you follow through. Add another daily serving each week as appropriate, until fruit and vegetables total about five servings a day. Review progress after a week, taking your allergies and dietary plan into account.",
  "تقليل السكر المضاف: خلال الأسبوع القادم، استبدل مشروبًا محلى واحدًا بالماء أو مشروب غير محلى في خمسة أيام، وسجّل مرات الاستبدال. راجع النتيجة في نهاية الأسبوع واختر خطوة الأسبوع التالي.":
    "Reduce added sugar: Over the coming week, replace one sweetened drink with water or an unsweetened drink on five days and record each replacement. Review the result at the end of the week and choose the next week's step.",
  "النشاط البدني: إذا كان المشي ملائمًا لحالتك، ابدأ بعشر دقائق بعد إحدى الوجبات، خمسة أيام خلال الأسبوع القادم. سجّل الدقائق، وزد خمس دقائق للمرة أسبوعيًا بحسب قدرتك وراحة جسمك، حتى تصل إلى ثلاثين دقيقة خمسة أيام أسبوعيًا. راجع التحمل أسبوعيًا؛ لا تُعد هذه المسودة تصريحًا طبيًا للتمرين.":
    "Physical activity: If walking is suitable for your health, start with ten minutes after a meal on five days over the coming week. Record the minutes and add five minutes per session each week according to your ability and comfort, until you reach thirty minutes on five days a week. Review tolerance weekly. This draft is not medical clearance for exercise.",
  "المحافظة على النشاط: دوّن دقائق نشاطك خلال الأيام السبعة القادمة، وحدّد مع الطبيب مقدار الزيادة المناسب تدريجيًا للوصول إلى 150 دقيقة أسبوعيًا من النشاط متوسط الشدة. عند ملاءمة حالتك، حدّد يومين لتمارين تقوية العضلات؛ راجع الالتزام بعد أسبوع. لا تبدأ نشاطًا شديدًا اعتمادًا على قراءة تركيب الجسم وحدها.":
    "Maintain activity: Record your activity minutes over the next seven days and agree with your doctor on an appropriate gradual increase toward 150 minutes of moderate activity a week. If suitable for your health, set two days for muscle-strengthening exercises. Review adherence after a week. Do not start vigorous activity based on a body composition reading alone.",
  "النوم: اختر وقت استيقاظ ثابتًا يناسب التزاماتك، والتزم به خلال الأيام السبعة القادمة. سجّل وقت الاستيقاظ يوميًا وراجع الالتزام في نهاية الأسبوع، مع تخصيص وقت كافٍ للنوم؛ يحتاج البالغون عمومًا إلى سبع ساعات أو أكثر يوميًا.":
    "Sleep: Choose a consistent wake-up time that fits your commitments and follow it for the next seven days. Record your wake-up time each day and review adherence at the end of the week, allowing enough time for sleep. Adults generally need seven or more hours a day.",
  "التبغ والنيكوتين: إذا كنت تستخدمهما، تواصل خلال الأيام السبعة القادمة مع خدمة موثوقة للإقلاع أو الفريق الصحي، وحدّد موعد متابعة وخطوة أولى تناسبك. سجّل موعد التواصل واطلب دعم شخص تثق به؛ لا تتضمن هذه المسودة وصف دواء.":
    "Tobacco and nicotine: If you use them, contact a trusted cessation service or your health team within the next seven days. Set a follow-up appointment and a first step that suits you. Record when you make contact and ask someone you trust for support. This draft does not prescribe medication.",
  "إدارة الضغوط: خصص دقيقتين لتمرين تنفس هادئ في وقت تختاره، خمسة أيام خلال الأسبوع القادم. ضع علامة بعد كل مرة وراجع مدى ملاءمة الخطوة لك في نهاية الأسبوع؛ هذه خطوة مساعدة وليست بديلًا للرعاية المتخصصة.":
    "Stress management: Set aside two minutes for calm breathing at a time you choose on five days over the coming week. Mark each completed session and review whether this step suits you at the end of the week. This is a supporting step, not a substitute for specialist care.",
  "الترابط والدعم: حدّد خلال الأسبوع القادم موعدًا لمكالمة مدتها عشر دقائق مع شخص موثوق، أو نشاط اجتماعي مناسب تختاره. سجّل إتمامه وراجع في نهاية الأسبوع إن كنت ترغب في تكراره.":
    "Connection and support: Over the coming week, schedule a ten-minute call with someone you trust or a suitable social activity of your choice. Record its completion and review at the end of the week whether you would like to repeat it.",
  "متابعة قياسات الجسم: خلال هذا الأسبوع، راجع الوزن والطول ومؤشر الكتلة المسجلة مع الفريق الصحي، واطلب قياس محيط الخصر بشريط قياس إذا كان مؤشر الكتلة أقل من 35. دوّن القياس للمقارنة في موعد متابعة بعد أربعة أسابيع. نتائج تركيب الجسم تقديرية؛ لا تجعل العمر الجسدي أو رقم الدهون الحشوية هدفًا علاجيًا، ولا تعتبر الكتلة العضلية وحدها قياسًا للقوة.":
    "Body measurement follow-up: This week, review your recorded weight, height, and BMI with your health team. Ask for a tape measurement of waist circumference if BMI is below 35. Record it for comparison at a follow-up in four weeks. Body composition results are estimates. Do not treat body age or visceral fat score as a treatment target, or muscle mass alone as a measure of strength.",
  "تحسين الوزن: خلال الأسبوعين القادمين، حدّد موعدًا مع الطبيب أو اختصاصي التغذية للاتفاق على خطة غذائية متوازنة بكميات تحقق خفضًا معتدلًا للطاقة يناسب حالتك، وسجّل الطعام ثلاثة أيام قبل الموعد. بعد الاتفاق، تابع الوزن مرة أسبوعيًا في ظروف متشابهة وراجع الخطة بعد أربعة أسابيع؛ تجنب الحميات القاسية أو تحديد سعرات اعتمادًا على الجهاز وحده.":
    "Weight management: Within the next two weeks, arrange an appointment with your doctor or dietitian to agree on a balanced eating plan with portions that provide a moderate energy reduction appropriate for your health. Record your food for three days before the appointment. Once agreed, track weight weekly under similar conditions and review the plan after four weeks. Avoid crash diets or setting calories based on the device alone.",
  "خفض الدهون وزيادة اللياقة: إذا كان المشي مناسبًا لحالتك ونشاطك الحالي أقل من الهدف، ابدأ بعشر دقائق بوتيرة متوسطة، خمسة أيام هذا الأسبوع، ثم زد خمس دقائق للجلسة أسبوعيًا حسب التحمل حتى تصل إلى ثلاثين دقيقة خمسة أيام أسبوعيًا في الأسبوع الخامس. سجّل الدقائق وراجع التحمل أسبوعيًا. إذا كنت تحقق هذا القدر بالفعل فحافظ عليه وناقش التطوير مع الطبيب؛ قد تتحسن الدهون واللياقة دون نزول كبير في الوزن.":
    "Reduce fat and improve fitness: If walking is suitable for your health and your current activity is below the target, start with ten minutes at a moderate pace on five days this week. Add five minutes per session each week as tolerated, reaching thirty minutes on five days a week in week five. Record minutes and review tolerance weekly. If you already achieve this amount, maintain it and discuss progression with your doctor. Fat and fitness may improve without a large weight change.",
  "المحافظة على العضلات: خلال الأسبوعين القادمين، ثبّت جلستَي مقاومة في يومين غير متتاليين أسبوعيًا، مدة كل منهما نحو عشرين دقيقة، بتمارين للعضلات الرئيسية تناسب قدرتك. ابدأ بمقاومة تتيح الحركة الصحيحة وتدرج بعد إتقانها بإرشاد مختص. سجّل الجلسات وراجع التقدم بعد أربعة أسابيع؛ هذا هدف للمحافظة على العضلات ولا يعني أن الجهاز شخّص ضعفًا عضليًا.":
    "Maintain muscle: Over the next two weeks, schedule two resistance sessions on nonconsecutive days each week, about twenty minutes per session, using exercises for the major muscle groups that suit your ability. Start with resistance that allows correct movement and progress after mastering technique with professional guidance. Record sessions and review progress after four weeks. This goal supports muscle preservation; it does not mean the device diagnosed muscle weakness.",
  "التغذية والمحافظة على الوظيفة: خلال الأسبوعين القادمين، رتّب مراجعة تغذوية لتقييم الشهية وتغير الوزن والقوة والقدرة على أداء الأنشطة اليومية. أحضر سجل الطعام لثلاثة أيام وقائمة الأدوية. لا تبدأ حمية لإنقاص الوزن من نتيجة الجهاز وحدها؛ اتفق مع الطبيب على ملاءمتها وخطة غذاء وتمرين فردية، وحدّد موعد متابعة قبل بدء الخطة.":
    "Nutrition and function: Within the next two weeks, arrange a nutrition review to assess appetite, weight change, strength, and daily function. Bring a three-day food record and medication list. Do not start a weight-loss diet based on the device result alone. Agree with your doctor on suitability and an individual eating and exercise plan, and schedule follow-up before starting.",
  "توصيات تثقيفية مبنية على بيانات هذه الزيارة.":
    "Educational recommendations based on this visit's data.",
  "استبيان نمط الحياة": "Lifestyle questionnaire",
  "LIM — إجابات الاستبيانات": "LIM \u2014 Questionnaire answers",
  "معرّف الفحص:": "Screening ID:",
  "المراجعة:": "Revision:",
  "الاسم:": "Name:",
  "مرجع الأرشيف:": "Archive reference:",
  "لم يكن هناك استبيان مفعّل لهذا الفحص.":
    "No questionnaire was enabled for this screening.",
  "نسخة الاستبيان:": "Questionnaire version:",
  "لم تُسجّل إجابة": "No answer recorded",
  "لم يُختر أي خيار": "No option selected",
  "الإجابة:": "Answer:",
  "رمز التحقق غير صحيح أو انتهت صلاحيته. أعد المحاولة أو اطلب رمزًا جديدًا.":
    "The verification code is incorrect or has expired. Try again or request a new code.",
  "أدخل رقم جوال سعودي صحيحًا.": "Enter a valid Saudi mobile number.",
  "اسم مرسل الرسائل غير صالح. استخدم %20 بدل المسافة. (OTP-SENDER)":
    "Phone verification is temporarily unavailable. Contact the event organizer. (OTP-SENDER)",
  "التحقق بالجوال غير متاح حاليًا. تواصل مع منظم الفعالية. (OTP-CONFIG)":
    "Phone verification is temporarily unavailable. Contact the event organizer. (OTP-CONFIG)",
  "خدمة الرسائل رفضت مفتاح الربط في الخادم المنشور.":
    "The SMS service is temporarily unavailable. Contact the event organizer.",
  "خدمة الرسائل رفضت صلاحية الإرسال لهذا التطبيق.":
    "The SMS service is temporarily unavailable. Contact the event organizer.",
  "خدمة الرسائل مشغولة أو وصلت لحد الإرسال. حاول بعد قليل.":
    "The SMS service is busy or has reached its sending limit. Try again shortly.",
  "تعذر إرسال الرمز. يلزم مراجعة إعدادات الرسائل لدى منظم الفعالية.":
    "Could not send the code. Contact the event organizer.",
  "خدمة الرسائل غير متاحة حاليًا. تواصل مع منظم الفعالية.":
    "The SMS service is temporarily unavailable. Contact the event organizer.",
  "تأخر رد خدمة الرسائل. حاول مرة أخرى بعد قليل.":
    "The SMS service took too long to respond. Try again shortly.",
  "تعذر الاتصال بخدمة الرسائل. حاول مرة أخرى بعد قليل.":
    "Could not connect to the SMS service. Try again shortly.",
  "خدمة الرسائل غير متاحة حاليًا. حاول مرة أخرى بعد قليل.":
    "The SMS service is temporarily unavailable. Try again shortly.",
  "تعذر تأكيد رد خدمة الرسائل. تواصل مع منظم الفعالية.":
    "Could not confirm the SMS service response. Contact the event organizer.",
  "تعذر بدء التحقق حاليًا.": "Could not start verification right now.",
  "تعذر بدء التحقق بالجوال حاليًا. حاول مرة أخرى بعد قليل.":
    "Could not start phone verification. Try again shortly.",
  "انتظر قليلًا قبل طلب رمز آخر. عدد المحاولات محدود.":
    "Wait before requesting another code. The number of attempts is limited.",
  "انتظر دقيقة قبل طلب رمز آخر.":
    "Wait one minute before requesting another code.",
  "لم يتم إرسال الرمز. حاول لاحقًا.": "The code was not sent. Try again later.",
  "الاستبيان غير مفعّل لهذه الزيارة":
    "The questionnaire is not enabled for this visit.",
  "أكمل أسئلة الاستبيان بقيم صحيحة وأولويات مختلفة قبل الحفظ":
    "Complete the questionnaire with valid answers and distinct priorities before saving.",
  "اكتمل التقرير؛ لا يمكن تعديل الاستبيان لهذه الزيارة":
    "The report is complete. The questionnaire for this visit can no longer be edited.",
  "تغير إصدار التقرير. حدّث الحالة ثم أعد المحاولة.":
    "The report version changed. Refresh the status and try again.",
  "تعذر استرجاع نسخة التقرير الثابتة. أعد المحاولة.":
    "Could not retrieve the approved report snapshot. Try again.",
  "لا توجد نسخة أصلية محفوظة لهذه الزيارة.":
    "No original copy is stored for this visit.",
  "التقرير غير معتمد بعد": "The report has not been approved yet.",
  "ملف التقرير غير صالح": "The report file is invalid.",
  "تعذر حفظ نسخة التقرير المؤرشفة": "Could not save the archived report copy.",
};
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const templates = Object.entries(eventEnglish).filter(([key]) =>
  key.includes("{{value}}")
);
/** Pure localization, shared by React and the answer PDF. Unknown free text stays verbatim. */
export function eventText<T>(input: T, language: EventLanguage): T {
  if (
    language !== "en" ||
    typeof input !== "string" ||
    !/[\u0600-\u06ff]/.test(input)
  )
    return input;
  const translate = (text: string): string => {
    const key = normalize(text);
    if (eventEnglish[key]) return eventEnglish[key];
    const numbered = key.match(/^(\d+\.\s*)([\s\S]+)$/);
    if (numbered && eventEnglish[numbered[2]])
      return numbered[1] + eventEnglish[numbered[2]];
    for (const [pattern, result] of templates) {
      const parts = pattern.split("{{value}}");
      if (
        parts.length === 2 &&
        key.startsWith(parts[0]) &&
        key.endsWith(parts[1])
      ) {
        const value = key.slice(
          parts[0].length,
          key.length - parts[1].length || undefined
        );
        return result.replace("{{value}}", translate(value));
      }
    }
    // Runtime insight sentences combine reviewed labels with reviewed answer anchors.
    const pair = key.match(/^(.+?): (.+?)(\.)?$/);
    if (pair && eventEnglish[pair[1]] && eventEnglish[pair[2]])
      return (
        eventEnglish[pair[1]] + ": " + eventEnglish[pair[2]] + (pair[3] || "")
      );
    const diagnostic = key.match(/^(.+?) (\(OTP-[A-Z0-9-]+\))$/);
    if (diagnostic && eventEnglish[diagnostic[1]])
      return eventEnglish[diagnostic[1]] + " " + diagnostic[2];
    return text;
  };
  return input
    .split("\n")
    .map(line => {
      const translated = translate(line);
      if (translated === line) return line;
      return (
        (line.match(/^\s+/)?.[0] || "") +
        translated +
        (line.match(/\s+$/)?.[0] || "")
      );
    })
    .join("\n") as T;
}
