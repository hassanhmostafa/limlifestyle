/** Explicit, read-only Source recovery. Adds only a matching Research attachment; no OCR. */
import "dotenv/config";
import { parseArgs } from "node:util";
import {
  approvedResearchContext,
  researchSessionId,
} from "../server/participantResearchDelivery";
import {
  buildAssessmentCompanion,
  deliverAssessmentCompanion,
} from "../server/assessmentCompanion";
const { values } = parseArgs({
  options: {
    "session-code": { type: "string" },
    "report-pdf-sha256": { type: "string" },
    "archive-id": { type: "string" },
    revision: { type: "string" },
    reissued: { type: "boolean" },
    apply: { type: "boolean" },
  },
  strict: true,
});
if (
  !values["session-code"] ||
  !/^LIM-[A-Za-z0-9-]{1,28}$/.test(values["session-code"]) ||
  !values["report-pdf-sha256"] ||
  !/^[a-f0-9]{64}$/.test(values["report-pdf-sha256"]) ||
  !values["archive-id"] ||
  !/^\d+$/.test(values.revision ?? "")
)
  throw new Error("EXACT_BINDING_ARGUMENTS_REQUIRED");
const context = await approvedResearchContext(
  await researchSessionId(values["session-code"])
);
if (
  context.archive.archiveId !== values["archive-id"] ||
  context.archive.reportRevision !== Number(values.revision)
)
  throw new Error("APPROVAL_CHANGED");
const data = buildAssessmentCompanion(context.snapshot, {
  archiveId: context.archive.archiveId + (values.reissued ? ".reissued" : ""),
  revision: context.archive.reportRevision,
  reportPdfSha256: values["report-pdf-sha256"],
  snapshotSha256: context.archive.snapshotSha256,
});
if (values.apply)
  await deliverAssessmentCompanion(data, context.snapshot.eventCode);
console.log(
  JSON.stringify({
    applied: !!values.apply,
    questionnaires: data.questionnaires.length,
    questions: data.questionnaires.reduce(
      (n, q) => n + q.sections.reduce((n, s) => n + s.questions.length, 0),
      0
    ),
    sourceDatabaseWrites: 0,
    newMeasurements: 0,
    newOcr: 0,
  })
);
