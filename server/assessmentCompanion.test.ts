import { describe, it, expect, vi } from "vitest";
import {
  freezeQuestionnaire,
  archivedQuestionnaires,
} from "../shared/questionnaireArchive";
import { archivedNursingMeasurements } from "../shared/nursingArchive";
import {
  buildAssessmentCompanion,
  assessmentAnswersPdf,
  deliverAssessmentCompanion,
} from "./assessmentCompanion";
import {
  researchPdfDeliveryCanonicalAck,
  researchPdfDeliverySignature,
} from "./researchPdfDelivery";
import crypto from "node:crypto";
const hash = "a".repeat(64);
function snapshot() {
  return {
    archivedAt: "2026-10-20T09:00:00.000Z",
    metadata: { participantId: "P-1" },
    participant: {
      code: "LIM-1",
      firstName: null,
      age: 35,
      sex: "male",
      city: "جدة",
      mobile: "0500000000",
    },
    lifestyleEnabled: true,
    answers: { _questionnaireVersion: "2026-09-28", fruit: 0, proteins: [] },
    care: {
      approvedAt: "2026-10-20T09:00:00.000Z",
      measurements: {
        blood_glucose: { value: "0", context: "صائم" },
        handgrip: { trial_1: "22.5" },
      },
    },
  } as any;
}
const binding = {
  archiveId: "archive",
  revision: 1,
  reportPdfSha256: hash,
  snapshotSha256: hash,
};
describe("immutable answers archive", () => {
  it("preserves zero, missing and empty multi-select as three different states", () => {
    const q = archivedQuestionnaires(["lifestyle"], snapshot().answers)[0];
    const all = q.sections.flatMap(s => s.questions);
    expect(all.find(q => q.id === "fruit")?.answer).toBe(0);
    expect(all.find(q => q.id === "proteins")?.answer).toEqual([]);
    expect(all.find(q => q.id === "sleepHours")?.answer).toBeNull();
  });
  it("freezes definitions and answers for any questionnaire without a new transport", () => {
    const input: any = {
      id: "other",
      title: "جديد",
      version: "v1",
      sections: [
        {
          id: "s",
          title: "قسم",
          questions: [
            {
              id: "q",
              text: "السؤال",
              type: "radio",
              options: [{ value: "0", label: "لا" }],
            },
          ],
        },
      ],
      answers: { q: 0 },
    };
    const frozen = freezeQuestionnaire(input);
    input.sections[0].questions[0].options[0].label = "changed";
    input.answers.q = 1;
    expect(frozen.sections[0].questions[0].options?.[0].label).toBe("لا");
    expect(frozen.sections[0].questions[0].answer).toBe(0);
  });
  it("refuses to pretend an unknown questionnaire was archived", () => {
    expect(() => archivedQuestionnaires(["unregistered"], {})).toThrow(
      "DEFINITION_REQUIRED"
    );
  });
  it("keeps nursing units, context and zero independently", () => {
    const rows = archivedNursingMeasurements(snapshot().care.measurements);
    expect(rows.find(r => r.id === "nurse_blood_glucose_value")).toMatchObject({
      value: 0,
      unit: "mg/dL",
    });
    expect(rows.find(r => r.id === "nurse_blood_glucose_context")?.value).toBe(
      "صائم"
    );
  });
  it("uses frozen demographics and does not invent absent historical phones", () => {
    const s = snapshot();
    delete s.participant.mobile;
    const c = buildAssessmentCompanion(s, binding);
    expect(c.participant.mobile).toBeNull();
    expect(c.participant.id).toBe("P-1");
  });
  it("generates deterministic PDF bytes for idempotent retries", async () => {
    const c = buildAssessmentCompanion(snapshot(), binding),
      a = await assessmentAnswersPdf(c),
      b = await assessmentAnswersPdf(c);
    expect(a.subarray(0, 5).toString()).toBe("%PDF-");
    expect(a).toEqual(b);
  });
  it("signs the new path and verifies a matching signed ACK", async () => {
    const key = Buffer.alloc(32, 7);
    vi.stubEnv("LIM_RESEARCH_DELIVERY_ENABLED", "true");
    vi.stubEnv(
      "LIM_RESEARCH_ENDPOINT",
      "https://research.example/api/integrations/lim/reports"
    );
    vi.stubEnv("LIM_RESEARCH_KEY_ID", "test");
    vi.stubEnv("LIM_RESEARCH_HMAC_SECRET_BASE64", key.toString("base64"));
    const c = buildAssessmentCompanion(snapshot(), binding);
    const fetchMock = vi.fn(async (url: any, options: any) => {
      expect(String(url)).toBe(
        "https://research.example/api/integrations/lim/companions"
      );
      const bytes = Buffer.from(options.body),
        meta = JSON.parse(
          Buffer.from(options.headers["X-LIM-Metadata"], "base64url").toString()
        );
      expect(meta.bodySha256).toBe(
        crypto.createHash("sha256").update(bytes).digest("hex")
      );
      const ack = Buffer.from(
        JSON.stringify({
          status: "archived",
          archiveId: binding.archiveId,
          revision: 1,
          bodySha256: meta.bodySha256,
        })
      );
      return new Response(ack, {
        status: 200,
        headers: {
          "x-lim-response-signature": researchPdfDeliverySignature(
            researchPdfDeliveryCanonicalAck(
              options.headers["X-LIM-Nonce"],
              ack
            ),
            key
          ),
        },
      });
    });
    try {
      await expect(
        deliverAssessmentCompanion(c, "event", fetchMock as any)
      ).resolves.toEqual({ status: "archived" });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
