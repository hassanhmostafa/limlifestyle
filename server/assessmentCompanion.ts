import crypto from "node:crypto";
import { eventText, type EventLanguage } from "../shared/eventTranslations";
import { readFile } from "node:fs/promises";
import { jsPDF } from "jspdf";
import type { AssessmentCompanion } from "../shared/assessmentCompanion";
import { COMPANION_PATH } from "../shared/assessmentCompanion";
import { archivedQuestionnaires } from "../shared/questionnaireArchive";
import { archivedNursingMeasurements } from "../shared/nursingArchive";
import type { EventReportSnapshot } from "./eventReportArchive";
import {
  researchPdfDeliveryConfig,
  researchPdfDeliveryCanonicalAck,
  researchPdfDeliverySignature,
} from "./researchPdfDelivery";

export function buildAssessmentCompanion(
  snapshot: EventReportSnapshot,
  binding: AssessmentCompanion["binding"]
): AssessmentCompanion {
  return {
    version: 1,
    approvedAt: snapshot.care.approvedAt,
    binding,
    participant: {
      id: snapshot.metadata?.participantId ?? null,
      code: snapshot.participant.code,
      name: snapshot.participant.firstName,
      mobile: snapshot.participant.mobile ?? null,
      city: snapshot.participant.city ?? null,
      age: snapshot.participant.age,
      sex: snapshot.participant.sex,
    },
    questionnaires:
      snapshot.questionnaires ??
      archivedQuestionnaires(
        snapshot.lifestyleEnabled ? ["lifestyle"] : [],
        snapshot.answers
      ),
    nursing:
      snapshot.nursing ??
      archivedNursingMeasurements(snapshot.care.measurements),
  };
}

/** Text PDF, generated from the same immutable data that crosses the bridge. */
export async function assessmentAnswersPdf(
  data: AssessmentCompanion,
  language: EventLanguage = "ar"
) {
  const t = (text: string) => eventText(text, language);
  const font = await readFile(
    new URL("./assets/DejaVuSans.ttf", import.meta.url)
  ).catch(() =>
    readFile(new URL("../server/assets/DejaVuSans.ttf", import.meta.url))
  );
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setFileId(
    crypto
      .createHash("sha256")
      .update(JSON.stringify(data) + (language === "en" ? ":en" : ""))
      .digest("hex")
      .slice(0, 32)
  );
  // A deterministic timestamp makes exact retry bytes stable.
  const dateStamp = new Date(data.approvedAt)
    .toISOString()
    .slice(0, 19)
    .replace(/\D/g, "");
  pdf.setCreationDate(`D:${dateStamp}+00'00'`);
  pdf.addFileToVFS("DejaVuSans.ttf", font.toString("base64"));
  pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  pdf.setFont("DejaVu");
  let y = 18;
  const line = (text: string, size = 11) => {
    pdf.setFontSize(size);
    for (const l of pdf.splitTextToSize(t(text), 174)) {
      if (y > 276) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(l, language === "ar" ? 194 : 18, y, {
        align: language === "ar" ? "right" : "left",
      });
      y += size === 15 ? 9 : 7;
    }
  };
  line("LIM — إجابات الاستبيانات", 15);
  line(
    `${t("معرّف الفحص:")} ${data.participant.code} | ${t("المراجعة:")} ${data.binding.revision}`
  );
  if (data.participant.name) line(`${t("الاسم:")} ${data.participant.name}`);
  line(`${t("مرجع الأرشيف:")} ${data.binding.archiveId}`, 9);
  y += 4;
  if (!data.questionnaires.length)
    line("لم يكن هناك استبيان مفعّل لهذا الفحص.");
  for (const q of data.questionnaires) {
    if (y > 235) {
      pdf.addPage();
      y = 18;
    }
    line(q.title, 15);
    line("نسخة الاستبيان:", 10);
    pdf.setFontSize(10);
    pdf.text(q.version, 18, y, { align: "left" });
    y += 9;
    for (const s of q.sections) {
      line(s.title, 12);
      if (s.intro) line(s.intro, 10);
      for (const question of s.questions) {
        const values =
          question.answer === null
            ? null
            : Array.isArray(question.answer)
              ? question.answer
              : [question.answer];
        const display =
          values === null
            ? "لم تُسجّل إجابة"
            : values.length === 0
              ? "لم يُختر أي خيار"
              : values
                  .map(v =>
                    t(
                      question.options?.find(o => o.value === String(v))
                        ?.label ?? String(v)
                    )
                  )
                  .join(language === "ar" ? "، " : ", ");
        pdf.setFontSize(11);
        const required =
          (pdf.splitTextToSize(t(question.text), 174).length +
            pdf.splitTextToSize(t("الإجابة:") + " " + t(display), 174).length) *
            7 +
          (values?.length ? 9 : 0) +
          2;
        if (y + required > 276 && required < 250) {
          pdf.addPage();
          y = 18;
        }
        line(question.text);
        line(t("الإجابة:") + " " + t(display));
        y += 2;
        if (values?.length) {
          pdf.setFontSize(9);
          pdf.text("Code: " + values.join(", "), 18, y, { align: "left" });
          y += 8;
        }
      }
    }
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFontSize(9);
    pdf.setTextColor(90);
    pdf.text(data.participant.code, 18, 289, { align: "left" });
    pdf.text(`${page} / ${pages}`, 194, 289, { align: "right" });
  }
  return Buffer.from(pdf.output("arraybuffer"));
}

