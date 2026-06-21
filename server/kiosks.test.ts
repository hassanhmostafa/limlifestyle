import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests don't need a real database
vi.mock("./db", () => ({
  getAllKiosks: vi.fn().mockResolvedValue([
    {
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
      isActive: "true",
      hours: [{ day: "Saturday", open: "10:00 AM", close: "11:00 PM" }],
      services: ["Blood Pressure", "Weight & BMI"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getKioskById: vi.fn().mockImplementation(async (id: string) => {
    if (id === "kiosk-001") {
      return {
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
        isActive: "true",
        hours: [{ day: "Saturday", open: "10:00 AM", close: "11:00 PM" }],
        services: ["Blood Pressure", "Weight & BMI"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return undefined;
  }),
  searchKiosks: vi.fn().mockResolvedValue([]),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("kiosks.list", () => {
  it("returns a list of kiosks", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.kiosks.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe("kiosk-001");
  });
});

describe("kiosks.byId", () => {
  it("returns a kiosk when given a valid ID", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.kiosks.byId({ id: "kiosk-001" });
    expect(result.name).toBe("Red Sea Mall Health Station");
  });

  it("throws when kiosk is not found", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.kiosks.byId({ id: "nonexistent" })).rejects.toThrow("Kiosk not found");
  });
});

describe("kiosks.search", () => {
  it("returns all kiosks when query is empty", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.kiosks.search({ query: "" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns search results for a non-empty query", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.kiosks.search({ query: "Red Sea" });
    expect(Array.isArray(result)).toBe(true);
  });
});
