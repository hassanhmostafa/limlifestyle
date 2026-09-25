import { describe, expect, it } from "vitest";
import { eventAnatomyStorageKey } from "./eventAssets";

describe("Events anatomy asset routing", () => {
  it("maps only the two approved anatomy modes to storage keys", () => {
    expect(eventAnatomyStorageKey("muscle")).toBe("body-muscle-v2_e7ba4c5c.png");
    expect(eventAnatomyStorageKey("fat")).toBe("body-fat-v2_1aa1b2ff.png");
    expect(eventAnatomyStorageKey("../../secrets")).toBeNull();
  });
});
