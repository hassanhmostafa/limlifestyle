import { eq, like, or, desc, and, gte, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, kiosks, InsertKiosk, healthReadings, InsertHealthReading,
  aiPlans, InsertAiPlan, kioskRequests, InsertKioskRequest, bookings, InsertBooking
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    // NOTE: We intentionally do NOT auto-set the owner to admin here.
    // Role changes made via the admin panel or direct DB queries should persist.

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmailUser(data: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email_password",
    role: "user",
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function updatePasswordHash(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

/**
 * Update a user's profile fields (gender, birthDate, name).
 */
export async function updateUserProfile(
  userId: number,
  data: { gender?: "male" | "female" | null; birthDate?: string | null; name?: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

// ─────────────────────────────────────────────
// Kiosk helpers
// ─────────────────────────────────────────────

/**
 * Retrieve all active kiosks from the database.
 * Returns an empty array if the database is unavailable.
 */
export async function getAllKiosks() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get kiosks: database not available");
    return [];
  }
  return db.select().from(kiosks).where(eq(kiosks.isActive, "true"));
}

/**
 * Retrieve a single kiosk by its ID.
 */
export async function getKioskById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(kiosks).where(eq(kiosks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Search kiosks by name, location, or address.
 */
export async function searchKiosks(query: string) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${query}%`;
  return db
    .select()
    .from(kiosks)
    .where(
      or(
        like(kiosks.name, pattern),
        like(kiosks.location, pattern),
        like(kiosks.address, pattern)
      )
    );
}

/**
 * Seed the database with the provided kiosk data.
 * Uses onDuplicateKeyUpdate so existing rows are not overwritten with blank data.
 * Safe to call multiple times — only updates the timestamp if the row already exists.
 */
export async function seedKiosks(data: InsertKiosk[]) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot seed kiosks: database not available");
    return;
  }
  for (const kiosk of data) {
    await db
      .insert(kiosks)
      .values(kiosk)
      .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  }
  console.log(`[Database] Seeded ${data.length} kiosks`);
}

/**
 * Retrieve ALL kiosks (active and inactive) — for admin use only.
 */
export async function getAllKiosksAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kiosks);
}

/**
 * Create a new kiosk.
 */
export async function createKiosk(data: InsertKiosk) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(kiosks).values(data);
  const result = await db.select().from(kiosks).where(eq(kiosks.id, data.id)).limit(1);
  return result[0];
}

/**
 * Update an existing kiosk by ID.
 */
export async function updateKiosk(id: string, data: Partial<InsertKiosk>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kiosks).set({ ...data, updatedAt: new Date() }).where(eq(kiosks.id, id));
  const result = await db.select().from(kiosks).where(eq(kiosks.id, id)).limit(1);
  return result[0];
}

/**
 * Soft-delete a kiosk by setting isActive = "false".
 */
export async function deactivateKiosk(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kiosks).set({ isActive: "false", updatedAt: new Date() }).where(eq(kiosks.id, id));
}

/**
 * Permanently delete a kiosk by ID.
 */
export async function deleteKiosk(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(kiosks).where(eq(kiosks.id, id));
}

/**
 * Get all kiosks owned by a specific user.
 */
export async function getKiosksByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kiosks).where(eq(kiosks.ownerId, ownerId));
}

/**
 * Get all users (for admin management).
 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    adminType: users.adminType,
  }).from(users).orderBy(users.name);
}

/**
 * Search users by name or email (for admin owner assignment combobox).
 * Returns up to 20 results.
 */
export async function searchUsers(query: string) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${query}%`;
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    adminType: users.adminType,
  }).from(users).where(
    or(
      like(users.name, pattern),
      like(users.email, pattern)
    )
  ).limit(20);
}

/**
 * Update a user's role.
 */
export async function updateUserRole(userId: number, role: "user" | "expert" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─────────────────────────────────────────────
// Health readings helpers
// ─────────────────────────────────────────────

/**
 * Get all health readings for a specific user, newest first.
 */
export async function getUserReadings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(healthReadings)
    .where(eq(healthReadings.userId, userId))
    .orderBy(desc(healthReadings.recordedAt));
}

/**
 * Get health readings for a user since a given date (for chart range filtering).
 * Pass null for `since` to get all readings (Max range).
 */
export async function getUserReadingsSince(userId: number, since: Date | null) {
  const db = await getDb();
  if (!db) return [];
  if (since === null) {
    return db
      .select()
      .from(healthReadings)
      .where(eq(healthReadings.userId, userId))
      .orderBy(desc(healthReadings.recordedAt));
  }
  return db
    .select()
    .from(healthReadings)
    .where(and(eq(healthReadings.userId, userId), gte(healthReadings.recordedAt, since)))
    .orderBy(desc(healthReadings.recordedAt));
}

/**
 * Log a new health reading for a user.
 */
export async function createHealthReading(data: InsertHealthReading) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(healthReadings).values(data);
  const result = await db
    .select()
    .from(healthReadings)
    .where(eq(healthReadings.userId, data.userId))
    .orderBy(desc(healthReadings.recordedAt))
    .limit(1);
  return result[0];
}

/**
 * Seed health readings for a given user (idempotent via recordedAt uniqueness).
 * Used only for demo/test data.
 */
export async function seedHealthReadings(data: InsertHealthReading[]) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot seed health readings: database not available");
    return;
  }
  for (const reading of data) {
    try {
      await db.insert(healthReadings).values(reading);
    } catch {
      // Ignore duplicate entries silently
    }
  }
  console.log(`[Database] Seeded ${data.length} health readings`);
}

