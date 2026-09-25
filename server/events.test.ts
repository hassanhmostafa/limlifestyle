import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createEventParticipantSession: vi.fn(),
    createMachinePhoneUser: vi.fn(),
    getEventParticipantSessionByTokenHash: vi.fn(),
    getUserById: vi.fn(),
    getUserByPhone: vi.fn(),
    getUserReadings: vi.fn(),
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
  displayName: "Event Participant",
  age: 30,
  sex: "male" as const,
  city: "Jeddah",
  consent: "true" as const,
  answers: {},
  status: "checked_in" as const,
  latestRecordNo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
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
  it("creates a browser-owned event session and returns the Saudi mobile QR value without main-app authentication", async () => {
    mockedDb.createEventParticipantSession.mockResolvedValue(eventSession);
    const caller = appRouter.createCaller(anonymousContext);
    const result = await caller.events.createSession({
      firstName: "Event Participant", age: 30, sex: "male", phone: "0501234567", city: "Jeddah", consent: true,
    });

    expect(result.accessToken.length).toBeGreaterThanOrEqual(32);
    expect(result.deviceUserId).toBe("0501234567");
    expect(mockedDb.createEventParticipantSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      accessTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      consent: "true",
    }));
  });

  it("rejects invalid event phone numbers", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.events.createSession({
      age: 30, sex: "male", phone: "0123456789", consent: true,
    })).rejects.toThrow("valid Saudi mobile");
  });
});

describe("standalone events results", () => {
  it("requires the opaque event token and returns only physical X18 readings for its linked internal participant", async () => {
    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue(eventSession);
    mockedDb.getUserReadings.mockResolvedValue([
      { id: 1, userId: 42, source: "x18", machineMetrics: { fatRate: "22.1" } },
      { id: 2, userId: 42, source: "manual", machineMetrics: null },
      { id: 3, userId: 42, source: "simulator", machineMetrics: {} },
    ] as never);

    const caller = appRouter.createCaller(anonymousContext);
    const result = await caller.events.results({ accessToken: "z".repeat(43) });

    expect(result.readings).toHaveLength(1);
    expect(result.readings[0].id).toBe(1);
    expect(mockedDb.getUserReadings).toHaveBeenCalledWith(42);
  });

  it("rejects a missing or unknown event token", async () => {
    mockedDb.getEventParticipantSessionByTokenHash.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.events.results({ accessToken: "x".repeat(43) })).rejects.toThrow("event session");
  });
});
