import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { parseEventStaffScan } from '@shared/eventStaffScan';

export default function EventCameraScanner({onScan,onClose}:{onScan:(value:string)=>void;onClose:()=>void}) {
 const video=useRef<HTMLVideoElement>(null);
 const panel=useRef<HTMLDivElement>(null);
 const close=useRef<HTMLButtonElement>(null);
 const handlers=useRef({onScan,onClose}); handlers.current={onScan,onClose};
 const [error,setError]=useState('');
 const [status,setStatus]=useState('جارٍ فتح الكاميرا…');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let cancelled=false,finished=false,controls:IScannerControls|undefined;
  const preview=video.current!;
  const opener=document.activeElement as HTMLElement|null;
  close.current?.focus();
  const stop=()=>{
   controls?.stop();
   const stream=preview.srcObject as MediaStream|null;
   stream?.getTracks().forEach(track=>track.stop());
   preview.srcObject=null;
  };
  const hide=()=>{if(document.hidden){cancelled=true;stop();handlers.current.onClose();}};
  const leave=()=>{cancelled=true;stop();handlers.current.onClose();};
  document.addEventListener('visibilitychange',hide);
  window.addEventListener('pagehide',leave);
  setError('');setStatus('جارٍ فتح الكاميرا…');
  void (async()=>{
   try{
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');
    const {BrowserMultiFormatReader}=await import('@zxing/browser');
    if(cancelled)return;
    const reader=new BrowserMultiFormatReader();
    controls=await reader.decodeFromVideoDevice(undefined,preview,(result,_error,scanControls)=>{
     if(cancelled||finished||!result)return;
     const value=parseEventStaffScan(result.getText());
     if(!value){setStatus('الرمز غير صالح للمشارك. وجّه الكاميرا إلى رمز زيارته في ليم.');return;}
     finished=true;scanControls.stop();stop();handlers.current.onScan(value);
    });
    if(cancelled||finished){controls.stop();stop();return;}
    setStatus('وجّه الكاميرا إلى رمز المشارك.');
   }catch(e){
    stop();if(cancelled||finished)return;
    const name=e instanceof Error?e.name:'';
    setError(name==='NotAllowedError'||name==='SecurityError'?'لم يُسمح باستخدام الكاميرا. اسمح بها من إعدادات المتصفح أو استخدم البحث اليدوي.':name==='NotFoundError'?'لا توجد كاميرا متاحة. يمكنك البحث يدويًا.':name==='NotReadableError'?'الكاميرا مستخدمة في تطبيق آخر. أغلقه وحاول مجددًا.':'تعذر فتح الكاميرا. افتح الصفحة عبر HTTPS أو استخدم البحث اليدوي.');
   }
  })();
  return()=>{cancelled=true;stop();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);opener?.focus();};
 },[attempt]);
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="scanner-title" dir="rtl" className="w-full max-w-md rounded-3xl bg-white p-5 text-[#123f37] shadow-xl" onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();onClose();}
   if(e.key==='Tab'){
    const items=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[href],input');
    if(!items?.length)return; const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  }}>
   <div className="mb-4 flex items-center justify-between gap-3"><h2 id="scanner-title" className="text-lg font-bold">مسح رمز المشارك</h2><button ref={close} type="button" onClick={onClose} className="rounded-xl border px-3 py-2">إغلاق</button></div>
   <video ref={video} muted autoPlay playsInline aria-label="معاينة كاميرا مسح الرمز" className="aspect-square w-full rounded-2xl bg-black object-cover" />
   {error?<p role="alert" className="my-3 text-sm text-red-700">{error}</p>:<p role="status" className="my-3 text-sm">{status}</p>}
   <p className="text-xs text-slate-500">تُقرأ الصورة على جهازك، ولا تُحفظ أو تُرفع. تأكد من اسم المشارك بعد المسح.</p>
   <div className="mt-4 flex gap-3">{error&&<button type="button" onClick={()=>setAttempt(n=>n+1)} className="rounded-xl bg-[#123f37] px-4 py-3 text-white">إعادة المحاولة</button>}<button type="button" onClick={onClose} className="rounded-xl border px-4 py-3">البحث اليدوي</button></div>
  </div>
 </div>;
}
