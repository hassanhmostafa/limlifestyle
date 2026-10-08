import EventPdfButton from "@/components/EventPdfButton";
import { eventReportCsv } from "@shared/eventReport";
import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CalendarDays, ImagePlus, ClipboardList, FileDown, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
const card='space-y-4 rounded-3xl border border-emerald-100 bg-white p-6';
const button='rounded-xl bg-[#123f37] px-5 py-3 font-bold text-white disabled:opacity-40';
const input='mt-2 w-full rounded-xl border border-emerald-100 bg-[#f8fbfa] p-3';
const catalog=[{id:'lifestyle',name:'استبيان نمط الحياة',ready:true},{id:'diabetes',name:'استبيان تقييم مخاطر الإصابة بالسكري',ready:false},{id:'cardiovascular',name:'استبيان مخاطر أمراض القلب والأوعية الدموية',ready:false}];
function download(name:string,content:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function EventAdminPanel(){
  const profile=trpc.eventAdmin.profile.useQuery(undefined,{retry:false,refetchOnWindowFocus:false});
  const summary=trpc.eventAdmin.summary.useQuery(undefined,{retry:false});
  const otpDiagnostics=trpc.eventAdmin.otpDiagnostics.useQuery(undefined,{enabled:false,retry:false});
  const utils=trpc.useUtils();
  const [form,setForm]=useState({name:'',startsOn:'',endsOn:'',location:'',organizer:'',questionnaireIds:['lifestyle'] as 'lifestyle'[]});
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [exporting,setExporting]=useState(false);
  const [confirmClose,setConfirmClose]=useState(false);const fileInput=useRef<HTMLInputElement>(null);
  const initialized=useRef(false);
  useEffect(()=>{if(profile.data&&!initialized.current){const p=profile.data;setForm({name:p.name,startsOn:p.startsOn??'',endsOn:p.endsOn??'',location:p.location,organizer:p.organizer,questionnaireIds:p.questionnaireIds.includes('lifestyle')?['lifestyle']:[]});initialized.current=true;}},[profile.data]);
  const onError=(e:{message:string})=>setMessage(e.message);
  const save=trpc.eventAdmin.save.useMutation({onSuccess:()=>{setMessage('تم حفظ بيانات الفعالية والاستبيانات');profile.refetch();},onError});
  const poster=trpc.eventAdmin.poster.useMutation({onSuccess:()=>{setMessage('تم تحديث البوستر');profile.refetch();},onError});
  const close=trpc.eventAdmin.setClosed.useMutation({onSuccess:()=>{setConfirmClose(false);setMessage('تم تحديث حالة التسجيل');profile.refetch();},onError});
  async function upload(file?:File){
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){setMessage('اختر صورة PNG أو JPG أو WebP حتى 2 ميجابايت');return;}
    setBusy(true);
    try {const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('تعذر قراءة الصورة'));reader.readAsDataURL(file);});
      const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('الصورة غير قابلة للعرض'));image.src=dataUrl;});
      await poster.mutateAsync({dataUrl});
    }catch(e){setMessage(e instanceof Error?e.message:'تعذر رفع البوستر');}finally{setBusy(false);if(fileInput.current)fileInput.current.value='';}
  }
  async function exportReport(format: "json" | "csv"){
    setExporting(true);setMessage('جارٍ إعداد التقرير…');
    try {const records:Record<string,unknown>[]=[];let after=0;do{const page=await utils.eventAdmin.report.fetch({after,limit:50});records.push(...page.records);if(page.nextCursor===null)break;after=page.nextCursor;}while(true);
      if (format==='csv') download('lim-event-report.csv',eventReportCsv(records),'text/csv;charset=utf-8');
      else download('lim-event-report.json',JSON.stringify({event:profile.data,summary:summary.data,exportedAt:new Date().toISOString(),records},null,2),'application/json');setMessage(`تم تنزيل تقرير ${records.length} زيارة شاملاً نتائج الجهاز والتمريض والتقارير المكتملة`);
    }catch(e){setMessage('تعذر تنزيل التقرير كاملًا. أعد المحاولة.');}finally{setExporting(false);}
  }
  if(profile.isLoading)return <section className={card}>جارٍ تحميل بيانات الفعالية…</section>;
  if(profile.error)return <section className={card}><p role="alert">تعذر تحميل إعدادات الفعالية. يرجى التحقق من تجهيز قاعدة البيانات.</p><button type="button" className={button} onClick={()=>profile.refetch()}>إعادة المحاولة</button></section>;
  return <>
    {message&&<p role="status" className="rounded-2xl bg-lime-50 p-4">{message}</p>}
    <form onSubmit={e=>{e.preventDefault();save.mutate(form);}} className={card}>
      <h2 className="flex items-center gap-2 text-xl font-bold"><CalendarDays/>بيانات الفعالية</h2>
      <label className="block">اسم الفعالية<input required maxLength={255} className={input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label>تاريخ البداية<input type="date" required className={input} value={form.startsOn} onChange={e=>setForm({...form,startsOn:e.target.value})}/></label><label>تاريخ النهاية<input type="date" required min={form.startsOn||undefined} className={input} value={form.endsOn} onChange={e=>setForm({...form,endsOn:e.target.value})}/></label></div>
      <label className="block">موقع الفعالية<input required maxLength={500} className={input} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
      <label className="block">الجهة المنظمة<input required maxLength={255} className={input} value={form.organizer} onChange={e=>setForm({...form,organizer:e.target.value})}/></label>
      <h2 className="flex items-center gap-2 pt-4 text-xl font-bold"><ClipboardList/>الاستبيانات</h2>
      <div className="rounded-2xl border border-emerald-100 bg-[#f8fbfa] p-4">
        <p className="font-bold">بدون استبيان</p>
        <p className="mt-1 text-sm text-slate-600">تبدأ الزيارات الجديدة بتحليل الجسم بعد التسجيل، ولن تظهر أسئلة أو إجابات الاستبيان للطبيب لهذه الزيارات.</p>
        <button type="button" className="mt-3 rounded-xl border border-[#123f37] px-4 py-2 font-bold text-[#123f37] disabled:opacity-40" disabled={!form.questionnaireIds.length} onClick={()=>setForm({...form,questionnaireIds:[]})}>تفعيل بدون استبيان</button>
      </div>
      <label className="block">إضافة استبيان<select className={input} value="" onChange={e=>{if(e.target.value==='lifestyle')setForm({...form,questionnaireIds:['lifestyle']});}}><option value="">اختر الاستبيان</option>{catalog.map(q=><option key={q.id} value={q.id} disabled={!q.ready||form.questionnaireIds.includes(q.id as 'lifestyle')}>{q.name}{!q.ready?' — بانتظار اعتماد النموذج':''}</option>)}</select></label>
      <div className="flex flex-wrap gap-2">{form.questionnaireIds.length ? form.questionnaireIds.map(id=><span key={id} className="rounded-full bg-emerald-50 px-4 py-2">استبيان نمط الحياة مفعّل</span>) : <span className="rounded-full bg-amber-50 px-4 py-2">لا يوجد استبيان للزيارات الجديدة</span>}</div>
      <p className="text-sm text-slate-600">بدون استبيانات تبدأ الزيارة بتحليل الجسم بعد التسجيل. التغيير للزيارات الجديدة فقط. استبيانا السكري والقلب يحتاجان اعتماد الأسئلة والتقييم قبل التفعيل.</p>
      <button className={button} disabled={save.isPending}>حفظ بيانات الفعالية</button>
    </form>
    <section className={card}>
      <h2 className="flex items-center gap-2 text-xl font-bold"><ImagePlus/>بوستر الفعالية</h2>
      <p>يظهر كاملًا في بداية صفحة المستفيد. PNG أو JPG أو WebP، حتى 2 ميجابايت.</p>
      {profile.data?.poster?<img src={profile.data.poster} alt="بوستر الفعالية" className="mx-auto max-h-[560px] w-full rounded-2xl object-contain"/>:<div className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-emerald-200 text-slate-500">مساحة بوستر الفعالية</div>}
      <input ref={fileInput} aria-label="ملف البوستر" type="file" accept="image/png,image/jpeg,image/webp" className="block w-full rounded-xl border p-3" disabled={busy||poster.isPending} onChange={e=>void upload(e.target.files?.[0])}/>
      {(busy||poster.isPending)&&<p role="status">جارٍ رفع البوستر…</p>}
      {profile.data?.poster&&<button type="button" className={button} disabled={busy||poster.isPending} onClick={()=>poster.mutate({dataUrl:null})}>إزالة البوستر</button>}
      <a href="/events" target="_blank" rel="noreferrer" className="block underline">معاينة صفحة المستفيد</a>
    </section>
    <section className={card}>
      <h2 className="flex items-center gap-2 text-xl font-bold"><LockKeyhole/>إغلاق الفعالية</h2>
      <p className="font-bold">الحالة: {profile.data?.closed?'التسجيل مغلق':'التسجيل مفتوح'}</p>
      <p>الإغلاق يوقف التسجيل الجديد. يستكمل المشاركون المسجلون زياراتهم وتبقى التقارير متاحة، دون حذف أي بيانات.</p>
      {confirmClose?<div className="space-y-3 rounded-2xl bg-amber-50 p-4"><p>هل تريد إغلاق التسجيل الجديد الآن؟</p><button type="button" className={button} disabled={close.isPending} onClick={()=>close.mutate({closed:true})}>تأكيد الإغلاق</button><button type="button" className="mx-4 underline" onClick={()=>setConfirmClose(false)}>إلغاء</button></div>:<button type="button" className={button} disabled={close.isPending} onClick={()=>profile.data?.closed?close.mutate({closed:false}):setConfirmClose(true)}>{profile.data?.closed?'إعادة فتح التسجيل':'إغلاق الفعالية'}</button>}
    </section>
    <section className={card}>
      <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck/>فحص اتصال OTP بالخادم المنشور</h2>
      <p className="text-sm text-slate-600">يفحص هذا الزر الخادم الذي يستقبل هذه الصفحة الآن عبر نقطة فحص الرصيد لدى OurSMS. لا يعرض المفتاح أو الرصيد أو رقم جوال أو أي رسالة من مزود الخدمة.</p>
      <button type="button" className={button} disabled={otpDiagnostics.isFetching} onClick={()=>void otpDiagnostics.refetch()}>
        <RefreshCw className="inline-block size-4"/> {otpDiagnostics.isFetching?'جارٍ الفحص…':'فحص إعداد OTP'}
      </button>
      {otpDiagnostics.error&&<p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-800">تعذر تنفيذ فحص OTP. تأكد من الدخول كمدير عام ثم أعد المحاولة.</p>}
      {otpDiagnostics.data&&<div role="status" className="space-y-2 rounded-2xl bg-[#f3f8f6] p-4 text-sm">
        <p><strong>المفتاح موجود:</strong> {otpDiagnostics.data.keyPresent?'نعم':'لا'} · <strong>الطول:</strong> {otpDiagnostics.data.keyLength}</p>
        <p>تفعيل OTP: {otpDiagnostics.data.enabled?'نعم':'لا'} · اسم المرسل: {otpDiagnostics.data.senderConfigured?'مضبوط':'ناقص'} · صيغة الإرسال: {otpDiagnostics.data.messageFormat} · سر التحقق: {otpDiagnostics.data.secretConfigured?'مضبوط':'ناقص'}</p><p><strong>بصمة آمنة للمقارنة:</strong> <code dir="ltr">{otpDiagnostics.data.keyFingerprint??'—'}</code></p>
        <p><strong>نتيجة OurSMS:</strong> {otpDiagnostics.data.transport==='network_error'?'تعذر الوصول للشبكة':otpDiagnostics.data.balanceHttpStatus===null?'لا يوجد مفتاح':'HTTP '+otpDiagnostics.data.balanceHttpStatus} {otpDiagnostics.data.balanceReachable?'— تم قبول المفتاح':'— لم يتم قبول المفتاح'}</p>
        <p className="text-slate-600">قارن البصمة وحالة HTTP بين المعاينة والموقع المنشور: تطابق البصمة مع 401 يعني أن OurSMS أو شبكة الخادم المنشور ترفض نفس المفتاح؛ اختلاف البصمة يعني أن إعداد secret المنشور مختلف.</p>
      </div>}
    </section>
    <section data-pdf-report id="event-print-report" className={card}>
      <style>{`@media print { body * { visibility: hidden; } #event-print-report, #event-print-report * { visibility: visible; } #event-print-report { position:absolute; inset:0; margin:0; } #event-print-report button { display:none; } }`}</style>
      <h2 className="flex items-center gap-2 text-xl font-bold"><FileDown/>تقرير الفعالية</h2>
      <p className="text-lg font-bold">{profile.data?.name}</p><p>{profile.data?.startsOn} — {profile.data?.endsOn}</p><p>{profile.data?.organizer} · {profile.data?.location}</p>
      {summary.error?<p role="alert">تعذر تحميل الإحصاءات</p>:<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{([['participants','المشاركون الفريدون'],['visits','الزيارات'],['measured','نتائج الجهاز'],['nursing','اكتمل التمريض'],['approved','تقارير مكتملة'],['finished','رحلات مكتملة']] as const).map(([key,title])=><div key={key} className="rounded-2xl bg-[#f3f8f6] p-4"><p className="text-sm">{title}</p><strong className="text-3xl">{summary.data?.[key]??'—'}</strong></div>)}</div>}
      <p className="text-sm text-slate-600">الملف التفصيلي مخصص للأدمن ويحتوي بيانات المشاركين واستبياناتهم ونتائج الجهاز والقياسات والنصائح المعتمدة.</p>
      <div data-pdf-hide className="flex flex-wrap gap-3"><button type="button" className={button} onClick={()=>summary.refetch()}>تحديث الإحصاءات</button><button type="button" className={button} disabled={exporting||!summary.data} onClick={()=>void exportReport("json")}>{exporting?'جارٍ التنزيل…':'تنزيل التقرير التفصيلي JSON'}</button><EventPdfButton className={button} label="تحميل الملخص للطباعة PDF" filename="lim-event-summary.pdf" /><button type="button" className={button} disabled={exporting||!summary.data} onClick={()=>void exportReport("csv")}>تنزيل جدول المشاركين CSV</button></div>
    </section>
  </>;
}
