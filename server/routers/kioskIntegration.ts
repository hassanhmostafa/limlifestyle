/**
 * Kiosk Integration Router
 *
 * Handles communication with Henan Lejia (TRIPLEBIGHT) Android health kiosk machines.
 *
 * ─── Machine-to-App Flow (based on API Protocol v1.0 + WeChat QR Login Protocol) ───
 *
 * The machine uses two configurable server URLs (set in machine settings):
 *   login_baseurl  → the base URL for QR login (e.g. https://tech-care.manus.space)
 *   data_upload    → the URL for posting health data (e.g. https://tech-care.manus.space/api/kiosk/data)
 *
 * Step-by-step flow:
 *
 * 1. User touches the machine screen.
 * 2. Machine generates a random token and shows a QR code pointing to:
 *      GET /weixin/login/xcx?token=<random_token>
 *    (This URL format is fixed by the machine firmware — we must match it exactly.)
 * 3. User scans the QR code with the Tech Care app on their phone.
 * 4. The app opens /kiosk-login?token=<random_token>, the user confirms their identity.
 * 5. The app calls POST /api/kiosk/confirm-login with { token, userId }.
 * 6. Meanwhile, the machine polls GET /weixin/login/xcx?token=<random_token> every second.
 *    - Before confirmation: returns { code: 0, msg: "数据不存在", data: null }
 *    - After confirmation:  returns { code: 1, msg: "操作成功", data: { name, mobile, ... } }
 * 7. Once the machine gets code=1, it knows who the user is and proceeds with measurements.
 * 8. After measurements, machine POSTs all health data to /api/kiosk/data.
 * 9. Server saves the reading under the confirmed user's account.
 *
 * ─── Admin Flow ───
 * Admins can register, update, and delete kiosk device hardware IDs via the tRPC router.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { kioskDevices, kioskSessions, healthReadings } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseFloatOrNull(val: string | undefined): number | null {
  if (!val) return null;
  // Machine sends values as "value#result_prompt#reference_range" — take first part
  const parts = val.split("#");
  const n = parseFloat(parts[0]);
  return isNaN(n) ? null : n;
}

function parseIntOrNull(val: string | undefined): number | null {
  const f = parseFloatOrNull(val);
  return f === null ? null : Math.round(f);
}

// ─── Kiosk Data Payload Schema ───────────────────────────────────────────────
// Based on Henan Lejia API Protocol v1.0

const KioskDataSchema = z.object({
  /** Session token — either from our confirm-login flow OR a pre-created session */
  sessionToken: z.string().optional(),
  /** Device hardware ID (e.g. "2CFDA15B9372") */
  deviceID: z.string().optional(),
  /** Physical examination number */
  examNo: z.string().optional(),

  // Height & Weight
  hw: z.object({
    height: z.string().optional(),
    weight: z.string().optional(),
    bmi: z.string().optional(),
  }).optional(),

  // Blood Pressure
  blood: z.object({
    high: z.string().optional(),   // systolic left arm
    low: z.string().optional(),    // diastolic left arm
    rate: z.string().optional(),   // heart rate
    rhigh: z.string().optional(),  // systolic right arm
    rlow: z.string().optional(),   // diastolic right arm
  }).optional(),

  // Blood Oxygen
  spo2: z.object({
    sp: z.string().optional(),
  }).optional(),

  // Body Temperature
  tiwen: z.string().optional(),

  // Body Composition
  fat: z.object({
    zflv: z.string().optional(),   // body fat rate
    jcdx: z.string().optional(),   // basal metabolism
    tsfl: z.string().optional(),   // body water content
    tsflv: z.string().optional(),  // body water rate
    zfl: z.string().optional(),    // body fat content
    jrl: z.string().optional(),    // muscle content
    jrlv: z.string().optional(),   // muscle rate
    gy: z.string().optional(),     // bone salt
    nzzf: z.string().optional(),   // visceral fat grade
    dbzlv: z.string().optional(),  // protein rate
    dbz: z.string().optional(),    // protein content
    gl: z.string().optional(),     // bone mass
  }).optional(),

  // Blood Sugar
  xt: z.object({
    type: z.string().optional(),
    value: z.string().optional(),
  }).optional(),

  // Uric Acid
  ns: z.string().optional(),

  // Cholesterol
  dgc: z.string().optional(),

  // Waist-Hip Ratio
  ytb: z.object({
    waist: z.string().optional(),
    hip: z.string().optional(),
    whr: z.string().optional(),
  }).optional(),

  // Lung Function
  fgn: z.object({
    pef: z.string().optional(),   // peak expiratory flow
    fev1: z.string().optional(),  // forced expiratory volume 1s
    fvc: z.string().optional(),   // forced vital capacity
    bz: z.string().optional(),    // fev1/fvc ratio
  }).optional(),

  // ID Card (optional — if kiosk has ID reader)
  sfz: z.object({
    name: z.string().optional(),
    sex: z.string().optional(),
    idnumber: z.string().optional(),
    age: z.string().optional(),
    qrCode: z.string().optional(),
  }).optional(),
}).passthrough();

