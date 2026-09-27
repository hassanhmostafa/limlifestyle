# LIM Events: Authentica SMS OTP

This change requires server-enforced phone verification for NEW event registration. The code field replaces the repeated phone input in the same form; verification unlocks the create-session button. Editing the phone clears the proof. Existing opaque event sessions continue normally; staff login and X18 phone QR/ingestion are unchanged. It does not implement main-app OTP login or recovery of historic records.

## Deployment (Hassan / Manus)

1. Review and deploy this branch. Prepare the provider key and database before publishing: NEW registrations are now always gated by OTP. Existing sessions continue normally.
2. Back up the database and apply pending migrations using `pnpm exec drizzle-kit migrate`. New migration: `0014_event_otp.sql`. Do not run generate/push blindly or mark the migration applied without creating both tables.
3. In the SERVER secret/environment settings, set `AUTHENTICA_API_KEY` to the owner's current Authentica application key. Paste the value literally; its dollar signs must not be expanded by a shell. Never add it to GitHub, client code, a VITE_ variable, or logs.
4. Set `EVENTS_OTP_ENABLED=true`, run `pnpm db:check-events`, then restart/redeploy the server. Missing key/database fails closed when enabled.
5. Test on a designated real Saudi mobile: SMS arrives, wrong code rejected, valid code creates the session, QR still has the national phone number, existing session continues without another OTP. Also test resending, expired code, changing phone, and replaying a consumed challenge. Verify live provider JSON matches the documented `success:true` send and `status:true` verify fields. HTTP 200 alone is not accepted as proof.
6. Disabling EVENTS_OTP_ENABLED pauses NEW registration; it does not bypass phone verification. Publish only after configuring the provider and migration.

Provider contract: https://docs.authentica.sa/api-reference/otp-verification/send-otp and https://docs.authentica.sa/api-reference/otp-verification/verify-otp (`/api/v2/send-otp`, `/api/v2/verify-otp`, X-Authorization). No custom-SMS endpoint is used. Key validity/delivery and native iOS Safari require live testing; automated tests use synthetic provider responses.

## Limits and storage

- Saudi mobile only, E.164 for Authentica; national 05 format remains the device QR.
- 60 seconds between sends, at most five sends per phone/hour; failed provider sends also count.
- Five verification attempts per challenge; challenge expires after ten minutes (provider expiry may be shorter).
- One active challenge per phone; resend replaces the previous challenge. The opaque browser token is bound to the phone hash, never contains the code, and is consumed once on registration.
- Challenges and counters persist in MySQL with row locks, so multiple instances share limits. Rate limits: 1,000 sends per IP/hour, 5,000 total/day. Configure Express trust proxy to the actual trusted hosting proxy; do not trust arbitrary forwarded IP headers.
- Provider calls timeout after 15 seconds, reject redirects and redact response bodies. No automatic retries that could duplicate SMS charges.
- A registration storage failure AFTER successful proof consumption requires a fresh OTP. Participant data remains in the form. This is a deliberate fail-closed behavior.
- Expired challenges and counters can be purged by a hosting maintenance job (challenges older than one day; counters with lastAt older than two days). They store hashes, never OTP codes or plaintext phone numbers.

## Verification

`JWT_SECRET=local-test-only-not-for-deployment pnpm test`

`pnpm check && pnpm build`

With Vite running, `node scripts/test-events-otp.cjs` tests the actual mobile React flow with synthetic tRPC responses. Database locking/rollback and live SMS delivery must additionally be checked on staging before activation.

## Provider error diagnosis

Participant errors include a non-sensitive OTP reference (AUTH, LIMIT, REQUEST, CREDIT, TIMEOUT, NETWORK, PROVIDER or RESPONSE). Server logs include only action/category/HTTP status, never provider bodies or the key. These labels classify a response; they do not prove the precise account-setting or infrastructure cause.

The current documented verification success field is `status: true`; older official GitHub examples use `verified: true`. Explicit boolean `status` takes precedence, and success/string booleans alone never authorize a participant.

For send failures, inspect the matching `[Events OTP] Provider failure` entry in the hosting logs. AUTH: confirm the server secret exactly matches the existing dashboard key (preserve literal dollar signs), and check channel permissions. REQUEST: check the Authentica app SMS/default template/sender configuration. TIMEOUT/NETWORK: check outbound HTTPS from the hosting server. LIMIT/CREDIT: review account limits/balance. No SMS should be retried automatically during diagnosis.
