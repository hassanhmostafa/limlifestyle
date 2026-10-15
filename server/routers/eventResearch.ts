import crypto from "node:crypto";
import { parse } from "cookie";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, superAdminProcedure } from "../_core/trpc";
import {
  staffCookieOptions,
  checkStaffLoginRate,
  createStaffCode,
  normalizeStaffCode,
  STAFF_SESSION_TTL,
} from "../lib/eventStaffAuth";
import { hashApiKey } from "../lib/apiSecurity";
import * as store from "../eventResearchDb";
import { readArchivedReportSnapshot, retryArchivedReportSnapshot } from "../eventReportArchive";
import { buildResearchWorkbook, buildResearchWorkbookZip } from "../eventResearchWorkbook";
const COOKIE = "lim_event_research";
const readToken = (headers: { cookie?: string }) => {
  const t = parse(headers.cookie ?? "")[COOKIE];
  return t && /^[A-Za-z0-9_-]{43}$/.test(t) ? t : null;
};
const researcherProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = readToken(ctx.req.headers);
  const r = token
    ? await store.researcherBySession(hashApiKey(token))
    : undefined;
  if (!r)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "سجّل الدخول بحساب الباحث المصرح له",
    });
  return next({ ctx: { ...ctx, researcher: r } });
});
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9._-]{3,80}$/,
    "اسم المستخدم: 3–80 حرفًا إنجليزيًا أو رقمًا أو . أو _ أو -"
  );
