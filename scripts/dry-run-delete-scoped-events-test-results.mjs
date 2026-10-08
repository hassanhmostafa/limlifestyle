// Safe-by-default cleanup for proven historical Events test results.
// Without --apply this script only reports counts. It never prints IDs, phones,
// names, tokens, advice, or measurement values.
import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

function connectionOptions(databaseUrl) {
  const url = new URL(databaseUrl);
  const rawSsl = url.searchParams.get("ssl");
  if (!rawSsl) return url.toString();
  url.searchParams.delete("ssl");
  try {
    const parsed = JSON.parse(rawSsl);
    if (parsed && typeof parsed === "object") return { uri: url.toString(), ssl: parsed };
  } catch {
    const managed = rawSsl.match(/^\{\s*rejectUnauthorized\s*:\s*(true|false)\s*\}$/);
    if (managed) return { uri: url.toString(), ssl: { rejectUnauthorized: managed[1] === "true" } };
    url.searchParams.set("ssl", rawSsl);
  }
  return url.toString();
}

const provenMarker = "(h.deviceNo = 'EVENTS_TEST' OR h.recordNo LIKE 'EVENT-TEST-%' OR h.notes LIKE 'LIM Events test upload%')";
const linkedSimulator = "(h.source = 'simulator' AND EXISTS (SELECT 1 FROM event_participant_sessions s WHERE s.eventCode = 'lim-events' AND s.userId = h.userId AND s.latestRecordNo = h.recordNo))";
const candidateWhere = `(${provenMarker} OR ${linkedSimulator})`;
const apply = process.argv.includes("--apply");
const confirmation = process.env.EVENTS_TEST_CLEANUP_CONFIRM === "DELETE_PROVEN_EVENT_TEST_RESULTS";

const connection = await mysql.createConnection(connectionOptions(process.env.DATABASE_URL));
try {
  const [[counts]] = await connection.query(`
    SELECT
      SUM(CASE WHEN ${provenMarker} THEN 1 ELSE 0 END) AS proven_marker_rows,
      SUM(CASE WHEN ${linkedSimulator} THEN 1 ELSE 0 END) AS exact_event_simulator_rows,
      SUM(CASE WHEN ${candidateWhere} THEN 1 ELSE 0 END) AS total_deletable_result_rows,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM event_participant_sessions s WHERE s.eventCode = 'lim-events' AND s.userId = h.userId AND s.latestRecordNo = h.recordNo) AND ${candidateWhere} THEN 1 ELSE 0 END) AS event_session_links_to_clear,
      SUM(CASE WHEN h.source = 'x18' AND EXISTS (SELECT 1 FROM event_participant_sessions s WHERE s.eventCode = 'lim-events' AND s.userId = h.userId) THEN 1 ELSE 0 END) AS retained_physical_x18_rows,
      SUM(CASE WHEN h.source NOT IN ('x18','x18_test','simulator') AND EXISTS (SELECT 1 FROM event_participant_sessions s WHERE s.eventCode = 'lim-events' AND s.userId = h.userId) THEN 1 ELSE 0 END) AS retained_ambiguous_shared_rows
    FROM health_readings h
  `);
  console.log(JSON.stringify({ mode: apply ? "apply-requested" : "dry-run", scope: "proven Events test markers plus simulator readings currently linked to an Events visit", counts }, null, 2));
  console.log("Retained by design: every physical X18 row, ambiguous/shared non-test row, participant account, event visit, care row, staff row, track, profile, setting, and research record.");

  if (!apply) {
    console.log("Dry run only. To request the transactional deletion, run with --apply and set EVENTS_TEST_CLEANUP_CONFIRM=DELETE_PROVEN_EVENT_TEST_RESULTS after owner review.");
    process.exitCode = 0;
  } else if (!confirmation) {
    console.error("No deletion performed: the exact confirmation environment value is required.");
    process.exitCode = 2;
  } else {
    await connection.beginTransaction();
    try {
      await connection.query("CREATE TEMPORARY TABLE scoped_events_test_results (id int PRIMARY KEY, userId int NOT NULL, recordNo varchar(64) NOT NULL)");
      await connection.query(`INSERT INTO scoped_events_test_results (id, userId, recordNo) SELECT h.id, h.userId, h.recordNo FROM health_readings h WHERE ${candidateWhere}`);
      const [unlinked] = await connection.query(`
        UPDATE event_participant_sessions s
        INNER JOIN scoped_events_test_results t ON t.userId = s.userId AND t.recordNo = s.latestRecordNo
        SET s.latestRecordNo = NULL, s.status = 'checked_in', s.consultationCompletedAt = NULL, s.reportCompletedAt = NULL, s.updatedAt = NOW()
        WHERE s.eventCode = 'lim-events'
      `);
      const [deleted] = await connection.query("DELETE h FROM health_readings h INNER JOIN scoped_events_test_results t ON t.id = h.id");
      await connection.query("DROP TEMPORARY TABLE scoped_events_test_results");
      await connection.commit();
      console.log(JSON.stringify({ applied: true, deletedResults: deleted.affectedRows, clearedEventResultLinks: unlinked.affectedRows, preserved: "accounts, visits, care, staff, tracks, profiles, settings, research, physical X18, and ambiguous shared rows" }, null, 2));
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
