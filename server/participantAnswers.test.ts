import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { eventsRouter } from "./routers/events";
import { getEventParticipantSessionByTokenHash } from "./db";
import { approvedResearchContext } from "./participantResearchDelivery";
import {
  buildAssessmentCompanion,
  assessmentAnswersPdf,
} from "./assessmentCompanion";
vi.mock("./db", async original => ({
  ...(await original<typeof import("./db")>()),
  getEventParticipantSessionByTokenHash: vi.fn(),
}));
vi.mock("./participantResearchDelivery", async original => ({
  ...(await original<typeof import("./participantResearchDelivery")>()),
  approvedResearchContext: vi.fn(),
}));
vi.mock("./assessmentCompanion", () => ({
  buildAssessmentCompanion: vi.fn(),
  assessmentAnswersPdf: vi.fn(),
}));
const binding = {
  archiveId: "00000000-0000-4000-8000-000000000001",
  reportRevision: 7,
  snapshotSha256: "a".repeat(64),
};
const input = { ...binding, accessToken: "b".repeat(43) };
const caller = () =>
  eventsRouter.createCaller({
    user: null,
    req: { headers: {} },
    res: {},
  } as any);
beforeEach(() => vi.resetAllMocks());
describe("participant questionnaire PDF access", () => {
  it("rejects an invalid session before reading any approval", async () => {
    vi.mocked(getEventParticipantSessionByTokenHash).mockResolvedValue(
      undefined
    );
    await expect(caller().questionnairePdf(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(approvedResearchContext).not.toHaveBeenCalled();
    expect(assessmentAnswersPdf).not.toHaveBeenCalled();
  });
  it("passes only the token's own session and exact approval binding", async () => {
    vi.mocked(getEventParticipantSessionByTokenHash).mockResolvedValue({
      id: 8,
    } as any);
    vi.mocked(approvedResearchContext).mockRejectedValue(
      new TRPCError({ code: "CONFLICT" })
    );
    await expect(caller().questionnairePdf(input)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(approvedResearchContext).toHaveBeenCalledWith(8, input);
    expect(assessmentAnswersPdf).not.toHaveBeenCalled();
  });
  it("generates answers from the immutable approval and keeps the report filename identity", async () => {
    vi.mocked(getEventParticipantSessionByTokenHash).mockResolvedValue({
      id: 8,
    } as any);
    const snapshot = {
      metadata: {
        participantId: "P-1",
        visitId: "LIM-123456-78",
        reportRevision: 7,
        approvedAt: "2026-10-20T09:00:00.000Z",
      },
    } as any;
    vi.mocked(approvedResearchContext).mockResolvedValue({
      snapshot,
      archive: { ...binding, pdfSha256: "c".repeat(64) },
    } as any);
    vi.mocked(buildAssessmentCompanion).mockReturnValue({
      frozen: true,
    } as any);
    vi.mocked(assessmentAnswersPdf).mockResolvedValue(Buffer.from("%PDF-test"));
    const result = await caller().questionnairePdf(input);
    expect(buildAssessmentCompanion).toHaveBeenCalledWith(
      snapshot,
      expect.objectContaining({
        archiveId: binding.archiveId,
        reportPdfSha256: "c".repeat(64),
      })
    );
    expect(assessmentAnswersPdf).toHaveBeenCalledWith({ frozen: true });
    expect(result.filename).toMatch(/-answers\.pdf$/);
    expect(Buffer.from(result.pdfBase64, "base64").toString()).toBe(
      "%PDF-test"
    );
  });
});
