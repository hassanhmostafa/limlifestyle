# Tech Care v2 — Project TODO

## Migration (Completed)
- [x] Initialize new Manus Space project (tech-care-v2) with db, server, user features
- [x] Install extra dependencies: bcryptjs, html2canvas, jspdf, jspdf-autotable, vite-plugin-pwa
- [x] Run full database schema migration (12 tables: users, kiosks, health_readings, ai_plans, bookings, kiosk_requests, expert_requests, conversations, messages, kiosk_devices, kiosk_sessions)
- [x] Copy full drizzle/schema.ts and drizzle/relations.ts from source
- [x] Copy all server-side routers (kiosks, admin, health, profile, aiPlans, kioskOwner, bookings, kioskRequests, expertRequests, chat, emailAuth, kioskIntegration)
- [x] Copy server/db.ts with all query helpers
- [x] Copy seed data files (seed.ts for Saudi Arabia kiosk locations, seedHealth.ts for demo readings)
- [x] Copy server/_core/trpc.ts with all procedure types (publicProcedure, protectedProcedure, adminProcedure, kioskAdminProcedure, expertAdminProcedure, superAdminProcedure, expertProcedure)
- [x] Register machine-facing HTTP endpoints: GET /weixin/login/xcx and POST /api/kiosk/data
- [x] Register seeding logic in server/_core/index.ts (kiosks, health readings, owner profile)
- [x] Copy all shared utilities: bmi.ts, healthScore.ts, types.ts, const.ts, errors.ts
- [x] Copy all frontend contexts: LanguageContext (Arabic/English bilingual), ThemeContext
- [x] Copy all frontend pages: Home, FindStation, StationDetail, HealthDashboard, Profile, AiPlan, MyKiosks, MyBookings, FindExperts, ExpertInbox, ExpertRegistration, Login, Admin, KioskLogin, NotFound
- [x] Copy all frontend components: Navigation, Footer, KioskMap, KioskDevicesTab, KioskTestTab, PWAInstallPrompt, TimeSelect, UserSearchCombobox
- [x] Copy lib utilities: kiosks.ts, pdfExport.ts, trpc.ts, utils.ts
- [x] Copy App.tsx with full routing (all 15 routes)
- [x] Copy main.tsx with all providers
- [x] Copy index.css with full cyan/teal design system and RTL support
- [x] Copy client/index.html with PWA meta tags
- [x] Copy vite.config.ts with PWA plugin configuration
- [x] Full production build passes with zero TypeScript errors

## Machine Integration (New Features)
- [x] GET /weixin/login/xcx — QR login polling endpoint (Henan Lejia firmware protocol)
- [x] POST /api/kiosk/data — Health data upload endpoint (receives all machine metrics)
- [x] KioskLogin page at /kiosk-login — QR scan landing page for users to confirm identity
- [x] kioskSessions table with 'pending' status for machine-initiated tokens

## Pending / Future
- [ ] Configure machine to point to new Manus Space URL (requires physical access to machine settings)
- [ ] Test end-to-end QR login flow with actual TRIPLEBIGHT hardware
- [ ] Add push notifications for new health readings
- [ ] Add Arabic language support for AI-generated plans
