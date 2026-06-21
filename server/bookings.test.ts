import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB helpers ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  createBooking: vi.fn(),
  getUserBookings: vi.fn(),
  cancelBooking: vi.fn(),
  getBookedSlots: vi.fn(),
  getKioskById: vi.fn(),
  createKioskRequest: vi.fn(),
  getUserKioskRequests: vi.fn(),
  getAllKioskRequests: vi.fn(),
  countPendingKioskRequests: vi.fn(),
  updateKioskRequestStatus: vi.fn(),
  getKioskBookings: vi.fn(),
  updateBookingStatus: vi.fn(),
  searchUsers: vi.fn(),
  getAllUsers: vi.fn(),
  getAllKiosksAdmin: vi.fn(),
  createKiosk: vi.fn(),
  updateKiosk: vi.fn(),
  deleteKiosk: vi.fn(),
  updateUserRole: vi.fn(),
}));

import {
  createBooking,
  getUserBookings,
  cancelBooking,
  getBookedSlots,
  getKioskById,
  createKioskRequest,
  getUserKioskRequests,
  getAllKioskRequests,
  countPendingKioskRequests,
  updateKioskRequestStatus,
  getKioskBookings,
  updateBookingStatus,
  searchUsers,
} from "./db";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCtx(role: "user" | "user" | "admin" = "user", id = 1) {
  return {
    user: { id, role, name: "Test User", email: "test@example.com" },
    req: {} as any,
    res: {} as any,
  };
}

const mockKiosk = {
  id: "kiosk-1",
  name: "Test Kiosk",
  location: "Jeddah",
  address: "123 Test St",
  latitude: "21.4858",
  longitude: "39.1925",
  isActive: "true" as const,
  ownerId: 2,
  hours: [
    { day: "Monday", open: "9:00 AM", close: "5:00 PM" },
    { day: "Saturday", open: "10:00 AM", close: "11:00 PM" },
  ],
  services: ["Blood Pressure"],
  phone: null,
  email: null,
  image: null,
  rating: null,
};

// ── Booking Router Tests ───────────────────────────────────────────────────────