/**
 * Delete a single health reading by ID (user must own it).
 */
export async function deleteHealthReading(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(healthReadings)
    .where(eq(healthReadings.id, id));
}

// ─────────────────────────────────────────────
// AI Plans helpers
// ─────────────────────────────────────────────

/**
 * Save a newly generated AI plan for a user.
 */
export async function createAiPlan(data: InsertAiPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(aiPlans).values(data);
  const result = await db
    .select()
    .from(aiPlans)
    .where(eq(aiPlans.userId, data.userId))
    .orderBy(desc(aiPlans.createdAt))
    .limit(1);
  return result[0];
}

/**
 * Get all AI plans for a user, newest first.
 */
export async function getUserAiPlans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiPlans)
    .where(eq(aiPlans.userId, userId))
    .orderBy(desc(aiPlans.createdAt));
}

/**
 * Delete an AI plan by ID (user must own it).
 */
export async function deleteAiPlan(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aiPlans).where(and(eq(aiPlans.id, id), eq(aiPlans.userId, userId)));
}

// ─────────────────────────────────────────────
// Kiosk Request helpers
// ─────────────────────────────────────────────

/**
 * Submit a new kiosk request (create or delete) from a user.
 */
export async function createKioskRequest(data: InsertKioskRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(kioskRequests).values(data);
  const result = await db
    .select()
    .from(kioskRequests)
    .where(eq(kioskRequests.userId, data.userId))
    .orderBy(desc(kioskRequests.createdAt))
    .limit(1);
  return result[0];
}

/**
 * Get all kiosk requests, newest first (admin only).
 */
export async function getAllKioskRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kioskRequests).orderBy(desc(kioskRequests.createdAt));
}

/**
 * Get kiosk requests submitted by a specific user.
 */
export async function getUserKioskRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(kioskRequests)
    .where(eq(kioskRequests.userId, userId))
    .orderBy(desc(kioskRequests.createdAt));
}

/**
 * Count pending kiosk requests (for admin badge).
 */
export async function countPendingKioskRequests() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select()
    .from(kioskRequests)
    .where(eq(kioskRequests.status, "pending"));
  return result.length;
}

/**
 * Update a kiosk request status (approve/reject).
 */
export async function updateKioskRequestStatus(
  id: number,
  status: "approved" | "rejected",
  adminId: number,
  adminNote?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kioskRequests).set({
    status,
    processedBy: adminId,
    processedAt: new Date(),
    adminNote: adminNote ?? null,
    updatedAt: new Date(),
  }).where(eq(kioskRequests.id, id));
  const result = await db.select().from(kioskRequests).where(eq(kioskRequests.id, id)).limit(1);
  return result[0];
}

// ─────────────────────────────────────────────
// Booking helpers
// ─────────────────────────────────────────────

/**
 * Create a new booking for a user at a kiosk.
 */
export async function createBooking(data: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(bookings).values(data);
  const result = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, data.userId))
    .orderBy(desc(bookings.createdAt))
    .limit(1);
  return result[0];
}

/**
 * Get all bookings for a specific user, newest first.
 */
export async function getUserBookings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: bookings.id,
      userId: bookings.userId,
      kioskId: bookings.kioskId,
      visitDate: bookings.visitDate,
      timeSlot: bookings.timeSlot,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      kioskName: kiosks.name,
      kioskLocation: kiosks.location,
    })
    .from(bookings)
    .leftJoin(kiosks, eq(bookings.kioskId, kiosks.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.visitDate), desc(bookings.timeSlot));
  return rows;
}

/**
 * Get all bookings for a specific kiosk (for owner/admin view).
 */
export async function getKioskBookings(kioskId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bookings)
    .where(and(eq(bookings.kioskId, kioskId), or(
      eq(bookings.status, "confirmed"),
      eq(bookings.status, "pending")
    )))
    .orderBy(bookings.visitDate, bookings.timeSlot);
}

