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

## Machine Integration (New Features — continued)
- [x] createTestSession tRPC procedure — generates a real session token for testing without a physical machine
- [x] KioskLogin no-token screen redesigned as Test Mode — shows how-it-works steps + Start Test Session button
- [x] sendTestMeasurement tRPC procedure — POSTs realistic randomised health data through the exact same /api/kiosk/data endpoint the real machine uses
- [x] KioskLogin success screen updated with amber Test Mode panel — shows Send Test Measurement button and displays the sent metrics inline

## Pending / Future
- [ ] Configure machine to point to new Manus Space URL (requires physical access to machine settings)
- [ ] Test end-to-end QR login flow with actual TRIPLEBIGHT hardware
- [ ] Add push notifications for new health readings
- [ ] Add Arabic language support for AI-generated plans

## Kiosk Owner Role Refactor (Completed)
- [x] Remove MyKiosks.tsx page and its route from App.tsx
- [x] Remove kioskOwner and kioskRequests routers from server/routers.ts
- [x] Remove "My Kiosks" nav links from Navigation.tsx (desktop and mobile)
- [x] Remove legacy admin procedures: assignKioskOwner, listKioskRequests, pendingRequestCount, approveKioskRequest, rejectKioskRequest from admin.ts
- [x] Remove legacy imports from admin.ts: getAllKioskRequests, countPendingKioskRequests, updateKioskRequestStatus
- [x] Delete legacy files: MyKiosks.tsx, KioskRequests.tsx, server/routers/kioskOwner.ts, server/routers/kioskRequests.ts
- [x] Remove legacy db.ts helpers: getKiosksByOwnerId, createKioskRequest, getAllKioskRequests, getUserKioskRequests, countPendingKioskRequests, updateKioskRequestStatus
- [x] Remove assignKioskOwner mutation, state, and dialog from Admin.tsx
- [x] Add listActiveDevices tRPC procedure (accessible to all authenticated users — returns active devices for device picker)
- [x] Refactor KioskLogin no-token screen: replaced QR-only instructions + Start Test Session button with a device-selection dropdown (calls listActiveDevices) + Connect to Machine button (calls createSession)
- [x] Apply DB migration: added latitude/longitude columns to kiosks, created kiosk_devices and kiosk_sessions tables, updated users role enum and added adminType/specialty/bio/gender columns
- [x] TypeScript check: 0 errors

## KioskLogin QR + Manual Entry Redesign
- [x] Seed demo kiosk devices into the database (linked to existing kiosk locations)
- [x] Redesign KioskLogin no-token screen: QR scan option + manual device ID entry option
- [x] Install html5-qrcode for in-browser QR scanning
- [x] On scan/submit, call createSession(deviceId) and redirect to /kiosk-login?token=...
- [x] TypeScript check, commit, checkpoint

## Machine Simulator (QR Login Test)
- [x] Add server procedure: generateMachineToken (creates a kiosk_session with a random token, returns token + QR URL)
- [x] Add server procedure: pollSessionStatus (checks if a token has been claimed by a user, returns user info)
- [x] Build MachineSimulator.tsx page: shows QR code, polls every second, shows confirmed user when scanned
- [x] Add route /machine-simulator and link from Admin panel
- [x] TypeScript check, commit, checkpoint

## Machine Simulator — Guest Mode
- [x] Add guestMeasurement tRPC procedure: generates realistic randomised metrics without saving to DB
- [x] Add "Measure Without Account" button to MachineSimulator idle screen
- [x] Guest mode confirmed state: show metrics inline + Print Receipt button only (no user identity, no DB save)
- [x] TypeScript check, commit, checkpoint
