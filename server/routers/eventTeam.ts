import crypto from "crypto";
import * as tracks from "../eventTracksDb";
import { hashApiKey } from "../lib/apiSecurity";
import {
  STAFF_COOKIE,
  STAFF_SESSION_TTL,
  readStaffToken,
  staffCookieOptions,
  createStaffCode,
  normalizeStaffCode,
  checkStaffLoginRate,
} from "../lib/eventStaffAuth";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure, superAdminProcedure } from "../_core/trpc";
import * as store from "../eventCareDb";
import { getEventReadingByRecordNo } from "../db";
import { normalizeSaudiMobilePhone } from "../lib/phone";
import { nursingCatalog } from "../../shared/eventNursing";
import { validateMeasurements } from "../../shared/eventCare";

const staffProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = readStaffToken(ctx.req);
  const authenticated = token
    ? await tracks.staffBySessionHash(hashApiKey(token))
    : undefined;
  const assignment = authenticated?.staff;
  if (!assignment?.trackId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "لا توجد لك صلاحية ضمن فريق الفعالية",
    });
  return next({
    ctx: {
      ...ctx,
      assignment: { ...assignment, trackId: assignment.trackId! },
      trackName: authenticated!.trackName,
    },
  });
});
async function sessionById(id: number, trackId: number) {
  const row = await store.findSession({ id }, trackId);
  if (!row || row.session.trackId !== trackId || row.session.consent !== "true")
    throw new TRPCError({ code: "NOT_FOUND", message: "الزيارة غير متاحة" });
  return row;
}
export const eventTeamRouter = router({
  me: staffProcedure.query(({ ctx }) => ({
    duty: ctx.assignment.duty,
    name: ctx.assignment.name,
    trackId: ctx.assignment.trackId,
    trackName: ctx.trackName,
  })),
  settings: superAdminProcedure.query(async () => ({
    ...(await store.readSettings()),
    staff: await tracks.listTeam(),
    tracks: await tracks.listTracks(),
  })),
  configure: superAdminProcedure
    .input(
      z.object({
        nursingEnabled: z.boolean(),
        testIds: z.array(z.string()).max(20),
      })
    )
    .mutation(async ({ input }) => {
      if (
        new Set(input.testIds).size !== input.testIds.length ||
        input.testIds.some(id => !nursingCatalog.some(t => t.id === id)) ||
        (input.nursingEnabled && !input.testIds.length)
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "اختر فحوصات صحيحة لمحطة التمريض",
        });
      await store.writeSettings(input.nursingEnabled, input.testIds);
      return { success: true };
    }),
  createTrack: superAdminProcedure
    .input(z.object({ name: z.string().trim().min(1).max(100) }))
    .mutation(({ input }) => tracks.createTrack(input.name)),
  editTrack: superAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().trim().min(1).max(100),
        active: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await tracks.changeTrack(input.id, input.name, input.active);
      return { success: true };
    }),
  createStaff: superAdminProcedure
    .input(
      z.object({
        trackId: z.number().int().positive(),
        name: z.string().trim().min(1).max(255),
        duty: z.enum(["nurse", "doctor"]),
      })
    )
    .mutation(async ({ input }) => {
      const code = createStaffCode();
      const created = await tracks.createStaff({
        ...input,
        codeHash: hashApiKey(normalizeStaffCode(code)),
      });
      return { id: created.id, code };
    }),
  rotateCode: superAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const code = createStaffCode();
      await tracks.changeStaff(input.id, {
        codeHash: hashApiKey(normalizeStaffCode(code)),
      });
      return { code };
    }),
  setStaffActive: superAdminProcedure
    .input(z.object({ id: z.number().int().positive(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      await tracks.changeStaff(input.id, { active: input.active });
      return { success: true };
    }),
  login: publicProcedure
    .input(z.object({ code: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      checkStaffLoginRate(
        ctx.req.ip ?? ctx.req.socket?.remoteAddress ?? "unknown"
      );
      const normalized = normalizeStaffCode(input.code);
      const row = /^LIM[0-9A-F]{24}$/.test(normalized)
        ? await tracks.staffByCodeHash(hashApiKey(normalized))
        : undefined;
      if (!row?.staff.trackId)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "الكود غير صحيح أو أوقفه الأدمن",
        });
      const token = crypto.randomBytes(32).toString("base64url");
      await tracks.createStaffSession(
        row.staff.id,
        row.staff.credentialVersion,
        hashApiKey(token),
        new Date(Date.now() + STAFF_SESSION_TTL)
      );
      const previous = readStaffToken(ctx.req);
      if (previous) await tracks.endStaffSession(hashApiKey(previous));
      ctx.res.cookie(STAFF_COOKIE, token, {
        ...staffCookieOptions(ctx.req),
        maxAge: STAFF_SESSION_TTL,
      });
      return { success: true };
    }),
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = readStaffToken(ctx.req);
    if (token) await tracks.endStaffSession(hashApiKey(token));
    ctx.res.clearCookie(STAFF_COOKIE, staffCookieOptions(ctx.req));
    return { success: true };
  }),
  lookup: staffProcedure
    .input(z.object({ query: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const normalized = input.query.replace(/[٠-٩]/g, d =>
        String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
      );
      const phone = normalizeSaudiMobilePhone(normalized);
      const row = await store.findSession(
        phone.ok ? { phone: phone.e164 } : { code: normalized },
        ctx.assignment.trackId
      );
      if (
        !row ||
        row.session.trackId !== ctx.assignment.trackId ||
        row.session.consent !== "true"
      )
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لا توجد زيارة بهذا الرقم أو الرمز في الفعالية",
        });
      // Identity only. No health record until the staff confirms the participant.
      return {
        id: row.session.id,
        code: row.session.code,
        name: row.session.displayName,
        age: row.session.age,
        sex: row.session.sex,
        phone: row.phone,
      };
    }),
  record: staffProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        confirmed: z.literal(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session } = await sessionById(
        input.sessionId,
        ctx.assignment.trackId
      );
      const care = await store.readCare(session.id);
      return {
        care,
        answers: session.answers,
        readings: session.latestRecordNo
          ? await getEventReadingByRecordNo(
              session.userId,
              session.latestRecordNo
            )
          : [],
      };
    }),
  saveNursing: staffProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        confirmed: z.literal(true),
        measurements: z.record(
          z.string().max(60),
          z.record(z.string().max(60), z.string().max(300))
        ),
        notes: z.string().trim().max(3000),
        finalize: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.assignment.duty !== "nurse")
        throw new TRPCError({ code: "FORBIDDEN", message: "للممرض فقط" });
      const { session } = await sessionById(
        input.sessionId,
        ctx.assignment.trackId
      );
      if (!session.latestRecordNo)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "بانتظار نتيجة جهاز تحليل الجسم",
        });
      const care = await store.readCare(session.id);
      if (!care.nursingEnabled)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "محطة التمريض غير مفعلة لهذه الزيارة",
        });
      const error = validateMeasurements(
        care.testIds,
        input.measurements,
        input.finalize
      );
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error });
      await store.updateCare(
        session.id,
        {
          measurements: input.measurements,
          nurseNotes: input.notes,
          nurseUserId: ctx.assignment.userId,
          nurseStaffId: ctx.assignment.id,
          nursingCompletedAt: input.finalize ? new Date() : null,
        },
        false,
        ctx.assignment.trackId
      );
      return { success: true };
    }),
  saveAdvice: staffProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        confirmed: z.literal(true),
        advice: z.string().trim().min(1).max(10000),
        finalize: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.assignment.duty !== "doctor")
        throw new TRPCError({ code: "FORBIDDEN", message: "للطبيب فقط" });
      const { session } = await sessionById(
        input.sessionId,
        ctx.assignment.trackId
      );
      if (!session.latestRecordNo)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "بانتظار نتيجة جهاز تحليل الجسم",
        });
      const care = await store.readCare(session.id);
      if (input.finalize && care.nursingEnabled && !care.nursingCompletedAt)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "أكمل محطة التمريض أولًا",
        });
      await store.updateCare(
        session.id,
        {
          advice: input.advice,
          doctorUserId: ctx.assignment.userId,
          doctorStaffId: ctx.assignment.id,
          doctorName: ctx.assignment.name ?? "الطبيب",
          approvedAt: input.finalize ? new Date() : null,
        },
        input.finalize,
        ctx.assignment.trackId
      );
      return { success: true };
    }),
});
