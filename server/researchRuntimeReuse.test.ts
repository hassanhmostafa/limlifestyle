import { describe, expect, it } from "vitest";
import { researchPdfDeliveryConfig } from "./researchPdfDelivery";
const secret = Buffer.alloc(32, 7).toString("base64");
const env = {
  LIM_RESEARCH_DELIVERY_ENABLED: "true",
  LIM_RESEARCH_ENDPOINT:
    "https://receiver.invalid/api/integrations/lim/reports",
  LIM_RESEARCH_SOURCE_KEY_ID: "existing_key",
  LIM_RESEARCH_SOURCE_HMAC_SECRET_BASE64: secret,
};
describe("reuse existing protected Research signing pair", () => {
  it("inherits only the explicitly matched existing production deployment and honors an explicit off switch", () => {
    const production = {
      LIM_RESEARCH_SOURCE_ENABLED: "true",
      LIM_RESEARCH_SOURCE_EVENT_CODE: "lim-events",
      LIM_RESEARCH_SOURCE_KEY_ID: "lim-research-live-20261018",
      LIM_RESEARCH_SOURCE_HMAC_SECRET_BASE64: secret,
    };
    expect(researchPdfDeliveryConfig(production)?.url).toBe(
      "https://limresearch-tq2kmayk.manus.space/api/integrations/lim/reports"
    );
    expect(
      researchPdfDeliveryConfig({
        ...production,
        LIM_RESEARCH_DELIVERY_ENABLED: "false",
      })
    ).toBeUndefined();
    expect(
      researchPdfDeliveryConfig({
        ...production,
        LIM_RESEARCH_SOURCE_EVENT_CODE: "other-event",
      })
    ).toBeUndefined();
    expect(
      researchPdfDeliveryConfig({
        ...production,
        LIM_RESEARCH_SOURCE_KEY_ID: "other-key",
      })
    ).toBeUndefined();
  });
  it("reuses the exact existing binary key only when delivery is explicitly enabled", () => {
    const config = researchPdfDeliveryConfig(env);
    expect(config?.keyId).toBe("existing_key");
    expect(config?.signingKey).toEqual(Buffer.from(secret, "base64"));
    expect(
      researchPdfDeliveryConfig({
        ...env,
        LIM_RESEARCH_DELIVERY_ENABLED: "false",
      })
    ).toBeUndefined();
  });
  it("does not mix incomplete explicit credentials with existing ones", () => {
    expect(
      researchPdfDeliveryConfig({ ...env, LIM_RESEARCH_KEY_ID: "new_key" })
    ).toBeUndefined();
    expect(
      researchPdfDeliveryConfig({
        ...env,
        LIM_RESEARCH_HMAC_SECRET_BASE64: secret,
      })
    ).toBeUndefined();
  });
  it("prefers a complete dedicated pair and rejects an invalid fallback", () => {
    expect(
      researchPdfDeliveryConfig({
        ...env,
        LIM_RESEARCH_KEY_ID: "dedicated",
        LIM_RESEARCH_HMAC_SECRET_BASE64: secret,
      })?.keyId
    ).toBe("dedicated");
    expect(
      researchPdfDeliveryConfig({
        ...env,
        LIM_RESEARCH_SOURCE_HMAC_SECRET_BASE64: "invalid",
      })
    ).toBeUndefined();
  });
});
