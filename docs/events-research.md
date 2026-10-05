# Research access and questionnaire revision

Base: main 7010479e920fd6608539b4e54f3216b81ec78a5d.
Run migration 0015 and the read-only `pnpm db:check-events` gate before publishing.
This migration adds codeHash to OTP challenges and four researcher tables; it does
not delete or rewrite visits, answers, staff codes or device results.

## Workflow

Super admin: /events/care-admin > الباحثون وصلاحيات البيانات. Create a username
and name, select all events (including future events) or specific existing event
codes. The generated random code is displayed once; only its hash is stored.
Edit to revoke access or pause the account; rotate to replace a lost code.
Each edit/rotation invalidates prior login sessions. Researcher login:
/events/research. This uses a separate HttpOnly cookie, not a clinical track or
staff login. Only super admins can manage grants; researcher endpoints are read-only.

Researchers can view paginated rows and download a selected event as CSV or JSON.
CSV flattens answers/nursing objects; JSON preserves all nested device records.
The questionnaire and nursing dictionary downloads from the portal. Access/export
pages and admin credential/permission changes are audited. No bearer/session tokens
or password hashes are exported. Every data request enforces the event on the
server and SQL query. Exports abort without a partial download if a later page fails.

Direct identifiers and free-text clinical notes are always excluded. The former
admin identity checkbox is intentionally disabled until the product records a
separate, explicit participant consent for identified research. Existing database
flags cannot override this server-side restriction. This is a field-level
de-identification measure, not a claim of irreversible anonymization; demographic
and measurement data can still be identifying. Raw nursing data may include drafts:
completion timestamps mark finalization. Real/test device source labels are retained.
Only consenting visits are exported; other personal app records outside the selected
visit are not read.

## Event identity limitation

The existing participant/admin flow uses EVENT_CODE='lim-events'. Research grants
support all distinct eventCode values present in event_profiles or participant
sessions, independently of tracks. This change does not invent historical events or
split visits by renamed posters. If several past activations were stored under the
same eventCode, they remain one dataset until their event identity is migrated.

## Questionnaire 2026-09-28

Implements the supplied Arabic PDF wording and examples. Sleep was marked approved
and remains unchanged. Response options and the existing educational score formula
are retained because the PDF did not supply replacement scales or a scoring manual.
Adds gameMeat to protein choices. Changes alcohol binge-frequency question to general
alcohol use under a NEW key alcoholUse. Historical alcohol responses retain their
original label and meaning. New submissions carry _questionnaireVersion; old rows
remain legacy. Doctor charts and detail labels select the appropriate dictionary.
No clinical validation is claimed for the existing educational composite score.
