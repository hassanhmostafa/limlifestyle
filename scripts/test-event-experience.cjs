// Real UI, synthetic API: charts, questionnaire scrolling and actual final PDF.
const { chromium } = require("playwright");
const superjson = require("superjson");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE
      ? {
          executablePath: process.env.CHROME_EXECUTABLE,
          args: ["--no-sandbox"],
        }
      : {}),
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      acceptDownloads: true,
    });
    await context.route("https://fonts.googleapis.com/**", r => r.abort());
    await context.route("https://fonts.gstatic.com/**", r => r.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const answers = {
      importance: 5,
      confidence: 5,
      priority1: "nutrition",
      priority2: "activity",
      priority3: "sleep",
      fruit: "5",
      vegetables: "5",
      wholeGrains: "5",
      refinedGrains: "2",
      preparedFood: "2",
      sugary: "0",
      salty: "0",
      fried: "0",
      proteins: ["legumes"],
      sleepHours: "3",
      dayTired: "0",
      activeDays: 3,
      activeMinutes: 30,
      strengthDays: 2,
      lowInterest: "0",
      lowMood: "0",
      notOnTop: "0",
      overwhelmed: "0",
      purpose: "3",
      support: "3",
      tobacco: "3",
      alcohol: "3",
      medMisuse: "3",
      cannabis: "3",
      otherDrugs: "3",
    };
    const session = {
      code: "UI-TEST",
      firstName: "بيانات تجريبية",
      age: 40,
      sex: "male",
      city: "جدة",
      status: "measured",
      answers,
      deviceUserId: "0500000000",
      trackId: 7,
      questionnaireIds: ["lifestyle"],
      consultationCompletedAt: null,
      reportCompletedAt: null,
    };
    const care = {
      nursingEnabled: 0,
      testIds: [],
      measurements: {},
      advice: "نصائح الطبيب التجريبية",
      doctorName: "طبيب الاختبار",
      approvedAt: "2026-09-26T10:00:00Z",
    };
    const reading = {
      id: 1,
      recordedAt: "2026-09-26T09:00:00Z",
      recordNo: "TEST-1",
      height: "174.5",
      weight: "76.6",
      bmi: "25.2",
      machineMetrics: { fatRate: "25.3", muscle: "42.8", bmr: "1426" },
    };
    let partial = false;
    await context.route("**/api/events/anatomy/**", r =>
      r.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=",
          "base64"
        ),
      })
    );
    await context.route("**/api/trpc/**", async route => {
      const url = new URL(route.request().url());
      const names = decodeURIComponent(
        url.pathname.split("/api/trpc/")[1]
      ).split(",");
      const result = names.map(name => {
        let value = null;
        if (name === "eventTeam.me")
          value = {
            id: 1,
            duty: "doctor",
            name: "الطبيب",
            trackId: 7,
            trackName: "المسار 7",
          };
        else if (name === "eventTeam.lookup")
          value = {
            id: 1,
            name: session.firstName,
            phone: "0500000000",
            code: session.code,
            sex: "male",
            age: 40,
          };
        else if (name === "eventTeam.record")
          value = {
            care,
            answers: partial ? {} : answers,
            readings: [reading],
          };
        else if (name === "events.getSession") value = session;
        else if (name === "events.care") value = care;
        else if (name === "events.results") value = { readings: [reading] };
        return { result: { data: superjson.serialize(value) } };
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });
    await page.goto("http://127.0.0.1:5173/events/team");
    await page.locator("#participant-query").fill("0500000000");
    await page.locator("#participant-query").press("Enter");
    await page.getByRole("checkbox").check();
    await page.getByRole("region", { name: "رسوم نتائج نمط الحياة" }).waitFor();
    assert.equal(await page.getByRole("meter").count(), 6);
    for (const meter of await page.getByRole("meter").all()) {
      const v = Number(await meter.getAttribute("aria-valuenow"));
      assert.ok(v >= 0 && v <= 10);
    }
    await page
      .getByRole("region", { name: "رسوم نتائج نمط الحياة" })
      .screenshot({ path: "/tmp/lim-doctor-charts.png" });
    console.log("PASS doctor sees six labelled charts and score values");
    partial = true;
    await page.reload();
    await page.locator("#participant-query").fill("0500000000");
    await page.locator("#participant-query").press("Enter");
    await page.getByRole("checkbox").check();
    await page
      .getByText("لم يُحفظ استبيان كامل لهذه الزيارة؛ تظهر الرسوم عند اكتماله.")
      .waitFor();
    assert.equal(await page.getByRole("meter").count(), 0);
    partial = false;
    console.log("PASS missing questionnaire does not show fabricated scores");
    await page.evaluate(() =>
      localStorage.setItem(
        "lim-events-session-token",
        "synthetic-test-token-0000000000000000000000"
      )
    );
    await page.goto("http://127.0.0.1:5173/events");
    await page
      .getByRole("button", { name: "متابعة الرحلة", exact: true })
      .click();
    await page
      .getByRole("button", { name: "عرض التقرير النهائي", exact: true })
      .click();
    await page.getByText(care.advice, { exact: true }).waitFor();
    const downloaded = page.waitForEvent("download", { timeout: 45000 });
    await page
      .getByRole("button", { name: "تحميل التقرير للطباعة (PDF)", exact: true })
      .last()
      .click();
    const pdf = await downloaded.catch(async e => {
      console.log("PDF ALERT", await page.getByRole("alert").allTextContents());
      console.log(
        "PDF ERROR",
        await page.evaluate(async () => {
          try {
            await (
              await import("/src/lib/eventPdf.ts")
            ).downloadEventPdf(
              document.querySelector("[data-final-report]"),
              "debug.pdf"
            );
            return "ok";
          } catch (e) {
            return e.stack;
          }
        })
      );
      throw e;
    });
    await pdf.saveAs("/tmp/lim-final-test.pdf");
    assert.equal(
      require("node:fs")
        .readFileSync("/tmp/lim-final-test.pdf")
        .subarray(0, 4)
        .toString(),
      "%PDF"
    );
    console.log("PASS approved final report downloads as real PDF");
    await page
      .getByRole("button", { name: "العودة إلى الرحلة", exact: true })
      .click();
    await page
      .getByRole("button")
      .filter({ hasText: "تقييم نمط الحياة" })
      .click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "التالي", exact: true }).click();
      await page.waitForFunction(() => window.scrollY === 0);
      if (i === 2)
        await page.screenshot({ path: "/tmp/lim-questionnaire-top.png" });
    }
    await page
      .getByRole("button", { name: "العودة إلى الرحلة", exact: true })
      .click();
    await page.waitForFunction(() => window.scrollY === 0);
    console.log(
      "PASS questionnaire next/back reset to top, including long nutrition page"
    );
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
