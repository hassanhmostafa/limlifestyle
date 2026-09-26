// UI regression using the real Events page with explicit synthetic API fixtures.
// Run Vite locally first. Requires Playwright available to Node.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const superjson = require('superjson');
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE, args:['--no-sandbox']} : {})});
  try {
    for (const scenario of ['generic', 'scoped', 'retry']) {
      const context = await browser.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
      const page = await context.newPage();
      let attempts = 0, tracksRequests = 0, sent;
      const session = {code:'UI-TEST',firstName:'تجربة',age:40,sex:'male',city:'جدة',status:'registered',answers:{},deviceUserId:'0500000000',trackId:7,trackName:'المسار 7',consultationCompletedAt:null,reportCompletedAt:null};
      await page.route('**/api/trpc/**', async route => {
        const request = route.request(), url = new URL(request.url());
        const names = decodeURIComponent(url.pathname.split('/api/trpc/')[1]).split(',');
        const body = request.method()==='POST' ? JSON.parse(request.postData()) : {};
        const responses = names.map((name, i) => {
          let data = null;
          if(name==='events.tracks') { tracksRequests++; throw new Error('Registration must not request track list'); }
          if(name==='events.createSession') {
            attempts++; sent=superjson.deserialize(body[i]);
            if(scenario==='retry' && attempts===1) return {error:{json:{message:'Failed query: synthetic DB failure',code:-32603,data:{code:'INTERNAL_SERVER_ERROR',httpStatus:500,path:name}}}};
            data={accessToken:'synthetic-test-token-0000000000000000000000',session,deviceUserId:session.deviceUserId};
          } else if(name==='events.getSession') data=session;
          else if(name==='events.care') data={nursingEnabled:false,approvedAt:null,measurements:{}};
          else if(name==='events.results') data={readings:[]};
          return {result:{data:{json:data}}};
        });
        await route.fulfill({contentType:'application/json',body:JSON.stringify(responses)});
      });
      await page.goto('http://127.0.0.1:5173/events'+(scenario==='scoped'?'?track=7':''));
      await page.getByPlaceholder('مثال: عبداللطيف').fill('تجربة');
      await page.getByPlaceholder('18+').fill('40');
      await page.getByRole('button',{name:'ذكر',exact:true}).click();
      await page.getByPlaceholder('05XXXXXXXX',{exact:true}).fill('0500000000');
      await page.getByPlaceholder('أعد كتابة الرقم').fill('0500000000');
      await page.getByRole('checkbox').check();
      const submit=page.getByRole('button',{name:'إنشاء جلستي الصحية'});
      assert.equal(await submit.isEnabled(),true);
      assert.equal(await page.getByText('مسارك في الفعالية',{exact:true}).count(),0);
      await submit.click();
      if(scenario==='retry') {
        await page.getByRole('alert').filter({hasText:'تعذر حفظ التسجيل'}).waitFor();
        assert.equal(await page.getByPlaceholder('05XXXXXXXX',{exact:true}).inputValue(),'0500000000');
        await submit.click();
      }
      const next=page.getByRole('button').filter({hasText:'تقييم نمط الحياة'});
      await next.waitFor(); await next.click();
      await page.getByRole('progressbar').waitFor({state:'visible'});
      if (process.env.UI_SCREENSHOT && scenario==='generic') await page.screenshot({path:process.env.UI_SCREENSHOT,fullPage:true});
      assert.equal(sent.trackId,scenario==='scoped'?7:undefined);
      assert.equal(tracksRequests,0);
      console.log('PASS mobile registration -> lifestyle:',scenario);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
