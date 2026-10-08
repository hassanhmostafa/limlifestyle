import { ArrowRight, HeartPulse, LockKeyhole, ShieldCheck } from "lucide-react";
import React from "react";
import { Link } from "wouter";

const updatedAt = "5 أكتوبر 2026";

function LegalShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <main dir="rtl" className="min-h-screen bg-[#f3f8f6] px-4 py-8 text-[#123a34]">
    <article className="mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-[#d7e7e2] bg-white shadow-[0_18px_55px_rgba(18,58,52,.08)]">
      <header className="bg-[#123f37] p-6 text-white sm:p-9">
        <Link href="/events" className="mb-7 inline-flex items-center gap-2 text-sm text-[#d7e7e2]"><ArrowRight className="h-4 w-4" />العودة إلى التسجيل</Link>
        <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#dff33d] text-[#123a34]"><HeartPulse /></span><div><p className="text-sm font-bold text-[#dff33d]">فعاليات LIM</p><h1 className="mt-1 text-3xl font-black">{title}</h1><p className="mt-3 max-w-2xl leading-7 text-[#d5e5e1]">{intro}</p></div></div>
      </header>
      <div className="space-y-7 p-6 leading-8 sm:p-9">{children}<p className="border-t border-[#dce9e5] pt-5 text-sm text-[#66827b]">آخر تحديث: {updatedAt}. للاستفسار أو ممارسة حقوقك، تواصل مع منظم الفعالية أو فريق LIM الموجود في موقع الفعالية.</p></div>
    </article>
  </main>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-xl font-black">{title}</h2><div className="text-[#45665f]">{children}</div></section>;
}

export function EventTerms() {
  return <LegalShell title="الشروط والأحكام" intro="توضح هذه الشروط طبيعة تجربة LIM الصحية في الفعالية وحدود استخدامها.">
    <Section title="1. طبيعة الخدمة"><p>تقدم LIM تقييمًا تثقيفيًا لنمط الحياة وقراءات تقديرية من أجهزة القياس، مع إمكانية مراجعتها من فريق التمريض والطبيب المصرح لهما في الفعالية. النتائج والتوصيات للتوعية ولا تُعد تشخيصًا أو وصفة علاجية أو بديلًا للرعاية الطبية.</p></Section>
    <Section title="2. أهلية المشاركة"><p>التسجيل مخصص للبالغين بعمر 18 سنة فأكثر. يلتزم المشارك بإدخال معلومات صحيحة تخصه واستخدام رقم جوال يمكنه استلام رمز التحقق عليه.</p></Section>
    <Section title="3. القياسات والنتائج"><p>قد تتأثر قياسات تركيب الجسم بالسوائل والطعام والنشاط ووقت القياس وحالة الجهاز. تُعرض القيم والمعدلات المرجعية كما يرسلها الجهاز، ويجب مناقشة أي نتيجة مقلقة مع مختص صحي.</p></Section>
    <Section title="4. الحالات الطارئة"><p>الخدمة غير مخصصة للطوارئ. عند وجود ألم شديد، ضيق تنفس، فقدان وعي أو أعراض عاجلة، اطلب المساعدة الطبية الطارئة مباشرة.</p></Section>
    <Section title="5. الاستخدام المقبول"><p>لا يجوز إساءة استخدام رموز الجلسات أو محاولة الوصول إلى بيانات الآخرين أو تعطيل الخدمة. يحتفظ النظام بحق إيقاف الجلسة عند الاشتباه في إساءة الاستخدام.</p></Section>
    <Section title="6. خدمات الأطراف المساندة"><p>قد تعتمد التجربة على مزود رسالة التحقق، والاستضافة، وجهاز القياس. تُستخدم هذه الخدمات بالقدر اللازم لتشغيل الرحلة الصحية.</p></Section>
    <Section title="7. التعديلات"><p>قد تُحدّث هذه الشروط لتحسين الخدمة أو الامتثال للمتطلبات النظامية. تظهر نسخة النص وتاريخ تحديثها في هذه الصفحة.</p></Section>
  </LegalShell>;
}

export function EventPrivacy() {
  return <LegalShell title="سياسة الخصوصية" intro="نلتزم بجمع أقل قدر لازم من البيانات وحمايتها وقصر الوصول عليها على المصرح لهم.">
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#eff8f5] p-4"><ShieldCheck className="mb-2 text-[#197f6f]" /><b>موافقة واضحة</b><p className="mt-1 text-sm text-[#52736c]">لن تُنشأ الجلسة قبل موافقتك الصريحة.</p></div><div className="rounded-2xl bg-[#eff8f5] p-4"><LockKeyhole className="mb-2 text-[#197f6f]" /><b>وصول محدود</b><p className="mt-1 text-sm text-[#52736c]">لفريق الفعالية المصرح له وضمن الحاجة المهنية.</p></div></div>
    <Section title="1. البيانات التي نجمعها"><p>قد تشمل الاسم الأول الاختياري، العمر، الجنس، رقم الجوال، المدينة، إجابات تقييم نمط الحياة، نتائج جهاز تركيب الجسم، قياسات التمريض، وملاحظات الطبيب، إضافة إلى بيانات تقنية لازمة لأمن الجلسة.</p></Section>
    <Section title="2. لماذا نستخدمها"><p>لإنشاء جلسة الفعالية، التحقق من رقم الجوال، ربط القياسات بالمشارك الصحيح، عرض التقرير، تمكين فريق الرعاية المصرح له من المراجعة، وحماية الخدمة وتحسين جودتها.</p></Section>
    <Section title="3. من يستطيع الاطلاع"><p>يقتصر الاطلاع على فريق التمريض والطبيب وموظفي التشغيل المصرح لهم بحسب دورهم والفعالية المكلفين بها. قد نستعين بمزودي خدمة تقنيين لمعالجة الحد الأدنى اللازم للتشغيل.</p></Section>
    <Section title="4. المعالجة الآلية للتوصيات"><p>قد تختار الفعالية وضع توصيات نمط الحياة التلقائية بعد اكتمال قياسات التمريض. في هذا الوضع تُعالج إجابات الاستبيان والقياسات المرتبطة بهذه الزيارة لاختيار توصيات تثقيفية من قائمة معتمدة مسبقًا. لا تستخدم هذه المعالجة ملاحظات التمريض الحرة أو رقم الجوال أو الاسم لإنشاء التوصية، ولا تُعد تشخيصًا أو وصفة علاجية أو بديلًا عن الرعاية الطبية.</p></Section>
    <Section title="5. التحليل والبحث"><p>قد تُستخدم بيانات مجمعة أو منزوعة الهوية لإحصاءات الفعالية وتحسين الخدمة. لا تشمل موافقة الخدمة استخدام بيانات تعريفية في بحث علمي مستقل؛ ويتطلب ذلك إجراءً وموافقة منفصلين عند انطباقه.</p></Section>
    <Section title="6. مدة الاحتفاظ والحماية"><p>تُحفظ البيانات للمدة اللازمة لتقديم الخدمة وإصدار التقرير والوفاء بالمتطلبات النظامية، وفق ضوابط الاحتفاظ المعتمدة. نستخدم وسائل تنظيمية وتقنية لتقليل الوصول غير المصرح به، ولا توجد وسيلة إلكترونية تضمن انعدام المخاطر بالكامل.</p></Section>
    <Section title="7. حقوقك"><p>يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو طلب إتلافها أو سحب الموافقة، مع مراعاة المتطلبات النظامية وآثار سحب الموافقة على استمرار الخدمة. تواصل مع منظم الفعالية أو فريق LIM لتقديم الطلب.</p></Section>
  </LegalShell>;
}
