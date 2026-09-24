import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getEventParticipantSession: vi.fn(),
    getUserById: vi.fn(),
    getUserReadings: vi.fn(),
    upsertEventParticipantSession: vi.fn(),
  };
});

const mockedDb = vi.mocked(db);

function context(authenticated = true): TrpcContext {
  return {
    user: authenticated ? {
      id: 42,
      openId: "phone:+966501234567",
      name: "Event Participant",
      phone: "+966501234567",
      email: null,
      loginMethod: "phone_password",
      role: "user",
      adminType: null,
      specialty: null,
      bio: null,
      passwordHash: null,
      gender: null,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockedDb.getUserById.mockResolvedValue({
    id: 42,
    openId: "phone:+966501234567",
    name: "Event Participant",
    phone: "+966501234567",
    email: null,
    loginMethod: "phone_password",
    role: "user",
    adminType: null,
    specialty: null,
    bio: null,
    passwordHash: null,
    gender: null,
    birthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  });
});

describe("events.checkIn", () => {
  it("stores an event form under the authenticated LIM user and exposes a local mobile QR value", async () => {
    mockedDb.upsertEventParticipantSession.mockResolvedValue({
      id: 1,
      userId: 42,
      eventCode: "lim-events",
      displayName: "Event Participant",
      age: 30,
      sex: "male",
      city: "Jeddah",
      consent: "true",
      answers: { goals: ["fitness"] },
      status: "checked_in",
      latestRecordNo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(context());
    const result = await caller.events.checkIn({
      displayName: "Event Participant",
      age: 30,
      sex: "male",
      city: "Jeddah",
      consent: true,
      answers: { goals: ["fitness"] },
    });

    expect(result.machineUserId).toBe("0501234567");
    expect(mockedDb.upsertEventParticipantSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      eventCode: "lim-events",
      consent: "true",
    }));
  });

  it("requires explicit event consent", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.events.checkIn({
      displayName: "Event Participant",
      age: 30,
      sex: "male",
      consent: false,
      answers: {},
    })).rejects.toThrow();
  });

  it("rejects unauthenticated event check-in", async () => {
    const caller = appRouter.createCaller(context(false));
    await expect(caller.events.checkIn({
      displayName: "Event Participant",
      age: 30,
      sex: "male",
      consent: true,
      answers: {},
    })).rejects.toThrow();
  });
});

describe("events.myResults", () => {
  it("returns only physical X18 readings belonging to the authenticated user", async () => {
    mockedDb.getEventParticipantSession.mockResolvedValue(null);
    mockedDb.getUserReadings.mockResolvedValue([
      { id: 1, userId: 42, source: "x18", machineMetrics: { fatRate: "22.1" } },
      { id: 2, userId: 42, source: "manual", machineMetrics: null },
      { id: 3, userId: 42, source: "simulator", machineMetrics: {} },
    ] as never);

    const caller = appRouter.createCaller(context());
    const result = await caller.events.myResults();

    expect(result.readings).toHaveLength(1);
    expect(result.readings[0].id).toBe(1);
    expect(result.readings[0].source).toBe("x18");
    expect(mockedDb.getUserReadings).toHaveBeenCalledWith(42);
  });
});
