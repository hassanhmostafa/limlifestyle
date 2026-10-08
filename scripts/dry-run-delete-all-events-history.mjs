// Owner-review-only audit for the authorized ALL historical LIM Events cleanup.
// This script intentionally has no --apply path. It prints only aggregate counts
// and never IDs, phones, names, tokens, advice, answers, or measurement values.
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
if (process.argv.includes("--apply")) {
  throw new Error("Deletion is intentionally disabled in this audit. Review the counts and authorize a separately reviewed transactional deletion plan.");
}
const connection = await mysql.createConnection(connectionOptions(process.env.DATABASE_URL));
try {
  const [[counts]] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM event_participant_sessions s WHERE s.eventCode = 'lim-events') AS event_visits,
      (SELECT COUNT(*) FROM event_care c INNER JOIN event_participant_sessions s ON s.id = c.sessionId WHERE s.eventCode = 'lim-events') AS care_rows,
      (SELECT COUNT(*) FROM event_participant_sessions s WHERE s.eventCode = 'lim-events' AND s.answers IS NOT NULL) AS visits_with_answers,
      (SELECT COUNT(*) FROM health_readings h WHERE EXISTS (
        SELECT 1 FROM event_participant_sessions s
        WHERE s.eventCode = 'lim-events' AND s.userId = h.userId AND s.latestRecordNo = h.recordNo
      )) AS proven_event_readings,
      (SELECT COUNT(*) FROM health_readings h WHERE EXISTS (
        SELECT 1 FROM event_participant_sessions s WHERE s.eventCode = 'lim-events' AND s.userId = h.userId
      ) AND NOT EXISTS (
        SELECT 1 FROM event_participant_sessions s
        WHERE s.eventCode = 'lim-events' AND s.userId = h.userId AND s.latestRecordNo = h.recordNo
      )) AS ambiguous_shared_readings,
      (SELECT COUNT(DISTINCT s.userId) FROM event_participant_sessions s WHERE s.eventCode = 'lim-events') AS preserved_account_count,
      (SELECT COUNT(*) FROM event_staff WHERE eventCode = 'lim-events') AS preserved_staff_count,
      (SELECT COUNT(*) FROM event_tracks WHERE eventCode = 'lim-events') AS preserved_track_count
  `);
  console.log(JSON.stringify({
    mode: "dry-run-only",
    scope: "all historical lim-events visits, their care rows, and their answer JSON; only readings currently proven by exact userId+latestRecordNo ownership are unambiguous",
    counts,
    preserved: ["user accounts", "event profile/settings", "staff", "staff sessions", "tracks", "research accounts/grants/audit", "OTP tables", "ambiguous/shared health readings"],
    nextStep: "No deletion was executed. Review counts, especially ambiguous_shared_readings, before requesting a separately reviewed transactional purge.",
  }, null, 2));
} finally {
  await connection.end();
}
