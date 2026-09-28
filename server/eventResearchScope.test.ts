import { beforeEach, describe, it, expect, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { getDb } from "./db";
import {
  allowedResearchEvents,
  requireResearchEvent,
  researchPage,
  researcherBySession,
} from "./eventResearchDb";
vi.mock("./db", () => ({ getDb: vi.fn(), getEventReadingByRecordNo: vi.fn() }));
const r = { id: 9, allEvents: 0, includeIdentity: 0 } as any;
let conditions: any[];
function databaseMock() {
  conditions = [];
  // Queue: profiles, distinct visits, grants, visit rows, audit write.
  const results: any[][] = [
    [
      { eventCode: "a", name: "A" },
      { eventCode: "b", name: "B" },
    ],
    [{ eventCode: "a" }, { eventCode: "b" }],
    [{ eventCode: "a" }],
    [],
  ];
  function query() {
    const rows = results.shift() ?? [];
    const q: any = {
      then: (resolve: any) => Promise.resolve(rows).then(resolve),
      from: () => q,
      innerJoin: () => q,
      leftJoin: () => q,
      where: (c: any) => {
        conditions.push(c);
        return q;
      },
      orderBy: () => q,
      limit: () => q,
    };
    return q;
  }
  const db = {
    select: query,
    selectDistinct: query,
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  };
  vi.mocked(getDb).mockResolvedValue(db as never);
  return db;
}
const sqlText = (s: any) => new MySqlDialect().sqlToQuery(s);
beforeEach(() => vi.resetAllMocks());
describe("database event isolation", () => {
  it("only lists granted event codes for restricted researcher", async () => {
    databaseMock();
    expect((await allowedResearchEvents(r)).map(e => e.eventCode)).toEqual([
      "a",
    ]);
  });
  it("denies ungranted event before selecting health data or writing export audit", async () => {
    const db = databaseMock();
    await expect(researchPage(r, "b", 0, 25, "export")).rejects.toThrow(
      "صلاحية"
    );
    expect(db.insert).not.toHaveBeenCalled();
    expect(conditions).toHaveLength(1);
  });
  it("enforces event and consent in the database query, and records page access", async () => {
    const db = databaseMock();
    await researchPage(r, "a", 13, 25, "view");
    const query = sqlText(conditions.at(-1));
    expect(query.sql).toContain("`event_participant_sessions`.`eventCode` = ?");
    expect(query.params).toEqual(["a", "true", 13]);
    expect(db.insert).toHaveBeenCalled();
  });
  it("all-events permission includes known events across tracks", async () => {
    databaseMock();
    const events = await allowedResearchEvents({ ...r, allEvents: 1 });
    expect(events.map(e => e.eventCode)).toEqual(
      expect.arrayContaining(["a", "b"])
    );
  });
  it("session lookup enforces active account, credential version and expiration", async () => {
    databaseMock();
    await researcherBySession("hash");
    const query = sqlText(conditions[0]);
    expect(query.sql).toContain("`credentialVersion`");
    expect(query.sql).toContain("`expiresAt` > ?");
    expect(query.sql).toContain("`active` = ?");
  });
});
