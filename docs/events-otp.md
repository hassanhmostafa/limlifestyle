# Events OTP — OurSMS (SMS only)

The Events registration flow uses OurSMS. Authentica is no longer called by Events.
Provider contract: https://docs.oursms.com/api/v1/ (and the supplied docs.json).
POST https://api.oursms.com/msgs/sms with Authorization: Bearer <server key>,
src, dests (9665… without +), body, msgClass=transactional, secure=true, validity=10.
HTTP 200 means accepted for sending, not delivered; the supplied OpenAPI does not
specify a response schema. Malformed/non-JSON nonempty or explicit error responses
are rejected. Confirm the actual send/delivery response in staging before launch.

## Required server secrets, in BOTH preview and production

- EVENTS_OTP_ENABLED=true
- OURSMS_API_KEY: paste the new provider key into the hosting secret manager.
- OURSMS_SENDER_ID: exact approved sender belonging to that account; no invented default.
- EVENTS_OTP_SECRET: an independent cryptographically random secret of at least 32
  characters; generate with `openssl rand -hex 32`. All server replicas need the
  same value. Do not expose any of these through VITE_* or client-side code.

Apply migration 0015_oursms_research.sql, restart/publish the server, then run
`pnpm db:check-events` against the intended database. Use the existing migration
runner (`pnpm exec drizzle-kit migrate`) rather than generating duplicate migrations.
Do not put credentials into SQL, source code, screenshots or GitHub.

## Challenge lifecycle

The server creates a cryptographically random six-digit code, stores only an HMAC
bound to the normalized phone and random browser challenge token, and sends it by
SMS. Local verification is transactional and uses constant-time digest comparison.
TTL 10 minutes; resend cooldown 60 seconds; at most five wrong guesses; successful
proof is consumed once by registration. Persisted send quotas apply across workers.
Failed sends remain unusable. Old Authentica challenges require a fresh code.
Provider and database failures return safe errors without logging OTP/message/key.
No WhatsApp selector or automatic fallback is present.

## Non-sending diagnostics

Events admin > فحص اتصال OTP بالخادم المنشور uses OurSMS GET /billing/credits.
It reports a short key fingerprint, HTTP status, whether sender/secret are configured,
and whether OTP is enabled. It does not return the key, credits, or provider body.
Compare fingerprints between preview and production if only one environment works.
This checks credential acceptance, not SMS delivery or sender approval.

## Deployment acceptance

After configuring the approved sender, test on an authorized test phone: send, wrong
code, correct code, register, then verify replay is rejected. Also test resend and
expiry. Automated tests use simulated provider responses; they do not send SMS.
