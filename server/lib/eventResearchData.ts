import { lifestyleSectionsForAnswers } from "../../shared/eventLifestyle";
import { X18MachinePayloadSchema } from "./x18Payload";
const identityKeys = new Set([
  "userID",
  "recordNo",
  "name",
  "sex",
  "age",
  "birthday",
  "address",
  "loginType",
  "measureTime",
]);
const metricKeys = new Set(
  Object.keys(X18MachinePayloadSchema.shape.datas.element.shape).filter(
    k => !identityKeys.has(k)
  )
);
/** Explicit projection: no bearer tokens, credential hashes or unrelated user records. */
export function researchRecord(
  row: any,
  readings: any[],
  includeIdentity: boolean
) {
  const answers = row.answers ?? {};
  const known = new Set(
    lifestyleSectionsForAnswers(answers).flatMap(s =>
      s.questions.map(q => q.id)
    )
  );
  return {
    id: row.id,
    eventCode: row.eventCode,
    participantId: `P-${row.userId}`,
    age: row.age,
    sex: row.sex,
    city: row.city,
    trackId: row.trackId,
    createdAt: row.createdAt,
    questionnaireIds: row.questionnaireIds,
    questionnaireVersion: answers._questionnaireVersion ?? "legacy",
    answers: Object.fromEntries(
      Object.entries(answers).filter(([k]) => known.has(k))
    ),
    testIds: row.testIds,
    measurements: row.measurements ?? {},
    nursingCompletedAt: row.nursingCompletedAt,
    approvedAt: row.approvedAt,
    consultationCompletedAt: row.consultationCompletedAt,
    reportCompletedAt: row.reportCompletedAt,
    ...(includeIdentity
      ? {
          name: row.name,
          phone: row.phone,
          code: row.code,
          recordNo: row.recordNo,
          nurseNotes: row.nurseNotes,
          advice: row.advice,
          doctorName: row.doctorName,
        }
      : {}),
    readings: readings.map(r => ({
      source: r.source,
      recordedAt: r.recordedAt,
      weight: r.weight,
      height: r.height,
      bmi: r.bmi,
      sbp: r.sbp,
      dbp: r.dbp,
      hr: r.hr,
      temperature: r.temperature,
      machineMetrics: includeIdentity
        ? r.machineMetrics
        : Object.fromEntries(
            Object.entries(r.machineMetrics ?? {}).filter(([k]) =>
              metricKeys.has(k)
            )
          ),
      ...(includeIdentity
        ? {
            patientName: r.patientName,
            patientAge: r.patientAge,
            patientSex: r.patientSex,
            recordNo: r.recordNo,
            deviceNo: r.deviceNo,
            notes: r.notes,
          }
        : {}),
    })),
  };
}
