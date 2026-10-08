import { beforeEach, describe, expect, it, vi } from "vitest";

const { claim, complete, fail, reading, invoke, models } = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
  reading: vi.fn(),
  invoke: vi.fn(),
  models: vi.fn(),
}));

vi.mock("./eventCareDb", () => ({
  claimAutomaticRecommendationGeneration: claim,
  completeAutomaticRecommendationGeneration: complete,
  failAutomaticRecommendationGeneration: fail,
}));
vi.mock("./db", () => ({ getEventReadingByRecordNo: reading }));
vi.mock("./_core/llm", () => ({ invokeLLM: invoke, listLLMModels: models }));

import { generateAutomaticRecommendationsForSession } from "./eventRecommendationEngine";

const baseClaim = () => ({
  state: "claimed" as const,
  session: { userId: 7, latestRecordNo: "X18-1", answers: { activeDays: "1", activeMinutes: "20", sleepHours: "6", tobacco: "3" } },
  care: { measurements: { blood_pressure: { systolic: "130", diastolic: "80" } } },
});

describe("automatic Events recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    models.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
    reading.mockResolvedValue([{ height: 170, weight: 70, bmi: 24, sbp: 120, dbp: 80, machineMetrics: { fatRate: "20" } }]);
    invoke.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ suggestionIds: ["measurement-followup", "small-goal"] }) } }] });
  });

  it("uses only the structured allowlist and never forwards free-text nursing notes", async () => {
    claim.mockResolvedValue({
      ...baseClaim(),
      care: { measurements: { blood_pressure: { systolic: "130", diastolic: "80" }, notes: { notes: "DO NOT FORWARD" } } },
    });
    const result = await generateAutomaticRecommendationsForSession(1);
    expect(result).toEqual({ state: "generated", mode: "automatic" });
    const request = invoke.mock.calls[0][0];
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(JSON.stringify(request.messages)).not.toContain("DO NOT FORWARD");
    expect(complete).toHaveBeenCalledWith(1, expect.objectContaining({
      model: "gpt-5-mini",
      recommendationMeta: expect.objectContaining({
        suggestionIds: ["measurement-followup", "small-goal"],
        sourceIds: ["RIPPE_BEHAVIOR"],
      }),
    }));
  });

  it("uses the deterministic urgent blood-pressure path without calling the model", async () => {
    claim.mockResolvedValue(baseClaim());
    reading.mockResolvedValue([{ sbp: 181, dbp: 80, machineMetrics: {} }]);
    const result = await generateAutomaticRecommendationsForSession(1);
    expect(result).toEqual({ state: "generated", mode: "automatic" });
    expect(invoke).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledWith(1, expect.objectContaining({
      model: null,
      recommendationMeta: expect.objectContaining({ sourceIds: ["AHA_BP_180_120"] }),
    }));
  });

  it("fails closed when the model returns an ID outside the source-backed allowlist", async () => {
    claim.mockResolvedValue(baseClaim());
    invoke.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ suggestionIds: ["unreviewed-diagnosis", "sleep-routine"] }) } }] });
    const result = await generateAutomaticRecommendationsForSession(1);
    expect(result).toEqual({ state: "failed" });
    expect(complete).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledWith(1, expect.any(String));
  });
});
