// Real UI with stateful synthetic API fixtures. No production writes.
const {chromium}=require('playwright');
const superjson=require('superjson');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox']}: {})});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await context.newPage();
  let profile={eventCode:'lim-events',name:'فعالية ليم',startsOn:null,endsOn:null,location:'',organizer:'',questionnaireIds:['lifestyle'],poster:null,closed:0};
  const counts={visits:2,participants:2,measured:1,nursing:1,approved:1,finished:1};
  const calls=[];
  await context.route('**/api/trpc/**',async route=>{
   const req=route.request(),url=new URL(req.url());const names=decodeURIComponent(url.pathname.split('/api/trpc/')[1]).split(',');
   const body=req.method()==='POST'?JSON.parse(req.postData()):JSON.parse(url.searchParams.get('input')||'{}');
   const result=names.map((name,i)=>{
    calls.push(name);const data=body[i]?superjson.deserialize(body[i]):undefined;let value=null;
    if(name==='auth.me')value={id:1,name:'اختبار الأدمن',role:'admin',adminType:'super'};
    else if(name==='eventTeam.settings')value={nursingEnabled:0,testIds:[],tracks:[],staff:[]};
    else if(['eventAdmin.profile','eventAdmin.publicProfile'].includes(name))value={...profile};
    else if(name==='eventAdmin.save'){profile={...profile,...data};value={success:true};}
    else if(name==='eventAdmin.poster'){profile.poster=data.dataUrl;value={success:true};}
    else if(name==='eventAdmin.setClosed'){profile.closed=Number(data.closed);value={success:true};}
    else if(name==='eventAdmin.summary')value=counts;
    else if(name==='eventAdmin.report')value={records:[{code:'TEST-1',name:'بيانات تجريبية',phone:'0500000000',advice:'نصائح تجريبية',readings:[]}],nextCursor:null};
    return {result:{data:superjson.serialize(value)}};
   });await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.goto('http://127.0.0.1:5173/events/care-admin');
  await page.getByLabel('اسم الفعالية',{exact:true}).fill('يوم الصحة التجريبي');
  await page.getByLabel('تاريخ البداية',{exact:true}).fill('2026-09-26');
  await page.getByLabel('تاريخ النهاية',{exact:true}).fill('2026-09-27');
  await page.getByLabel('موقع الفعالية',{exact:true}).fill('جدة');
  await page.getByLabel('الجهة المنظمة',{exact:true}).fill('ليم');
  await page.getByRole('button',{name:'حفظ بيانات الفعالية',exact:true}).click();
  await page.getByRole('status').filter({hasText:'تم حفظ بيانات'}).waitFor();
  assert.equal(profile.name,'يوم الصحة التجريبي');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=','base64');
  await page.getByLabel('ملف البوستر').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:png});
  await page.getByAltText('بوستر الفعالية').waitFor();
  assert.ok(profile.poster.startsWith('data:image/png;'));
  assert.ok(page.url().endsWith('/events/care-admin'));
  await page.reload();await page.getByAltText('بوستر الفعالية').waitFor();
  assert.equal(await page.getByLabel('اسم الفعالية',{exact:true}).inputValue(),'يوم الصحة التجريبي');
  console.log('PASS metadata and poster upload remain after reload; admin page stays open');
  await page.getByRole('button',{name:'استبيان نمط الحياة ×'}).click();
  await page.getByRole('button',{name:'حفظ بيانات الفعالية',exact:true}).click();
  await page.getByRole('status').filter({hasText:'تم حفظ بيانات'}).waitFor();
  assert.deepEqual(profile.questionnaireIds,[]);
  await page.getByRole('button',{name:'إغلاق الفعالية',exact:true}).click();
  await page.getByRole('button',{name:'تأكيد الإغلاق',exact:true}).click();
  await page.getByRole('button',{name:'إعادة فتح التسجيل',exact:true}).waitFor();
  const participant=await context.newPage();await participant.goto('http://127.0.0.1:5173/events');
  await participant.getByText('انتهى التسجيل في هذه الفعالية. شكرًا لاهتمامك.').waitFor();
  assert.equal(await participant.getByRole('button',{name:'إنشاء جلستي الصحية'}).count(),0);
  await page.getByRole('button',{name:'إعادة فتح التسجيل',exact:true}).click();
  await page.getByRole('button',{name:'إغلاق الفعالية',exact:true}).waitFor();
  await participant.reload();await participant.getByRole('button',{name:'إنشاء جلستي الصحية'}).waitFor();
  console.log('PASS questionnaire save; close blocks new registration; reopen restores it');
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'تنزيل جدول المشاركين CSV'}).click();
  const file=await downloaded;assert.equal(file.suggestedFilename(),'lim-event-report.csv');
  assert.ok(calls.includes('eventAdmin.report'));
  if(process.env.UI_SCREENSHOT)await page.screenshot({path:process.env.UI_SCREENSHOT,fullPage:true});
  console.log('PASS report CSV download');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
