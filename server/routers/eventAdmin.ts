import { listTracks } from "../eventTracksDb";
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, superAdminProcedure } from '../_core/trpc';
import * as store from '../eventAdminDb';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=> {
  const d = new Date(v+'T00:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===v;
}, 'تاريخ غير صحيح');
export const eventProfileInput = z.object({name:z.string().trim().min(1).max(255),startsOn:date,endsOn:date,
  location:z.string().trim().min(1).max(500),organizer:z.string().trim().min(1).max(255),
  questionnaireIds:z.array(z.literal('lifestyle')).max(1),
}).refine(v=>v.endsOn>=v.startsOn,{message:'تاريخ النهاية يجب ألا يسبق البداية',path:['endsOn']});
export function validatePoster(input: string) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!match) throw new TRPCError({code:'BAD_REQUEST',message:'اختر صورة PNG أو JPG أو WebP'});
  const bytes=Buffer.from(match[2],'base64');
  const valid = match[1]==='png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : match[1]==='jpeg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255
    : bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
  if(!valid || bytes.length>2*1024*1024 || bytes.length<12) throw new TRPCError({code:'BAD_REQUEST',message:'صورة غير صالحة أو أكبر من 2 ميجابايت'});
  return input;
}
export const eventAdminRouter = router({
  publicProfile: publicProcedure.query(()=>store.readEventProfile()),
  profile: superAdminProcedure.query(()=>store.readEventProfile()),
  save: superAdminProcedure.input(eventProfileInput).mutation(async({input})=>{await store.updateEventProfile(input);return {success:true};}),
  poster: superAdminProcedure.input(z.object({dataUrl:z.string().max(2800000).nullable()})).mutation(async({input})=>{
    await store.updateEventProfile({poster:input.dataUrl?validatePoster(input.dataUrl):null});return {success:true};
  }),
  setClosed: superAdminProcedure.input(z.object({closed:z.boolean()})).mutation(async({input})=>{
    await store.updateEventProfile({closed:Number(input.closed)});return {success:true};
  }),
  start: superAdminProcedure.mutation(async()=>{
    const profile=await store.readEventProfile();
    if(!eventProfileInput.safeParse(profile).success) throw new TRPCError({code:'BAD_REQUEST',message:'أكمل بيانات الفعالية وتواريخها وموقعها والجهة المنظمة واحفظها أولًا'});
    if(!(await listTracks(true)).length) throw new TRPCError({code:'BAD_REQUEST',message:'فعّل مسارًا واحدًا على الأقل قبل بدء الفعالية'});
    await store.updateEventProfile({closed:0});return {success:true};
  }),
  summary: superAdminProcedure.query(()=>store.eventReportSummary()),
  report: superAdminProcedure.input(z.object({after:z.number().int().nonnegative().default(0),limit:z.number().int().min(1).max(50).default(50)}))
    .query(({input})=>store.eventReportPage(input.after,input.limit)),
});
