// Real React UI at a mobile viewport; synthetic tRPC/provider responses, no SMS.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const superjson = require('superjson');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE, args: ['--no-sandbox'] } : {}) });
  try {
    for (const scenario of ['verified', 'send-failure', 'change-phone', 'config-failure']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await context.route('https://fonts.googleapis.com/**', r => r.abort());
      await context.route('https://fonts.gstatic.com/**', r => r.abort());
      const page = await context.newPage();
      await page.clock.install();
      let sends = 0, creates = 0, sentInput, verified = false;
      const token = 'synthetic-challenge-token-0000000000000000';
      const session = { code: 'TEST', firstName: 'تجربة', age: 40, sex: 'male', city: 'جدة', status: 'checked_in', answers: {}, deviceUserId: '0500000000', trackId: 1, questionnaireIds: ['lifestyle'] };
      const failure = (name, message) => ({ error: { json: { message, code: -32003, data: { code: 'UNAUTHORIZED', httpStatus: 401, path: name } } } });
      await page.route('**/api/trpc/**', async route => {
        const request = route.request(), url = new URL(request.url());
        const names = decodeURIComponent(url.pathname.split('/api/trpc/')[1]).split(',');
        const body = request.method() === 'POST' ? JSON.parse(request.postData()) : {};
        const responses = names.map((name, i) => {
          const input = body[i] ? superjson.deserialize(body[i]) : {};
          let data = null;
          if (name === 'events.otpStatus') {
            if (scenario === 'config-failure') return failure(name, 'Unavailable');
            data = { enabled: true };
          } else if (name === 'events.sendOtp') {
            sends++;
            if (scenario === 'send-failure') return failure(name, 'تعذر إرسال رمز التحقق.');
            data = { challengeToken: token + sends, retryAfterSeconds: 60, expiresInSeconds: 600 };
          } else if (name === 'events.verifyOtp') {
            assert.equal(input.challengeToken, token + sends);
            if (input.code !== '123456') return failure(name, 'رمز التحقق غير صحيح');
            verified = true; data = { verified: true };
          } else if (name === 'events.createSession') {
            assert.equal(verified, true, 'must verify before registering');
            creates++; sentInput = input;
            data = { accessToken: 'synthetic-session-token-0000000000000000', session, deviceUserId: session.deviceUserId };
          } else if (name === 'events.getSession') data = session;
          else if (name === 'events.care') data = { nursingEnabled: false, measurements: {}, approvedAt: null };
          else if (name === 'events.results') data = { readings: [] };
          return { result: { data: { json: data } } };
        });
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(responses) });
      });
      await page.goto('http://127.0.0.1:5173/events');
      await page.getByPlaceholder('مثال: عبداللطيف').fill('تجربة');
      await page.getByPlaceholder('18+').fill('40');
      await page.getByRole('button', { name: 'ذكر', exact: true }).click();
      await page.getByPlaceholder('05XXXXXXXX', { exact: true }).fill('0500000000');
      await page.getByPlaceholder('أعد كتابة الرقم').fill('0500000000');
      await page.getByRole('checkbox').check();
      const submit = page.getByRole('button', { name: 'إنشاء جلستي الصحية', exact: true });
      if (scenario === 'config-failure') {
        await page.getByRole('alert').filter({ hasText: 'تعذر تحميل إعدادات التسجيل' }).waitFor();
        assert.equal(await submit.isDisabled(), true);
        assert.equal(creates, 0);
      } else {
        await submit.click();
        if (scenario === 'send-failure') {
          await page.getByRole('alert').filter({ hasText: 'تعذر إرسال' }).waitFor();
          assert.equal(await page.getByPlaceholder('05XXXXXXXX', { exact: true }).inputValue(), '0500000000');
          assert.equal(creates, 0);
        } else {
          await page.getByRole('heading', { name: 'تأكيد رقم الجوال' }).waitFor();
          assert.equal(creates, 0);
          assert.equal(await page.getByRole('button', { name: /إعادة الإرسال بعد/ }).isDisabled(), true);
          if (scenario === 'change-phone') {
            await page.getByRole('button', { name: 'تعديل رقم الجوال أو البيانات' }).click();
            assert.equal(await page.getByPlaceholder('مثال: عبداللطيف').inputValue(), 'تجربة');
            assert.equal(creates, 0);
          } else {
            await page.getByLabel('رمز التحقق', { exact: true }).fill('000000');
            await page.getByRole('button', { name: 'تأكيد وإنشاء جلستي الصحية' }).click();
            await page.getByRole('alert').filter({ hasText: 'غير صحيح' }).waitFor();
            assert.equal(creates, 0);
            await page.screenshot({ path: '/tmp/lim-otp-ui.png', fullPage: true });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
            await page.clock.fastForward(61000);
            await page.getByRole('button', { name: 'إعادة إرسال الرمز', exact: true }).click();
            await page.waitForFunction(() => document.getElementById('event-otp').value === '');
            assert.equal(sends, 2);
            await page.getByLabel('رمز التحقق', { exact: true }).fill('١٢٣٤٥٦');
            await page.getByRole('button', { name: 'تأكيد وإنشاء جلستي الصحية' }).click();
            await page.getByRole('button').filter({ hasText: 'تقييم نمط الحياة' }).waitFor();
            assert.equal(creates, 1);
            assert.equal(sentInput.otpChallengeToken, token + sends);
            assert.equal(sentInput.phone, '0500000000');
          }
        }
      }
      console.log('PASS mobile OTP:', scenario);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