// ─── tRPC Router ─────────────────────────────────────────────────────────────

export const kioskIntegrationRouter = router({

  /**
   * Called by the Tech Care app after the user scans the machine's QR code.
   * Links the machine's random token to the logged-in user's account.
   * After this, the machine's polling endpoint (/weixin/login/xcx) will return success.
   */
  confirmLogin: protectedProcedure
    .input(z.object({
      /** The token extracted from the QR code URL (?token=...) */
      token: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if this token already exists (machine may have pre-created it)
      const [existing] = await db
        .select()
        .from(kioskSessions)
        .where(eq(kioskSessions.token, input.token));

      if (existing) {
        // Token exists — update it to link this user
        if (existing.status !== "pending" && existing.status !== "active") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This session has already been used or expired.",
          });
        }
        if (existing.status === "active" && existing.userId === ctx.user.id) {
          // Already confirmed by this same user — idempotent success
          return { success: true, message: "Session already confirmed." };
        }
        await db
          .update(kioskSessions)
          .set({ userId: ctx.user.id, status: "active" })
          .where(eq(kioskSessions.id, existing.id));
      } else {
        // Token was generated by the machine — create a new session record for it
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min
        await db.insert(kioskSessions).values({
          token: input.token,
          deviceId: "unknown", // will be resolved when machine sends data
          userId: ctx.user.id,
          status: "active",
          expiresAt,
        });
      }

      return {
        success: true,
        message: "Session confirmed. You may now proceed with the health measurements.",
      };
    }),

  /**
   * Create a test session token for development/demo purposes.
   * Allows testing the full kiosk login flow without a physical machine.
   * Returns a token and the full URL to open the KioskLogin confirmation page.
   */
  createTestSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const token = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min

      // Insert a pending session — simulates what the machine would create
      await db.insert(kioskSessions).values({
        token,
        deviceId: "TEST_DEVICE",
        userId: ctx.user.id,
        status: "active",
        expiresAt,
      });

      return { token, expiresAt };
    }),

  /**
   * Create a kiosk session manually (used by admin test panel or direct device pairing).
   */
  createSession: protectedProcedure
    .input(z.object({
      deviceId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [device] = await db
        .select()
        .from(kioskDevices)
        .where(and(
          eq(kioskDevices.deviceId, input.deviceId),
          eq(kioskDevices.isActive, "true")
        ));

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not registered or inactive. Please contact your administrator.",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(kioskSessions).values({
        token,
        deviceId: input.deviceId,
        userId: ctx.user.id,
        status: "active",
        expiresAt,
      });

      return { token, expiresAt };
    }),

  /**
   * Admin: List all registered kiosk devices.
   */
  listDevices: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) return [];
      return db.select().from(kioskDevices).orderBy(kioskDevices.createdAt);
    }),

  /**
   * Admin: Register a new kiosk device.
   */
  registerDevice: protectedProcedure
    .input(z.object({
      deviceId: z.string().min(1).max(64),
      label: z.string().optional(),
      kioskId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db
        .select()
        .from(kioskDevices)
        .where(eq(kioskDevices.deviceId, input.deviceId));

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A device with this ID is already registered.",
        });
      }

      await db.insert(kioskDevices).values({
        deviceId: input.deviceId,
        label: input.label ?? null,
        kioskId: input.kioskId ?? null,
        isActive: "true",
      });

      return { success: true };
    }),

  /**
   * Admin: Update a kiosk device (label, kioskId, active status).
   */
  updateDevice: protectedProcedure
    .input(z.object({
      id: z.number(),
      label: z.string().optional(),
      kioskId: z.string().optional(),
      isActive: z.enum(["true", "false"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updates: Record<string, unknown> = {};
      if (input.label !== undefined) updates.label = input.label;
      if (input.kioskId !== undefined) updates.kioskId = input.kioskId;
      if (input.isActive !== undefined) updates.isActive = input.isActive;

      await db
        .update(kioskDevices)
        .set(updates)
        .where(eq(kioskDevices.id, input.id));

      return { success: true };
    }),

  /**
   * Admin: Delete a kiosk device registration.
   */
  deleteDevice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(kioskDevices).where(eq(kioskDevices.id, input.id));
      return { success: true };
    }),
});