/**
 * Get booked time slots for a kiosk on a specific date (to show availability).
 */
export async function getBookedSlots(kioskId: string, visitDate: string) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ timeSlot: bookings.timeSlot })
    .from(bookings)
    .where(and(
      eq(bookings.kioskId, kioskId),
      eq(bookings.visitDate, visitDate),
      or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending"))
    ));
  return result.map(r => r.timeSlot);
}

/**
 * Cancel a booking (user can only cancel their own).
 */
export async function cancelBooking(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookings).set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));
}

/**
 * Update booking status (owner/admin can mark as completed or cancelled).
 */
export async function updateBookingStatus(id: number, status: "confirmed" | "cancelled" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookings).set({ status, updatedAt: new Date() }).where(eq(bookings.id, id));
}

// ── Expert Requests ───────────────────────────────────────────────────────────

import {
  expertRequests, InsertExpertRequest,
  conversations, InsertConversation,
  messages, InsertMessage,
} from "../drizzle/schema";

/**
 * Submit a new expert registration request.
 */
export async function createExpertRequest(data: InsertExpertRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(expertRequests).values(data);
}

/**
 * Get the most recent expert request for a user.
 */
export async function getUserExpertRequest(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(expertRequests)
    .where(eq(expertRequests.userId, userId))
    .orderBy(desc(expertRequests.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * List all expert requests (for admin review), newest first.
 */
export async function listExpertRequests(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  const query = db
    .select({
      id: expertRequests.id,
      userId: expertRequests.userId,
      specialty: expertRequests.specialty,
      credentials: expertRequests.credentials,
      bio: expertRequests.bio,
      status: expertRequests.status,
      adminNote: expertRequests.adminNote,
      processedBy: expertRequests.processedBy,
      processedAt: expertRequests.processedAt,
      createdAt: expertRequests.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(expertRequests)
    .leftJoin(users, eq(expertRequests.userId, users.id))
    .orderBy(desc(expertRequests.createdAt));

  if (status) {
    return (await query).filter(r => r.status === status);
  }
  return query;
}

/**
 * Update an expert request status (approve or reject).
 */
export async function updateExpertRequest(
  id: number,
  status: "approved" | "rejected",
  adminNote: string | undefined,
  processedBy: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(expertRequests)
    .set({ status, adminNote: adminNote ?? null, processedBy, processedAt: new Date(), updatedAt: new Date() })
    .where(eq(expertRequests.id, id));
}

/**
 * Get all approved experts for the experts listing page.
 */
export async function listExperts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      specialty: users.specialty,
      bio: users.bio,
    })
    .from(users)
    .where(eq(users.role, "expert"))
    .orderBy(users.name);
}

/**
 * Promote a user to admin with a specific adminType.
 */
export async function promoteToAdmin(userId: number, adminType: "kiosk" | "expert" | "super") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ role: "admin", adminType, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ── Conversations & Messages ──────────────────────────────────────────────────

/**
 * Find an existing conversation between a user and an expert, or create one.
 */
export async function findOrCreateConversation(userId: number, expertId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.expertId, expertId)))
    .limit(1);

  if (existing.length > 0) return existing[0];

  await db.insert(conversations).values({ userId, expertId, lastMessageAt: new Date() });

  const created = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.expertId, expertId)))
    .limit(1);

  return created[0];
}

/**
 * Get all conversations for a user (user side).
 */
export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: conversations.id,
      expertId: conversations.expertId,
      lastMessageAt: conversations.lastMessageAt,
      expertName: users.name,
      expertSpecialty: users.specialty,
    })
    .from(conversations)
    .leftJoin(users, eq(conversations.expertId, users.id))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.lastMessageAt));
}

/**
 * Get all conversations for an expert (expert inbox).
 */
export async function getExpertConversations(expertId: number) {
  const db = await getDb();
  if (!db) return [];

  // alias users table for the user side
  const { alias } = await import("drizzle-orm/mysql-core");
  const userAlias = alias(users, "chatUser");

  return db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      lastMessageAt: conversations.lastMessageAt,
      userName: userAlias.name,
      userEmail: userAlias.email,
    })
    .from(conversations)
    .leftJoin(userAlias, eq(conversations.userId, userAlias.id))
    .where(eq(conversations.expertId, expertId))
    .orderBy(desc(conversations.lastMessageAt));
}

/**
 * Get messages for a conversation (newest last).
 */
export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

/**
 * Send a message in a conversation and update lastMessageAt.
 */
export async function sendMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values(data);
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
}

/**
 * Verify that a user is a participant in a conversation (security check).
 */
export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return rows[0] ?? null;
}
