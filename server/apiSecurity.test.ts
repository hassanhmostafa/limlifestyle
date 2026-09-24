import { describe, expect, it } from "vitest";
import { apiKeysMatch, createDeviceApiKey, hashApiKey, readBearerToken, readDeviceApiKey } from "./lib/apiSecurity";

describe("LIM API credentials", () => {
  it("generates a compact alpha-numeric key suitable for X18 settings", () => {
    const key = createDeviceApiKey();
    expect(key).toMatch(/^lim_x18_[A-Za-z0-9]{16}$/);
    expect(key).toHaveLength("lim_x18_".length + 16);
  });

  it("matches only the correct hashed device key", () => {
    const key = "lim_x18_test_device_key";
    const hash = hashApiKey(key);
    expect(apiKeysMatch(key, hash)).toBe(true);
    expect(apiKeysMatch("lim_x18_wrong", hash)).toBe(false);
    expect(apiKeysMatch(undefined, hash)).toBe(false);
  });

  it("prefers a dedicated device header and supports X18 URL-key fallback", () => {
    expect(readDeviceApiKey({ headers: { "x-lim-device-key": "header-key" }, query: { apiKey: "url-key" } })).toBe("header-key");
    expect(readDeviceApiKey({ headers: {}, query: { apiKey: "url-key" } })).toBe("url-key");
  });

  it("extracts a Bearer token only when the scheme is valid", () => {
    expect(readBearerToken({ headers: { authorization: "Bearer participant-token" } })).toBe("participant-token");
    expect(readBearerToken({ headers: { authorization: "Basic abc" } })).toBeUndefined();
  });
});
