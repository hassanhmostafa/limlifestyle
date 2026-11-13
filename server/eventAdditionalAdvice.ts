import type { EventAnswers } from '../shared/eventLifestyle';

// PHA Lifestyle Medicine Guidelines 20260705: printed pp.104,118,120.
// PHQ-2 is independent of the combined lifestyle score; partial answers are not negative screens.
const frequency=(a:EventAnswers,k:string)=>{
 const v=a[k];
 return (typeof v==='number'||typeof v==='string')&&v!==''&&[0,1,2,3].includes(Number(v))?Number(v):undefined;
};
const times=(a:EventAnswers,k:string)=>{
 const v=a[k];
 return (typeof v==='number'||typeof v==='string')&&v!==''&&[0,.5,2,5,10.5,21].includes(Number(v))?Number(v):undefined;
};
export function phq2Score(a:EventAnswers):number|undefined {
 const mood=frequency(a,'lowMood'),interest=frequency(a,'lowInterest');
 return mood===undefined||interest===undefined?undefined:mood+interest;
}
export function additionalEventAdvice(a:EventAnswers,priorities:readonly string[]):string[] {
 const notes:string[]=[];
 if((phq2Score(a)??-1)>=3) notes.push('يُنصح بمراجعة طبيب الأسرة لاستكمال تقييم المزاج؛ الاستبيان لا يشخّص الاكتئاب.');
 const used=(k:string)=>{const n=frequency(a,k);return n!==undefined&&n<3;};
 // Safety follow-up remains visible even when substances is a selected pillar.
 const tobacco=used('tobacco');
 const other=['alcoholUse','alcohol','medMisuse','cannabis','otherDrugs'].some(used);
 const habits:string[]=[];
 if(!priorities.includes('substances')&&(tobacco||other)) habits.push(tobacco&&other?'اطلب دعم الطبيب للتوقف عن التبغ وتقييم استخدام المواد':tobacco?'اطلب دعم مختص للتوقف عن التبغ أو النيكوتين':'راجع الطبيب لتقييم استخدام المواد والأدوية ووضع خطة آمنة');
 if(!priorities.includes('nutrition')){
  const fruit=times(a,'fruit'),veg=times(a,'vegetables');
  const lowFruit=fruit!==undefined&&fruit<5,lowVeg=veg!==undefined&&veg<5;
  if(lowFruit&&lowVeg)habits.push('زد الفاكهة والخضروات تدريجيًا');
  else if(lowFruit)habits.push('زد تناول الفاكهة تدريجيًا');
  else if(lowVeg)habits.push('زد الخضروات تدريجيًا');
  else if((times(a,'preparedFood')??0)>=5)habits.push('قلل الوجبات الجاهزة تدريجيًا');
 }
 if(!priorities.includes('sleep')&&['0','1','2'].includes(String(a.sleepHours))) habits.push('نظّم نومك وزد مدته تدريجيًا');
 if(!priorities.includes('activity')){
  const d=a.activeDays,m=a.activeMinutes;
  if(d!==undefined&&m!==undefined&&d!==''&&m!==''&&Number.isFinite(Number(d))&&Number.isFinite(Number(m))&&Number(d)>=0&&Number(m)>=0&&Number(d)*Number(m)<150)habits.push('وزّع نشاطك وزده تدريجيًا حسب قدرتك');
 }
 if(!priorities.includes('stress')&&(phq2Score(a)??0)<3&&['notOnTop','overwhelmed'].some(k=>(frequency(a,k)??0)>=2))habits.push('خصص وقتًا للاسترخاء واطلب الدعم عند استمرار الضغوط');
 if(!priorities.includes('connection')&&frequency(a,'support')===0)habits.push('تواصل بانتظام مع شخص داعم');
 if(habits.length)notes.push(habits.join('؛ ')+'.');
 return notes;
}
