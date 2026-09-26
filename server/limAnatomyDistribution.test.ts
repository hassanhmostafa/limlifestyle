import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LIMAnatomyDistribution } from "../client/src/components/LIMAnatomyDistribution";

describe("LIMAnatomyDistribution", () => {
  it("uses one shared professional board with connected measurement callouts", () => {
    const markup = renderToStaticMarkup(createElement(LIMAnatomyDistribution, {
      mode: "muscle",
      language: "ar",
      values: {
        muscleRightArm: "3.1",
        muscleLeftArm: "2.5",
        muscleTrunk: "23.3",
        muscleRightLeg: "6.3",
        muscleLeftLeg: "6.2",
      },
    }));

    expect(markup).toContain("lim-anatomy-stage");
    expect(markup).toContain("lim-segment-target");
    expect(markup).toContain("/api/events/anatomy/muscle");
    expect(markup).toContain("الذراع اليمنى");
    expect(markup).toContain("الجذع");
    expect(markup).toContain("6.2 kg");
  });

  it("keeps the same board structure when displaying fat distribution", () => {
    const markup = renderToStaticMarkup(createElement(LIMAnatomyDistribution, {
      mode: "fat",
      language: "en",
      values: { fatTrunk: "15.3" },
    }));

    expect(markup).toContain("lim-segment-fat");
    expect(markup).toContain("/api/events/anatomy/fat");
    expect(markup).toContain("Trunk");
  });

  it("keeps fat leader lines visible outside the Events report color scope", () => {
    const css = readFileSync(resolve(process.cwd(), "client/src/styles/event-results.css"), "utf8");
    expect(css).toContain(".lim-segment-fat::after, .lim-segment-fat::before, .lim-segment-fat .lim-segment-target");
    expect(css).toContain("var(--lim-coral, #ef806d)");
  });
});
