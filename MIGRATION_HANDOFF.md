# MIGRATION_HANDOFF — LIM Lifestyle (tech-care-v2)

Purpose: everything needed to re-create this project under a different Manus account: code, database, private storage, secrets, integrations, and the custom domain. Written from the repository at tag `migration-20261113` (commit at time of writing: `b4b8c35` on `main`).

No secret values are recorded here — names and handling rules only.

---

## 1. What this is

| Item | Value |
|---|---|
| Product | LIM Lifestyle — health kiosk locator + wellness tracking + event ("فعالية ليم") participant flows for Saudi Arabia |
| Manus preview/published host | `techcarev2-zgcnaa4a.manus.space` |
| Custom domain | `limlifestyle.com` (+ `www`), DNS managed at the registrar |
| Repo | `https://github.com/hassanhmostafa/limlifestyle` (branch `main`) — **currently PUBLIC; make private before migrating** |
| Package name | `tech-care-v2` |
| Stack | React 19 + Vite + Tailwind/shadcn (client), Express + tRPC (server), Drizzle ORM, **MySQL** (`mysql2`), Manus OAuth, Manus Forge file storage, OurSMS for OTP |
| Node / PM | Node 22, pnpm |

## 2. Repository layout

```
client/            React app (pages, components, event UI, kiosk flows, report views)
server/            Express + tRPC routers, _core/ runtime (env, oauth sdk, storage proxy, llm, heartbeat)
  event*.ts        Event flows: registration, OTP, care cycle, reports, archives, research
shared/            Shared constants and the event recommendation catalog
drizzle/           schema.ts (27 tables) + SQL migrations 0000–0022 + meta journal
scripts/           DB checks, dry-runs, guarded purge, QA browser scripts
docs/              Design/contract docs (events OTP, research, recommendations, physician briefs)
references/        Source references (machine upload contract, periodic updates, physician sources)
patches/           Applied patch files
```

## 3. Local / fresh-environment run

```bash
pnpm install
cp .env.example .env        # create it — see §4 for variable names (never commit)
pnpm db:push                # drizzle-kit generate && migrate (applies drizzle/*.sql in order)
pnpm dev                    # tsx watch server/_core/index.ts
pnpm check                  # tsc --noEmit
pnpm test                   # vitest run (~367 tests at last checkpoint)
pnpm build                  # vite build + esbuild server bundle + copy-report-assets.mjs
pnpm start                  # NODE_ENV=production node dist/index.js
```

PDF generation is done in the browser (print/save PDF); the server does not render PDFs. `CHROME_EXECUTABLE` / `UI_SCREENSHOT` are only used by QA scripts.

## 4. Environment variables

Names read by the app (from `server/_core/env.ts` and `process.env` usage):

| Name | Purpose | Migration rule |
|---|---|---|
| `DATABASE_URL` | MySQL connection string | New value from the new project's database |
| `JWT_SECRET` | Session cookie signing | Regenerate is acceptable (logs everyone out) |
| `VITE_APP_ID` | Manus OAuth app id | New value — account-bound |
| `OAUTH_SERVER_URL` | Manus OAuth server | New value — account-bound |
| `OWNER_OPEN_ID` | Owner account id for admin bootstrap | New value from the new account |
| `BUILT_IN_FORGE_API_URL` | Manus Forge API base (LLM + storage presign) | New value — account-bound |
| `BUILT_IN_FORGE_API_KEY` | Forge API key | New value — account-bound |
| `VITE_FRONTEND_FORGE_API_URL` / `VITE_FRONTEND_FORGE_API_KEY` | Client-side Forge calls (public by nature) | New values |
| `EVENT_REPORT_ARCHIVE_KEY` | AES key encrypting event report archives | **Copy unchanged.** Rotating it makes existing archives unreadable |
| `EVENTS_OTP_SECRET` | HMAC secret for OTP code/token hashes | Copy unchanged to keep in-flight OTPs valid; regenerate after cutover is acceptable |
| `EVENTS_OTP_ENABLED` | OTP feature flag (`1`/`0`) | Copy |
| `OURSMS_API_KEY` | OurSMS SMS provider credential | Copy or re-issue with the provider |
| `OURSMS_SENDER_ID` | Sender name; the app now uses the non-secret constant `Authora` (`server/lib/oursmsConfig.ts`) | Copy `Authora`; any legacy value is ignored |
| `OURSMS_CREDENTIAL_TEST` | Diagnostics toggle | Copy if set |
| `EVENTS_TEST_CLEANUP_CONFIRM`, `DEV`, `PORT`, `NODE_ENV` | Test/runtime flags | Set per environment |

Values are entered only through the new project's Settings → Secrets / Environment Variables. Never in git, never in chat, never in `VITE_` vars unless intentionally public.

## 5. Database

- Engine: **MySQL** (Drizzle `dialect: "mysql"`, driver `mysql2`).
- 27 tables, including: `users`, `kiosks`, `health_readings`, `kiosk_devices`, `kiosk_sessions`, `bookings`, `expert_requests`, `conversations`, `messages`, `ai_plans`, `clinician_participant_access`, `event_*` (profiles, settings, staff, staff sessions, tracks, participant sessions, otp challenges/limits, care, researchers, research grants/sessions/audit, report archives).
- Migrations: `drizzle/0000_*.sql` … `0022_event_report_pdf_claim_lease.sql`, journal in `drizzle/meta/_journal.json` (idx 0–22). Apply with `pnpm db:push` on a fresh database; the production database must already be at idx 22.

