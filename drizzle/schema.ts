import { int, mysqlEnum, mysqlTable, mediumtext, text, timestamp, varchar, decimal, json, date, uniqueIndex } from "drizzle-orm/mysql-core";

export const eventOtpChallenges = mysqlTable("event_otp_challenges", {
  phoneHash: varchar("phoneHash", { length: 64 }).primaryKey(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").notNull().default(0),
  state: varchar("state", { length: 16 }).notNull(),
});
export const eventOtpLimits = mysqlTable("event_otp_limits", {
  bucket: varchar("bucket", { length: 64 }).primaryKey(),
  count: int("count").notNull().default(0),
  lastAt: timestamp("lastAt").notNull(),
});

export const eventProfiles = mysqlTable("event_profiles", {
  eventCode: varchar("eventCode", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull().default("فعالية ليم"),
  startsOn: varchar("startsOn", { length: 10 }),
  endsOn: varchar("endsOn", { length: 10 }),
  location: varchar("location", { length: 500 }).notNull().default(""),
  organizer: varchar("organizer", { length: 255 }).notNull().default(""),
  poster: mediumtext("poster"),
  questionnaireIds: json("questionnaireIds").$type<string[]>().notNull(),
  closed: int("closed").notNull().default(0),
});

// Event operations are separate from the main app's expert/patient grants.
export const eventSettings = mysqlTable("event_settings", {
  eventCode: varchar("eventCode", { length: 64 }).primaryKey(),
  nursingEnabled: int("nursingEnabled").notNull().default(0),
  testIds: json("testIds").$type<string[]>().notNull(),
});
export const eventStaff = mysqlTable("event_staff", {
  id: int("id").autoincrement().primaryKey(),
  eventCode: varchar("eventCode", { length: 64 }).notNull(),
  userId: int("userId"),
  trackId: int("trackId"),
  name: varchar("name", { length: 255 }),
  codeHash: varchar("codeHash", { length: 64 }).unique("event_staff_code_unique"),
  credentialVersion: int("credentialVersion").notNull().default(1),
  duty: mysqlEnum("duty", ["nurse", "doctor"]).notNull(),
  active: int("active").notNull().default(1),
}, t => [uniqueIndex("event_staff_user_unique").on(t.eventCode, t.userId)]);
export const eventTracks = mysqlTable("event_tracks", {
  id: int("id").autoincrement().primaryKey(),
  eventCode: varchar("eventCode", { length: 64 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  active: int("active").notNull().default(1),
}, t => [uniqueIndex("event_track_name_unique").on(t.eventCode, t.name)]);
export const eventStaffSessions = mysqlTable("event_staff_sessions", {
  tokenHash: varchar("tokenHash", { length: 64 }).primaryKey(),
  staffId: int("staffId").notNull(),
  credentialVersion: int("credentialVersion").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});
export const eventCare = mysqlTable("event_care", {
  sessionId: int("sessionId").primaryKey(),
  // Snapshot taken on first access so later settings changes do not lose work.
  nursingEnabled: int("nursingEnabled").notNull(),
  testIds: json("testIds").$type<string[]>().notNull(),
  measurements: json("measurements").$type<Record<string, Record<string, string>>>().notNull(),
  nurseNotes: text("nurseNotes"),
  nurseUserId: int("nurseUserId"),
  nurseStaffId: int("nurseStaffId"),
  nursingCompletedAt: timestamp("nursingCompletedAt"),
  advice: text("advice"),
  doctorUserId: int("doctorUserId"),
  doctorStaffId: int("doctorStaffId"),
  doctorName: varchar("doctorName", { length: 255 }),
  approvedAt: timestamp("approvedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  /** Verified account phone in E.164 format, e.g. +966563817217. */
  phone: varchar("phone", { length: 20 }).unique(),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /**
   * User role:
   * - user: regular user
   * - expert: health specialist who can chat with users
   * - admin: administrative user (see adminType for sub-role)
   */
  role: mysqlEnum("role", ["user", "expert", "admin"]).default("user").notNull(),
  /**
   * Admin sub-role (only meaningful when role = admin):
   * - kiosk: manages kiosk creation/deletion requests
   * - expert: manages expert registration requests
   * - super: full access to all admin functions
   */
  adminType: mysqlEnum("adminType", ["kiosk", "expert", "super"]),
  /**
   * For expert users: their medical/health specialty.
   * e.g. "Nutritionist", "Cardiologist", "General Practitioner"
   */
  specialty: varchar("specialty", { length: 128 }),
  /**
   * For expert users: a short professional bio shown on the experts listing page.
   */
  bio: text("bio"),
  /**
   * Hashed password for email+password auth (nullable — social login users won't have one).
   */
  passwordHash: text("passwordHash"),
  /** User's gender, chosen during profile setup. Used for BMI calculations. */
  gender: mysqlEnum("gender", ["male", "female"]),
  /** User's date of birth (stored as a date string YYYY-MM-DD). Used to compute age for BMI. */
  birthDate: varchar("birthDate", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Kiosk locations table.
 * Each row represents one physical health screening station.
 */
export const kiosks = mysqlTable("kiosks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  image: text("image"),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  hours: json("hours").$type<{ day: string; open: string; close: string }[]>(),
  services: json("services").$type<string[]>(),
  ownerId: int("ownerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KioskRecord = typeof kiosks.$inferSelect;
export type InsertKiosk = typeof kiosks.$inferInsert;

/**
 * Health readings table.
 */
export const healthReadings = mysqlTable("health_readings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kioskId: varchar("kioskId", { length: 64 }).notNull(),
  /** Origin separates real X18 measurements from simulator, demo, and manual data. */
  source: mysqlEnum("source", ["x18", "x18_test", "legacy", "simulator", "manual", "demo"]).default("manual").notNull(),
  /** Vendor-native X18 field names, retained for protocol clarity. */
  sbp: int("sbp"),
  dbp: int("dbp"),
  hr: int("hr"),
  weight: decimal("weight", { precision: 5, scale: 1 }),
  height: decimal("height", { precision: 5, scale: 1 }),
  bmi: decimal("bmi", { precision: 4, scale: 1 }),
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  /** Full X18 body-composition payload, stored using the vendor's variable names. */
  machineMetrics: json("machineMetrics").$type<Record<string, string>>(),
  /** Patient identity exactly as submitted by the X18 for this measurement. */
  patientName: varchar("patientName", { length: 255 }),
  patientAge: int("patientAge"),
  patientSex: varchar("patientSex", { length: 32 }),
  /** X18 report identifier shared by the device's multiple upload posts. */
  recordNo: varchar("recordNo", { length: 64 }),
  deviceNo: varchar("deviceNo", { length: 64 }),
  notes: text("notes"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HealthReading = typeof healthReadings.$inferSelect;
export type InsertHealthReading = typeof healthReadings.$inferInsert;

/**
 * Standalone browser sessions for the LIM Events web experience. The browser
 * holds only the opaque token; health results remain exclusively in
 * `health_readings` and are joined internally through `userId`.
 */
export const eventParticipantSessions = mysqlTable("event_participant_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** SHA-256 of an opaque browser token. The raw token is never stored. */
  accessTokenHash: varchar("accessTokenHash", { length: 64 }).notNull().unique(),
  /** Human-friendly reference used by the event team, not an access credential. */
  code: varchar("code", { length: 32 }).notNull().unique(),
  eventCode: varchar("eventCode", { length: 64 }).notNull().default("lim-events"),
  trackId: int("trackId"),
  questionnaireIds: json("questionnaireIds").$type<string[]>(),
  displayName: varchar("displayName", { length: 255 }),
  age: int("age"),
  sex: mysqlEnum("sex", ["male", "female"]),
  city: varchar("city", { length: 128 }),
  consent: mysqlEnum("consent", ["true", "false"]).default("false").notNull(),
  answers: json("answers").$type<Record<string, string | number | string[]>>(),
  status: mysqlEnum("status", ["checked_in", "measured"]).default("checked_in").notNull(),
  latestRecordNo: varchar("latestRecordNo", { length: 64 }),
  /** Explicit participant actions after an associated X18 measurement arrives. */
  consultationCompletedAt: timestamp("consultationCompletedAt"),
  reportCompletedAt: timestamp("reportCompletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventParticipantSession = typeof eventParticipantSessions.$inferSelect;
export type InsertEventParticipantSession = typeof eventParticipantSessions.$inferInsert;

/**
 * A participant grants a specific clinician (expert account) access to their
 * readings. There is no broad clinician search over health data.
 */
export const clinicianParticipantAccess = mysqlTable("clinician_participant_access", {
  id: int("id").autoincrement().primaryKey(),
  clinicianUserId: int("clinicianUserId").notNull(),
  participantUserId: int("participantUserId").notNull(),
  status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
}, (table) => [
  uniqueIndex("clinician_participant_access_unique").on(table.clinicianUserId, table.participantUserId),
]);

export type ClinicianParticipantAccess = typeof clinicianParticipantAccess.$inferSelect;

/**
 * AI-generated health and diet plans.
 */
export const aiPlans = mysqlTable("ai_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planType: mysqlEnum("planType", ["health", "diet", "combined"]).notNull(),
  content: text("content").notNull(),
  metricsSnapshot: json("metricsSnapshot").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiPlan = typeof aiPlans.$inferSelect;
export type InsertAiPlan = typeof aiPlans.$inferInsert;

/**
 * Kiosk requests table.
 */
export const kioskRequests = mysqlTable("kiosk_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["create", "delete"]).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  message: text("message"),
  adminNote: text("adminNote"),
  processedBy: int("processedBy"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KioskRequest = typeof kioskRequests.$inferSelect;
export type InsertKioskRequest = typeof kioskRequests.$inferInsert;

/**
 * Kiosk visit bookings table.
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kioskId: varchar("kioskId", { length: 64 }).notNull(),
  visitDate: varchar("visitDate", { length: 10 }).notNull(),
  timeSlot: varchar("timeSlot", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("confirmed").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Expert registration requests table.
 * Users submit requests to become health experts on the platform.
 * Expert admins and super admins review and approve/reject these.
 */
export const expertRequests = mysqlTable("expert_requests", {
  id: int("id").autoincrement().primaryKey(),
  /** The user applying to become an expert */
  userId: int("userId").notNull(),
  /** Medical/health specialty e.g. "Nutritionist", "Cardiologist" */
  specialty: varchar("specialty", { length: 128 }).notNull(),
  /** Professional credentials e.g. "MD, King Abdulaziz University" */
  credentials: varchar("credentials", { length: 512 }).notNull(),
  /** Short professional bio */
  bio: text("bio").notNull(),
  /** Request status */
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  /** Admin's note when approving or rejecting */
  adminNote: text("adminNote"),
  /** Admin who processed the request */
  processedBy: int("processedBy"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpertRequest = typeof expertRequests.$inferSelect;
export type InsertExpertRequest = typeof expertRequests.$inferInsert;

/**
 * Conversations table.
 * Each row represents a chat thread between one user and one expert.
 * One conversation per user–expert pair (unique constraint enforced in app logic).
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  /** The regular user in the conversation */
  userId: int("userId").notNull(),
  /** The expert user in the conversation */
  expertId: int("expertId").notNull(),
  /** Timestamp of the last message (for sorting inbox) */
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table.
 * Individual messages within a conversation thread.
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  /** The user who sent this message (could be the user or the expert) */
  senderId: int("senderId").notNull(),
  /** Message text content (empty string when sending a file-only message) */
  content: text("content").notNull().default(""),
  /** Optional S3 URL for an attached file (PDF, image, etc.) */
  fileUrl: varchar("fileUrl", { length: 1024 }),
  /** Original filename for display */
  fileName: varchar("fileName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Kiosk devices table.
 * Stores registered TRIPLEBIGHT kiosk hardware devices.
 * Each device has a unique hardware ID (MAC/serial) that the kiosk sends with every data submission.
 */
export const kioskDevices = mysqlTable("kiosk_devices", {
  id: int("id").autoincrement().primaryKey(),
  /** Hardware device ID from the kiosk (e.g. "2CFDA15B9372") */
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(),
  /** Legacy per-device hash retained for backwards-compatible migration only. */
  apiKeyHash: varchar("apiKeyHash", { length: 64 }),
  /** Human-readable label for this device */
  label: varchar("label", { length: 255 }),
  /** FK to kiosks table — which kiosk location this device belongs to */
  kioskId: varchar("kioskId", { length: 64 }),
  /** Whether this device is allowed to submit data */
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KioskDevice = typeof kioskDevices.$inferSelect;
export type InsertKioskDevice = typeof kioskDevices.$inferInsert;

/**
 * One shared upload credential for the LIM X18 fleet. Hardware remains
 * individually registered/activatable in kioskDevices; the shared plaintext
 * key is never stored, only its SHA-256 hash.
 */
export const kioskIntegrationSettings = mysqlTable("kiosk_integration_settings", {
  id: int("id").primaryKey(),
  apiKeyHash: varchar("apiKeyHash", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KioskIntegrationSettings = typeof kioskIntegrationSettings.$inferSelect;

/**
 * Kiosk sessions table.
 * A session links a kiosk device to a user for a single measurement session.
 * The kiosk creates a session (via QR code or manual login), then submits readings
 * referencing the session token. Expires after 60 minutes.
 */
export const kioskSessions = mysqlTable("kiosk_sessions", {
  id: int("id").autoincrement().primaryKey(),
  /** Session token sent to the kiosk after user authenticates */
  token: varchar("token", { length: 128 }).notNull().unique(),
  /** The device that created this session */
  deviceId: varchar("deviceId", { length: 64 }).notNull(),
  /** The user who authenticated at the kiosk */
  userId: int("userId").notNull(),
  /**
   * Session status:
   * - pending: token generated by the machine, waiting for user to scan and confirm
   * - active:  user has confirmed via the app, machine can proceed
   * - used:    machine has submitted health data for this session
   * - expired: session timed out before use
   */
  status: mysqlEnum("status", ["pending", "active", "used", "expired"]).default("active").notNull(),
  /** When this session expires (60 minutes after creation) */
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KioskSession = typeof kioskSessions.$inferSelect;
export type InsertKioskSession = typeof kioskSessions.$inferInsert;