export async function deliverAssessmentCompanion(
  data: AssessmentCompanion,
  eventCode: string,
  fetchImpl: typeof fetch = fetch
) {
  const config = researchPdfDeliveryConfig();
  if (!config) throw new Error("COMPANION_DISABLED");
  const pdf = await assessmentAnswersPdf(data);
  const body = Buffer.from(
    JSON.stringify({ data, answersPdfBase64: pdf.toString("base64") })
  );
  if (body.length > 3 * 1024 * 1024) throw new Error("COMPANION_SIZE_LIMIT");
  const hash = crypto.createHash("sha256").update(body).digest("hex");
  const metadata = {
    contractVersion: 1,
    sourceSystem: "lim-lifestyle",
    archiveId: data.binding.archiveId,
    revision: data.binding.revision,
    eventCode,
    reportPdfSha256: data.binding.reportPdfSha256,
    size: body.length,
    bodySha256: hash,
  };
  const encoded = Buffer.from(JSON.stringify(metadata)).toString("base64url"),
    nonce = crypto.randomUUID(),
    timestamp = String(Math.floor(Date.now() / 1000));
  const signature = researchPdfDeliverySignature(
    [
      "LIM_RESEARCH_REQUEST_V1",
      "POST",
      COMPANION_PATH,
      config.keyId,
      timestamp,
      nonce,
      encoded,
      hash,
    ].join("\n"),
    config.signingKey
  );
  const url = new URL(config.url);
  url.pathname = COMPANION_PATH;
  const response = await fetchImpl(url, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(config.timeoutMs),
    headers: {
      "Content-Type": "application/json",
      "Accept-Encoding": "identity",
      "X-LIM-Key-Id": config.keyId,
      "X-LIM-Timestamp": timestamp,
      "X-LIM-Nonce": nonce,
      "X-LIM-Metadata": encoded,
      "X-LIM-Signature": signature,
    },
    body: new Uint8Array(body),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (response.status !== 200 || bytes.length > 16384)
    throw new Error("COMPANION_ACK_FAILED");
  const expected = researchPdfDeliverySignature(
      researchPdfDeliveryCanonicalAck(nonce, bytes),
      config.signingKey
    ),
    actual = response.headers.get("x-lim-response-signature") ?? "";
  if (
    !/^[a-f0-9]{64}$/.test(actual) ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  )
    throw new Error("COMPANION_ACK_SIGNATURE");
  const ack = JSON.parse(bytes.toString("utf8"));
  if (
    ack.status !== "archived" ||
    ack.archiveId !== data.binding.archiveId ||
    ack.revision !== data.binding.revision ||
    ack.bodySha256 !== hash
  )
    throw new Error("COMPANION_ACK_BINDING");
  return { status: "archived" as const };
}
