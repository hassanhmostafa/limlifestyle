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
- [x] Add **إنشاء نتيجة اختبار** at the Events QR step. It generates a session-scoped complete X18-like `datas` payload and posts it through the exact `/api/kiosk/data?apiKey=…` HTTP upload handler with a five-minute, record-bound temporary test credential. The record is marked `x18_test`, shown in Events and the linked My Health account, and never uses the physical fleet key.
- [x] Re-upload the Events muscle/fat images to stable published storage paths and enlarge/re-align the anatomy figure, cards, and connector lines for the mobile result layout.
- [x] Route a completed body analysis to **الاستشارة الطبية** (step 4) rather than marking steps 4 and 5 finished; the final report remains an explicit next action.
- [x] Ensure newly received phone-linked X18 and Events records are ordered by LIM receipt time in **My Health**, refresh while that page is open, and normalize future X18 Saudi-local timestamps to UTC for new uploads.
- [x] Deliver Events muscle/fat art through a first-party `/api/events/anatomy/:kind` image proxy rather than a signed storage redirect, ensuring Safari can render the image after production publishing.
- [x] On an Events result, use the device-reported name when present and the Events-form name when the device omitted it; keep the participant on their body report after a result arrives and show an explicit LIM-styled **الانتقال إلى الاستشارة الطبية** button.
- [x] Enlarge the Events muscle/fat figures and reposition their callouts to match the arms, trunk, and legs rather than the transparent margin around the supplied artwork.
- [x] Use angled, endpoint-marked Events anatomy connectors: arm and leg cards exit horizontally then angle down to the limb; the trunk card exits horizontally then angles up to the torso.
- [x] Render the Events body chart at one fixed mobile geometry in both the immediate measurement view and final report: smaller figure and labels, wider horizontal connector space, and no nested report-card width reduction.
- [x] Add persisted, explicit Events milestones: **التقرير النهائي** completes the consultation and opens the report; **إنهاء الرحلة** completes the report and marks all five journey steps finished.

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
