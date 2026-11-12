# Physician uploaded source record — 2026-11-12

This record documents the source files reviewed by the project owner/ChatGPT and used by the physician-only evidence helper. The original binary files are not present in this repository or this runtime; this file does not claim that they were ingested locally. No internet source was added.

The four source records supplied for the physician draft are:

1. **Physician FITT/SMART examples** — the uploaded physician-draft examples file. Reviewed by pillar sections for the FITT template and practical SMART options. It defines an editable clinician template; its schedules are examples to individualize, not quoted guideline doses. Helper ID: `UPLOADED_FITT_SMART_EXAMPLES`.
2. **NICE NG246, supplied project edition** — 177 pages, updated 8 January 2026. Nutrition review: §§1.16.1–1.16.7, pp. 75–76. Activity review: §§1.15.2–1.15.4, pp. 73–74. Applied only for an adult validated BMI context of BMI ≥25. Helper ID: `UPLOADED_NICE_NG246_2026`.
3. **EASO/Oppert exercise evidence pair** — the one-page EASO clinician exercise guide and the 12-page Oppert et al. *Obesity Reviews* PDF, Table 3 p. 5. Applied only to an adult validated BMI context of BMI ≥25 and only for the activity pillar. It does not add HIIT, automatic exercise clearance, or an assumption of weight loss. Helper IDs: `UPLOADED_EASO_CLINICIANS` and `UPLOADED_EASO_OPPERT_2021`.
4. **ESPEN Clinical nutrition and hydration in geriatrics (2022)** — 32 pages. Reviewed pp. 3–4, recommendations 1–5, and p. 26, recommendations 80–82. Applied only to the nutrition pillar when validated age is ≥65. It does not generate automatic protein, fluid, or calorie quantities from BIA. Helper ID: `UPLOADED_ESPEN_GERIATRICS_2022`.

The physician helper also attaches applicable existing catalog cards by the selected pillar. Existing catalog/reference material remains preserved in `references/smart-bia-sources.md`, `docs/events-lifestyle-report-catalog.md`, `docs/events-auto-recommendations.md`, and `shared/eventRecommendationCatalog.ts`. The two PHM files are intentionally excluded from physician attribution and source IDs.
