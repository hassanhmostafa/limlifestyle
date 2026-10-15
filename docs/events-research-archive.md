# LIM Events research archive architecture

## Scope and access model

This feature extends the existing **LIM researcher account**, credential rotation, event grant, session-version revocation, and audit model. It does not create a second researcher login system.

| Actor | Allowed actions |
| --- | --- |
| Event participant | Continues to access only their own standalone Events session and its report. |
| Super-admin | Creates, pauses, scopes, and rotates researcher accounts; may explicitly grant report-archive access. |
| Researcher, default | Reads and exports only de-identified structured data for assigned event(s). No names, phone numbers, access tokens, free-text notes, clinical advice, original PDFs, or archive snapshots are returned. |
| Researcher with **report-archive access** | May inspect an immutable historical report snapshot, regenerate it with the shared report template, and download its original participant PDF when it has been captured. This additional permission is default-off and is audited. It does not automatically change existing researcher grants. |

The existing `includeIdentity` field remains hard-disabled. No new participant-consent workflow is introduced and existing permitted structured records remain visible under their current `consent = true` and researcher-grant checks.

## Archive lifecycle

1. When a final report is approved, the server creates one immutable, encrypted **snapshot** for that visit/report revision.
2. The original participant PDF is marked **pending** until the participant browser has rendered the normal final report and uploads the browser-created PDF. This is necessary because the shared report renderer is browser based.
3. The participant report automatically attempts the upload when the PDF is prepared for download/share. The encrypted snapshot remains authoritative if a browser PDF is not yet available; the archive row truthfully remains `pending` rather than presenting a regenerated report as the original.
4. The original PDF is stored once per report revision. A later invalidated/re-approved report has a different revision and receives a separate archive record.
5. A researcher with report-archive access can download the original through a server authorization check or regenerate the saved snapshot with the same `EventPrintReport` template. Regeneration reads the saved snapshot and saved advice only; it does not call AI, calculate new recommendations, or impersonate a participant.

## Encryption and storage

The storage adapter was verified with synthetic bytes: an unauthenticated request could retrieve an uploaded object. Therefore **raw PDFs and raw snapshots are never uploaded or exposed through `/manus-storage/`**.

- Snapshot and PDF bytes use AES-256-GCM before persistence/upload.
- Object keys are random UUIDs and contain no name, phone, event code, report code, or other participant identifier.
- The ciphertext uses an archive-specific HKDF-derived key from the existing server-only `JWT_SECRET`, with a fixed `lim-event-report-archive-v1` context and authenticated additional data bound to the session and report revision.
- `/api/research/reports/:archiveId/original.pdf` authenticates the existing researcher cookie, checks account activity, credential version, archive permission, and event grant, then fetches, decrypts, and streams the file with `Cache-Control: no-store`. It never returns a storage URL.

### Key continuity and backup requirement

`JWT_SECRET` must be retained for the lifetime of encrypted archives. **Do not rotate or replace it without retaining the legacy secret or migrating every archive by decrypting and re-encrypting it.** A database backup without the matching server secret cannot restore report archives. The encryption version is stored per archive so a future controlled key migration can coexist with historical records.

## Audit, retention, and recovery

- Every scoped researcher data view/export, snapshot read, original-PDF download, and regeneration is inserted into `event_research_audit` with actor, event, action, row count, and timestamp.
- Report archive records include status (`pending`, `archived`, `failed`), byte count, integrity hash, encryption version, source, timestamps, and a retention target of 24 months.
- This release does **not** automatically delete archives. Retention expiry is a review marker only; deletion requires a separately authorized, audited operational action.
- If participant upload fails, status remains pending/failed and the participant/research coordinator can retry. The encrypted snapshot remains available to authorized researchers for a template-based historical regeneration.

## Research data and exports

The researcher portal is available at `/research` (with `/events/research` retained as a compatible route). It provides:

- Event, date, and track filters; date spans are server-enforced.
- Paginated de-identified records and summary counts.
- Existing CSV and JSON downloads, plus a server-generated XLSX workbook for selected permitted events. The workbook has `Visits` and `Dictionary` sheets and is audited before its bytes are returned.
- A versioned variable dictionary for the questionnaire, X18 projection, nursing fields, and explicit missing-data/data-quality notes.
- Formula-safe spreadsheet values and no object-storage links.

CSV and Excel use raw structured fields suitable for analysis. Blank values mean **not recorded**, not zero; a reading source/status must be retained when interpreting results. Questionnaire keys are versioned and only recognized question keys are exported.
