import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb }));

import {
  claimAutomaticRecommendationGeneration,
  completeAutomaticRecommendationGeneration,
} from "./eventCareDb";

function fakeDatabase(rows: unknown[]) {
  const queue = [...rows];
  const updates: Record<string, unknown>[] = [];
  const db: any = {
    transaction: async <T>(fn: (tx: any) => Promise<T>) => fn(db),
    select: () => ({
      from: () => ({
        where: () => ({
          for: async () => [queue.shift()],
          limit: async () => [queue.shift()],
        }),
      }),
    }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: async () => { updates.push(patch); return [{ affectedRows: 1 }]; },
      }),
    }),
  };
  return { db, updates };
}

const session = { id: 9, eventCode: "lim-events", latestRecordNo: "R1" };
const baseCare = {
  sessionId: 9,
  consultationMode: "automatic" as const,
  nursingEnabled: 1,
  nursingCompletedAt: new Date(),
  approvedAt: null,
  revision: 4,
  autoGenerationState: "failed",
  autoGenerationAttempts: 1,
  autoGenerationFingerprint: "same",
  autoGenerationLeaseExpiresAt: null,
};

describe("Events automatic recommendation lease", () => {
  beforeEach(() => vi.resetAllMocks());

  it("reclaims an expired crash lease and marks a fresh attempt token", async () => {
    const { db, updates } = fakeDatabase([
      session,
      { ...baseCare, autoGenerationState: "generating", autoGenerationLeaseExpiresAt: new Date(Date.now() - 1_000) },
    ]);
    getDb.mockResolvedValue(db);
    const claimed = await claimAutomaticRecommendationGeneration(9, { fingerprint: "same", inputRevision: 4, recordNo: "R1" });
    expect(claimed.state).toBe("claimed");
    expect(updates[0]).toMatchObject({ autoGenerationState: "generating", autoGenerationAttempts: 2, autoGenerationRecordNo: "R1", autoGenerationInputRevision: 4 });
    expect(updates[0].autoGenerationAttemptToken).toEqual(expect.stringMatching(/^[a-f0-9]{48}$/));
  });

  it("reports a live lease as busy and never creates a competing attempt", async () => {
    const { db, updates } = fakeDatabase([
      session,
      { ...baseCare, autoGenerationState: "generating", autoGenerationLeaseExpiresAt: new Date(Date.now() + 60_000) },
    ]);
    getDb.mockResolvedValue(db);
    await expect(claimAutomaticRecommendationGeneration(9, { fingerprint: "same", inputRevision: 4, recordNo: "R1" }))
      .resolves.toEqual({ state: "busy" });
    expect(updates).toHaveLength(0);
  });

  it("starts a fresh attempt when substantive input changes under the same record number", async () => {
    const { db, updates } = fakeDatabase([
      session,
      { ...baseCare, autoGenerationAttempts: 2, autoGenerationFingerprint: "old-body-fingerprint", autoGenerationRecordNo: "R1" },
    ]);
    getDb.mockResolvedValue(db);
    const claimed = await claimAutomaticRecommendationGeneration(9, { fingerprint: "new-body-fingerprint", inputRevision: 4, recordNo: "R1" });
    expect(claimed.state).toBe("claimed");
    expect(updates[0]).toMatchObject({ autoGenerationAttempts: 1, autoGenerationFingerprint: "new-body-fingerprint", autoGenerationRecordNo: "R1" });
  });

  it("does not publish a leased result after the body record changes", async () => {
    const { db, updates } = fakeDatabase([
      { ...session, latestRecordNo: "R2" },
      {
        ...baseCare,
        autoGenerationState: "generating",
        autoGenerationAttemptToken: "token",
        autoGenerationFingerprint: "fingerprint",
        autoGenerationInputRevision: 4,
        autoGenerationLeaseExpiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    getDb.mockResolvedValue(db);
    const published = await completeAutomaticRecommendationGeneration(9, {
      token: "token", fingerprint: "fingerprint", inputRevision: 4, recordNo: "R1",
    }, { advice: "stale", recommendationMeta: {}, model: "gpt-5-mini" });
    expect(published).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it("does not publish an older token when the same record was re-claimed after input changed", async () => {
    const { db, updates } = fakeDatabase([
      session,
      {
        ...baseCare,
        autoGenerationState: "generating",
        autoGenerationAttemptToken: "new-token",
        autoGenerationFingerprint: "new-body-fingerprint",
        autoGenerationInputRevision: 4,
        autoGenerationRecordNo: "R1",
        autoGenerationLeaseExpiresAt: new Date(Date.now() + 60_000),
      },
    ]);
    getDb.mockResolvedValue(db);
    const published = await completeAutomaticRecommendationGeneration(9, {
      token: "old-token", fingerprint: "old-body-fingerprint", inputRevision: 4, recordNo: "R1",
    }, { advice: "stale", recommendationMeta: {}, model: "gpt-5-mini" });
    expect(published).toBe(false);
    expect(updates).toHaveLength(0);
  });
});
