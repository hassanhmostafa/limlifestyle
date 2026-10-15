import { beforeEach, describe, it, expect, vi } from "vitest";
import { eventResearchRouter } from "./routers/eventResearch";
import * as store from "./eventResearchDb";
import { researchRecord } from "./lib/eventResearchData";
import { researchCsv } from "../shared/eventResearchExport";
import { EVENT_LIFESTYLE_VERSION, eventLifestyleSections, type EventAnswers } from "../shared/eventLifestyle";
import { lifestyleReport } from "../shared/eventLifestyleInsights";
vi.mock("./eventResearchDb", () => ({
  listResearchers: vi.fn(),
  researchEvents: vi.fn(),
  saveResearcher: vi.fn(),
  rotateResearchCode: vi.fn(),
  researcherByCredential: vi.fn(),
  createResearchSession: vi.fn(),
  endResearchSession: vi.fn(),
  researcherBySession: vi.fn(),
  allowedResearchEvents: vi.fn(),
  researchPage: vi.fn(),
  researchExport: vi.fn(),
}));
const token = "a".repeat(43);
function context(user: any = null, cookie = "") {
  return {
    user,
    req: { headers: { cookie }, ip: "test-research-ip" },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  } as any;
}
const admin = { id: 1, role: "admin", adminType: "super" };
const r = {
  id: 10,
  name: "باحث",
  username: "researcher",
  credentialVersion: 1,
  allEvents: 0,
  includeIdentity: 0,
  active: 1,
  codeHash: "private",
} as any;
const input = {
  name: "باحث",
  username: "researcher",
  allEvents: false,
  eventCodes: ["event-a"],
  includeIdentity: false,
  reportArchiveAccess: false,
  active: true,
};
beforeEach(() => vi.resetAllMocks());
describe("research access boundaries", () => {
  it.each([
    null,
    { id: 2, role: "user" },
    { id: 3, role: "admin", adminType: "kiosk" },
    { id: 4, role: "expert" },
  ])("only super admin manages accounts %j", async user => {
    const caller = eventResearchRouter.createCaller(context(user));
    await expect(caller.adminList()).rejects.toThrow();
    await expect(caller.save(input)).rejects.toThrow();
    await expect(caller.rotate({ id: 10 })).rejects.toThrow();
    expect(store.saveResearcher).not.toHaveBeenCalled();
  });
  it("generates a code once, only stores a hash, and does not assign a track", async () => {
    vi.mocked(store.saveResearcher).mockResolvedValue({ id: 10 });
    const result = await eventResearchRouter
      .createCaller(context(admin))
      .save(input);
    expect(result.code).toMatch(/^LIM-/);
    expect(store.saveResearcher).toHaveBeenCalledWith(
      input,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      1
    );
    expect(store.saveResearcher.mock.calls[0][1]).not.toBe(result.code);
  });
  it("rejects identified researcher access until separate research consent exists", async () => {
    const caller = eventResearchRouter.createCaller(context(admin));
    await expect(
      caller.save({ ...input, includeIdentity: true as false })
    ).rejects.toThrow("منزوعة الهوية");
    expect(store.saveResearcher).not.toHaveBeenCalled();
  });
  it("does not accept a doctor cookie or an unsigned research identity", async () => {
    const caller = eventResearchRouter.createCaller(
      context(null, `lim_event_staff=${token}`)
    );
    await expect(caller.me()).rejects.toThrow();
    await expect(caller.data({ eventCode: "event-a" })).rejects.toThrow();
    expect(store.researchPage).not.toHaveBeenCalled();
  });
  it("rejects a revoked or expired session before reading records", async () => {
    vi.mocked(store.researcherBySession).mockResolvedValue(undefined);
    await expect(
      eventResearchRouter
        .createCaller(context(null, `lim_event_research=${token}`))
        .data({ eventCode: "event-a" })
    ).rejects.toThrow();
    expect(store.researchPage).not.toHaveBeenCalled();
  });
  it("passes authenticated identity and selected event to the scoped data store", async () => {
    vi.mocked(store.researcherBySession).mockResolvedValue(r);
    vi.mocked(store.researchPage).mockResolvedValue({
      records: [],
      nextCursor: null,
    });
    const c = eventResearchRouter.createCaller(
      context(null, `lim_event_research=${token}`)
    );
    await c.data({
      eventCode: "event-b",
      purpose: "export",
      after: 20,
      limit: 50,
      from: "2026-01-01",
      to: "2026-01-31",
      code: "VISIT-7",
      identity: "allowed-only",
    });
    expect(store.researchPage).toHaveBeenCalledWith(
      r,
      "event-b",
      20,
      50,
      "export",
      { from: "2026-01-01", to: "2026-01-31", code: "VISIT-7", identity: "allowed-only" }
    );
    await expect(
      c.data({ eventCode: "event-b", limit: 1000 })
    ).rejects.toThrow();
  });
  it("denies multi-event workbook export without a valid researcher session", async () => {
    await expect(eventResearchRouter.createCaller(context()).exportXlsx({ eventCodes: ["event-a", "event-b"] })).rejects.toThrow();
    expect(store.researchExport).not.toHaveBeenCalled();
  });
  it("passes every selected event to the server-scoped workbook query", async () => {
    vi.mocked(store.researcherBySession).mockResolvedValue(r);
    vi.mocked(store.researchExport).mockResolvedValue([]);
    const result = await eventResearchRouter.createCaller(context(null, `lim_event_research=${token}`)).exportXlsx({ eventCodes: ["event-a", "event-b"], latestPerParticipant: false });
    expect(store.researchExport).toHaveBeenCalledWith(r, ["event-a", "event-b"], false, {});
    expect(result.filename).toMatch(/^lim-research-.*\.xlsx$/);
  });
  it("returns only public identity, not credential fields", async () => {
    vi.mocked(store.researcherBySession).mockResolvedValue({
      ...r,
      includeIdentity: 1,
    });
    vi.mocked(store.allowedResearchEvents).mockResolvedValue([]);
    expect(
      await eventResearchRouter
        .createCaller(context(null, `lim_event_research=${token}`))
        .me()
    ).toEqual({
      name: r.name,
      username: r.username,
      includeIdentity: false,
      reportArchiveAccess: false,
      events: [],
    });
  });
  it("login requires username and code; session uses independent HttpOnly cookie", async () => {
    vi.mocked(store.researcherByCredential).mockResolvedValue(r);
    const ctx = context();
    await eventResearchRouter
      .createCaller(ctx)
      .login({
        username: "Researcher",
        code: "LIM-ABCDEF-ABCDEF-ABCDEF-ABCDEF",
      });
    expect(store.researcherByCredential).toHaveBeenCalledWith(
      "researcher",
      expect.stringMatching(/^[a-f0-9]{64}$/)
    );
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "lim_event_research",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" })
    );
  });
});
describe("raw data projection and export", () => {
  const row = {
    id: 5,
    eventCode: "a",
    userId: 9,
    name: "Private Name",
    phone: "Private Phone",
    code: "private-visit",
    recordNo: "private-record",
    answers: {
      fruit: "2",
      _questionnaireVersion: "legacy",
      unexpected: "private",
    },
    measurements: {},
    nurseNotes: "private nurse",
    advice: "private advice",
    doctorName: "private doctor",
    accessTokenHash: "private token",
  };
  const readings = [
    {
      source: "x18",
      patientName: "private",
      notes: "private",
      machineMetrics: {
        weight: "70",
        fatRate: "20",
        userID: "private",
        name: "private",
        unknown: "private",
      },
    },
  ];
  it("omits identifiers, unapproved extra answer keys and free text by default", () => {
    const record = researchRecord(row, readings);
    expect(JSON.stringify(record)).not.toMatch(/private/i);
    expect(record.participantId).toBe("P-9");
    expect(record.readings[0].machineMetrics).toEqual({
      weight: 70,
      fatRate: 20,
    });
    expect(record.answers).toEqual({ fruit: 2 });
  });
  it("never includes identity or free text in the researcher projection", () => {
    const record = researchRecord(row, readings);
    expect(JSON.stringify(record)).not.toMatch(/private/i);
    expect(record).not.toHaveProperty("phone");
    expect(record).not.toHaveProperty("nurseNotes");
  });
  it("normalizes finite string clinical values without turning missing values into zero", () => {
    const record = researchRecord({
      ...row,
      questionnaireIds: [],
      answers: { activeDays: " ", activeMinutes: "not-a-number" },
      measurements: { waist: { value: "91.5" }, blood_glucose: { value: "" }, temperature: { value: false } },
    }, [{
      source: "x18", weight: "70.4", bmi: "25.1", height: "", machineMetrics: { weight: "70.4", fatRate: "", muscle: null },
    }]);
    expect(record.clinical).toMatchObject({ weight: 70.4, bmi: 25.1, waist: 91.5 });
    expect(record.clinical.glucose).toBeUndefined();
    expect(record.readings[0].height).toBeUndefined();
    expect(record.readings[0].machineMetrics).toEqual({ weight: 70.4 });
    expect(record.lifestyleScore).toBeNull();
    expect(record.lifestyleDomains).toEqual({});
  });
  it("keeps vendor category and range text and chooses the newest available clinical metric", () => {
    const record = researchRecord({ ...row, questionnaireIds: ["lifestyle"] }, [
      { source: "x18", sbp: "120", machineMetrics: { bodyShape: "standard", bmi_s: "18.5–24.9", fatRate: "20" } },
      { source: "x18", weight: "70.4", bmi: "25.1" },
      { source: "x18", weight: "69", bmi: "24.5" },
    ]);
    expect(record.readings[0].machineMetrics).toMatchObject({ bodyShape: "standard", bmi_s: "18.5–24.9", fatRate: 20 });
    expect(record.clinical).toMatchObject({ weight: 70.4, bmi: 25.1 });
    expect(record.answers.fruit).toBe(2);
  });
  it("exports numeric choice codes without changing completeness or the computed score", () => {
    const answers: EventAnswers = { _questionnaireVersion: EVENT_LIFESTYLE_VERSION };
    for (const section of eventLifestyleSections) for (const question of section.questions) {
      answers[question.id] = question.type === "multi" ? [] :
        question.type === "number" ? question.min ?? 0 :
        question.type === "slider" ? 8 : question.options?.[0]?.value ?? "";
    }
    Object.assign(answers, { priority1: "nutrition", priority2: "activity", priority3: "sleep" });
    const record = researchRecord({ ...row, questionnaireIds: ["lifestyle"], answers }, []);
    expect(record.lifestyleScore).toEqual(expect.any(Number));
    expect(record.lifestyleScore).toBe(lifestyleReport(answers).score.overall);
    expect(record.answers.fruit).toBe(0);
    expect(record.answers.priority1).toBe("nutrition");
    expect(record.questionnaireVersion).toBe(EVENT_LIFESTYLE_VERSION);
  });
  it("flattens questionnaire and nursing values and blocks CSV formulas", () => {
    const csv = researchCsv([
      {
        name: '=HYPERLINK("bad")',
        answers: { fruit: "2" },
        measurements: { bp: { sbp: "120" } },
      },
    ]);
    expect(csv).toContain("answers.fruit");
    expect(csv).toContain("measurements.bp.sbp");
    expect(csv).toContain("'=HYPERLINK");
  });
});
