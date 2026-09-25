# LIM — Project TODO

## Implemented in this checkpoint
- [x] Rebrand the primary LIM application and phone sign-in around Saudi mobile numbers.
- [x] Accept native X18_5 `datas` uploads and merge all posts with the same `deviceNo` and `recordNo` into one measurement.
- [x] Persist native core values (`sbp`, `dbp`, `hr`, `height`, `weight`, `bmi`) and preserve all X18 body-composition values in `machineMetrics`.
- [x] Link a QR-scanned LIM session or a manual Saudi mobile number to a participant account.
- [x] Encode the participant's Saudi mobile number in **My QR Code**, so X18 displays that number in its ID field exactly like manual phone entry.
- [x] Store and display the name, age, and sex that X18 submitted with each specific report in **My Health**, the detailed X18 report, PDF output, and event API; do not substitute LIM account-profile details.
- [x] Create a pending LIM account automatically when a valid Saudi mobile number has no account; activating that number later exposes the saved readings.
- [x] Remove the phone-scans-machine-results workflow. X18 uploads results directly and the participant opens **My Health**.
- [x] Require an active registered device and one shared LIM fleet upload key, stored only as a hash.
- [x] Add event-app Bearer-token endpoints for a participant to view only their own readings and complete `machineMetrics`.
- [x] Add consent-gated clinician endpoints; an expert only sees participants who have explicitly authorized them.
- [x] Mark and hide historical demo/simulator readings from participant and event health histories without deleting them; stop runtime demo seeding.
- [x] Add non-secret integration documentation and unit/API validation.
- [x] Render full X18 body-composition reports in **My Health**, including muscle/fat switching, segmental measurements, metabolism indicators, and a separate trend graph for every available X18 metric.
- [x] Add the standalone `/events` journey from the event project: no LIM main-app sign-in in its frontend, its own event-form and opaque browser session, a phone-number QR for X18, and physical results drawn from the same shared LIM `health_readings` record that **My Health** uses.
- [x] Port the supplied standalone Events result-page structure, Arabic labels, muscle/fat anatomy controls, cards, and anatomical assets without restoring its broken separate account/password result gateway. `/events` remains absent from the main LIM navigation.
- [x] Add **إنشاء نتيجة اختبار** at the Events QR step. It creates a session-scoped, complete randomized X18-like report marked `simulator`, displays it only in Events, and keeps it out of My Health and the physical X18 upload flow.

## Required field verification after deployment
- [ ] Publish the checkpoint, then rotate the registered X18 device key in **Admin → Kiosk Devices** and configure the generated URL/key in the physical machine.
- [ ] Complete one real X18 measurement using a LIM QR or a registered Saudi phone number; confirm the device receives `{ "code": "1", "msg": "successful" }`.
- [ ] Confirm the new real reading appears in the correct participant's **My Health** page and event API, including `machineMetrics`.
- [ ] Visually verify a real X18 body-composition report in **My Health** after the physical device sends all `datas` posts for one `recordNo`.
- [ ] Verify pending-account activation: measure with a valid Saudi phone that has no LIM account, then register the same phone and confirm the historic measurement appears.
- [ ] Verify consent: participant grants one expert access, expert can see only that participant, then participant revokes and expert receives `403`.

## Deferred product work
- [ ] Replace mobile password verification with SMS OTP and recovery.
- [ ] Add push notification when a real X18 reading is received.
- [ ] Add Arabic language generation for AI wellness plans.