describe("bookings.availableSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getKioskById).mockResolvedValue(mockKiosk);
    vi.mocked(getBookedSlots).mockResolvedValue([]);
  });

  it("returns slots for an open day", async () => {
    const { bookingsRouter } = await import("./routers/bookings");
    const caller = bookingsRouter.createCaller(makeCtx("user"));
    // Monday = day index 1; 2025-01-06 is a Monday
    const result = await caller.availableSlots({ kioskId: "kiosk-1", visitDate: "2025-01-06" });
    expect(result.closed).toBe(false);
    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.slots[0]).toBe("9:00 AM");
  });

  it("returns closed=true for a day with no hours", async () => {
    const { bookingsRouter } = await import("./routers/bookings");
    const caller = bookingsRouter.createCaller(makeCtx("user"));
    // 2025-01-07 is a Tuesday — no hours in mockKiosk
    const result = await caller.availableSlots({ kioskId: "kiosk-1", visitDate: "2025-01-07" });
    expect(result.closed).toBe(true);
    expect(result.slots).toHaveLength(0);
  });

  it("excludes already booked slots", async () => {
    vi.mocked(getBookedSlots).mockResolvedValue(["9:00 AM", "9:30 AM"]);
    const { bookingsRouter } = await import("./routers/bookings");
    const caller = bookingsRouter.createCaller(makeCtx("user"));
    const result = await caller.availableSlots({ kioskId: "kiosk-1", visitDate: "2025-01-06" });
    expect(result.slots).not.toContain("9:00 AM");
    expect(result.slots).not.toContain("9:30 AM");
  });

  it("throws NOT_FOUND for unknown kiosk", async () => {
    vi.mocked(getKioskById).mockResolvedValue(null);
    const { bookingsRouter } = await import("./routers/bookings");
    const caller = bookingsRouter.createCaller(makeCtx("user"));
    await expect(caller.availableSlots({ kioskId: "bad-id", visitDate: "2025-01-06" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("bookings.book", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getKioskById).mockResolvedValue(mockKiosk);
    vi.mocked(getBookedSlots).mockResolvedValue([]);
    vi.mocked(createBooking).mockResolvedValue({ id: 1, userId: 1, kioskId: "kiosk-1", visitDate: "2025-01-06", timeSlot: "9:00 AM", status: "confirmed", notes: null, createdAt: Date.now() });
  });

  it("creates a booking for an available slot", async () => {
    const { bookingsRouter } = await import("./routers/bookings");
    const caller = bookingsRouter.createCaller(makeCtx("user"));
    await caller.book({ kioskId: "kiosk-1", visitDate: "2025-01-06", timeSlot: "9:00 AM" });
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({
      kioskId: "kiosk-1",
      visitDate: "2025-01-06",
      timeSlot: "9:00 AM",
      status: "confirmed",
    }));
  });

  it("throws CONFLICT when slot is already taken", async () => {
    vi.mocked(getBookedSlots).mockResolvedValue(["9:00 AM"]);
    const { bookingsRouter } = await import("./routers/bookings");
    const caller = bookingsRouter.createCaller(makeCtx("user"));
    await expect(caller.book({ kioskId: "kiosk-1", visitDate: "2025-01-06", timeSlot: "9:00 AM" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("bookings.myBookings", () => {
  it("returns bookings for the current user", async () => {
    vi.mocked(getUserBookings).mockResolvedValue([]);
    const { bookingsRouter } = await import("./routers/bookings");
    const caller = bookingsRouter.createCaller(makeCtx("user", 5));
    await caller.myBookings();
    expect(getUserBookings).toHaveBeenCalledWith(5);
  });
});

describe("bookings.cancel", () => {
  it("calls cancelBooking with correct user and booking id", async () => {
    vi.mocked(cancelBooking).mockResolvedValue(undefined);
    const { bookingsRouter } = await import("./routers/bookings");
    const caller = bookingsRouter.createCaller(makeCtx("user", 3));
    await caller.cancel({ bookingId: 42 });
    expect(cancelBooking).toHaveBeenCalledWith(42, 3);
  });
});

// ── Kiosk Requests Router Tests ────────────────────────────────────────────────

describe("kioskRequests.requestCreate", () => {
  it("creates a create request with correct type and payload", async () => {
    vi.mocked(createKioskRequest).mockResolvedValue({ id: 1 } as any);
    const { kioskRequestsRouter } = await import("./routers/kioskRequests");
    const caller = kioskRequestsRouter.createCaller(makeCtx("user", 7));
    await caller.requestCreate({ name: "New Kiosk", location: "Mall", address: "123 St" });
    expect(createKioskRequest).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      type: "create",
      status: "pending",
    }));
  });
});

describe("kioskRequests.requestDelete", () => {
  it("creates a delete request with kioskId in payload", async () => {
    vi.mocked(createKioskRequest).mockResolvedValue({ id: 2 } as any);
    const { kioskRequestsRouter } = await import("./routers/kioskRequests");
    const caller = kioskRequestsRouter.createCaller(makeCtx("user", 8));
    await caller.requestDelete({ kioskId: "kiosk-abc", kioskName: "ABC Kiosk" });
    expect(createKioskRequest).toHaveBeenCalledWith(expect.objectContaining({
      userId: 8,
      type: "delete",
      payload: expect.objectContaining({ kioskId: "kiosk-abc" }),
    }));
  });
});

describe("kioskRequests.myRequests", () => {
  it("returns requests for the current user", async () => {
    vi.mocked(getUserKioskRequests).mockResolvedValue([]);
    const { kioskRequestsRouter } = await import("./routers/kioskRequests");
    const caller = kioskRequestsRouter.createCaller(makeCtx("user", 9));
    await caller.myRequests();
    expect(getUserKioskRequests).toHaveBeenCalledWith(9);
  });
});

// ── Admin searchUsers Tests ────────────────────────────────────────────────────

describe("admin.searchUsers", () => {
  it("returns empty array for empty query", async () => {
    const { adminRouter } = await import("./routers/admin");
    const caller = adminRouter.createCaller(makeCtx("admin"));
    const result = await caller.searchUsers({ query: "" });
    expect(result).toEqual([]);
    expect(searchUsers).not.toHaveBeenCalled();
  });

  it("calls searchUsers with trimmed query", async () => {
    vi.mocked(searchUsers).mockResolvedValue([]);
    const { adminRouter } = await import("./routers/admin");
    const caller = adminRouter.createCaller(makeCtx("admin"));
    await caller.searchUsers({ query: "hassan" });
    expect(searchUsers).toHaveBeenCalledWith("hassan");
  });

  it("throws FORBIDDEN for non-admin", async () => {
    const { adminRouter } = await import("./routers/admin");
    const caller = adminRouter.createCaller(makeCtx("user"));
    await expect(caller.searchUsers({ query: "test" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── Admin kioskRequests Tests ──────────────────────────────────────────────────

describe("admin.pendingRequestCount", () => {
  it("returns count from db helper", async () => {
    vi.mocked(countPendingKioskRequests).mockResolvedValue(3);
    const { adminRouter } = await import("./routers/admin");
    const caller = adminRouter.createCaller(makeCtx("admin"));
    const count = await caller.pendingRequestCount();
    expect(count).toBe(3);
  });
});

describe("admin.rejectKioskRequest", () => {
  it("rejects a pending request", async () => {
    vi.mocked(getAllKioskRequests).mockResolvedValue([
      { id: 10, type: "create", status: "pending", payload: {}, message: null, adminNote: null, userId: 5, reviewedBy: null, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);
    vi.mocked(updateKioskRequestStatus).mockResolvedValue(undefined);
    const { adminRouter } = await import("./routers/admin");
    const caller = adminRouter.createCaller(makeCtx("admin"));
    await caller.rejectKioskRequest({ requestId: 10, adminNote: "Not suitable" });
    expect(updateKioskRequestStatus).toHaveBeenCalledWith(10, "rejected", 1, "Not suitable");
  });

  it("throws BAD_REQUEST for already processed request", async () => {
    vi.mocked(getAllKioskRequests).mockResolvedValue([
      { id: 11, type: "create", status: "approved", payload: {}, message: null, adminNote: null, userId: 5, reviewedBy: null, createdAt: Date.now(), updatedAt: Date.now() },
    ] as any);
    const { adminRouter } = await import("./routers/admin");
    const caller = adminRouter.createCaller(makeCtx("admin"));
    await expect(caller.rejectKioskRequest({ requestId: 11 }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
