# LIM Events: Consultation Modes and Automatic Recommendations

## Scope

This document defines the two supported consultation modes for **new** LIM Events registrations. Existing visits retain their registration-time snapshot.

| Mode | Required flow | Recommendation author | Participant-facing attribution |
|---|---|---|---|
| `physician` | Body analysis → optional nursing → physician review and explicit approval | Assigned event physician; an optional private source-constrained draft may assist | **توصيات الطبيب** with physician name only after approval |
| `automatic` | Body analysis → **completed nursing** → lease-protected server generation | Server-selected IDs from a controlled education catalog | **توصيات لنمط حياة صحي**; no physician attribution and no AI label |

## Evidence record

The supplied clinical reference is recorded accurately as:

> Rippe, James M., MD (editor). *Lifestyle Medicine*, **Fourth Edition**. CRC Press / Taylor & Francis, 2024. ISBN 978-1-0321-2992-1. Reviewed reference: supplied PDF/book extract, lifestyle-behavior and nutrition/activity sections (chapter/page references retained with the review material rather than asserted from a public summary URL).

Implementation wording is original Arabic education, **not** a quotation, treatment protocol, diagnosis, or a replacement for clinical review. Additional operational guardrails use the CDC adult sleep facts page, WHO physical-activity guidance, and AHA severe blood-pressure escalation guidance.

| Source ID | Bounded use |
|---|---|
| `RIPPE_LM4_2024_BEHAVIOR` | Small, specific, measurable behavior goals and self-monitoring |
| `RIPPE_LM4_2024_NUTRITION` | Incremental food-pattern education, without prescribing a diet |
| `RIPPE_LM4_2024_TOBACCO` | Requesting reliable cessation support; no medication advice |
| `RIPPE_LM4_2024_CONNECTION` | Supportive social contact and connection |
| `WHO_PHYSICAL_ACTIVITY_2025` | Gradual activity and general adult targets, never exercise clearance |
| `CDC_ADULT_SLEEP` | General adult sleep-duration/routine education |
| `AHA_BP_180_120` | Deterministic urgent repeat-measurement/review and symptom escalation |

## Safety and privacy boundary

- The automatic path can be configured only where nursing is enabled and at least one nursing test is selected.
- A model can select **only** catalog IDs. It cannot create prose, diagnose, prescribe medication, set calorie targets, clear exercise, or choose an unlisted source. Arabic text is composed on the server from the immutable catalog.
- The doctor-only draft endpoint uses the same restricted selection process, persists only a private editable draft, and never exposes it to the participant, report, admin export, or research output before explicit physician approval.
- The minimized model input accepts only: validated numeric approved X18 fields; recognized, closed-choice questionnaire answers; validated numeric nursing fields; and catalog-defined closed nursing enums. It excludes names, phone numbers, session codes, free-text notes, bone device/site/result text, arbitrary machine metrics, and missing answers. Missing questionnaire data remains unknown—no deficiency is inferred.
- A deterministic urgent rule applies when `SBP > 180` or `DBP > 120` from the linked X18 reading or nursing blood-pressure fields. It asks for repeat measurement and urgent clinical review, supplies emergency symptom escalation, and suppresses generic activity advice.
- Automatic work uses a random attempt token, 90-second lease, input fingerprint, input revision, and record number. Only the current unexpired lease can publish. A crash expires to a transparent retry state; a changed measurement or care revision blocks stale publication. Attempts are capped per unchanged input.
- Every nurse/doctor draft/save/approval carries an expected revision. The database compare-and-increment rejects stale editors with a visible conflict while the browser retains local text.
- Each approved report stores `approvedRecordNo`. If a later X18 reading replaces the session’s measurement, the prior approval is invalidated; physician prose remains a private draft for re-review and automatic output is cleared for regeneration. A public report cannot pair old advice with a newer reading.

## Data flow

1. Super admin configures the future-visit consultation mode, nursing tests, and optional questionnaire.
2. Registration snapshots the questionnaire selection in `event_participant_sessions` and nursing/mode settings in `event_care`.
3. The physical X18 upload uses the shared `/api/kiosk/data` endpoint and associates the current record to the Event visit.
4. Staff work from revision-guarded records. A physician may request a private draft but must edit/review and explicitly approve it.
5. Automatic mode waits for the required nursing station, claims a time-bounded lease, builds minimized input, applies the urgent rule or selects allowed IDs, and stores rendered education plus internal source IDs.
6. Participants only see approved advice. In automatic mode the heading is **توصيات لنمط حياة صحي**, with no false physician attribution. Research/admin outputs continue to exclude drafts and raw private notes.

## Storage and migrations

- `0017_events_auto_recommendations.sql` introduced consultation mode and baseline recommendation state.
- **`0018_events_care_concurrency.sql`** is additive and introduces care revisions, approved reading reference, generation attempt token/lease, fingerprint, input revision, and record number. It is intentionally separate because `0017` is already recorded.

## Historical Events cleanup audit

- `pnpm db:dry-run-delete-events-test-results` remains the narrow, separately guarded audit for proven test uploads.
- `pnpm db:dry-run-delete-all-events-history` is the authorized **all historical `lim-events`** dry-run audit. It counts visits, care rows, answer-bearing visits, proven readings, and ambiguous/shared readings. It has **no apply path**.
- The all-history audit treats exact `userId + latestRecordNo` associations as unambiguous. Readings for an Event participant without that exact current association are reported as ambiguous/shared and remain untouched until a separately reviewed transactional deletion plan is authorized.
- Accounts, profiles/settings, staff/staff sessions, tracks, research accounts/grants/audit, OTP tables, and ambiguous/shared readings are preserved.

## Rollout

1. Apply reviewed additive migration `0018_events_care_concurrency.sql`.
2. Run `pnpm db:check-events`, focused staff/recommendation tests, full tests, and build.
3. Verify the PWA update notice offers a manual reload and never clears login/local storage; staff with dirty editor state must save or discard deliberately before reload.
4. Publish only after review; the PWA version notice protects clients from silently retaining an old physician UI.
