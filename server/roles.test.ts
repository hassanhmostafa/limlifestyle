/**
 * LIM authorization tests. Kiosk ownership and request workflows were removed:
 * devices are company-managed through the admin surface.
 */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => {
  const kiosk001 = {
    id: "kiosk-001",
    name: "LIM Health Station",
    location: "Jeddah",
    address: "King Abdulaziz Road, Jeddah",
    latitude: "21.5433000",
    longitude: "39.1726000",
    phone: "+966 12 645 8888",
    email: "redsea@limlifestyle.com",
    image: "https://example.com/image.jpg",
    rating: "4.8",
    isActive: "true" as const,
    hours: [{ day: "Saturday", open: "10:00", close: "22:00" }],
    services: ["Blood Pressure"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const users = [
    { id: 1, name: "Admin User", phone: "+966500000001", email: null, role: "admin" as const },
    { id: 2, name: "LIM User", phone: "+966500000002", email: null, role: "user" as const },
  ];
  return {
    getAllKiosks: vi.fn().mockResolvedValue([kiosk001]),
    getAllKiosksAdmin: vi.fn().mockResolvedValue([kiosk001]),
    getKioskById: vi.fn().mockResolvedValue(kiosk001),
    searchKiosks: vi.fn().mockResolvedValue([]),
    createKiosk: vi.fn().mockResolvedValue(kiosk001),
    updateKiosk: vi.fn().mockResolvedValue(kiosk001),
    deleteKiosk: vi.fn().mockResolvedValue(undefined),
    deactivateKiosk: vi.fn().mockResolvedValue(undefined),
    getAllUsers: vi.fn().mockResolvedValue(users),
    updateUserRole: vi.fn().mockResolvedValue(undefined),
    getUserReadings: vi.fn().mockResolvedValue([]),
    getUserReadingsSince: vi.fn().mockResolvedValue([]),
    createHealthReading: vi.fn().mockResolvedValue({}),
    deleteHealthReading: vi.fn().mockResolvedValue(undefined),
    getUserAiPlans: vi.fn().mockResolvedValue([]),
    createAiPlan: vi.fn().mockResolvedValue({}),
    deleteAiPlan: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue(null),
    getUserByPhone: vi.fn().mockResolvedValue(null),
    updateUserProfile: vi.fn().mockResolvedValue(null),
    updateUserPhoneCredentials: vi.fn().mockResolvedValue(null),
    createPhoneUser: vi.fn().mockResolvedValue(null),
  };
});

function makeCtx(role: "user" | "admin" | null, userId = 1): TrpcContext {
  return {
    user: role
      ? {
          id: userId,
          openId: `open-${userId}`,
          name: `Test ${role}`,
          phone: null,
          email: `${role}@test.com`,
          loginMethod: "phone_password",
          role,
          gender: null,
          birthDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin.listKiosks", () => {
  it("returns company-managed kiosks for an admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listKiosks();
    expect(result).toHaveLength(1);
  });

  it("rejects a non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.listKiosks()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an unauthenticated caller", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.admin.listKiosks()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("admin.listUsers", () => {
  it("lists users for an admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listUsers();
    expect(result).toHaveLength(2);
  });

  it("rejects a non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.listUsers()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.updateUserRole", () => {
  it("allows an admin to update a supported LIM role", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(caller.admin.updateUserRole({ userId: 2, role: "user" })).resolves.toMatchObject({ success: true });
  });

  it("rejects a regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.updateUserRole({ userId: 2, role: "user" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
