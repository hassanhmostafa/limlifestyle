import { describe, expect, it } from "vitest";
import { shouldShowInstallPrompt } from "../client/src/lib/appRoute";

describe("shouldShowInstallPrompt", () => {
  it("hides the LIM install prompt throughout the standalone events journey", () => {
    expect(shouldShowInstallPrompt("/events")).toBe(false);
    expect(shouldShowInstallPrompt("/events/check-in")).toBe(false);
  });

  it("keeps the prompt available in the main LIM application", () => {
    expect(shouldShowInstallPrompt("/")).toBe(true);
    expect(shouldShowInstallPrompt("/health")).toBe(true);
  });
});