Export (run where `DATABASE_URL` is available):

```bash
mysqldump --single-transaction --quick --no-tablespaces --routines --triggers \
  --hex-blob --default-character-set=utf8mb4 \
  --set-gtid-purged=OFF "$DATABASE_URL" > lim_prod.sql
```

Restore into the new database:

```bash
mysql --default-character-set=utf8mb4 "$NEW_DATABASE_URL" < lim_prod.sql
```

Verify after restore: table count = 27, per-table row counts match the pre-export counts, `drizzle/meta/_journal.json` state consistent (`pnpm db:push` reports no pending changes), and `pnpm db:check-events` passes. Encrypt the dump (`age`/`gpg`/7z with passphrase) before it leaves the machine; it contains participant PII. Never commit it.

## 6. Private file storage

- Backend: Manus Forge storage, reached through `BUILT_IN_FORGE_API_URL/KEY` and proxied at `/manus-storage/*` (`server/_core/storageProxy.ts`, presign endpoint `v1/storage/presign/get`).
- Object keys referenced by the database: `event_report_archives.snapshotKey` and `event_report_archives.pdfKey` (opaque keys; never exposed to clients). `snapshotPayload` (the report JSON snapshot) is stored **in the database**, not in storage.
- Encryption: archive payloads are encrypted with `EVENT_REPORT_ARCHIVE_KEY`; `event_report_archives.encryptionVersion` records the scheme. Moving archives to another key/version requires decrypt-and-re-encrypt, otherwise keep the same key.
- Migration: export every distinct `snapshotKey`/`pdfKey` object through the Forge storage API, keep the exact key strings, re-upload into the new project's storage, then verify `snapshotSha256` / `pdfSha256` against the re-uploaded bytes and render one PDF to confirm decryption.
- Public CDN images referenced in `server/seed.ts` (cloudfront.net) are third-party assets; no migration needed unless the CDN bucket is retired.

## 7. Integrations

- **Manus OAuth**: the new project gets its own `VITE_APP_ID` / `OAUTH_SERVER_URL` / callback origin. Existing `users.openId` values are tied to the old OAuth identity — decide explicitly whether to (a) let users re-register (new openIds) or (b) keep the `users` table as-is and map logins by email. Option (b) requires a deliberate identity-mapping step, otherwise migrated users cannot log in to their old data.
- **OurSMS**: sender `Authora`, credential `OURSMS_API_KEY`; admin diagnostics screen shows sender status without exposing secrets. Re-issue the key with the provider if the old one is account-scoped.
- **Research delivery**: contract in `docs/lim-research-source-contract-v1.md` and `docs/events-research.md`; HMAC/keys handled server-side. Reconfigure any external consumer's endpoint after cutover.
- **Scheduled jobs**: no cron jobs are registered in the schema. If any runtime Heartbeat jobs (`schedule_cron_task_uid`) were created in production, list them from the old project's settings and recreate them after the new site is deployed.

## 8. Migration sequence

1. Make the GitHub repo private; push tag `migration-20261113` (done).
2. In the old project session: run the MySQL export above, record row counts, encrypt, hash.
3. Export storage objects (§6), encrypted, with a manifest of keys + hashes.
4. Create the new Manus project, import the repo, `pnpm install`, create the MySQL database, restore the dump.
5. Re-enter secrets (§4); keep `EVENT_REPORT_ARCHIVE_KEY` identical.
6. Restore storage; verify hashes and one PDF.
7. Recreate OAuth/SMS/research config; decide the user-identity strategy (§7).
8. `pnpm check && pnpm test && pnpm build`; browser-test login, registration, OTP, visit/measurement, report PDF, event export, admin screens with synthetic data.
9. Publish to the temporary `*.manus.space` URL and retest.
10. Add `limlifestyle.com` + `www` to the new project, set DNS at the registrar (TTL 300), verify HTTPS on both, then keep the old deployment running 1–2 weeks as rollback.

## 9. Do not migrate

`.env*`, `node_modules/`, `dist/`, database dumps with real data, decrypted archives, QA screenshots/logs, Manus checkpoints/metadata. Keep the repo private and free of data exports.

## 10. Known issue at migration time (2026-11-13): storage downloads return 403

Exporting storage objects from the old project failed: `v1/storage/presign/get` returns HTTP 200 with a URL on `d36hbw14aib5lz.cloudfront.net`, and every GET of that URL returns `403 AccessDenied` (both with a plain unauthenticated GET and through the app's `/manus-storage/*` proxy). All 29 keys behave identically, so this is a platform/CDN-side problem, not a credential or script problem.

Consequences for the migration:

- All 15 `snapshotKey` objects are redundant: every snapshot is already embedded in `event_report_archives.snapshotPayload` (encrypted, base64) and travels with the database dump.
- The 14 `pdfKey` objects are derived artefacts (PDFs rendered from snapshots). After the database is restored and `EVENT_REPORT_ARCHIVE_KEY` is in place, they can be regenerated from the embedded snapshots; compare against `pdfSha256` and record any object that cannot be reproduced byte-for-byte.
- If byte-exact originals are required, escalate to Manus support / the project backup portal while the old project is still live. Do not delete the old project until this is resolved or explicitly waived.