// ─── Plain HTTP Express Handlers ─────────────────────────────────────────────
// These are registered as raw Express routes because the machine sends plain
// HTTP requests, not tRPC-formatted requests.

/**
 * GET /weixin/login/xcx?token=<token>
 *
 * This is the machine's QR login polling endpoint.
 * The machine generates a random token, encodes it in a QR code, and then
 * polls this URL every second to check if the user has scanned and confirmed.
 *
 * Response format matches the Henan Lejia WeChat login protocol exactly:
 *   - Not yet confirmed: { code: 0, msg: "数据不存在", data: null }
 *   - Confirmed:         { code: 1, msg: "操作成功", data: { name, mobile, ... } }
 *
 * The machine firmware expects this exact URL path and response format.
 * Do NOT change the path or response shape.
 */
export async function handleKioskLoginPoll(req: any, res: any) {
  try {
    const token = req.query?.token as string | undefined;

    if (!token) {
      return res.json({ code: 0, msg: "数据不存在", data: null });
    }

    const db = await getDb();
    if (!db) return res.json({ code: 0, msg: "数据不存在", data: null });

    // Look for an active session with this token
    const [session] = await db
      .select()
      .from(kioskSessions)
      .where(and(
        eq(kioskSessions.token, token),
        eq(kioskSessions.status, "active"),
        gt(kioskSessions.expiresAt, new Date())
      ));

    if (!session) {
      // Token not yet confirmed or doesn't exist — machine keeps polling
      return res.json({ code: 0, msg: "数据不存在", data: null });
    }

    // Session is confirmed — fetch user info to return to the machine
    const { users } = await import("../../drizzle/schema");
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));

    if (!user) {
      return res.json({ code: 0, msg: "数据不存在", data: null });
    }

    // Return user data in the format the machine expects
    // The machine uses this to display the user's name on screen
    return res.json({
      code: 1,
      msg: "操作成功",
      data: {
        name: user.name ?? "Tech Care User",
        sex: user.gender === "female" ? "女" : user.gender === "male" ? "男" : "",
        mobile: user.email ?? "",
        idnumber: String(user.id),
        unionid: user.openId,
      },
    });
  } catch (err) {
    console.error("[KioskLoginPoll] Error:", err);
    return res.json({ code: 0, msg: "数据不存在", data: null });
  }
}

