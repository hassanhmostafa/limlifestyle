# Assessment archive and SMART plans

- Source base: `7a374940176e3ed5b89241c0c1c849e89edf5d3d`.
- No Source schema migration, new credential, Source-to-Research DB connection, or background schedule.
- The existing PDF relay is unchanged. A downstream signed `/api/integrations/lim/companions` request adds a separate answers PDF and structured answers, demographics and nursing values to the same Research receipt. The participant receives the existing final report.
- New approval snapshots freeze registered questionnaire wording, options, timeframes, version, original answers, nursing units and labels, and the registered phone/city. Historical snapshots are never rewritten or enriched from current operational records.
- New questionnaire implementations use `freezeQuestionnaire` and register their definition/resolver in `archivedQuestionnaires`. Research transport/storage/view is independent of questionnaire IDs. A questionnaire that has not been implemented and registered is deliberately not silently declared archived.
- An ACK is recorded in the existing browser queue only after both files are confirmed. Exact retries are idempotent. A downstream failure must not prevent participant sharing/completion. Already acknowledged historical reports do not automatically backfill; the explicit recovery script reads an exact frozen approval and appends only to the matching existing Research receipt.
- `server/assets/DejaVuSans.ttf` and its license must be retained in the deployment. PDF generation checks its module-relative source location and the bundled `dist` fallback.
- Removed the duplicated next-steps panel from screen and print. Physician-selected drafts keep controlled, source-linked advice IDs and use concrete measurable time-bound steps. Existing approved advice and scoring are unchanged.

## Clinical source distinction

The week-by-week increments are practical draft goals for physician review, not verbatim prescriptions attributed to a guideline. Five servings means combined fruit and vegetables, not five distinct vegetable types.

Checked 2026-10-20:

- WHO healthy diet: https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- WHO physical activity: https://www.who.int/health-topics/noncommunicable-diseases/physical-activity
- CDC sleep: https://www.cdc.gov/sleep/about/

Existing source IDs and physician approval remain in place. Urgent-reading safeguards are unchanged.
