# LIM — Project TODO

## Core Platform
- [x] Migrate the original health-kiosk application to the current LIM project.
- [x] Preserve bilingual Arabic/English support and RTL layout.
- [x] Replace user-facing Tech Care branding with **LIM** in primary navigation, login, health reports, kiosk screens, PWA manifest, and machine simulator.
- [x] Move primary account sign-in and registration to Saudi mobile number plus password.
- [ ] Add SMS OTP verification and recovery for mobile-number accounts.

## Physical X18_5 Machine Integration
- [x] Preserve the existing firmware paths: `GET /weixin/login/xcx` and `POST /api/kiosk/data`.
- [x] Register physical device `G260820131014906` as active.
- [x] Accept native X18_5 payloads using `deviceNo`, `recordNo`, `userID`, and `datas`.
- [x] Align dashboard vital fields with the X18 JSON: `sbp`, `dbp`, and `hr`.
- [x] Preserve native body-composition names such as `fatRate`, `skeletalMuscle`, `waterRate`, `bmr`, and `vfal` in `machineMetrics`.
- [x] Merge separate height/weight, body-composition, and blood-pressure uploads with the same `recordNo` into one reading.
- [x] Document the production data-upload configuration at `https://limlifestyle.com/api/kiosk/data`.
- [ ] Enter the LIM data-upload URL in the physical X18_5 settings and perform a real measurement using an existing LIM phone account.
- [ ] Confirm whether updated firmware can submit a **mobile-app QR scan** to a configurable LIM callback. The observed scan currently writes the raw QR value as the local user name; it does not identify the LIM account by itself.
- [ ] Obtain/document the manufacturer API for its final report QR. The current physical QR links to the manufacturer report, not a LIM result-transfer token.

## Two-Scan Simulator
- [x] Phone QR page creates a short-lived LIM login token for the simulator.
- [x] Simulator scans the phone QR, identifies the account, generates a test measurement, and displays one LIM results QR.
- [x] Stage a simulator result once, then finalize it once when the phone claims the QR; no duplicate health reading is created.
- [x] Keep guest measurements receipt-only and out of the account database.
- [x] Use an iOS-compatible native video element with ZXing for the LIM results scanner.
- [ ] Validate camera scanning on an iPhone after publishing the current checkpoint and clearing the PWA cache.

## Future Product Work
- [ ] Add push notifications for newly received health readings.
- [ ] Add Arabic language generation for AI wellness plans.
