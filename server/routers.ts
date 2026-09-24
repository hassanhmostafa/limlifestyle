import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { kiosksRouter } from "./routers/kiosks";
import { adminRouter } from "./routers/admin";
import { healthRouter } from "./routers/health";
import { profileRouter } from "./routers/profile";
import { aiPlansRouter } from "./routers/aiPlans";
import { bookingsRouter } from "./routers/bookings";
import { expertRequestsRouter } from "./routers/expertRequests";
import { chatRouter } from "./routers/chat";
import { emailAuthRouter } from "./routers/emailAuth";
import { phoneAuthRouter } from "./routers/phoneAuth";
import { kioskIntegrationRouter } from "./routers/kioskIntegration";

export const appRouter = router({
  system: systemRouter,
  kiosks: kiosksRouter,
  admin: adminRouter,
  health: healthRouter,
  profile: profileRouter,
  aiPlans: aiPlansRouter,
  bookings: bookingsRouter,
  expertRequests: expertRequestsRouter,
  chat: chatRouter,
  emailAuth: emailAuthRouter,
  phoneAuth: phoneAuthRouter,
  kioskIntegration: kioskIntegrationRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
