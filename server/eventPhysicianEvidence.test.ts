import {describe,it,expect} from 'vitest';
import {physicianEvidence} from './eventPhysicianEvidence';
describe('physician references',()=>{
 it('keeps old catalog sources and examples while excluding PHM',()=>{
 const p=physicianEvidence(['sleep','stress','connection'],42,28);
 expect(p.sourceIds).toContain('UPLOADED_FITT_SMART_EXAMPLES');expect(p.sourceIds.some(id=>id.includes('PHM'))).toBe(false);
 expect(p.sources.every(s=>['sleep','stress','connection'].includes(s.pillar))).toBe(true);
 expect(p.sourceIds.some(id=>id.includes('NICE')||id.includes('EASO')||id.includes('ESPEN'))).toBe(false);
 });
 it('limits EASO and NICE to relevant adult weight management context',()=>{
 expect(physicianEvidence(['activity','nutrition'],42,28).sourceIds).toContain('UPLOADED_NICE_NG246_2026');
 expect(physicianEvidence(['activity'],42,28).sourceIds).toContain('UPLOADED_EASO_OPPERT_2021');
 for(const age of [undefined,16]) expect(physicianEvidence(['activity'],age,28).sourceIds).not.toContain('UPLOADED_EASO_OPPERT_2021');
 expect(physicianEvidence(['activity'],42,23).sourceIds).not.toContain('UPLOADED_EASO_OPPERT_2021');
 });
 it('never generalizes geriatric ESPEN advice to younger or age-unknown users',()=>{
 for(const age of [undefined,42,64]) expect(physicianEvidence(['nutrition'],age,28).sourceIds).not.toContain('UPLOADED_ESPEN_GERIATRICS_2022');
 expect(physicianEvidence(['nutrition'],65,28).sourceIds).toContain('UPLOADED_ESPEN_GERIATRICS_2022');
 expect(physicianEvidence(['sleep'],75,28).sourceIds).not.toContain('UPLOADED_ESPEN_GERIATRICS_2022');
 });
});
