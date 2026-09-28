import { beforeEach, describe, it, expect, vi } from "vitest";
import { eventResearchRouter } from "./routers/eventResearch";
import * as store from "./eventResearchDb";
import { researchRecord } from "./lib/eventResearchData";
import { researchCsv } from "../shared/eventResearchExport";
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
    });
    expect(store.researchPage).toHaveBeenCalledWith(
      r,
      "event-b",
      20,
      50,
      "export"
    );
    await expect(
      c.data({ eventCode: "event-b", limit: 1000 })
    ).rejects.toThrow();
  });
  it("returns only public identity, not credential fields", async () => {
    vi.mocked(store.researcherBySession).mockResolvedValue(r);
    vi.mocked(store.allowedResearchEvents).mockResolvedValue([]);
    expect(
      await eventResearchRouter
        .createCaller(context(null, `lim_event_research=${token}`))
        .me()
    ).toEqual({
      name: r.name,
      username: r.username,
      includeIdentity: false,
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
    const record = researchRecord(row, readings, false);
    expect(JSON.stringify(record)).not.toMatch(/private/i);
    expect(record.participantId).toBe("P-9");
    expect(record.readings[0].machineMetrics).toEqual({
      weight: "70",
      fatRate: "20",
    });
    expect(record.answers).toEqual({ fruit: "2" });
  });
  it("includes requested identity fields but never bearer credentials", () => {
    const record = researchRecord(row, readings, true);
    expect(record.phone).toBe(row.phone);
    expect(record.nurseNotes).toBe(row.nurseNotes);
    expect(JSON.stringify(record)).not.toContain("private token");
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
