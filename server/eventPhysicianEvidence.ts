import { eventRecommendationById } from '../shared/eventRecommendationCatalog';

const pillarCards: Record<string,string[]> = {
 nutrition:['nutrition-plants','nutrition-sugary'], activity:['activity-gradual','activity-target'],
 sleep:['sleep-routine'], stress:['small-goal'], connection:['support-connection'], substances:['tobacco-support'],
};
export type PhysicianSource = { pillar:string; sourceId:string; title:string; location:string; scope:string };
/** References support principles; SMART schedules remain individualized examples, not quoted guideline doses. */
export function physicianEvidence(priorities: readonly string[], age?: number, bmi?: number) {
 const adult = age !== undefined && Number.isFinite(age) && age >=18 && age<=120;
 const overweightContext = adult && bmi !== undefined && Number.isFinite(bmi) && bmi>=25;
 const sources:PhysicianSource[]=[];
 for(const pillar of priorities) {
  sources.push({pillar,sourceId:'UPLOADED_FITT_SMART_EXAMPLES',title:'أمثلة لمسودة الطبيب',location:'قسم الركيزة المختارة',scope:'قالب FITT وخيارات SMART تطبيقية يخصصها الطبيب'});
  for(const id of pillarCards[pillar]??[]) {
   const entry=eventRecommendationById.get(id);
   if(entry&&!sources.some(s=>s.pillar===pillar&&s.sourceId===entry.sourceId)) sources.push({pillar,sourceId:entry.sourceId,title:entry.sourceId,location:(entry as typeof entry & {sourceLocation?:string}).sourceLocation??'موضع المراجعة المعتمد في كتالوج المشروع',scope:entry.sourceSummary});
  }
  if(overweightContext && (pillar==='nutrition'||pillar==='activity')) sources.push({pillar,sourceId:'UPLOADED_NICE_NG246_2026',title:'NICE NG246 — النسخة المرفوعة، تحديث 8 يناير 2026',location:pillar==='nutrition'?'ص 75–76، 1.16.1–1.16.7':'ص 73–74، 1.15.2–1.15.4',scope:pillar==='nutrition'?'تفصيل التدخل الغذائي حسب التفضيلات والظروف والحالة الصحية، مع التوازن الغذائي والمتابعة':'التدرج وفق اللياقة والقدرة الحالية، واختيار النشاط والأهداف بالاتفاق مع المشارك'});
  if(overweightContext && pillar==='activity') {
   sources.push({pillar,sourceId:'UPLOADED_EASO_OPPERT_2021',title:'Oppert et al. — Obesity Reviews 2021;22:e13273',location:'PDF ص 5، جدول 3',scope:'للبالغين ذوي زيادة الوزن أو السمنة: النشاط الهوائي المتوسط والمقاومة؛ لا افتراض لخسارة الوزن أو جراحة سابقة، ولا HIIT دون تقييم وإشراف'});
   sources.push({pillar,sourceId:'UPLOADED_EASO_CLINICIANS',title:'EASO clinician exercise guide',location:'الملف المرفوع، صفحة واحدة، الأهداف 2–3',scope:'تحسين تركيب الجسم واللياقة؛ التدرج الأولي في SMART مثال تطبيقي وليس جرعة مقتبسة حرفيًا'});
  }
  if(adult && age!>=65 && pillar==='nutrition') sources.push({pillar,sourceId:'UPLOADED_ESPEN_GERIATRICS_2022',title:'ESPEN — Clinical nutrition and hydration in geriatrics (2022)',location:'PDF ص 3–4، التوصيات 1–5؛ ص 26، 80–82',scope:'مرجع لكبار السن فقط: تفصيل التغذية والسوائل حسب الحالة وموازنة فوائد خفض الوزن ومخاطره؛ لا حساب آلي للبروتين أو السوائل أو عجز السعرات من BIA'});
 }
 return {sources,sourceIds:Array.from(new Set(sources.map(s=>s.sourceId)))};
}
