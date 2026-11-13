import { additionalEventAdvice } from "./eventAdditionalAdvice";
import type { EventAnswers } from '../shared/eventLifestyle';
export const BRIEF_PLAN_VERSION='brief-single-source-2026-11-13-additional-v3';
export const BRIEF_PLAN_SOURCE='PHA_LIFESTYLE_GUIDELINES_20260705';
type Body=Record<string,number>;
const labels:Record<string,string>={sleep:'النوم',activity:'النشاط البدني',nutrition:'التغذية',stress:'إدارة الضغوط',connection:'الترابط الاجتماعي',substances:'تجنب المواد الضارة'};
const number=(a:EventAnswers,k:string)=>{const v=a[k];return v!==undefined&&v!==''&&!Array.isArray(v)&&Number.isFinite(Number(v))?Number(v):undefined};
export function composeEventBriefPlan(input:{answers:EventAnswers;body?:Body;age?:number}){
 const {answers:a,body:b={},age}=input;
 const priorities=[a.priority1,a.priority2,a.priority3];
 if(priorities.some(p=>typeof p!=='string'||!Object.hasOwn(labels,p))||new Set(priorities).size!==3)throw new Error('اختر ثلاث أولويات مختلفة قبل إنشاء التوصيات.');
 if(age!==undefined&&age<18)throw new Error('هذا المرجع مخصص للبالغين؛ يلزم تقييم مناسب للعمر.');
 const adult=age!==undefined&&age>=18;
 const highWeight=adult&&b.bmi>=25;
 const lowWeight=adult&&b.bmi<18.5;
 const body:string[]=[];
 if(b.weight!==undefined&&b.bmi!==undefined){const status=adult?(lowWeight?'أقل من النطاق الصحي':b.bmi>=30?'ضمن السمنة':highWeight?'ضمن زيادة الوزن':'ضمن النطاق الصحي'): 'دون تصنيف لعدم توفر العمر';body.push(`• الوزن: ${b.weight.toFixed(1)} كجم، ومؤشر الكتلة: ${b.bmi.toFixed(1)} — ${status}.`);}
 if(b.fatRate!==undefined)body.push(`• نسبة الدهون: ${b.fatRate.toFixed(1)}٪.`);
 if(b.skeletalMuscle!==undefined)body.push(`• الكتلة العضلية الهيكلية: ${b.skeletalMuscle.toFixed(1)} كجم.`);
 if(highWeight&&b.height>=80&&b.height<=260){const target=24.9*(b.height/100)**2;body.push(`• الهدف: خفض الدهون مع الحفاظ على العضلات؛ نحو ${target.toFixed(1)} كجم حد أعلى للنطاق المرجعي لطولك، وليس هدفًا فوريًا.`);}
 else if(lowWeight)body.push('• الهدف: تحسين كفاية الغذاء والحفاظ على العضلات؛ يلزم تقييم التغذية قبل تحديد وزن مستهدف.');
 else if(body.length)body.push('• الهدف: الحفاظ على العضلات ومتابعة تغير الوزن وتركيب الجسم.');
 const sections=(priorities as string[]).map((p,index)=>{
  const goals:string[]=[]; let rx='';
  if(p==='sleep'){
   const code=String(a.sleepHours);
   const short=['0','1','2'].includes(code);
   const known=['0','1','2','3','3.1','2.1','0.1'].includes(code);
   rx=known?`نظّم النوم والاستيقاظ يوميًا، ${short?'وزِد مدة النوم تدريجيًا نحو':'وحافظ على'} ${age!==undefined&&age>=65?'٧–٨':'٧–٩'} ساعات، مع روتين هادئ قبل النوم.`:'استكمل تقييم مدة النوم وانتظامه قبل تحديد خطة شخصية.';
   if(short)goals.push('نم أبكر من موعدك المعتاد بـ١٥ دقيقة يوميًا لأسبوع، ثم راجع المدة أسبوعيًا لمدة ٤ أسابيع.');
   if(known)goals.push('سجّل وقت النوم والاستيقاظ كل صباح لمدة أسبوعين.');
  }else if(p==='activity'){
   const days=number(a,'activeDays'),mins=number(a,'activeMinutes'),strength=number(a,'strengthDays');
   const total=days!==undefined&&mins!==undefined?days*mins:undefined;
   rx=total===undefined?'استكمل تسجيل أيام النشاط ومدته قبل تحديد الجرعة المناسبة.':`نشاط هوائي بشدة متوسطة مع مقاومة للعضلات؛ ${total>0?'حافظ على مجموعك الأسبوعي ووزّعه حسب قدرتك':'ابدأ بجلسات قصيرة وزدها تدريجيًا'}.`;
   if(total!==undefined&&total>=150)goals.push(`وزّع ${total} دقيقة نشاط على ${Math.max(4,Math.min(5,days!))} أيام أسبوعيًا لمدة ٤ أسابيع، بجلسات أقصر حسب التحمل.`);
   else if(total!==undefined&&total>0){const spread=Math.max(3,Math.min(5,days??3));const minutes=Math.ceil(total/spread);goals.push(`مارس نشاطك ${minutes} دقيقة في ${spread} أيام أسبوعيًا لمدة أسبوعين، ثم زد المدة تدريجيًا حسب التحمل.`);}
   else if(total===0)goals.push('ابدأ بالمشي ١٠ دقائق، ٣ أيام أسبوعيًا لمدة أسبوعين، ثم زد المدة تدريجيًا حسب التحمل.');
   if(strength!==undefined)goals.push(strength>=2?'حافظ على جلستَي مقاومة أسبوعيًا، بينهما ٤٨ ساعة راحة، لمدة ٤ أسابيع.':strength===1?'حافظ على جلسة المقاومة أسبوعيًا لأسبوعين، ثم زدها لجلستين غير متتاليتين لأسبوعين حسب التحمل.':'ابدأ بجلسة مقاومة خفيفة أسبوعيًا لمدة أسبوعين، ثم جلستين غير متتاليتين للأسبوعين التاليين، حسب التحمل.');
  }else if(p==='nutrition'){
   rx=lowWeight?'تناول غذاءً متوازنًا يوميًا يتضمن البروتين والحبوب والخضروات، دون تقليل الكميات قبل تقييم احتياجك.':`${highWeight?'نظّم كميات وجباتك يوميًا لخفض الدهون تدريجيًا':'تناول غذاءً متوازنًا يوميًا'}، مع بروتين متنوع وحبوب كاملة ضمن كمياتك المعتادة.`;
   const grain=number(a,'wholeGrains'),refined=number(a,'refinedGrains'),veg=number(a,'vegetables'),sugar=number(a,'sugary');
   if(grain!==undefined&&grain<10.5&&refined!==undefined&&refined>0)goals.push('استبدل الحبوب البيضاء بالكاملة بنفس الكمية في وجبة واحدة، ٥ أيام أسبوعيًا لمدة ٤ أسابيع.');
   if(veg!==undefined&&veg<10.5)goals.push('أضف الخضروات إلى وجبة واحدة في ٥ أيام أسبوعيًا لمدة ٤ أسابيع.');
   if(sugar!==undefined&&sugar>=2)goals.push('استبدل اختيارًا محلى معتادًا بفاكهة أو مشروب غير محلى في كل مرة تتناوله، لمدة ٤ أسابيع.');
   if(goals.length<2)goals.push('سجّل طعامك وشرابك وكمياتهما خلال ٣ أيام من الأسبوع الأول لتحديد تعديل مناسب.');
  }else if(p==='stress'){
   const known=['notOnTop','overwhelmed','lowMood','lowInterest'].some(k=>a[k]!==undefined);
   rx=known?'خصص وقتًا منتظمًا للاسترخاء والتنفس الهادئ بمجهود مريح، وابدأ بممارسة قصيرة يوميًا.':'استكمل تقييم الضغوط وأساليب التعامل معها قبل تخصيص الخطة.';
   if(known)goals.push('مارس المشي اليقظ بهدوء لمدة ٥ دقائق، يومين أسبوعيًا لمدة أسبوعين.','دوّن أمرين تشعر بالامتنان لهما خلال ٥ دقائق، ٥ أمسيات أسبوعيًا لمدة أسبوعين.');
  }else if(p==='connection'){
   const known=a.support!==undefined||a.purpose!==undefined;
   rx=known?'حافظ على تواصل داعم ومنتظم مع شخص تثق به، بمحادثات أو أنشطة مشتركة تناسبك عدة مرات أسبوعيًا.':'استكمل تقييم التواصل ومصادر الدعم قبل تخصيص الخطة.';
   if(known)goals.push('خصص مكالمة أو لقاءً مع قريب أو صديق مرتين أسبوعيًا لمدة ٤ أسابيع.');
  }else{
   const used=['tobacco','alcoholUse','medMisuse','cannabis','otherDrugs'].filter(k=>a[k]!==undefined&&[0,1,2].includes(Number(a[k]))&&a[k]!=='');
   const known=['tobacco','alcoholUse','medMisuse','cannabis','otherDrugs'].some(k=>a[k]!==undefined);
   rx=!known?'استكمل تقييم استخدام التبغ والمواد قبل تخصيص الخطة.':used.length?'ابدأ خطة مناسبة للتوقف عن المواد المستخدمة بدعم مختص، مع متابعة منتظمة للمحفزات وأعراض الانسحاب.':'حافظ على عدم استخدام التبغ والمواد الضارة يوميًا.';
   if(used.length){goals.push('احجز استشارة متخصصة خلال أسبوعين لتحديد خطة التوقف المناسبة.');if(used.includes('tobacco'))goals.push('سجّل مرات استخدام النيكوتين ومحفزاته يوميًا لمدة أسبوع.');}
   else if(known)goals.push('استمر على عدم استخدام المواد الضارة يوميًا خلال الأسابيع الأربعة القادمة.');
  }
  if(!goals.length)goals.push('استكمل الإجابات المتعلقة بهذا المجال قبل إنشاء خطة مخصصة.');
  return `${index+1}. ${labels[p]}\nالوصفة: ${rx}\nالأهداف:\n${goals.slice(0,3).map((g,i)=>`${i+1}) ${g}`).join('\n')}`;
 });
 const extra=additionalEventAdvice(a,priorities as string[]);
 return {advice:[...(body.length?['ملخص تحليل جسمك',body.join('\n')]:[]),...sections,...(extra.length?['ملاحظات إضافية',extra.map(n=>'• '+n).join('\n')]:[])].join('\n\n'),sourceIds:[BRIEF_PLAN_SOURCE],priorities:priorities as string[],promptVersion:BRIEF_PLAN_VERSION};
}
