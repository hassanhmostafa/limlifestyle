import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventTeamRouter } from "./routers/eventTeam";
import { eventsRouter } from "./routers/events";
import * as store from "./eventCareDb";
import * as db from "./db";
import * as tracks from "./eventTracksDb";
import { hashApiKey } from "./lib/apiSecurity";
vi.mock("./eventTracksDb", () => ({
  staffBySessionHash: vi.fn(),
  staffByCodeHash: vi.fn(),
  createStaffSession: vi.fn(),
  endStaffSession: vi.fn(),
  listTeam: vi.fn(),
  listTracks: vi.fn(),
  createTrack: vi.fn(),
  changeTrack: vi.fn(),
  createStaff: vi.fn(),
  changeStaff: vi.fn(),
}));
import type { TrpcContext } from "./_core/context";
import { validateMeasurements } from "../shared/eventCare";
vi.mock("./eventCareDb", () => ({
  EVENT_CODE: "lim-events",
  findSession: vi.fn(),
  readCare: vi.fn(),
  updateCare: vi.fn(),
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
}));
vi.mock("./db", () => ({
  getEventReadingByRecordNo: vi.fn(),
  getUserByPhone: vi.fn(),
  getEventParticipantSessionByTokenHash: vi.fn(),
  updateEventParticipantSession: vi.fn(),
}));
const token = "t".repeat(43);
const ctx = (id: number | null, admin = false) =>
  ({
    user: id
      ? {
          id,
          name: "موظف تجريبي",
          role: admin ? "admin" : "user",
          adminType: admin ? "super" : null,
        }
      : null,
    req: {
      headers: id ? { cookie: `lim_event_staff=${String(id).repeat(43)}` } : {},
      protocol: "https",
      ip: "test-ip",
    },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
  }) as TrpcContext;
