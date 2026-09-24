import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { sdk } from "../_core/sdk";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { normalizeSaudiMobilePhone } from "../lib/phone";

const BCRYPT_ROUNDS = 10;

function phoneOpenId(phone: string) {
  return `phone:${phone}`;
}

function normalizeInputPhone(phone: string) {
  const normalized = normalizeSaudiMobilePhone(phone);
  if (!normalized.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enter a valid Saudi mobile number, for example 05XXXXXXXX.",
    });
  }
  return normalized.e164;
}

function signInUser(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: any }, user: { openId: string; name: string | null }) {
  return sdk.createSessionToken(user.openId, {
    name: user.name || "LIM User",
    expiresInMs: ONE_YEAR_MS,
  }).then((sessionToken) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  });
}

/**
 * Phone + password authentication. SMS OTP can replace the password check later
 * without changing the canonical phone number or session format.
 */
export const phoneAuthRouter = router({
  register: publicProcedure
    .input(z.object({
      name: z.string().trim().min(1, "Name is required").max(255),
      phone: z.string().min(1, "Phone number is required"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    }))
    .mutation(async ({ input, ctx }) => {
      const phone = normalizeInputPhone(input.phone);
      const existing = await db.getUserByPhone(phone);
      if (existing) {
        if (existing.loginMethod === "machine_phone_pending") {
          const activated = await db.activateMachinePhoneUser(existing.id, {
            name: input.name,
            passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
          });
          if (!activated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to activate the machine-created account." });
          await signInUser(ctx, activated);
          return { success: true, activatedExistingAccount: true, user: { id: activated.id, name: activated.name, phone: activated.phone, role: activated.role } };
        }
        throw new TRPCError({ code: "CONFLICT", message: "An account with this phone number already exists." });
      }

      const user = await db.createPhoneUser({
        openId: phoneOpenId(phone),
        name: input.name,
        phone,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      });
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account." });

      await signInUser(ctx, user);
      return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
    }),

  login: publicProcedure
    .input(z.object({
      phone: z.string().min(1, "Phone number is required"),
      password: z.string().min(1, "Password is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const phone = normalizeInputPhone(input.phone);
      const user = await db.getUserByPhone(phone);
      if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid phone number or password." });
      }

      await signInUser(ctx, user);
      return { success: true, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
    }),

  /** Lets an existing LIM/OAuth account enable the new phone-password sign-in. */
  setCredentials: protectedProcedure
    .input(z.object({
      phone: z.string().min(1, "Phone number is required"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    }))
    .mutation(async ({ input, ctx }) => {
      const phone = normalizeInputPhone(input.phone);
      const existing = await db.getUserByPhone(phone);
      if (existing && existing.id !== ctx.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This phone number is already linked to another account." });
      }

      const user = await db.updateUserPhoneCredentials(ctx.user.id, {
        phone,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      });
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update phone credentials." });

      return { success: true, user: { id: user.id, name: user.name, phone: user.phone } };
    }),
});
