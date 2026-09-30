# Events OTP — OurSMS (SMS only)

The Events registration flow uses OurSMS. Authentica is no longer called by Events.
Provider contract: https://docs.oursms.com/api/v1/ (and the supplied docs.json).
POST https://api.oursms.com/msgs/sms with Authorization: Bearer <server key>,
src, dests (9665… without +), and body only.
The exact approved message, per support's 2026-09-30 follow-up, is:
`رمز التحقق الخاص بك ( 0123 )` (0123 is replaced with the generated four-digit code).
Do not append LIM branding, expiry wording, punctuation or other text.
The public /msgs/sms schema requires body and does not document templateId.
We therefore render the approved text directly, rather than sending templateId/vars.
This needs one real delivery acceptance test after deployment; local tests are mocks.
HTTP 200 means accepted for sending, not delivered; the supplied OpenAPI does not
specify a response schema. Malformed/non-JSON nonempty or explicit error responses
are rejected. Confirm the actual send/delivery response in staging before launch.

## Required server secrets, in BOTH preview and production

- EVENTS_OTP_ENABLED=true
- OURSMS_API_KEY: paste the new provider key into the hosting secret manager.
- OURSMS_SENDER_ID=RAWZ OTP (exact sender supplied by support, including space).
- OURSMS_TEMPLATE_ID is no longer required or sent; an existing value can remain unused.
- EVENTS_OTP_SECRET: an independent cryptographically random secret of at least 32
  characters; generate with `openssl rand -hex 32`. All server replicas need the
  same value. Do not expose any of these through VITE_* or client-side code.

### Sender IDs containing spaces

If the Manus secret editor rejects literal spaces, write each space as `%20` in
`OURSMS_SENDER_ID`. For example, store `LIM%20Lifestyle` for the approved sender
`LIM Lifestyle`. The server decodes this value in memory only when it submits the
authenticated request to OurSMS. Do not add quotation marks or use `+` for spaces.

Apply migration 0015_oursms_research.sql, restart/publish the server, then run
`pnpm db:check-events` against the intended database. Use the existing migration
runner (`pnpm exec drizzle-kit migrate`) rather than generating duplicate migrations.
Do not put credentials into SQL, source code, screenshots or GitHub.

## Challenge lifecycle

The server creates a cryptographically random four-digit code, stores only an HMAC
bound to the normalized phone and random browser challenge token, and sends it by
SMS. Local verification is transactional and uses constant-time digest comparison.
TTL 10 minutes; resend cooldown 60 seconds; at most five wrong guesses; successful
proof is consumed once by registration. Persisted send quotas apply across workers.
Failed sends remain unusable. Old Authentica and pending six-digit challenges require a fresh code.
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

## Approved-text deployment (2026-09-30)

Keep the current API key and EVENTS_OTP_SECRET unchanged. Set the approved sender
above in production and preview; publish server and frontend together. No new DB
migration is needed for this template update. Existing verified sessions remain valid.
Ask participants with pending six-digit codes to request a new four-digit code.
The example 1235 from support is not a fixed code; new codes are generated securely,
including leading zeros. Confirm actual delivery and verification on staging.

When the hosting secret editor rejects spaces, set OURSMS_SENDER_ID=RAWZ%20OTP.
The server decodes it to RAWZ OTP before sending. The admin diagnostic shows messageFormat=approved-text-v1 for this server version.
A successful balance check still does not prove SMS delivery.
