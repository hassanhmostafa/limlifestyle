import { describe, expect, it } from "vitest";
import { resolveAutomaticCareStatus } from "../client/src/lib/eventCareStatus";

const now = Date.parse("2026-10-08T20:00:00.000Z");

describe("automatic Events participant status", () => {
  it("never labels a provider failure as waiting for nursing when nursing is disabled", () => {
    const status = resolveAutomaticCareStatus(
      {
        nursingEnabled: false,
        nursingCompletedAt: null,
        autoGenerationState: "failed",
        autoGenerationError: "internal provider error",
      },
      true,
      false,
      now
    );

    expect(status).toEqual(
      expect.objectContaining({ kind: "retry", canRetry: true })
    );
    expect(status.message).not.toContain("التمريض");
  });

  it("distinguishes body, nursing, active lease, expired lease, and retry-cap states", () => {
    expect(
      resolveAutomaticCareStatus({ nursingEnabled: false }, false, false, now)
        .kind
    ).toBe("waiting_body");
    expect(
      resolveAutomaticCareStatus(
        { nursingEnabled: true, nursingCompletedAt: null },
        true,
        false,
        now
      ).kind
    ).toBe("waiting_nursing");
    expect(
      resolveAutomaticCareStatus(
        {
          nursingEnabled: false,
          autoGenerationState: "generating",
          autoGenerationLeaseExpiresAt: new Date(now + 30_000),
        },
        true,
        false,
        now
      ).kind
    ).toBe("generating");
    expect(
      resolveAutomaticCareStatus(
        {
          nursingEnabled: false,
          autoGenerationState: "generating",
          autoGenerationLeaseExpiresAt: new Date(now - 1),
        },
        true,
        false,
        now
      ).kind
    ).toBe("retry");
    expect(
      resolveAutomaticCareStatus(
        {
          nursingEnabled: false,
          autoGenerationState: "retry_limit",
        },
        true,
        false,
        now
      ).kind
    ).toBe("retry_limit");
  });
});
