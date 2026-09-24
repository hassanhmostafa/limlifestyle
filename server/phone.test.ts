import { describe, expect, it } from "vitest";
import { normalizeSaudiMobilePhone, toMachineUserId } from "./lib/phone";

describe("Saudi mobile normalization", () => {
  it("accepts national and international forms", () => {
    expect(normalizeSaudiMobilePhone("0563817217")).toEqual({ ok: true, e164: "+966563817217", national: "0563817217" });
    expect(normalizeSaudiMobilePhone("+966 56 381 7217")).toEqual({ ok: true, e164: "+966563817217", national: "0563817217" });
    expect(normalizeSaudiMobilePhone("00966563817217")).toEqual({ ok: true, e164: "+966563817217", national: "0563817217" });
  });

  it("rejects non-mobile and malformed values", () => {
    expect(normalizeSaudiMobilePhone("+966 12 345 6789")).toEqual({ ok: false });
    expect(normalizeSaudiMobilePhone("123")).toEqual({ ok: false });
  });

  it("returns the local format required by the X18 userID field", () => {
    expect(toMachineUserId("+966563817217")).toBe("0563817217");
  });
});
