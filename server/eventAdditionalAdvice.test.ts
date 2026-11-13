import {describe,it,expect} from 'vitest';
import {additionalEventAdvice,phq2Score} from './eventAdditionalAdvice';
import {composeEventBriefPlan} from './eventBriefPlan';
import {parseEventStaffScan} from '../shared/eventStaffScan';
const selected=['sleep','activity','nutrition'];
describe('independent PHA mood screening',()=>{
 it('uses sum of two complete 0-3 answers at the exact threshold',()=>{
  for(let lowMood=0;lowMood<=3;lowMood++)for(let lowInterest=0;lowInterest<=3;lowInterest++){
   expect(phq2Score({lowMood,lowInterest})).toBe(lowMood+lowInterest);
   const notes=additionalEventAdvice({lowMood,lowInterest},selected).join(' ');
   expect(notes.includes('تقييم المزاج')).toBe(lowMood+lowInterest>=3);
  }
 });
 it('never treats partial or invalid answers as a valid negative screen',()=>{
  for(const lowMood of [undefined,'',-1,4,'bad',null,true]){
   const answers={lowMood,lowInterest:3} as any;
   expect(phq2Score(answers)).toBeUndefined();expect(additionalEventAdvice(answers,selected)).toEqual([]);
  }
  expect(phq2Score({lowMood:'2',lowInterest:'1'})).toBe(3);
 });
 it('works when stress is selected and does not infer depression from stress score',()=>{
  expect(additionalEventAdvice({lowMood:2,lowInterest:1},['stress','sleep','nutrition']).join(' ')).toContain('الاستبيان لا يشخّص');
  expect(additionalEventAdvice({notOnTop:3,overwhelmed:3,lowMood:0,lowInterest:0},selected).join(' ')).not.toContain('الاكتئاب');
 });
});
describe('additional notes outside the three priorities',()=>{
 it('shows tobacco even at less than weekly use and accepts numeric never codes',()=>{
  expect(additionalEventAdvice({tobacco:'2'},selected).join(' ')).toContain('النيكوتين');
  expect(additionalEventAdvice({tobacco:3,alcoholUse:3},selected)).toEqual([]);
  expect(additionalEventAdvice({},selected)).toEqual([]);
 });
 it('includes substance follow-up together with positive mood screen in two concise notes',()=>{
  const n=additionalEventAdvice({tobacco:'0',medMisuse:'2',lowMood:'2',lowInterest:'2'},selected);
  expect(n).toHaveLength(2);expect(n[0]).toContain('طبيب الأسرة');expect(n[1]).toContain('التبغ');expect(n[1]).toContain('المواد');
 });
 it('only adds other lifestyle notes for unselected pillars with actual answers',()=>{
  expect(additionalEventAdvice({vegetables:'0.5',support:0},['sleep','activity','nutrition']).join(' ')).not.toContain('الخضروات');
  expect(additionalEventAdvice({vegetables:'0.5'},['sleep','activity','connection']).join(' ')).toContain('الخضروات');
  const vegetableOnly=additionalEventAdvice({vegetables:'0.5',fruit:'21'},['sleep','activity','connection']).join(' ');
  expect(vegetableOnly).toContain('زد الخضروات تدريجيًا');expect(vegetableOnly).not.toContain('الفاكهة');
  expect(additionalEventAdvice({tobacco:'0'},['substances','sleep','nutrition'])).toEqual([]);
 });
 it('keeps three prescriptions and appends notes without extra pillar selection',()=>{
  const p=composeEventBriefPlan({answers:{priority1:'sleep',priority2:'activity',priority3:'nutrition',sleepHours:'2',activeDays:1,activeMinutes:120,strengthDays:1,lowMood:2,lowInterest:1,tobacco:2},age:42});
  expect(p.advice.match(/الوصفة:/g)).toHaveLength(3);expect(p.advice).toContain('ملاحظات إضافية');expect(p.advice).toContain('40 دقيقة');expect(p.advice).toContain('حافظ على جلسة المقاومة');
  expect(p.advice).not.toContain('امشِ 20');expect(p.sourceIds).toEqual(['PHA_LIFESTYLE_GUIDELINES_20260705']);
 });
});
describe('staff camera identifiers',()=>{
 it('accepts exact visit codes and the existing kiosk phone QR',()=>{
  expect(parseEventStaffScan(' lim-755995-54 ')).toBe('LIM-755995-54');
  expect(parseEventStaffScan('٠٥٠١٢٣٤٥٦٧')).toBe('0501234567');
 });
 it('never navigates or accepts URLs, scripts or oversized/unrelated payloads',()=>{
  for(const value of ['https://evil.test/?code=LIM-755995-54','javascript:alert(1)','<script>','', 'LIM-'+'A'.repeat(80),'hello'])expect(parseEventStaffScan(value)).toBeNull();
 });
});
