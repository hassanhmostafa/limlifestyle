import {describe,it,expect} from 'vitest';
import {composeEventBriefPlan,BRIEF_PLAN_SOURCE} from './eventBriefPlan';
const a={priority1:'sleep',priority2:'activity',priority3:'nutrition',sleepHours:'2',activeDays:2,activeMinutes:120,strengthDays:2,wholeGrains:'5',refinedGrains:'5',vegetables:'10.5',sugary:'0.5'};
describe('brief single-source recommendations',()=>{
 it('combines the actual questionnaire with body data and preserves selected order',()=>{
 const p=composeEventBriefPlan({answers:a,age:42,body:{height:162.5,weight:75.7,bmi:28.7,fatRate:37.6,skeletalMuscle:26}});
 expect(p.advice).toContain('65.8');expect(p.advice).toContain('37.6');expect(p.advice).toContain('240');expect(p.advice).not.toContain('محلى');
 expect(p.advice.match(/الوصفة:/g)).toHaveLength(3);expect(p.priorities).toEqual(['sleep','activity','nutrition']);expect(p.sourceIds).toEqual([BRIEF_PLAN_SOURCE]);
 expect(p.advice).not.toMatch(/المصدر|ACLM|NICE|FITT|SMART|اختر|بحسب مرجع/);expect(p.advice.length).toBeLessThan(2400);
 });
 it('does not invent body measurements, weight loss, or missing answer deficiencies',()=>{
 const p=composeEventBriefPlan({answers:{priority1:'sleep',priority2:'activity',priority3:'nutrition'}});
 expect(p.advice).not.toContain('ملخص تحليل جسمك');expect(p.advice).not.toContain('امشِ');expect(p.advice).not.toContain('كجم');
 });
 it('does not prescribe weight loss to underweight or normal-weight adults',()=>{
 for(const bmi of [17,23])expect(composeEventBriefPlan({answers:a,age:42,body:{bmi,height:162.5,weight:60}}).advice).not.toContain('خفض الدهون');
 });
 it('handles other selected pillars without inferring substance use or missing support',()=>{
 const p=composeEventBriefPlan({answers:{priority1:'stress',priority2:'connection',priority3:'substances',overwhelmed:'0',support:'3',tobacco:'3',alcoholUse:'3',medMisuse:'3',cannabis:'3',otherDrugs:'3'},age:42});
 expect(p.advice.match(/الوصفة:/g)).toHaveLength(3);expect(p.advice).not.toContain('خطة التوقف');expect(p.advice).not.toContain('النوم');
 expect(p.advice.split('الأهداف:').slice(1).every(block=>(block.match(/^\d\)/gm)??[]).length<=3)).toBe(true);
 });
 it('requires three distinct valid priorities and adult scope',()=>{
 expect(()=>composeEventBriefPlan({answers:{...a,priority2:'sleep'}})).toThrow();
 expect(()=>composeEventBriefPlan({answers:a,age:15})).toThrow();
 });
});