const assignment = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(255),
  username,
  active: z.boolean(),
  allEvents: z.boolean(),
  includeIdentity: z.literal(false, {
    error: "بيانات الباحثين منزوعة الهوية حتى تُسجل موافقة بحثية مستقلة",
  }),
  reportArchiveAccess: z.boolean().default(false),
  eventCodes: z
    .array(z.string().min(1).max(64))
    .max(500)
    .refine(v => new Set(v).size === v.length, "لا تكرر الفعاليات"),
});
export const eventResearchRouter = router({
  adminList: superAdminProcedure.query(async () => ({
    researchers: await store.listResearchers(),
    events: await store.researchEvents(),
  })),
  save: superAdminProcedure
    .input(assignment)
    .mutation(async ({ ctx, input }) => {
      const code = input.id ? undefined : createStaffCode();
      const saved = await store.saveResearcher(
        input,
        code ? hashApiKey(normalizeStaffCode(code)) : undefined,
        ctx.user.id
      );
      return { ...saved, code };
    }),
  rotate: superAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const code = createStaffCode();
      await store.rotateResearchCode(
        input.id,
        hashApiKey(normalizeStaffCode(code)),
        ctx.user.id
      );
      return { code };
    }),
  login: publicProcedure
    .input(z.object({ username, code: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      checkStaffLoginRate(
        "research:" + (ctx.req.ip ?? ctx.req.socket?.remoteAddress ?? "unknown")
      );
      const normalized = normalizeStaffCode(input.code);
      const r = /^LIM[0-9A-F]{24}$/.test(normalized)
        ? await store.researcherByCredential(
            input.username,
            hashApiKey(normalized)
          )
        : undefined;
      if (!r)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "اسم المستخدم أو الكود غير صحيح أو الحساب موقوف",
        });
      const token = crypto.randomBytes(32).toString("base64url");
      await store.createResearchSession(
        r,
        hashApiKey(token),
        new Date(Date.now() + STAFF_SESSION_TTL)
      );
      const old = readToken(ctx.req.headers);
      if (old) await store.endResearchSession(hashApiKey(old));
      ctx.res.cookie(COOKIE, token, {
        ...staffCookieOptions(ctx.req),
        maxAge: STAFF_SESSION_TTL,
      });
      return { success: true };
    }),
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = readToken(ctx.req.headers);
    if (token) await store.endResearchSession(hashApiKey(token));
    ctx.res.clearCookie(COOKIE, staffCookieOptions(ctx.req));
    return { success: true };
  }),
  me: researcherProcedure.query(async ({ ctx }) => ({
    name: ctx.researcher.name,
    username: ctx.researcher.username,
    includeIdentity: false,
    reportArchiveAccess: ctx.researcher.reportArchiveAccess === 1,
    events: await store.allowedResearchEvents(ctx.researcher),
  })),
  data: researcherProcedure
    .input(
      z.object({
        eventCode: z.string().min(1).max(64),
        after: z.number().int().nonnegative().default(0),
        limit: z.number().int().min(1).max(50).default(25),
        purpose: z.enum(["view", "export"]).default("view"),
        from: z.string().date().optional(), to: z.string().date().optional(),
        code: z.string().trim().max(64).optional(), identity: z.string().trim().max(100).optional(),
      })
    )
    .query(({ ctx, input }) =>
      store.researchPage(
        ctx.researcher,
        input.eventCode,
        input.after,
        input.limit,
        input.purpose, { from: input.from, to: input.to, code: input.code, identity: input.identity }
      )
    ),
  archives: researcherProcedure
    .input(
      z.object({
        eventCode: z.string().min(1).max(64),
        after: z.number().int().nonnegative().default(0),
        limit: z.number().int().min(1).max(50).default(25),
      })
    )
    .query(({ ctx, input }) =>
      store.reportArchivePage(ctx.researcher, input.eventCode, input.after, input.limit)
    ),
  archiveSnapshot: researcherProcedure
    .input(z.object({ archiveId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const archive = await store.authorizeReportArchive(ctx.researcher, input.archiveId);
      const archived = await readArchivedReportSnapshot(archive.archiveId);
      if (!archived)
        throw new TRPCError({ code: "NOT_FOUND", message: "نسخة التقرير غير متاحة" });
      await store.auditReportArchiveAccess(ctx.researcher, archive.eventCode, "archive_snapshot");
      return { archive: archived.archive, snapshot: archived.snapshot };
    }),
  retryArchiveStorage: researcherProcedure
    .input(z.object({ archiveId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const archive = await store.authorizeReportArchive(ctx.researcher, input.archiveId);
      const retried = await retryArchivedReportSnapshot(archive.archiveId);
      await store.auditReportArchiveAccess(ctx.researcher, archive.eventCode, "archive_snapshot");
      return { archive: retried };
    }),
  exportXlsx: researcherProcedure
    .input(z.object({
      eventCodes: z.array(z.string().min(1).max(64)).min(1).max(50),
      latestPerParticipant: z.boolean().default(false),
    }).refine(input => new Set(input.eventCodes).size === input.eventCodes.length, "لا تكرر الفعاليات"))
    .mutation(async ({ ctx, input }) => {
      const records = await store.researchExport(
        ctx.researcher,
        input.eventCodes,
        input.latestPerParticipant
      );
      const workbook = buildResearchWorkbook(records);
      return {
        filename: `lim-research-${new Date().toISOString().slice(0, 10)}.xlsx`,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        base64: workbook.toString("base64"),
        rowCount: records.length,
      };
    }),
  exportXlsxZip: researcherProcedure
    .input(z.object({
      eventCodes: z.array(z.string().min(1).max(64)).min(1).max(50),
      latestPerParticipant: z.boolean().default(false),
    }).refine(input => new Set(input.eventCodes).size === input.eventCodes.length, "لا تكرر الفعاليات"))
    .mutation(async ({ ctx, input }) => {
      const records = await store.researchExport(ctx.researcher, input.eventCodes, input.latestPerParticipant);
      const archive = await buildResearchWorkbookZip(records, input.eventCodes);
      return {
        filename: `lim-research-by-event-${new Date().toISOString().slice(0, 10)}.zip`,
        mimeType: "application/zip",
        base64: archive.toString("base64"),
        rowCount: records.length,
      };
    }),
});
