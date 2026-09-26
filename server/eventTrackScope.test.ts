import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/mysql-proxy";
import { getTableColumns } from "drizzle-orm";
import { eventStaff } from "../drizzle/schema";
import { getDb } from "./db";
import { findSession } from "./eventCareDb";
import {
  staffBySessionHash,
  changeStaff,
  selectRegistrationTrack,
} from "./eventTracksDb";
vi.mock("./db", () => ({ getDb: vi.fn() }));
const queries: { sql: string; params: unknown[] }[] = [];
let rows: unknown[][] = [];
beforeEach(() => {
  queries.length = 0;
  rows = [];
  const db = drizzle(async (sql, params) => {
    queries.push({ sql, params });
    return {
      rows: sql.startsWith("select")
        ? rows
        : [{ insertId: 0, affectedRows: 1 }],
    };
  });
  vi.mocked(getDb).mockResolvedValue(db as never);
});
describe("database authorization predicates", () => {
  it("includes event and track in exact phone and ID lookups", async () => {
    await findSession({ phone: "+966501234567" }, 4);
    expect(queries[0].sql).toContain(
      "`event_participant_sessions`.`trackId` = ?"
    );
    expect(queries[0].params).toContain(4);
    expect(queries[0].params).toContain("lim-events");
    await findSession({ id: 88 }, 4);
    expect(queries[1].params).toContain(88);
    expect(queries[1].params).toContain(4);
  });
  it("checks expiry, credential version, staff and track activation in the session query", async () => {
    await staffBySessionHash("hash");
    const query = queries[0].sql;
    expect(query).toContain("`event_staff_sessions`.`expiresAt` > ?");
    expect(query).toContain(
      "`event_staff_sessions`.`credentialVersion` = `event_staff`.`credentialVersion`"
    );
    expect(query).toContain("`event_staff`.`active` = ?");
    expect(query).toContain("`event_tracks`.`active` = ?");
    expect(queries[0].params).toContain("lim-events");
  });
  it("increments credential version on rotation and revocation", async () => {
    const staff = {
      id: 7,
      eventCode: "lim-events",
      userId: null,
      trackId: 1,
      name: "اختبار",
      codeHash: "old",
      credentialVersion: 1,
      duty: "doctor",
      active: 1,
    };
    rows = [
      Object.keys(getTableColumns(eventStaff)).map(
        key => staff[key as keyof typeof staff]
      ),
    ];
    await changeStaff(7, { codeHash: "new" });
    await changeStaff(7, { active: false });
    const updates = queries.filter(q => q.sql.startsWith("update"));
    expect(updates).toHaveLength(2);
    for (const q of updates)
      expect(q.sql).toContain("`event_staff`.`credentialVersion` + 1");
    expect(updates[1].params).toContain(0);
  });
  it("requires explicit selection with multiple active tracks", async () => {
    rows = [
      [1, "lim-events", "الأول", 1],
      [2, "lim-events", "الثاني", 1],
    ];
    await expect(selectRegistrationTrack()).rejects.toThrow("اختر المسار");
    rows = [];
    await expect(selectRegistrationTrack(9)).rejects.toThrow("المسار غير متاح");
    expect(queries.at(-1)?.sql).toContain("`event_tracks`.`active` = ?");
  });
});
