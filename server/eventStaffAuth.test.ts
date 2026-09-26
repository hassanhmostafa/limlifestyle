import { describe, expect, it } from "vitest";
import {
  createStaffCode,
  normalizeStaffCode,
  readStaffToken,
  checkStaffLoginRate,
} from "./lib/eventStaffAuth";
describe("staff credentials", () => {
  it("generates independent credentials and supports grouped paste input", () => {
    const a = createStaffCode();
    const b = createStaffCode();
    expect(a).not.toBe(b);
    expect(normalizeStaffCode(a)).toMatch(/^LIM[0-9A-F]{24}$/);
    expect(normalizeStaffCode(" lim-abcd ef-123456-ABCDEF-123456 ")).toBe(
      "LIMABCDEF123456ABCDEF123456"
    );
  });
  it("ignores the participant cookie and malformed staff tokens", () => {
    expect(
      readStaffToken({
        headers: { cookie: `lim-events-session-token=${"a".repeat(43)}` },
      })
    ).toBeNull();
    expect(
      readStaffToken({ headers: { cookie: "lim_event_staff=123" } })
    ).toBeNull();
  });
  it("limits guesses and permits retry after the window expires", () => {
    for (let i = 0; i < 20; i++) checkStaffLoginRate("limiter-test", 1000);
    expect(() => checkStaffLoginRate("limiter-test", 1001)).toThrow("محاولات");
    expect(() => checkStaffLoginRate("limiter-test", 601001)).not.toThrow();
  });
});
