import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventAdminRouter, eventProfileInput, validatePoster } from './routers/eventAdmin';
import * as store from './eventAdminDb';
import type { TrpcContext } from './_core/context';
import { eventReportCsv } from '../shared/eventReport';
vi.mock('./eventAdminDb',()=>({readEventProfile:vi.fn(),updateEventProfile:vi.fn(),eventReportSummary:vi.fn(),eventReportPage:vi.fn()}));
const ctx=(user:unknown)=>({user,req:{headers:{}},res:{}} as TrpcContext);
const admin=eventAdminRouter.createCaller(ctx({id:1,role:'admin',adminType:'super'}));
const profile={name:'اليوم الصحي',startsOn:'2026-09-26',endsOn:'2026-09-27',location:'جدة',organizer:'ليم',questionnaireIds:['lifestyle'] as 'lifestyle'[]};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=';
beforeEach(()=>vi.clearAllMocks());
describe('event administration',()=>{
  it('restricts profile editing, poster, closure and reports to super admin',async()=>{
    for(const user of [null,{id:2,role:'user'},{id:3,role:'admin',adminType:'kiosk'},{id:4,role:'expert'}]){
      const caller=eventAdminRouter.createCaller(ctx(user));
      await expect(caller.save(profile)).rejects.toThrow();
      await expect(caller.poster({dataUrl:png})).rejects.toThrow();
      await expect(caller.setClosed({closed:true})).rejects.toThrow();
      await expect(caller.report({after:0,limit:50})).rejects.toThrow();
      await expect(caller.summary()).rejects.toThrow();
    }
    expect(store.updateEventProfile).not.toHaveBeenCalled();
    expect(store.eventReportPage).not.toHaveBeenCalled();
  });
  it('validates dates and does not silently activate unimplemented clinical questionnaires',()=>{
    expect(eventProfileInput.safeParse({...profile,endsOn:'2026-09-25'}).success).toBe(false);
    expect(eventProfileInput.safeParse({...profile,startsOn:'2026-02-30'}).success).toBe(false);
    expect(eventProfileInput.safeParse({...profile,questionnaireIds:['diabetes']}).success).toBe(false);
    expect(eventProfileInput.safeParse({...profile,questionnaireIds:[]}).success).toBe(true);
  });
  it('updates metadata without overwriting status or poster',async()=>{
    await admin.save(profile);
    expect(store.updateEventProfile).toHaveBeenCalledWith(profile);
    await admin.poster({dataUrl:png});
    expect(store.updateEventProfile).toHaveBeenLastCalledWith({poster:png});
    await admin.setClosed({closed:true});
    expect(store.updateEventProfile).toHaveBeenLastCalledWith({closed:1});
    await admin.setClosed({closed:false});
    expect(store.updateEventProfile).toHaveBeenLastCalledWith({closed:0});
  });
  it('rejects unsafe MIME, mismatched signatures and oversized poster bytes',()=>{
    expect(validatePoster(png)).toBe(png);
    expect(()=>validatePoster('data:image/svg+xml;base64,PHN2Zz4=')).toThrow();
    expect(()=>validatePoster('data:image/png;base64,'+Buffer.from('not a real png header').toString('base64'))).toThrow();
    const huge=Buffer.alloc(2*1024*1024+1);Buffer.from([137,80,78,71,13,10,26,10]).copy(huge);
    expect(()=>validatePoster('data:image/png;base64,'+huge.toString('base64'))).toThrow();
  });
  it('bounds report pages and passes explicit cursor',async()=>{
    await admin.report({after:50,limit:20});
    expect(store.eventReportPage).toHaveBeenCalledWith(50,20);
    await expect(admin.report({after:0,limit:1000})).rejects.toThrow();
  });
  it('quotes CSV data and neutralizes spreadsheet formulas',()=>{
    const csv=eventReportCsv([{name:'=HYPERLINK("test")',phone:'+966500000000',advice:'line1\nline2'}]);
    expect(csv).toContain('"\'=HYPERLINK(""test"")"');
    expect(csv).toContain('"\'+966500000000"');
    expect(csv).toContain('"line1\nline2"');
  });
});