const session = {
  id: 1,
  userId: 42,
  eventCode: "lim-events",
  trackId: 1,
  consent: "true",
  code: "LIM-TEST",
  displayName: "مستفيد تجريبي",
  age: 35,
  sex: "male",
  answers: {},
  latestRecordNo: "R1",
};
let care: any;
beforeEach(() => {
  vi.resetAllMocks();
  care = {
    sessionId: 1,
    nursingEnabled: 1,
    testIds: ["oxygen_saturation"],
    measurements: {},
    nursingCompletedAt: null,
    approvedAt: null,
    advice: null,
  };
  vi.mocked(tracks.staffBySessionHash).mockImplementation(async hash => {
    const id =
      hash === hashApiKey("7".repeat(43))
        ? 7
        : hash === hashApiKey("8".repeat(43))
          ? 8
          : 0;
    return id
      ? ({
          staff: {
            id,
            userId: null,
            name: "موظف تجريبي",
            duty: id === 7 ? "nurse" : "doctor",
            trackId: 1,
            active: 1,
            credentialVersion: 1,
          },
          trackName: "المسار 1",
        } as never)
      : undefined;
  });
  vi.mocked(store.findSession).mockResolvedValue({
    session,
    phone: "+966501234567",
  } as never);
  vi.mocked(store.readCare).mockImplementation(async () => ({ ...care }));
  vi.mocked(store.updateCare).mockImplementation(async (_id, patch) => {
    Object.assign(care, patch);
  });
  vi.mocked(db.getEventParticipantSessionByTokenHash).mockResolvedValue(
    session as never
  );
  vi.mocked(db.getEventReadingByRecordNo).mockResolvedValue([]);
  vi.mocked(db.updateEventParticipantSession).mockResolvedValue({
    ...session,
    reportCompletedAt: new Date(),
  } as never);
});
describe("event basic care cycle", () => {
  it("blocks record reads and both writes for a visit in another track even with a known ID", async () => {
    vi.mocked(store.findSession).mockResolvedValue({
      session: { ...session, trackId: 2 },
      phone: "+966501234567",
    } as never);
    const nurse = eventTeamRouter.createCaller(ctx(7));
    const doctor = eventTeamRouter.createCaller(ctx(8));
    await expect(nurse.lookup({ query: "0501234567" })).rejects.toThrow(
      "لا توجد زيارة"
    );
    await expect(
      nurse.record({ sessionId: 1, confirmed: true })
    ).rejects.toThrow("غير متاحة");
    await expect(
      nurse.saveNursing({
        sessionId: 1,
        confirmed: true,
        measurements: {},
        notes: "",
        finalize: false,
      })
    ).rejects.toThrow("غير متاحة");
    await expect(
      doctor.saveAdvice({
        sessionId: 1,
        confirmed: true,
        advice: "اختبار",
        finalize: false,
      })
    ).rejects.toThrow("غير متاحة");
    expect(store.readCare).not.toHaveBeenCalled();
    expect(store.updateCare).not.toHaveBeenCalled();
  });
  it("rechecks active staff sessions on each request", async () => {
    const caller = eventTeamRouter.createCaller(ctx(7));
    expect((await caller.me()).trackId).toBe(1);
    vi.mocked(tracks.staffBySessionHash).mockResolvedValue(undefined);
    await expect(
      caller.record({ sessionId: 1, confirmed: true })
    ).rejects.toThrow("صلاحية");
    expect(store.findSession).not.toHaveBeenCalled();
  });
  it("issues a staff code to admin once and only passes its hash to storage", async () => {
    vi.mocked(tracks.createStaff).mockResolvedValue({ id: 77 });
    const result = await eventTeamRouter
      .createCaller(ctx(2, true))
      .createStaff({ trackId: 1, name: "اختبار", duty: "nurse" });
    expect(result.code).toMatch(/^LIM-(?:[0-9A-F]{6}-){3}[0-9A-F]{6}$/);
    const stored = vi.mocked(tracks.createStaff).mock.calls[0][0];
    expect(stored.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(result.code);
    await expect(
      eventTeamRouter
        .createCaller(ctx(7))
        .createStaff({ trackId: 1, name: "اختبار", duty: "doctor" })
    ).rejects.toThrow();
  });
  it("logs in with a code without a main-app account and uses an HttpOnly session cookie", async () => {
    vi.mocked(tracks.staffByCodeHash).mockResolvedValue({
      staff: { id: 7, trackId: 1, credentialVersion: 3 },
    } as never);
    const context = ctx(null);
    const result = await eventTeamRouter
      .createCaller(context)
      .login({ code: "lim-abcdef-123456-abcdef-123456" });
    expect(result).toEqual({ success: true });
    expect(tracks.staffByCodeHash).toHaveBeenCalledWith(
      hashApiKey("LIMABCDEF123456ABCDEF123456")
    );
    expect(tracks.createStaffSession).toHaveBeenCalledWith(
      7,
      3,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date)
    );
    expect(context.res.cookie).toHaveBeenCalledWith(
      "lim_event_staff",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 28800000,
      })
    );
  });
  it("rejects incorrect codes and revokes the server session on logout", async () => {
    const context = ctx(7);
    await expect(
      eventTeamRouter
        .createCaller(ctx(null))
        .login({ code: "LIM-000000-000000-000000-000000" })
    ).rejects.toThrow("الكود غير صحيح");
    expect(tracks.createStaffSession).not.toHaveBeenCalled();
    await eventTeamRouter.createCaller(context).logout();
    expect(tracks.endStaffSession).toHaveBeenCalledWith(
      hashApiKey("7".repeat(43))
    );
    expect(context.res.clearCookie).toHaveBeenCalledWith(
      "lim_event_staff",
      expect.objectContaining({ httpOnly: true })
    );
  });
  it("restricts changing codes and staff/track activation to super admin", async () => {
    const nurse = eventTeamRouter.createCaller(ctx(7));
    await expect(nurse.rotateCode({ id: 7 })).rejects.toThrow();
    await expect(
      nurse.setStaffActive({ id: 7, active: true })
    ).rejects.toThrow();
    await expect(
      nurse.editTrack({ id: 1, name: "مسار", active: false })
    ).rejects.toThrow();
    const admin = eventTeamRouter.createCaller(ctx(2, true));
    await admin.rotateCode({ id: 7 });
    expect(tracks.changeStaff).toHaveBeenCalledWith(7, {
      codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    await admin.setStaffActive({ id: 7, active: false });
    expect(tracks.changeStaff).toHaveBeenCalledWith(7, { active: false });
  });
  it("saves nursing, keeps doctor drafts private, then publishes approved advice and permits completion", async () => {
    const nurse = eventTeamRouter.createCaller(ctx(7));
    const doctor = eventTeamRouter.createCaller(ctx(8));
    const participant = eventsRouter.createCaller(ctx(null));
    await expect(
      doctor.saveAdvice({
        sessionId: 1,
        confirmed: true,
        advice: "نص تجريبي",
        finalize: true,
      })
    ).rejects.toThrow("التمريض");
    await nurse.saveNursing({
      sessionId: 1,
      confirmed: true,
      measurements: { oxygen_saturation: { value: "98" } },
      notes: "قياس تجريبي",
      finalize: true,
    });
    await doctor.saveAdvice({
      sessionId: 1,
      confirmed: true,
      advice: "نص تجريبي",
      finalize: false,
    });
    expect((await participant.care({ accessToken: token })).advice).toBeNull();
    await expect(
      participant.completeReport({ accessToken: token })
    ).rejects.toThrow("Complete the consultation");
    await doctor.saveAdvice({
      sessionId: 1,
      confirmed: true,
      advice: "نص تجريبي معتمد",
      finalize: true,
    });
    const result = await participant.care({ accessToken: token });
    expect(result.advice).toBe("نص تجريبي معتمد");
    expect(result.measurements.oxygen_saturation.value).toBe("98");
    expect(
      (await participant.completeReport({ accessToken: token })).success
    ).toBe(true);
  });
  it("skips nursing entirely when disabled", async () => {
    care.nursingEnabled = 0;
    await expect(
      eventTeamRouter.createCaller(ctx(7)).saveNursing({
        sessionId: 1,
        confirmed: true,
        measurements: {},
        notes: "",
        finalize: false,
      })
    ).rejects.toThrow("غير مفعلة");
    await eventTeamRouter.createCaller(ctx(8)).saveAdvice({
      sessionId: 1,
      confirmed: true,
      advice: "نص تجريبي",
      finalize: true,
    });
    expect(care.approvedAt).toBeInstanceOf(Date);
  });
  it("does not let the participant, unassigned staff, or nurse approve doctor advice", async () => {
    await expect(
      eventsRouter
        .createCaller(ctx(null))
        .completeConsultation({ accessToken: token })
    ).rejects.toThrow();
    await expect(
      eventTeamRouter.createCaller(ctx(null)).lookup({ query: "0501234567" })
    ).rejects.toThrow();
    await expect(
      eventTeamRouter.createCaller(ctx(9)).lookup({ query: "0501234567" })
    ).rejects.toThrow("صلاحية");
    await expect(
      eventTeamRouter.createCaller(ctx(7)).saveAdvice({
        sessionId: 1,
        confirmed: true,
        advice: "اختبار",
        finalize: false,
      })
    ).rejects.toThrow("للطبيب");
    expect(store.updateCare).not.toHaveBeenCalled();
  });
  it("normalizes Arabic phone input and reveals only identity before confirmation", async () => {
    const result = await eventTeamRouter
      .createCaller(ctx(7))
      .lookup({ query: "٠٥٠١٢٣٤٥٦٧" });
    expect(store.findSession).toHaveBeenCalledWith(
      { phone: "+966501234567" },
      1
    );
    expect(result).not.toHaveProperty("accessTokenHash");
    expect(result).not.toHaveProperty("answers");
    expect(result).not.toHaveProperty("care");
  });
  it("rejects visits outside this event or without consent", async () => {
    vi.mocked(store.findSession).mockResolvedValue(undefined);
    await expect(
      eventTeamRouter
        .createCaller(ctx(7))
        .record({ sessionId: 123, confirmed: true })
    ).rejects.toThrow("غير متاحة");
    expect(store.readCare).not.toHaveBeenCalled();
  });
  it("requires a device result before staff completion", async () => {
    vi.mocked(store.findSession).mockResolvedValue({
      session: { ...session, latestRecordNo: null },
    } as never);
    await expect(
      eventTeamRouter.createCaller(ctx(8)).saveAdvice({
        sessionId: 1,
        confirmed: true,
        advice: "اختبار",
        finalize: true,
      })
    ).rejects.toThrow("بانتظار");
    expect(store.updateCare).not.toHaveBeenCalled();
  });
  it("reserves configuration for the super admin", async () => {
    await expect(
      eventTeamRouter
        .createCaller(ctx(7))
        .configure({ nursingEnabled: false, testIds: [] })
    ).rejects.toThrow();
    await expect(
      eventTeamRouter
        .createCaller(ctx(2, true))
        .configure({ nursingEnabled: true, testIds: [] })
    ).rejects.toThrow("اختر");
    await eventTeamRouter
      .createCaller(ctx(2, true))
      .configure({ nursingEnabled: true, testIds: ["oxygen_saturation"] });
    expect(store.writeSettings).toHaveBeenCalledWith(true, [
      "oxygen_saturation",
    ]);
  });
});
describe("manual measurements", () => {
  it("permits incomplete drafts but not incomplete final measurements", () => {
    expect(validateMeasurements(["blood_pressure"], {}, false)).toBeNull();
    expect(validateMeasurements(["blood_pressure"], {}, true)).toContain(
      "أكمل"
    );
  });
  it("rejects unconfigured tests, unknown fields and invalid numbers", () => {
    expect(
      validateMeasurements([], { pulse: { value: "75" } }, false)
    ).toBeTruthy();
    expect(
      validateMeasurements(["pulse"], { pulse: { value: "NaN" } }, true)
    ).toBeTruthy();
    expect(
      validateMeasurements(
        ["pulse"],
        { pulse: { value: "75", injected: "1" } },
        true
      )
    ).toBeTruthy();
  });
});
