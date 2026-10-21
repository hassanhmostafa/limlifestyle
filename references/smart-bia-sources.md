# LIM SMART / BIA recommendation review — 2026-10-21

The model selects IDs from controlled Arabic cards. It cannot invent medical prose.
The source-backed principles are distinct from applied SMART schedules (10-minute
walks, weekly 5-minute increments, 20-minute resistance sessions and review dates).
These starting schedules require clinician adjustment; they are not verbatim doses.

## Approved uploaded sources

1. easo-clinicians_spreads.pdf: EASO healthcare professional exercise guide, PDF p1.
   Adult overweight/obesity aerobic exercise and resistance training goals.
2. ESPEN practical guideline: Clinical nutrition and hydration in geriatrics (2022).
   PDF p2 defines the older population (usually >=65); PDF pp25–26 discuss weight
   reduction only with appropriate clinical indication and exercise. No blanket
   weight-loss/protein/fluid prescription is inferred from BIA.
3. Oppert et al., Obesity Reviews 2021;22:e13273, Table 3, PDF p5.
   Aerobic exercise 150–200 minutes/week for weight/fat loss; resistance for lean
   mass preservation and strength. EASO recommendations are gated to adult
   overweight/obesity, not device fat-rate or visceral-index thresholds.
4. NICE NG246, supplied project edition. Assessment 1.9.8–1.9.9, PDF p35;
   central adiposity 1.9.14–1.9.15; dietary approaches 1.16, PDF pp75–76.
   BIA is not a substitute for BMI; waist measurement complements BMI <35.
   Individualized balanced dietary energy deficit, with no device-derived calorie
   prescription. No device-specific fat, muscle, visceral-index or body-age
   diagnostic thresholds have been added.
5. Lifestyle Medicine and the Primary Care Provider, edited by Stout, Reichert
   and Kelly. Uploaded copy is image-based. Chapter 9, printed pp137–139,
   PDF pp168–170, was rendered/OCR reviewed for supportive social connection.
   No other unreviewed passages from the scan are used for new claims.
6. Foundations of Lifestyle Medicine Board Review Manual, 4th ed., ACLM,
   Clayton and Bonnet. SMART definition PDF p44; relevant nutrition, activity,
   sleep, stress, tobacco and social connection chapters support education cards.
   Legacy IDs incorrectly naming Rippe's different textbook have been replaced.

## Clinical boundaries

- Age >=65 receives nutrition/function assessment instead of routine energy
  restriction. Unknown age receives no weight-loss-specific body card.
- No diagnosis of sarcopenia from muscle mass or green device coloring.
- No treatment targets derived from body age or visceral-fat index.
- Existing urgent BP safety pathway and physician approval remain intact.
- Existing approved reports remain frozen; the new version applies on a new
  generation and does not overwrite approved advice or historical PDFs.
- Physician UI exposes selected source names, locations and rationale.

## Participant buttons and archived files

In shareable participant mode only one PDF/share action is shown, labelled
«مشاركة التقرير + الاستبيان عبر الواتساب». Admin/research standalone PDF download
is retained. Questionnaire expected/pending/missing prevents report-only sharing;
retry uses the same control. With questionnaire disabled only the report is
shared. Native Web Share presents the system share sheet (user chooses WhatsApp).
On browsers without file sharing, both files are downloaded for manual attachment.
No WhatsApp message is sent automatically. PDF preparation callback, server
archiving, questionnaire generation and research delivery are unchanged.

## Validation

Run TypeScript check, production frontend/backend builds, report assets copy,
and focused Vitest suites listed in VALIDATION.txt in the release package.
Actual WhatsApp recipient selection must be exercised on a supported user device;
no real participant message is needed or authorized by the code validation.
