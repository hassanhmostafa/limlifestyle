// Stateful API fixtures, real mobile UI; no production data or SMS.
const {chromium}=require('playwright');
const superjson=require('superjson');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://fonts.gstatic.com/**',r=>r.abort());
  const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let researchers=[],logged=false,saved,exportPages=0;
  const events=[{eventCode:'event-a',name:'يوم الصحة',startsOn:'2026-09-28',endsOn:'2026-09-28'},{eventCode:'event-b',name:'فعالية أخرى',startsOn:null,endsOn:null}];
  const failure=name=>({error:{json:{message:'سجّل الدخول',code:-32001,data:{code:'UNAUTHORIZED',httpStatus:401,path:name}}}});
  await context.route('**/api/trpc/**',async route=>{
   const req=route.request(),url=new URL(req.url()),names=decodeURIComponent(url.pathname.split('/api/trpc/')[1]).split(',');
   const body=req.method()==='POST'?JSON.parse(req.postData()):JSON.parse(url.searchParams.get('input')||'{}');
   const results=names.map((name,i)=>{
    const input=body[i]?superjson.deserialize(body[i]):undefined;let value=null;
    if(name==='auth.me')value={id:1,name:'أدمن',role:'admin',adminType:'super'};
    if(name==='eventTeam.settings')value={nursingEnabled:0,testIds:[],tracks:[],staff:[]};
    if(name==='eventAdmin.profile')value={eventCode:'event-a',name:'يوم الصحة',startsOn:'2026-09-28',endsOn:'2026-09-28',location:'جدة',organizer:'ليم',questionnaireIds:['lifestyle'],closed:0};
    if(name==='eventAdmin.summary')value={visits:2,participants:2,measured:2,nursing:2,approved:2,finished:2};
    if(name==='eventResearch.adminList')value={researchers,events};
    if(name==='eventResearch.save'){saved=input;researchers=[{...input,id:1,active:1,allEvents:Number(input.allEvents),includeIdentity:Number(input.includeIdentity)}];value={id:1,code:'LIM-ABCDEF-ABCDEF-ABCDEF-ABCDEF'};}
    if(name==='eventResearch.login'){assert.equal(input.username,'researcher');assert.equal(input.code,'LIM-ABCDEF-ABCDEF-ABCDEF-ABCDEF');logged=true;value={success:true};}
    if(name==='eventResearch.me'){if(!logged)return failure(name);value={name:'باحث تجريبي',username:'researcher',includeIdentity:false,events:events.slice(0,1)};}
    if(name==='eventResearch.data'){
     assert.equal(input.eventCode,'event-a');if(input.purpose==='export')exportPages++;
     value={records:[{id:input.after?2:1,eventCode:'event-a',participantId:'P-1',age:40,sex:'male',questionnaireVersion:'2026-09-28',answers:{fruit:'2'},readings:[]}],nextCursor:input.after?null:1};
    }
    return {result:{data:superjson.serialize(value)}};
   });await route.fulfill({contentType:'application/json',body:JSON.stringify(results)});
  });
  await page.goto('http://127.0.0.1:5173/events/care-admin');
  await page.getByLabel('اسم الباحث',{exact:true}).fill('باحث تجريبي');await page.getByLabel('اسم المستخدم',{exact:true}).fill('researcher');
  const create=page.getByRole('button',{name:'إنشاء الحساب والكود',exact:true});assert.equal(await create.isDisabled(),true);
  await page.getByLabel(/يوم الصحة \(event-a\)/).check();await create.click();
  await page.getByText('LIM-ABCDEF-ABCDEF-ABCDEF-ABCDEF',{exact:true}).waitFor();assert.deepEqual(saved.eventCodes,['event-a']);assert.equal(saved.includeIdentity,false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('heading',{name:'الباحثون وصلاحيات البيانات'}).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/lim-research-admin.png'});
  console.log('PASS admin creates researcher with selected event and one-time code');
  await page.goto('http://127.0.0.1:5173/events/research');
  await page.getByLabel('اسم المستخدم',{exact:true}).fill('researcher');await page.getByLabel('كود الدخول',{exact:true}).fill('LIM-ABCDEF-ABCDEF-ABCDEF-ABCDEF');await page.getByRole('button',{name:'دخول',exact:true}).click();
  await page.getByText('أهلًا باحث تجريبي').waitFor();await page.getByText('P-1',{exact:true}).waitFor();
  assert.equal(await page.locator('select option').count(),1);
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'تنزيل CSV',exact:true}).click()]);
  const stream=await download.createReadStream();let csv='';for await(const chunk of stream)csv+=chunk.toString();assert.match(csv,/answers.fruit/);assert.equal(exportPages,2);
  await page.getByRole('button',{name:'التالي',exact:true}).click();await page.getByRole('heading',{name:'الزيارة 2',exact:true}).waitFor();
  await page.getByText('عرض البيانات',{exact:true}).click();await page.screenshot({path:'/tmp/lim-research-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  console.log('PASS researcher login, event filtering, pagination, raw view, complete CSV export; mobile has no overflow');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
