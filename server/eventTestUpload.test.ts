import { describe, expect, it } from "vitest";
import { createEventTestUploadKey, verifyEventTestUploadKey } from "./lib/eventTestUpload";

const claim = {
  userId: 42,
  phone: "+966501234567",
  recordNo: "EVENT-TEST-123",
  deviceNo: "EVENTS_TEST",
};

describe("Events temporary test upload credential", () => {
  it("accepts only the exact user, phone, record, and virtual test device", () => {
    const key = createEventTestUploadKey(claim);
    expect(verifyEventTestUploadKey(key, claim)).toBe(true);
    expect(verifyEventTestUploadKey(key, { ...claim, recordNo: "OTHER" })).toBe(false);
    expect(verifyEventTestUploadKey(key, { ...claim, deviceNo: "G260820131014906" })).toBe(false);
    expect(verifyEventTestUploadKey(key, { ...claim, userId: 99 })).toBe(false);
  });

  it("rejects malformed temporary credentials", () => {
    expect(verifyEventTestUploadKey("lim_event_test.bad.signature", claim)).toBe(false);
    expect(verifyEventTestUploadKey(undefined, claim)).toBe(false);
  });
});
