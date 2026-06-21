/**
 * Tests for expert registration and chat procedures.
 * Covers: expertRequests.submit, myRequest, list, approve, reject
 *         chat.startConversation, myConversations, expertInbox, getMessages, sendMessage
 *         admin.promoteToAdmin, admin.listExperts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  createExpertRequest: vi.fn(),
  getUserExpertRequest: vi.fn(),
  listExpertRequests: vi.fn(),
  updateExpertRequest: vi.fn(),
  findOrCreateConversation: vi.fn(),
  getUserConversations: vi.fn(),
  getExpertConversations: vi.fn(),
  getConversationMessages: vi.fn(),
  sendMessage: vi.fn(),
  getConversationById: vi.fn(),
  listExperts: vi.fn(),
  updateUserRole: vi.fn(),
  promoteToAdmin: vi.fn(),
  getAllUsers: vi.fn(),
  listKiosks: vi.fn(),
  listKioskRequests: vi.fn(),
  pendingKioskRequestCount: vi.fn(),
  searchUsers: vi.fn(),
}));

import * as db from "./db";

// ── Helper: build a mock tRPC context ────────────────────────────────────────
const makeCtx = (overrides: Record<string, unknown> = {}) => ({
  user: {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@example.com",
    role: "user" as const,
    adminType: null as "kiosk" | "expert" | "super" | null,
    ...overrides,
  },
});

const makeAdminCtx = (adminType: "kiosk" | "expert" | "super" = "super") =>
  makeCtx({ role: "admin", adminType });

const makeExpertCtx = () => makeCtx({ id: 99, role: "expert" });

// ── Expert Requests ──────────────────────────────────────────────────────────
describe("expertRequests procedures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submit: creates a new expert request for a regular user", async () => {
    vi.mocked(db.getUserExpertRequest).mockResolvedValue(null);
    vi.mocked(db.createExpertRequest).mockResolvedValue(undefined);

    const { expertRequestsRouter } = await import("./routers/expertRequests");
    const caller = expertRequestsRouter.createCaller(makeCtx() as any);

    const result = await caller.submit({
      specialty: "Cardiology",
      credentials: "MD, 10 years experience",
      bio: "Experienced cardiologist specializing in preventive care.",
    });

    expect(result.success).toBe(true);
    expect(db.createExpertRequest).toHaveBeenCalledWith(
      expect.objectContaining({ specialty: "Cardiology", status: "pending" })
    );
  });

  it("submit: throws CONFLICT if user already has a pending request", async () => {
    vi.mocked(db.getUserExpertRequest).mockResolvedValue({
      id: 1,
      userId: 1,
      specialty: "Cardiology",
      credentials: "MD",
      bio: "Bio",
      status: "pending",
      adminNote: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { expertRequestsRouter } = await import("./routers/expertRequests");
    const caller = expertRequestsRouter.createCaller(makeCtx() as any);

    await expect(
      caller.submit({ specialty: "Cardiology", credentials: "MD", bio: "Bio text here" })
    ).rejects.toThrow(TRPCError);
  });

  it("submit: throws CONFLICT if user is already approved as expert", async () => {
    vi.mocked(db.getUserExpertRequest).mockResolvedValue({
      id: 1,
      userId: 1,
      specialty: "Cardiology",
      credentials: "MD",
      bio: "Bio",
      status: "approved",
      adminNote: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { expertRequestsRouter } = await import("./routers/expertRequests");
    const caller = expertRequestsRouter.createCaller(makeCtx() as any);

    await expect(
      caller.submit({ specialty: "Cardiology", credentials: "MD", bio: "Bio text here" })
    ).rejects.toThrow(TRPCError);
  });

  it("myRequest: returns the current user's request", async () => {
    const mockRequest = {
      id: 1,
      userId: 1,
      specialty: "Nutrition",
      credentials: "RD",
      bio: "Registered dietitian",
      status: "pending",
      adminNote: null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.getUserExpertRequest).mockResolvedValue(mockRequest);

    const { expertRequestsRouter } = await import("./routers/expertRequests");
    const caller = expertRequestsRouter.createCaller(makeCtx() as any);

    const result = await caller.myRequest();
    expect(result).toEqual(mockRequest);
  });

  it("list: expert admin can list all expert requests", async () => {
    vi.mocked(db.listExpertRequests).mockResolvedValue([]);

    const { expertRequestsRouter } = await import("./routers/expertRequests");
    const caller = expertRequestsRouter.createCaller(makeAdminCtx("expert") as any);

    const result = await caller.list();
    expect(result).toEqual([]);
    expect(db.listExpertRequests).toHaveBeenCalled();
  });

  it("list: regular user cannot list expert requests", async () => {
    const { expertRequestsRouter } = await import("./routers/expertRequests");
    const caller = expertRequestsRouter.createCaller(makeCtx() as any);

    await expect(caller.list()).rejects.toThrow(TRPCError);
  });

  it("reject: expert admin can reject a pending request", async () => {
    vi.mocked(db.listExpertRequests).mockResolvedValue([
      {
        id: 5,
        userId: 2,
        specialty: "Cardiology",
        credentials: "MD",
        bio: "Bio",
        status: "pending",
        adminNote: null,
        reviewedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userName: "User",
        userEmail: "u@example.com",
      },
    ]);
    vi.mocked(db.updateExpertRequest).mockResolvedValue(undefined);

    const { expertRequestsRouter } = await import("./routers/expertRequests");
    const caller = expertRequestsRouter.createCaller(makeAdminCtx("expert") as any);

    const result = await caller.reject({ requestId: 5, adminNote: "Insufficient credentials" });
    expect(result.success).toBe(true);
    expect(db.updateExpertRequest).toHaveBeenCalledWith(5, "rejected", "Insufficient credentials", expect.any(Number));
  });

  it("reject: throws NOT_FOUND for non-existent request", async () => {
    vi.mocked(db.listExpertRequests).mockResolvedValue([]);

    const { expertRequestsRouter } = await import("./routers/expertRequests");
    const caller = expertRequestsRouter.createCaller(makeAdminCtx("expert") as any);

    await expect(caller.reject({ requestId: 999 })).rejects.toThrow(TRPCError);
  });
});

// ── Chat ─────────────────────────────────────────────────────────────────────
describe("chat procedures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("startConversation: user can start a conversation with an expert", async () => {
    vi.mocked(db.findOrCreateConversation).mockResolvedValue({
      id: 10,
      userId: 1,
      expertId: 99,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    });

    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeCtx() as any);

    const result = await caller.startConversation({ expertId: 99 });
    expect(result.id).toBe(10);
    expect(db.findOrCreateConversation).toHaveBeenCalledWith(1, 99);
  });

  it("startConversation: throws BAD_REQUEST if user tries to message themselves", async () => {
    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeCtx({ id: 5 }) as any);

    await expect(caller.startConversation({ expertId: 5 })).rejects.toThrow(TRPCError);
  });

  it("myConversations: returns user's conversations", async () => {
    vi.mocked(db.getUserConversations).mockResolvedValue([]);

    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeCtx() as any);

    const result = await caller.myConversations();
    expect(result).toEqual([]);
  });

  it("expertInbox: expert can view their inbox", async () => {
    vi.mocked(db.getExpertConversations).mockResolvedValue([]);

    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeExpertCtx() as any);

    const result = await caller.expertInbox();
    expect(result).toEqual([]);
  });

  it("expertInbox: regular user cannot access expert inbox", async () => {
    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeCtx() as any);

    await expect(caller.expertInbox()).rejects.toThrow(TRPCError);
  });

  it("getMessages: participant can read messages", async () => {
    vi.mocked(db.getConversationById).mockResolvedValue({
      id: 10,
      userId: 1,
      expertId: 99,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    });
    vi.mocked(db.getConversationMessages).mockResolvedValue([]);

    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeCtx() as any);

    const result = await caller.getMessages({ conversationId: 10 });
    expect(result).toEqual([]);
  });

  it("getMessages: non-participant cannot read messages", async () => {
    vi.mocked(db.getConversationById).mockResolvedValue({
      id: 10,
      userId: 2,  // different user
      expertId: 99,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    });

    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeCtx({ id: 1 }) as any);

    await expect(caller.getMessages({ conversationId: 10 })).rejects.toThrow(TRPCError);
  });

  it("sendMessage: participant can send a message", async () => {
    vi.mocked(db.getConversationById).mockResolvedValue({
      id: 10,
      userId: 1,
      expertId: 99,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    });
    vi.mocked(db.sendMessage).mockResolvedValue({
      id: 1,
      conversationId: 10,
      senderId: 1,
      content: "Hello",
      createdAt: new Date(),
    });

    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeCtx() as any);

    const result = await caller.sendMessage({ conversationId: 10, content: "Hello" });
    expect(result.success).toBe(true);
  });

  it("sendMessage: non-participant cannot send a message", async () => {
    vi.mocked(db.getConversationById).mockResolvedValue({
      id: 10,
      userId: 2,
      expertId: 99,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    });

    const { chatRouter } = await import("./routers/chat");
    const caller = chatRouter.createCaller(makeCtx({ id: 1 }) as any);

    await expect(
      caller.sendMessage({ conversationId: 10, content: "Hello" })
    ).rejects.toThrow(TRPCError);
  });
});

// ── Admin: promoteToAdmin ────────────────────────────────────────────────────
describe("admin.promoteToAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super admin can promote a user to kiosk admin", async () => {
    vi.mocked(db.promoteToAdmin).mockResolvedValue(undefined);
    vi.mocked(db.getAllUsers).mockResolvedValue([]);
    vi.mocked(db.listKiosks).mockResolvedValue([]);
    vi.mocked(db.listKioskRequests).mockResolvedValue([]);
    vi.mocked(db.pendingKioskRequestCount).mockResolvedValue(0);
    vi.mocked(db.searchUsers).mockResolvedValue([]);

    const { adminRouter } = await import("./routers/admin");
    const caller = adminRouter.createCaller(makeAdminCtx("super") as any);

    const result = await caller.promoteToAdmin({ userId: 5, adminType: "kiosk" });
    expect(result.success).toBe(true);
    expect(db.promoteToAdmin).toHaveBeenCalledWith(5, "kiosk");
  });

  it("kiosk admin cannot promote users to admin", async () => {
    vi.mocked(db.getAllUsers).mockResolvedValue([]);
    vi.mocked(db.listKiosks).mockResolvedValue([]);
    vi.mocked(db.listKioskRequests).mockResolvedValue([]);
    vi.mocked(db.pendingKioskRequestCount).mockResolvedValue(0);
    vi.mocked(db.searchUsers).mockResolvedValue([]);

    const { adminRouter } = await import("./routers/admin");
    const caller = adminRouter.createCaller(makeAdminCtx("kiosk") as any);

    await expect(caller.promoteToAdmin({ userId: 5, adminType: "kiosk" })).rejects.toThrow(TRPCError);
  });
});
