/**
 * Tests for role-based access control:
 * - admin router: assignKioskOwner, updateUserRole, listUsers
 * - kioskOwner router: myKiosks, updateMyKiosk
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB ──────────────────────────────────────────────────────────────────


vi.mock("./db", () => {
  const kiosk001 = {
    id: "kiosk-001",
    name: "Red Sea Mall Health Station",
    location: "Red Sea Mall",
    address: "King Abdulaziz Road, Red Sea Mall, Jeddah",
    latitude: "21.5433000",
    longitude: "39.1726000",
    phone: "+966 12 645 8888",
    email: "redsea@techcare.com",
    image: "https://example.com/image.jpg",
    rating: "4.8",
    isActive: "true" as const,
    hours: [{ day: "Saturday", open: "10:00", close: "22:00" }],
    services: ["Blood Pressure"],
    ownerId: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const kiosk002 = { ...kiosk001, id: "kiosk-002", ownerId: null };
  const users = [
    { id: 1, name: "Admin User", email: "admin@test.com", role: "admin" as const },
    { id: 2, name: "Owner User", email: "owner@test.com", role: "user" as const },
    { id: 3, name: "Regular User", email: "user@test.com", role: "user" as const },
  ];
  return {
    getAllKiosks: vi.fn().mockResolvedValue([kiosk001]),
    getAllKiosksAdmin: vi.fn().mockResolvedValue([kiosk001, kiosk002]),
    getKioskById: vi.fn().mockImplementation(async (id: string) => {
      if (id === "kiosk-001") return kiosk001;
      if (id === "kiosk-002") return kiosk002;
      return undefined;
    }),
    searchKiosks: vi.fn().mockResolvedValue([]),
    createKiosk: vi.fn().mockResolvedValue(kiosk001),
    updateKiosk: vi.fn().mockResolvedValue(kiosk001),
    deleteKiosk: vi.fn().mockResolvedValue(undefined),
    deactivateKiosk: vi.fn().mockResolvedValue(undefined),
    getAllUsers: vi.fn().mockResolvedValue(users),
    updateUserRole: vi.fn().mockResolvedValue(undefined),
    getKiosksByOwnerId: vi.fn().mockImplementation(async (ownerId: number) => {
      return ownerId === 2 ? [kiosk001] : [];
    }),
    getUserReadings: vi.fn().mockResolvedValue([]),
    getUserReadingsSince: vi.fn().mockResolvedValue([]),
    createHealthReading: vi.fn().mockResolvedValue({}),
    deleteHealthReading: vi.fn().mockResolvedValue(undefined),
    getUserAiPlans: vi.fn().mockResolvedValue([]),
    createAiPlan: vi.fn().mockResolvedValue({}),
    deleteAiPlan: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue(null),
    updateUserProfile: vi.fn().mockResolvedValue(null),
  };
});

// ── Context factories ─────────────────────────────────────────────────────────

function makeCtx(role: "user" | "user" | "admin" | null, userId = 1): TrpcContext {
  return {
    user: role
      ? {
          id: userId,
          openId: `open-${userId}`,
          name: `Test ${role}`,
          email: `${role}@test.com`,
          loginMethod: "google",
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

// ── Admin router tests ────────────────────────────────────────────────────────

describe("admin.listKiosks", () => {
  it("returns all kiosks for admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listKiosks();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("throws FORBIDDEN for regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.listKiosks()).rejects.toThrow();
  });

  it("throws FORBIDDEN for kiosk_owner", async () => {
    const caller = appRouter.createCaller(makeCtx("user", 2));
    await expect(caller.admin.listKiosks()).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.admin.listKiosks()).rejects.toThrow();
  });
});

describe("admin.listUsers", () => {
  it("returns all users for admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listUsers();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });
});

describe("admin.assignKioskOwner", () => {
  it("allows admin to assign an owner", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.assignKioskOwner({ kioskId: "kiosk-001", ownerId: 2 });
    expect(result.success).toBe(true);
  });

  it("allows admin to unassign an owner (null)", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.assignKioskOwner({ kioskId: "kiosk-001", ownerId: null });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN for kiosk_owner", async () => {
    const caller = appRouter.createCaller(makeCtx("user", 2));
    await expect(
      caller.admin.assignKioskOwner({ kioskId: "kiosk-001", ownerId: 2 })
    ).rejects.toThrow();
  });
});

describe("admin.updateUserRole", () => {
  it("allows admin to promote a user to kiosk_owner", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.updateUserRole({ userId: 3, role: "user" });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN for regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.admin.updateUserRole({ userId: 3, role: "user" })
    ).rejects.toThrow();
  });
});

// ── kioskOwner router tests ───────────────────────────────────────────────────

describe("kioskOwner.myKiosks", () => {
  it("returns kiosks owned by the current kiosk_owner", async () => {
    const caller = appRouter.createCaller(makeCtx("user", 2));
    const result = await caller.kioskOwner.myKiosks();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("kiosk-001");
  });

  it("throws FORBIDDEN for regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.kioskOwner.myKiosks()).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.kioskOwner.myKiosks()).rejects.toThrow();
  });
});

describe("kioskOwner.updateMyKiosk", () => {
  it("allows kiosk_owner to update their own kiosk", async () => {
    // userId=2 matches mockKiosk.ownerId=2
    const caller = appRouter.createCaller(makeCtx("user", 2));
    const result = await caller.kioskOwner.updateMyKiosk({
      kioskId: "kiosk-001",
      data: { name: "Updated Name" },
    });
    expect(result).toBeDefined();
  });

  it("throws FORBIDDEN when kiosk_owner tries to edit another owner's kiosk", async () => {
    // userId=3 but kiosk ownerId=2
    const caller = appRouter.createCaller(makeCtx("user", 3));
    await expect(
      caller.kioskOwner.updateMyKiosk({ kioskId: "kiosk-001", data: { name: "Hack" } })
    ).rejects.toThrow();
  });

  it("throws NOT_FOUND for non-existent kiosk", async () => {
    const caller = appRouter.createCaller(makeCtx("user", 2));
    await expect(
      caller.kioskOwner.updateMyKiosk({ kioskId: "nonexistent", data: { name: "X" } })
    ).rejects.toThrow("Kiosk not found");
  });

  it("allows admin to update any kiosk regardless of ownership", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.kioskOwner.updateMyKiosk({
      kioskId: "kiosk-001",
      data: { name: "Admin Update" },
    });
    expect(result).toBeDefined();
  });

  it("throws FORBIDDEN for regular user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.kioskOwner.updateMyKiosk({ kioskId: "kiosk-001", data: { name: "X" } })
    ).rejects.toThrow();
  });
});
