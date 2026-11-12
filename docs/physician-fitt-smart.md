# Physician FITT/SMART change – 2026-11-12

Scope: physician draft only. Automatic reports and existing urgent BP gate remain unchanged. No schema, identity, OTP, or permission changes.

The physician branch uses deterministic Arabic source-constrained composition, with no LLM generation and no external reference retrieval. It requires three distinct valid priorities and preserves their order. Closed survey responses provide the baseline and select goal options. Missing answers remain unknown; a baseline collection goal replaces unsupported customization. Doctors edit the private draft and select one or two initial goals before approving it through the existing workflow.

Source provenance:
- Uploaded “أمثلة لمسودة الطبيب-.pdf”: actual FITT fields and SMART examples; nutrition pp 1–2, activity pp 2–3, sleep pp 3–4, stress p 4, substances pp 4–5, social connection pp 5–6. Arabic translations/adaptations of these examples, rather than verbatim quotations. These examples require clinician individualization. Time schedules newly made explicit in SMART adaptations are planning choices, not claims of efficacy.
- Uploaded PHM guidebook and practical summary: person-centered intervention design, prioritization, monitoring and engagement only. These do not provide the specific FITT dosage. Do not attribute lifestyle dosing to PHM.
- Existing urgent BP escalation remains a separate legacy clinical safety rule; it is not a new uploaded-source FITT/SMART recommendation.

Deploy: apply only the five TS/TSX files in the patch, keep references/docs. Do not overwrite the whole working repository. Run pnpm check and pnpm exec vitest run server/eventPhysicianPlan.test.ts server/eventRecommendationEngine.test.ts server/eventTeam.test.ts; verify three priorities, different baselines, missing answers, private draft then explicit approval. Confirm existing safety escalation still works. No real participant data or SMS needed.
