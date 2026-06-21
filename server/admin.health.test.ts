import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAllKiosksAdmin: vi.fn().mockResolvedValue([
      { id: "kiosk-1", name: "Test Kiosk", location: "Test Area", address: "123 Test St",
        latitude: "21.5", longitude: "39.1", isActive: "true", rating: "4.5",
        phone: null, email: null, image: null, hours: [], services: [],
        createdAt: new Date(), updatedAt: new Date() },
    ]),
    createKiosk: vi.fn().mockResolvedValue({ id: "kiosk-new", name: "New Kiosk" }),
    updateKiosk: vi.fn().mockResolvedValue({ id: "kiosk-1", name: "Updated Kiosk" }),
    deleteKiosk: vi.fn().mockResolvedValue(undefined),
    getUserReadings: vi.fn().mockResolvedValue([
      { id: 1, userId: 1, kioskId: "kiosk-1", bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80, heartRate: 72, weight: "70.0", height: "170",
        bmi: "24.2", temperature: "36.6", notes: null,
        recordedAt: new Date(), createdAt: new Date() },
    ]),
    createHealthReading: vi.fn().mockResolvedValue({ id: 2, userId: 1, kioskId: "kiosk-1" }),
    deleteHealthReading: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Context factories ────────────────────────────────────────────────────────
function makeCtx(role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Admin router tests ───────────────────────────────────────────────────────
describe("admin.listKiosks", () => {
  it("returns kiosks for admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listKiosks();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.listKiosks()).rejects.toThrow("Admin access required");
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.admin.listKiosks()).rejects.toThrow();
  });
});

describe("admin.createKiosk", () => {
  it("creates a kiosk when called by admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.createKiosk({
      name: "New Kiosk",
      location: "Test Area",
      address: "123 Test St",
      latitude: "21.5",
      longitude: "39.1",
      isActive: "true",
    });
    expect(result).toBeDefined();
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.admin.createKiosk({
        name: "New Kiosk",
        location: "Test Area",
        address: "123 Test St",
        latitude: "21.5",
        longitude: "39.1",
        isActive: "true",
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("admin.deleteKiosk", () => {
  it("deletes a kiosk when called by admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.deleteKiosk({ id: "kiosk-1" });
    expect(result.success).toBe(true);
  });
});

// ─── Health router tests ──────────────────────────────────────────────────────
describe("health.myReadings", () => {
  it("returns readings for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    const result = await caller.health.myReadings();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].userId).toBe(1);
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.health.myReadings()).rejects.toThrow();
  });
});

describe("health.logReading", () => {
  it("logs a reading for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    const result = await caller.health.logReading({
      kioskId: "kiosk-1",
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 72,
    });
    expect(result).toBeDefined();
  });

  it("rejects invalid blood pressure values", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.health.logReading({
        kioskId: "kiosk-1",
        bloodPressureSystolic: 999, // out of range
      })
    ).rejects.toThrow();
  });
});

describe("health.deleteReading", () => {
  it("deletes a reading owned by the user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    const result = await caller.health.deleteReading({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN for a reading not owned by the user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    // id 999 is not in the mocked readings list
    await expect(caller.health.deleteReading({ id: 999 })).rejects.toThrow();
  });
});