/**
 * POST /api/kiosk/data
 *
 * Receives health measurement data from the machine after a session completes.
 * The machine POSTs JSON containing the session token and all measured metrics.
 * This handler maps the machine's field names to our health_readings schema and saves them.
 *
 * Response format matches the Henan Lejia API Protocol:
 *   { code: "1", msg: "successful" }
 */
export async function handleKioskData(req: any, res: any) {
  try {
    const body = req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({ code: "0", msg: "Invalid request body" });
    }

    const parsed = KioskDataSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[KioskData] Schema validation failed:", parsed.error.flatten());
      return res.status(400).json({ code: "0", msg: "Invalid data format" });
    }

    const data = parsed.data;
    const sessionToken = data.sessionToken;
    const deviceId = data.deviceID;

    if (!sessionToken && !deviceId) {
      return res.status(400).json({ code: "0", msg: "sessionToken or deviceID required" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ code: "0", msg: "Database unavailable" });

    // ── Resolve userId from session token ──────────────────────────────────

    let userId: number | null = null;
    let resolvedKioskId: string | null = null;

    if (sessionToken) {
      const [session] = await db
        .select()
        .from(kioskSessions)
        .where(and(
          eq(kioskSessions.token, sessionToken),
          eq(kioskSessions.status, "active"),
          gt(kioskSessions.expiresAt, new Date())
        ));

      if (!session) {
        return res.status(401).json({ code: "0", msg: "Invalid or expired session token" });
      }

      userId = session.userId;

      // Mark session as used so it cannot be reused
      await db
        .update(kioskSessions)
        .set({ status: "used" })
        .where(eq(kioskSessions.id, session.id));
    }

    // Resolve kiosk location from device ID
    if (deviceId) {
      const [device] = await db
        .select()
        .from(kioskDevices)
        .where(eq(kioskDevices.deviceId, deviceId));

      if (device?.kioskId) resolvedKioskId = device.kioskId;

      // If no session token was provided, try to find the most recent active session
      // for this device as a fallback (useful if machine sends deviceID but not token)
      if (!userId) {
        const [latestSession] = await db
          .select()
          .from(kioskSessions)
          .where(and(
            eq(kioskSessions.deviceId, deviceId),
            eq(kioskSessions.status, "active"),
            gt(kioskSessions.expiresAt, new Date())
          ));

        if (latestSession) {
          userId = latestSession.userId;
          await db
            .update(kioskSessions)
            .set({ status: "used" })
            .where(eq(kioskSessions.id, latestSession.id));
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ code: "0", msg: "Could not identify user from session" });
    }

    // ── Map machine fields to health_readings schema ───────────────────────

    const hw = data.hw;
    const blood = data.blood;
    const spo2 = data.spo2;

    // Blood pressure: prefer left arm (high/low), fallback to right arm (rhigh/rlow)
    const systolic   = parseIntOrNull(blood?.high)  ?? parseIntOrNull(blood?.rhigh);
    const diastolic  = parseIntOrNull(blood?.low)   ?? parseIntOrNull(blood?.rlow);
    const heartRate  = parseIntOrNull(blood?.rate);
    const weight     = parseFloatOrNull(hw?.weight);
    const height     = parseFloatOrNull(hw?.height);
    const bmi        = parseFloatOrNull(hw?.bmi);
    const temperature = parseFloatOrNull(data.tiwen);

    // Collect extended metrics into the notes field
    const extraMetrics: string[] = [];
    const spO2 = parseFloatOrNull(spo2?.sp);
    if (spO2 !== null)                                   extraMetrics.push(`SpO2: ${spO2}%`);
    const bodyFatRate = parseFloatOrNull(data.fat?.zflv);
    if (bodyFatRate !== null)                            extraMetrics.push(`Body Fat: ${bodyFatRate}%`);
    const muscleRate = parseFloatOrNull(data.fat?.jrlv);
    if (muscleRate !== null)                             extraMetrics.push(`Muscle Rate: ${muscleRate}%`);
    const visceralFat = parseFloatOrNull(data.fat?.nzzf);
    if (visceralFat !== null)                            extraMetrics.push(`Visceral Fat Grade: ${visceralFat}`);
    const basalMetab = parseFloatOrNull(data.fat?.jcdx);
    if (basalMetab !== null)                             extraMetrics.push(`Basal Metabolism: ${basalMetab} kcal`);
    const bodyWaterRate = parseFloatOrNull(data.fat?.tsflv);
    if (bodyWaterRate !== null)                          extraMetrics.push(`Body Water Rate: ${bodyWaterRate}%`);
    const proteinRate = parseFloatOrNull(data.fat?.dbzlv);
    if (proteinRate !== null)                            extraMetrics.push(`Protein Rate: ${proteinRate}%`);
    const boneMass = parseFloatOrNull(data.fat?.gl);
    if (boneMass !== null)                               extraMetrics.push(`Bone Mass: ${boneMass} kg`);
    const bloodSugar = parseFloatOrNull(data.xt?.value);
    if (bloodSugar !== null)                             extraMetrics.push(`Blood Sugar: ${bloodSugar} mmol/L`);
    const uricAcid = parseFloatOrNull(data.ns);
    if (uricAcid !== null)                               extraMetrics.push(`Uric Acid: ${uricAcid} mmol/L`);
    const cholesterol = parseFloatOrNull(data.dgc);
    if (cholesterol !== null)                            extraMetrics.push(`Cholesterol: ${cholesterol} mmol/L`);
    const whr = parseFloatOrNull(data.ytb?.whr);
    if (whr !== null)                                    extraMetrics.push(`Waist-Hip Ratio: ${whr}`);
    const waist = parseFloatOrNull(data.ytb?.waist);
    if (waist !== null)                                  extraMetrics.push(`Waist: ${waist} cm`);
    const hip = parseFloatOrNull(data.ytb?.hip);
    if (hip !== null)                                    extraMetrics.push(`Hip: ${hip} cm`);
    const pef = parseFloatOrNull(data.fgn?.pef);
    if (pef !== null)                                    extraMetrics.push(`PEF: ${pef} L/min`);
    const fev1 = parseFloatOrNull(data.fgn?.fev1);
    if (fev1 !== null)                                   extraMetrics.push(`FEV1: ${fev1} L`);
    const fvc = parseFloatOrNull(data.fgn?.fvc);
    if (fvc !== null)                                    extraMetrics.push(`FVC: ${fvc} L`);
    if (data.examNo)                                     extraMetrics.push(`Exam No: ${data.examNo}`);
    if (deviceId)                                        extraMetrics.push(`Device: ${deviceId}`);

    const notes = extraMetrics.length > 0 ? extraMetrics.join(" | ") : null;

    // ── Insert health reading ──────────────────────────────────────────────

    await db.insert(healthReadings).values({
      userId,
      kioskId: resolvedKioskId ?? (deviceId ?? "unknown"),
      bloodPressureSystolic:  systolic    ?? undefined,
      bloodPressureDiastolic: diastolic   ?? undefined,
      heartRate:              heartRate   ?? undefined,
      weight:      weight      !== null ? String(weight)      : undefined,
      height:      height      !== null ? String(height)      : undefined,
      bmi:         bmi         !== null ? String(bmi)         : undefined,
      temperature: temperature !== null ? String(temperature) : undefined,
      notes:       notes       ?? undefined,
      recordedAt:  new Date(),
    });

    console.log(`[KioskData] Saved reading for userId=${userId}, device=${deviceId ?? "n/a"}`);
    return res.json({ code: "1", msg: "successful" });

  } catch (err) {
    console.error("[KioskData] Error processing kiosk data:", err);
    return res.status(500).json({ code: "0", msg: "Internal server error" });
  }
}
