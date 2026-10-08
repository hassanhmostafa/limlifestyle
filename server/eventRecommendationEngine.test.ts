import { beforeEach, describe, expect, it, vi } from "vitest";

const { claim, complete, fail, reading, invoke, models, getDb, readCare, updateCare } = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
  reading: vi.fn(),
  invoke: vi.fn(),
  models: vi.fn(),
  getDb: vi.fn(),
  readCare: vi.fn(),
  updateCare: vi.fn(),
}));

vi.mock("./eventCareDb", () => ({
  claimAutomaticRecommendationGeneration: claim,
  completeAutomaticRecommendationGeneration: complete,
  failAutomaticRecommendationGeneration: fail,
  readCare,
  updateCare,
}));
vi.mock("./db", () => ({ getEventReadingByRecordNo: reading, getDb }));
vi.mock("./_core/llm", () => ({ invokeLLM: invoke, listLLMModels: models }));

import {
  generateAutomaticRecommendationsForSession,
  generatePhysicianRecommendationDraftForSession,
  minimizeBodyReading,
  minimizeNursingMeasurements,
  minimizeQuestionnaire,
} from "./eventRecommendationEngine";

const session = {
  id: 1,
  userId: 7,
  eventCode: "lim-events",
  latestRecordNo: "X18-1",
  answers: { activeDays: "1", activeMinutes: "20", sleepHours: "6", tobacco: "3" },
};
const care = {
  sessionId: 1,
  consultationMode: "automatic",
  nursingEnabled: 1,
  nursingCompletedAt: new Date(),
  revision: 4,
  measurements: { blood_pressure: { systolic: "130", diastolic: "80" } },
};
function dbForSession() {
  return {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [session] }) }) }),
  };
}

describe("automatic Events recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDb.mockResolvedValue(dbForSession());
    readCare.mockResolvedValue(care);
    claim.mockResolvedValue({ state: "claimed", attemptToken: "attempt-1" });
    complete.mockResolvedValue(true);
    updateCare.mockResolvedValue({ revision: 5 });
    models.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    reading.mockResolvedValue([{ height: 170, weight: 70, bmi: 24, sbp: 120, dbp: 80, machineMetrics: { fatRate: "20", skeletalMuscle: "42", arbitrarySecret: "DROP" } }]);
    invoke.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ suggestionIds: ["measurement-followup", "small-goal"] }) } }] });
  });

  it("uses only the structured allowlist and never forwards free-text nursing notes", async () => {
    readCare.mockResolvedValue({ ...care, measurements: { blood_pressure: { systolic: "130", diastolic: "80" }, notes: { notes: "DO NOT FORWARD" }, bone_screening: { device: "DO NOT FORWARD" } } });
    const result = await generateAutomaticRecommendationsForSession(1);
    expect(result).toEqual({ state: "generated", mode: "automatic" });
    const request = invoke.mock.calls[0][0];
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(JSON.stringify(request.messages)).not.toContain("DO NOT FORWARD");
    expect(JSON.stringify(request.messages)).not.toContain("arbitrarySecret");
    expect(complete).toHaveBeenCalledWith(1, expect.objectContaining({
      token: "attempt-1",
      recordNo: "X18-1",
    }), expect.objectContaining({
      model: "gpt-5-mini",
      recommendationMeta: expect.objectContaining({
        suggestionIds: ["measurement-followup", "small-goal"],
        sourceIds: ["RIPPE_LM4_2024_BEHAVIOR"],
      }),
    }));
  });

  it("uses the deterministic urgent blood-pressure path without calling the model", async () => {
    reading.mockResolvedValue([{ height: 170, weight: 70, bmi: 24, sbp: 181, dbp: 80, machineMetrics: { fatRate: "22", skeletalMuscle: "41" } }]);
    const result = await generateAutomaticRecommendationsForSession(1);
    expect(result).toEqual({ state: "generated", mode: "automatic" });
    expect(invoke).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledWith(1, expect.any(Object), expect.objectContaining({
      model: null,
      recommendationMeta: expect.objectContaining({ sourceIds: ["AHA_BP_180_120"] }),
    }));
  });

  it("fails closed when the model returns an ID outside the source-backed allowlist", async () => {
    invoke.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ suggestionIds: ["unreviewed-diagnosis", "sleep-routine"] }) } }] });
    const result = await generateAutomaticRecommendationsForSession(1);
    expect(result).toEqual({ state: "failed" });
    expect(complete).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledWith(1, "attempt-1", expect.any(String));
  });

  it("treats missing questionnaire responses as unknown and strips arbitrary values", () => {
    expect(minimizeQuestionnaire({ activeDays: "NOT_A_VALUE", freeText: "do not send" } as never)).toEqual({});
    expect(minimizeBodyReading({ height: 170, machineMetrics: { skeletalMuscle: "42", notes: "do not send", foo: "x" } })).toEqual({ height: 170, skeletalMuscle: 42 });
    expect(minimizeNursingMeasurements({ bone_screening: { device: "private", site: "private", result: "private" }, blood_pressure: { systolic: "123", arm: "اليمنى", injected: "x" } })).toEqual({ blood_pressure: { systolic: 123, arm: "اليمنى" } });
  });

  it("does not publish when the lease claim reports changed input", async () => {
    claim.mockResolvedValue({ state: "input_changed" });
    const result = await generateAutomaticRecommendationsForSession(1);
    expect(result).toEqual({ state: "input_changed" });
    expect(invoke).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects an X18 partial post even when it has a latest record number", async () => {
    reading.mockResolvedValue([{ sbp: 121, dbp: 79, machineMetrics: { temperature: "36.8" } }]);
    const result = await generateAutomaticRecommendationsForSession(1);
    expect(result).toEqual({ state: "waiting_for_body" });
    expect(claim).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("persists an editable physician-only allowlisted draft without approval", async () => {
    readCare.mockResolvedValue({ ...care, consultationMode: "physician", nursingEnabled: 0, nursingCompletedAt: null });
    const result = await generatePhysicianRecommendationDraftForSession({
      sessionId: 1, trackId: 1, expectedRevision: 4, doctor: { userId: 12, staffId: 8, name: "طبيب تجريبي" },
    });
    expect(result.advice).toContain("توصيات تثقيفية");
    expect(updateCare).toHaveBeenCalledWith(1, expect.objectContaining({ approvedAt: null, recommendationMeta: expect.objectContaining({ reviewRequired: true }) }), false, 1, 4);
  });
});
