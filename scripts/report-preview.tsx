// Local-only synthetic fixture. Bundle for visual/PDF QA; never uses participant data.
import React from "react";
import { createRoot } from "react-dom/client";
import EventPrintReport from "../client/src/components/EventPrintReport";
import { EventBodyResults } from "../client/src/components/EventBodyResults";
import { downloadEventPdf } from "../client/src/lib/eventPdf";
const answers = { importance:5, confidence:5, priority1:"nutrition", priority2:"activity", priority3:"sleep", fruit:"5", vegetables:"5", wholeGrains:"5", refinedGrains:"2", preparedFood:"2", sugary:"0", salty:"0", fried:"0", proteins:["legumes"], sleepHours:"3", dayTired:"0", activeDays:3, activeMinutes:30, strengthDays:2, lowInterest:"0", lowMood:"0", notOnTop:"0", overwhelmed:"0", purpose:"3", support:"3", tobacco:"3", alcohol:"3", medMisuse:"3", cannabis:"3", otherDrugs:"3" };
const reading = { id:1, recordedAt:"2026-10-06T08:00:00Z", recordNo:"DEMO-ONLY", source:"x18_test", height:"161.5", weight:"75.2", bmi:"28.8", machineMetrics:{fatRate:"38.1",fatRate_n:"10 - 20",fatRate_s:"2",skeletalMuscle:"25.9",skeletalMuscle_n:"25 - 30",vfal:"13",vfal_n:"1 - 9",whr:"0.94",whr_n:"0.8 - 0.9",bodyAge:"51",muscleRightArm:"2.49",muscleLeftArm:"2.47",muscleTrunk:"21.4",muscleRightLeg:"7.05",muscleLeftLeg:"7.05",fatRightArm:"2.1",fatLeftArm:"2.1",fatTrunk:"14.7",fatRightLeg:"4.2",fatLeftLeg:"4.2"} };
const participant = { firstName:"نموذج اختبار التصميم",age:43,sex:"male",code:"DEMO-ONLY" };
function Preview() {
  const [long, setLong] = React.useState(false);
  return <><nav><button onClick={()=>setLong(!long)}>تبديل النص الطويل</button><button onClick={async()=>{try {await downloadEventPdf(document.querySelector('[data-final-report]')!,long?'lim-qa-long.pdf':'lim-qa-report.pdf'); document.querySelector('#result')!.textContent='تم';} catch(e) {document.querySelector('#result')!.textContent=String(e);}}}>تحميل PDF</button><span id="result" /></nav><div data-final-report><EventPrintReport participant={participant} readings={[reading]} answers={answers} lifestyleEnabled care={{nursingCompletedAt:true,measurements:{blood_glucose:{value:"110",context:"عشوائي"},temperature:{value:"37",site:"الأذن"},waist:{value:"90"}},advice:long?Array.from({length:70},(_,i)=>`${i+1}. سطر تجريبي للتحقق من استمرار النص دون حذف أو تداخل — Test 123.`).join('\n'):"هذا نص تجريبي لفحص تنسيق توصيات الطبيب.\nسطر ثانٍ يجمع العربية مع English و123.",doctorName:"طبيب الاختبار"}}/><EventBodyResults participant={participant} readings={[reading]} /></div></>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
