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

/**
 * Core logic for saving a kiosk measurement payload to the database.
 * Shared between the real machine HTTP handler and the test measurement tRPC procedure.
 */
async function saveKioskMeasurement(
  data: z.infer<typeof KioskDataSchema>,
  db: Awaited<ReturnType<typeof getDb>>
): Promise<{ success: boolean; userId: number | null }> {
  if (!db) return { success: false, userId: null };

  const sessionToken = data.sessionToken;
  const deviceId = data.deviceID;

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

    if (!session) return { success: false, userId: null };
    userId = session.userId;
    await db.update(kioskSessions).set({ status: "used" }).where(eq(kioskSessions.id, session.id));
  }

  if (deviceId) {
    const [device] = await db.select().from(kioskDevices).where(eq(kioskDevices.deviceId, deviceId));
    if (device?.kioskId) resolvedKioskId = device.kioskId;
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
        await db.update(kioskSessions).set({ status: "used" }).where(eq(kioskSessions.id, latestSession.id));
      }
    }
  }

  if (!userId) return { success: false, userId: null };

  const hw = data.hw;
  const blood = data.blood;
  const spo2 = data.spo2;

  const systolic   = parseIntOrNull(blood?.high)  ?? parseIntOrNull(blood?.rhigh);
  const diastolic  = parseIntOrNull(blood?.low)   ?? parseIntOrNull(blood?.rlow);
  const heartRate  = parseIntOrNull(blood?.rate);
  const weight     = parseFloatOrNull(hw?.weight);
  const height     = parseFloatOrNull(hw?.height);
  const bmi        = parseFloatOrNull(hw?.bmi);
  const temperature = parseFloatOrNull(data.tiwen);

  const extraMetrics: string[] = [];
  const spO2val = parseFloatOrNull(spo2?.sp);
  if (spO2val !== null)                                   extraMetrics.push(`SpO2: ${spO2val}%`);
  const bodyFatRate = parseFloatOrNull(data.fat?.zflv);
  if (bodyFatRate !== null)                               extraMetrics.push(`Body Fat: ${bodyFatRate}%`);
  const muscleRate = parseFloatOrNull(data.fat?.jrlv);
  if (muscleRate !== null)                                extraMetrics.push(`Muscle Rate: ${muscleRate}%`);
  const visceralFat = parseFloatOrNull(data.fat?.nzzf);
  if (visceralFat !== null)                               extraMetrics.push(`Visceral Fat Grade: ${visceralFat}`);
  const basalMetab = parseFloatOrNull(data.fat?.jcdx);
  if (basalMetab !== null)                                extraMetrics.push(`Basal Metabolism: ${basalMetab} kcal`);
  const bodyWaterRate = parseFloatOrNull(data.fat?.tsflv);
  if (bodyWaterRate !== null)                             extraMetrics.push(`Body Water Rate: ${bodyWaterRate}%`);
  const proteinRate = parseFloatOrNull(data.fat?.dbzlv);
  if (proteinRate !== null)                               extraMetrics.push(`Protein Rate: ${proteinRate}%`);
  const boneMass = parseFloatOrNull(data.fat?.gl);
  if (boneMass !== null)                                  extraMetrics.push(`Bone Mass: ${boneMass} kg`);
  const bloodSugar = parseFloatOrNull(data.xt?.value);
  if (bloodSugar !== null)                                extraMetrics.push(`Blood Sugar: ${bloodSugar} mmol/L`);
  const uricAcid = parseFloatOrNull(data.ns);
  if (uricAcid !== null)                                  extraMetrics.push(`Uric Acid: ${uricAcid} mmol/L`);
  const cholesterol = parseFloatOrNull(data.dgc);
  if (cholesterol !== null)                               extraMetrics.push(`Cholesterol: ${cholesterol} mmol/L`);
  const whr = parseFloatOrNull(data.ytb?.whr);
  if (whr !== null)                                       extraMetrics.push(`Waist-Hip Ratio: ${whr}`);
  const waist = parseFloatOrNull(data.ytb?.waist);
  if (waist !== null)                                     extraMetrics.push(`Waist: ${waist} cm`);
  const hip = parseFloatOrNull(data.ytb?.hip);
  if (hip !== null)                                       extraMetrics.push(`Hip: ${hip} cm`);
  const pef = parseFloatOrNull(data.fgn?.pef);
  if (pef !== null)                                       extraMetrics.push(`PEF: ${pef} L/min`);
  const fev1 = parseFloatOrNull(data.fgn?.fev1);
  if (fev1 !== null)                                      extraMetrics.push(`FEV1: ${fev1} L`);
  const fvc = parseFloatOrNull(data.fgn?.fvc);
  if (fvc !== null)                                       extraMetrics.push(`FVC: ${fvc} L`);
  if (data.examNo)                                        extraMetrics.push(`Exam No: ${data.examNo}`);
  if (deviceId)                                           extraMetrics.push(`Device: ${deviceId}`);

  const notes = extraMetrics.length > 0 ? extraMetrics.join(" | ") : null;

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

  return { success: true, userId };
}

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
   * TWO-SCAN FLOW — Step 1a (Phone → App):
   * Generates a short-lived login token for the user to display as a QR on their phone.
   * The machine scans this QR and calls claimUserQR to get the user identity.
   */
  generateUserQR: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const token = crypto.randomBytes(8).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await db.insert(kioskSessions).values({ token, deviceId: "PHONE_QR", userId: ctx.user.id, status: "active", expiresAt });
      return { token, expiresAt };
    }),

  /**
   * TWO-SCAN FLOW — Step 1b (Machine → Server):
   * Machine calls this after scanning the phone QR. Returns user identity.
   */
  claimUserQR: publicProcedure
    .input(z.object({ token: z.string().min(1), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [session] = await db.select().from(kioskSessions).where(and(eq(kioskSessions.token, input.token), eq(kioskSessions.status, "active"), gt(kioskSessions.expiresAt, new Date())));
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Token not found or expired." });
      if (input.deviceId) await db.update(kioskSessions).set({ deviceId: input.deviceId }).where(eq(kioskSessions.id, session.id));
      const { users } = await import("../../drizzle/schema");
      const [user] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, session.userId));
      return { success: true, user: user ?? null, sessionToken: session.token };
    }),

  /**
   * TWO-SCAN FLOW — Step 3a (Simulator → Server after measurements):
   * Stores measurement results under a results token. Machine displays QR with this token.
   */
  storeResults: publicProcedure
    .input(z.object({
      sessionToken: z.string().min(1),
      metrics: z.object({
        height: z.number().optional(), weight: z.number().optional(), bmi: z.number().optional(),
        systolic: z.number().optional(), diastolic: z.number().optional(), heartRate: z.number().optional(),
        temperature: z.number().optional(), spO2: z.number().optional(),
        bodyFatRate: z.number().optional(), muscleRate: z.number().optional(), bloodSugar: z.number().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
     const db = await getDb();
     if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Look up the session by token regardless of status — it may already be "used" because
      // saveKioskMeasurement consumes it. We only need the userId and deviceId.
      const [session] = await db.select().from(kioskSessions).where(eq(kioskSessions.token, input.sessionToken));
      if (!session || !session.userId) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      const resultsToken = crypto.randomBytes(8).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await db.insert(kioskSessions).values({ token: `results:${resultsToken}`, deviceId: session.deviceId, userId: session.userId, status: "pending", expiresAt });
      const m = input.metrics;
      await db.insert(healthReadings).values({
        userId: session.userId,
        kioskId: `RESULTS_PENDING:${resultsToken}`,
        bloodPressureSystolic: m.systolic ?? undefined,
        bloodPressureDiastolic: m.diastolic ?? undefined,
        heartRate: m.heartRate ?? undefined,
        weight: m.weight !== undefined ? String(m.weight) : undefined,
        height: m.height !== undefined ? String(m.height) : undefined,
        bmi: m.bmi !== undefined ? String(m.bmi) : undefined,
        temperature: m.temperature !== undefined ? String(m.temperature) : undefined,
        notes: [m.spO2 !== undefined ? `SpO2: ${m.spO2}%` : null, m.bodyFatRate !== undefined ? `Body Fat: ${m.bodyFatRate}%` : null, m.muscleRate !== undefined ? `Muscle Rate: ${m.muscleRate}%` : null, m.bloodSugar !== undefined ? `Blood Sugar: ${m.bloodSugar} mmol/L` : null].filter(Boolean).join(" | ") || undefined,
        recordedAt: new Date(),
      });
      return { resultsToken };
    }),

  /**
   * TWO-SCAN FLOW — Step 3b (Phone → Server after scanning machine QR):
   * Phone calls this with the results token. Marks reading as claimed, returns data.
   */
  claimResults: protectedProcedure
    .input(z.object({ resultsToken: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { healthReadings: hr } = await import("../../drizzle/schema");
      const [reading] = await db.select().from(hr).where(eq(hr.kioskId, `RESULTS_PENDING:${input.resultsToken}`));
      if (!reading) throw new TRPCError({ code: "NOT_FOUND", message: "Results not found or already claimed." });
      if (reading.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "These results belong to a different account." });
      await db.update(hr).set({ kioskId: "KIOSK_DEVICE" }).where(eq(hr.id, reading.id));
      await db.update(kioskSessions).set({ status: "used" }).where(eq(kioskSessions.token, `results:${input.resultsToken}`));
      return { success: true, reading: { id: reading.id, bloodPressureSystolic: reading.bloodPressureSystolic, bloodPressureDiastolic: reading.bloodPressureDiastolic, heartRate: reading.heartRate, weight: reading.weight, height: reading.height, bmi: reading.bmi, temperature: reading.temperature, notes: reading.notes, recordedAt: reading.recordedAt } };
    }),

  /**
   * LEGACY — Called by the Tech Care app after the user scans the machine's QR code.
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
   * Send a simulated machine measurement for the current user.
   * Generates realistic fake health data and posts it directly to the data-upload handler,
   * exactly as a real TRIPLEBIGHT machine would. Useful for testing the full flow without hardware.
   */
  sendTestMeasurement: protectedProcedure
    .input(z.object({
      /** Optional: provide a confirmed session token to use. If omitted, a fresh one is created. */
      sessionToken: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // If no token provided, create a fresh active session for this user
      let token = input.sessionToken;
      if (!token) {
        token = crypto.randomBytes(16).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await db.insert(kioskSessions).values({
          token,
          deviceId: "TEST_DEVICE",
          userId: ctx.user.id,
          status: "active",
          expiresAt,
        });
      }

      // Generate realistic randomised health metrics within normal ranges
      const systolic  = Math.floor(Math.random() * 30 + 110);  // 110–140 mmHg
      const diastolic = Math.floor(Math.random() * 20 + 65);   // 65–85 mmHg
      const heartRate = Math.floor(Math.random() * 30 + 60);   // 60–90 bpm
      const weight    = (Math.random() * 40 + 55).toFixed(1);  // 55–95 kg
      const height    = (Math.random() * 30 + 155).toFixed(1); // 155–185 cm
      const bmi       = (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1);
      const temp      = (Math.random() * 1.5 + 36.0).toFixed(1); // 36.0–37.5 °C
      const spO2      = Math.floor(Math.random() * 4 + 96);    // 96–100%
      const bodyFat   = (Math.random() * 15 + 15).toFixed(1);  // 15–30%
      const muscle    = (Math.random() * 15 + 35).toFixed(1);  // 35–50%
      const bloodSugar = (Math.random() * 2.5 + 4.0).toFixed(1); // 4.0–6.5 mmol/L

      // Build the exact payload the machine would send
      const machinePayload = {
        sessionToken: token,
        deviceID: "TEST_DEVICE",
        examNo: `TEST-${Date.now()}`,
        hw: {
          height: String(height),
          weight: String(weight),
          bmi: String(bmi),
        },
        blood: {
          high: String(systolic),
          low: String(diastolic),
          rate: String(heartRate),
        },
        spo2: { sp: String(spO2) },
        tiwen: String(temp),
        fat: {
          zflv: String(bodyFat),
          jrlv: String(muscle),
          nzzf: String(Math.floor(Math.random() * 5 + 5)),
          jcdx: String(Math.floor(Math.random() * 400 + 1400)),
          tsflv: String((Math.random() * 10 + 50).toFixed(1)),
          dbzlv: String((Math.random() * 5 + 15).toFixed(1)),
          gl: String((Math.random() * 1 + 2.5).toFixed(1)),
        },
        xt: { value: String(bloodSugar) },
        ytb: {
          waist: String((Math.random() * 20 + 70).toFixed(1)),
          hip: String((Math.random() * 15 + 85).toFixed(1)),
          whr: String((Math.random() * 0.15 + 0.75).toFixed(2)),
        },
      };

      // Parse and save via the shared core logic (same path as the real machine)
      const parsed = KioskDataSchema.safeParse(machinePayload);
      if (!parsed.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to build test payload" });
      }

      const result = await saveKioskMeasurement(parsed.data, db);
      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save test measurement — session may have expired",
        });
      }

      return {
        success: true,
        metrics: {
          height: parseFloat(height),
          weight: parseFloat(weight),
          bmi: parseFloat(bmi),
          systolic,
          diastolic,
          heartRate,
          temperature: parseFloat(temp),
          spO2,
          bodyFatRate: parseFloat(bodyFat),
          muscleRate: parseFloat(muscle),
          bloodSugar: parseFloat(bloodSugar),
        },
      };
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
   * Machine Simulator: Generate a fresh pending session token (simulates what the machine does
   * when the user touches the screen). Returns the token and the QR URL to display.
   * The token starts as "pending" — it becomes "active" once the user scans and confirms.
   */
  generateMachineToken: protectedProcedure
    .input(z.object({
      deviceId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const token = crypto.randomBytes(8).toString("hex"); // short, like the protocol example
      const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds, as per protocol

      await db.insert(kioskSessions).values({
        token,
        deviceId: input.deviceId ?? "SIMULATOR",
        userId: 0, // placeholder — will be set when user confirms
        status: "pending",
        expiresAt,
      });

      return { token, expiresAt };
    }),

  /**
   * Machine Simulator: Poll whether a token has been claimed by a user.
   * Mirrors what the machine does by calling GET /weixin/login/xcx?token=...
   * Returns the user info if confirmed, or null if still pending/expired.
   */
  pollSessionStatus: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { confirmed: false, user: null };

      const [session] = await db
        .select()
        .from(kioskSessions)
        .where(eq(kioskSessions.token, input.token));

      if (!session) return { confirmed: false, user: null, expired: true };
      if (new Date() > session.expiresAt) return { confirmed: false, user: null, expired: true };
      if (session.status !== "active" || !session.userId || session.userId === 0) {
        return { confirmed: false, user: null, expired: false };
      }

      const { users } = await import("../../drizzle/schema");
      const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, session.userId));

      return {
        confirmed: true,
        expired: false,
        user: user ?? null,
      };
    }),

  /**
   * Guest Mode: Generate realistic health metrics without saving to the database.
   * Used by the machine simulator when a user chooses to measure without an account.
   * Results are only shown on-screen and can be printed — never persisted.
   */
  guestMeasurement: protectedProcedure
    .mutation(async () => {
      // Generate realistic randomised health metrics — same ranges as sendTestMeasurement
      const systolic  = Math.floor(Math.random() * 30 + 110);
      const diastolic = Math.floor(Math.random() * 20 + 65);
      const heartRate = Math.floor(Math.random() * 30 + 60);
      const weight    = parseFloat((Math.random() * 40 + 55).toFixed(1));
      const height    = parseFloat((Math.random() * 30 + 155).toFixed(1));
      const bmi       = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
      const temp      = parseFloat((Math.random() * 1.5 + 36.0).toFixed(1));
      const spO2      = Math.floor(Math.random() * 4 + 96);
      const bodyFat   = parseFloat((Math.random() * 15 + 15).toFixed(1));
      const muscle    = parseFloat((Math.random() * 15 + 35).toFixed(1));
      const bloodSugar = parseFloat((Math.random() * 2.5 + 4.0).toFixed(1));

      // Nothing is saved to the database — caller is responsible for display/print only
      return {
        metrics: { height, weight, bmi, systolic, diastolic, heartRate, temperature: temp, spO2, bodyFatRate: bodyFat, muscleRate: muscle, bloodSugar },
      };
    }),

  /**
   * Admin: List all registered kiosk devices (full details).
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
   * Any authenticated user: List active kiosk devices for device-selection UI.
   * Returns only id, deviceId, label, kioskId for display purposes.
   */
  listActiveDevices: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: kioskDevices.id,
          deviceId: kioskDevices.deviceId,
          label: kioskDevices.label,
          kioskId: kioskDevices.kioskId,
        })
        .from(kioskDevices)
        .where(eq(kioskDevices.isActive, "true"))
        .orderBy(kioskDevices.label);
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

    if (!data.sessionToken && !data.deviceID) {
      return res.status(400).json({ code: "0", msg: "sessionToken or deviceID required" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ code: "0", msg: "Database unavailable" });

    const result = await saveKioskMeasurement(data, db);

    if (!result.success) {
      return res.status(401).json({ code: "0", msg: "Invalid or expired session token" });
    }

    console.log(`[KioskData] Saved reading for userId=${result.userId}, device=${data.deviceID ?? "n/a"}`);
    return res.json({ code: "1", msg: "successful" });

  } catch (err) {
    console.error("[KioskData] Error processing kiosk data:", err);
    return res.status(500).json({ code: "0", msg: "Internal server error" });
  }
}
