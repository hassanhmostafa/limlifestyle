import * as otp from "./eventOtp";
import { readFileSync } from "node:fs";
vi.mock("./eventOtp", async importOriginal => ({ ...await importOriginal<typeof import("./eventOtp")>(), consumeEventOtp: vi.fn() }));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { requireOpenEvent } from "./eventAdminDb";
vi.mock("./eventAdminDb", () => ({ requireOpenEvent: vi.fn() }));
import * as tracks from "./eventTracksDb";
vi.mock("./eventTracksDb", () => ({ selectRegistrationTrack: vi.fn(), requireTrack: vi.fn(), listTracks: vi.fn() }));
import { createCareSnapshot, readCare } from "./eventCareDb";
vi.mock("./eventCareDb", () => ({ readCare: vi.fn(), createCareSnapshot: vi.fn() }));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createEventParticipantSession: vi.fn(),
    createMachinePhoneUser: vi.fn(),
    getEventReadingByRecordNo: vi.fn(),
    getEventParticipantSessionByTokenHash: vi.fn(),
    getUserById: vi.fn(),
    getUserByPhone: vi.fn(),
    updateEventParticipantSession: vi.fn(),
  };
});

const mockedDb = vi.mocked(db);
const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
};

const eventSession = {
  id: 8,
  userId: 42,
  accessTokenHash: "a".repeat(64),
  code: "LIM-111111-42",
  eventCode: "lim-events",
  trackId: 1,
  questionnaireIds: ["lifestyle"],
  displayName: "Event Participant",
  age: 30,
  sex: "male" as const,
  city: "Jeddah",
  consent: "true" as const,
  answers: {},
  status: "checked_in" as const,
  latestRecordNo: null,
  consultationCompletedAt: null,
  reportCompletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(otp.consumeEventOtp).mockResolvedValue(undefined);
  vi.mocked(requireOpenEvent).mockResolvedValue({questionnaireIds:["lifestyle"],closed:0} as never);
  vi.mocked(tracks.selectRegistrationTrack).mockResolvedValue({ id: 1, name: "المسار 1", eventCode: "lim-events", active: 1 });
  vi.mocked(readCare).mockResolvedValue({ nursingEnabled: 0, measurements: {}, consultationMode: "physician", approvedAt: null } as never);
  vi.mocked(createCareSnapshot).mockResolvedValue({ nursingEnabled: 0, measurements: {}, consultationMode: "physician", approvedAt: null } as never);
  mockedDb.getUserByPhone.mockResolvedValue({
    id: 42, openId: "phone:+966501234567", name: "Event Participant", phone: "+966501234567", email: null,
    loginMethod: "machine_phone_pending", passwordHash: null, role: "user", adminType: null, specialty: null, bio: null,
    gender: null, birthDate: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  });
  mockedDb.getUserById.mockResolvedValue({
    id: 42, openId: "phone:+966501234567", name: "Event Participant", phone: "+966501234567", email: null,
    loginMethod: "machine_phone_pending", passwordHash: null, role: "user", adminType: null, specialty: null, bio: null,
    gender: null, birthDate: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  });
});

describe("standalone events.createSession", () => {
  it("enforces OTP on the server before looking up or creating a participant", async () => {
    vi.stubEnv("EVENTS_OTP_ENABLED", "true");
    vi.stubEnv("OURSMS_API_KEY", "test-only-key");
    vi.stubEnv("OURSMS_SENDER_ID", "LIM");
    vi.stubEnv("EVENTS_OTP_SECRET", "test-only-secret-at-least-32-characters");
    try {
      const actual = await vi.importActual<typeof import("./eventOtp")>("./eventOtp");
      vi.mocked(otp.consumeEventOtp).mockImplementation(actual.consumeEventOtp);
      await expect(appRouter.createCaller(anonymousContext).events.createSession({ age: 40, sex: "male", phone: "0501234567", consent: true, consentVersion: "events-service-2026-10-05" })).rejects.toThrow("رمز التحقق");
      expect(mockedDb.getUserByPhone).not.toHaveBeenCalled();
      expect(mockedDb.createEventParticipantSession).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });

  it("creates a browser-owned event session and returns the Saudi mobile QR value without main-app authentication", async () => {
    mockedDb.createEventParticipantSession.mockResolvedValue(eventSession);
    const caller = appRouter.createCaller(anonymousContext);
    const result = await caller.events.createSession({
      firstName: "Event Participant", age: 30, sex: "male", phone: "0501234567", city: "Jeddah", consent: true, consentVersion: "events-service-2026-10-05",
    });

    expect(result.accessToken.length).toBeGreaterThanOrEqual(32);
    expect(result.deviceUserId).toBe("0501234567");
    expect(mockedDb.createEventParticipantSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      accessTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      consent: "true",
      consentVersion: "events-service-2026-10-05",
      consentedAt: expect.any(Date),
    }));
    expect(createCareSnapshot).toHaveBeenCalledWith(eventSession.id);
  });

  it("rejects a stale consent text version instead of recording ambiguous consent", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.events.createSession({
      age: 30,
      sex: "male",
      phone: "0501234567",
      consent: true,
      consentVersion: "old-version" as "events-service-2026-10-05",
    })).rejects.toThrow();
    expect(mockedDb.createEventParticipantSession).not.toHaveBeenCalled();
  });

  it("does not create a participant or visit after the event is closed", async () => {
    vi.mocked(requireOpenEvent).mockRejectedValue(new Error("انتهى التسجيل"));
    const caller=appRouter.createCaller(anonymousContext);
    await expect(caller.events.createSession({age:30,sex:"male",phone:"0501234567",consent:true,consentVersion:"events-service-2026-10-05"})).rejects.toThrow("انتهى التسجيل");
    expect(mockedDb.createMachinePhoneUser).not.toHaveBeenCalled();
    expect(mockedDb.createEventParticipantSession).not.toHaveBeenCalled();
  });
  it("snapshots an empty questionnaire selection for a new visit", async () => {
    vi.mocked(requireOpenEvent).mockResolvedValue({questionnaireIds:[],closed:0} as never);
    mockedDb.createEventParticipantSession.mockResolvedValue({...eventSession,questionnaireIds:[]});
    await appRouter.createCaller(anonymousContext).events.createSession({age:30,sex:"male",phone:"0501234567",consent:true,consentVersion:"events-service-2026-10-05"});
    expect(mockedDb.createEventParticipantSession).toHaveBeenCalledWith(expect.objectContaining({questionnaireIds:[]}));
  });
  it("rejects invalid event phone numbers", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.events.createSession({
      age: 30, sex: "male", phone: "0123456789", consent: true, consentVersion: "events-service-2026-10-05",
    })).rejects.toThrow("valid Saudi mobile");
  });
});

describe("standalone events results", () => {
  it("does not expose prior LIM measurements to a fresh event journey", async () => {
    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue(eventSession);
    const caller = appRouter.createCaller(anonymousContext);
    const result = await caller.events.results({ accessToken: "z".repeat(43) });
    expect(result.readings).toEqual([]);
    expect(mockedDb.getEventReadingByRecordNo).not.toHaveBeenCalled();
  });

  it("requires the opaque event token and returns only the result marked for this event session", async () => {
    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue({
      ...eventSession,
      status: "measured",
      latestRecordNo: "EVENT-RECORD-1",
    });
    mockedDb.getEventReadingByRecordNo.mockResolvedValue([
      { id: 1, userId: 42, source: "x18", recordNo: "EVENT-RECORD-1", machineMetrics: { fatRate: "22.1" } },
    ] as never);

    const caller = appRouter.createCaller(anonymousContext);
    const result = await caller.events.results({ accessToken: "z".repeat(43) });

    expect(result.readings).toHaveLength(1);
    expect(result.readings[0].id).toBe(1);
    expect(mockedDb.getEventReadingByRecordNo).toHaveBeenCalledWith(42, "EVENT-RECORD-1");
  });

  it("uses the exact approved reading rather than a newer session record", async () => {
    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue({
      ...eventSession, status: "measured", latestRecordNo: "NEWER-X18-2",
    });
    vi.mocked(readCare).mockResolvedValue({
      nursingEnabled: 0, measurements: {}, consultationMode: "physician", approvedAt: new Date(), approvedRecordNo: "REVIEWED-X18-1",
    } as never);
    mockedDb.getEventReadingByRecordNo.mockResolvedValue([{ id: 1, userId: 42, recordNo: "REVIEWED-X18-1" }] as never);
    await appRouter.createCaller(anonymousContext).events.results({ accessToken: "z".repeat(43) });
    expect(mockedDb.getEventReadingByRecordNo).toHaveBeenCalledWith(42, "REVIEWED-X18-1");
  });

  it("does not expose a synthetic Events measurement generation procedure", () => {
    const source = readFileSync(new URL("./routers/events.ts", import.meta.url), "utf8");
    expect(source).not.toContain("generateTestMeasurement");
    expect(source).not.toContain("EVENTS_TEST");
  });

  it("rejects a missing or unknown event token", async () => {
    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.events.results({ accessToken: "x".repeat(43) })).rejects.toThrow("event session");
  });
});

describe("standalone Events completion milestones", () => {
  it("moves from an associated measurement through consultation then final report", async () => {
    const measuredSession = { ...eventSession, status: "measured" as const, latestRecordNo: "EVENT-RECORD-1" };
    const consultationAt = new Date("2026-09-25T15:00:00Z");
    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue(measuredSession);
    mockedDb.updateEventParticipantSession.mockResolvedValue({
      ...measuredSession,
      consultationCompletedAt: consultationAt,
    });

    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.events.completeConsultation({ accessToken: "z".repeat(43) })).rejects.toThrow("يعتمد الطبيب");
    expect(mockedDb.updateEventParticipantSession).not.toHaveBeenCalled();
    vi.mocked(readCare).mockResolvedValue({ approvedAt: consultationAt } as never);

    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue({
      ...measuredSession,
      consultationCompletedAt: consultationAt,
    });
    const reportAt = new Date("2026-09-25T15:05:00Z");
    mockedDb.updateEventParticipantSession.mockResolvedValue({
      ...measuredSession,
      consultationCompletedAt: consultationAt,
      reportCompletedAt: reportAt,
    });
    const report = await caller.events.completeReport({ accessToken: "z".repeat(43) });
    expect(report.success).toBe(true);
    expect(mockedDb.updateEventParticipantSession).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ reportCompletedAt: expect.any(Date) }),
    );
  });

  it("does not permit the report milestone before consultation", async () => {
    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue({
      ...eventSession,
      status: "measured" as const,
      latestRecordNo: "EVENT-RECORD-1",
    });
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.events.completeReport({ accessToken: "z".repeat(43) }))
      .rejects.toThrow("Complete the consultation");
  });
});
