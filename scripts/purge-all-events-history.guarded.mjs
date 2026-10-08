#!/usr/bin/env node
/**
 * Reviewed, action-time guarded cleanup for ALL historical LIM Events visits.
 *
 * Default behavior is a dry-run plan. It never deletes anything unless every
 * manifest count/hash, cutoff, and explicit confirmation token are supplied.
 * It intentionally preserves accounts, event settings/profiles, tracks, staff,
 * staff sessions, OTP/research tables, and ambiguous/shared health readings.
 */
import "dotenv/config";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const EVENT_CODE = "lim-events";
const CONFIRMATION = "PURGE_LIM_EVENTS_HISTORY";
const args = new Map(
  process.argv.slice(2).map(value => {
    const [key, ...parts] = value.replace(/^--/, "").split("=");
    return [key, parts.join("=") || true];
  })
);

if (args.has("help")) {
  console.log(`Usage:
  pnpm db:plan-purge-events-history -- --cutoff=2026-10-08T00:00:00Z

Default output is a dry-run manifest only. To execute AFTER separate final
approval, provide all exact values printed by the dry-run:
  --apply --cutoff=<same ISO timestamp> --expected-visits=<n> \\
  --expected-care=<n> --expected-answer-visits=<n> \\
  --expected-proven-readings=<n> --expected-manifest=<sha256> \\
  --confirm=${CONFIRMATION}

Ambiguous/shared readings are always preserved and are never deleted.`);
  process.exit(0);
}

const cutoffRaw = args.get("cutoff");
if (typeof cutoffRaw !== "string" || Number.isNaN(Date.parse(cutoffRaw))) {
  throw new Error("A valid UTC cutoff is required: --cutoff=2026-10-08T00:00:00Z");
}
const cutoff = new Date(cutoffRaw);
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
    const managedSsl = rawSsl.match(/^\{\s*rejectUnauthorized\s*:\s*(true|false)\s*\}$/);
    if (managedSsl) return { uri: url.toString(), ssl: { rejectUnauthorized: managedSsl[1] === "true" } };
    url.searchParams.set("ssl", rawSsl);
  }
  return url.toString();
}

const baseWhere = "s.eventCode = ? AND s.createdAt < ?";
const baseParams = [EVENT_CODE, cutoff];
// A reading is proven only when an in-scope visit references the exact
// userId+recordNo and no Events session outside this cutoff/event scope does.
// This exact predicate is shared by counts, identifier hashing, and DELETE.
const provenReadingPredicate = `
  EXISTS (
    SELECT 1 FROM event_participant_sessions scoped
    WHERE scoped.eventCode = ? AND scoped.createdAt < ?
      AND scoped.userId = h.userId AND scoped.latestRecordNo = h.recordNo
  )
  AND NOT EXISTS (
    SELECT 1 FROM event_participant_sessions outside_scope
    WHERE outside_scope.userId = h.userId
      AND outside_scope.latestRecordNo = h.recordNo
      AND NOT (outside_scope.eventCode = ? AND outside_scope.createdAt < ?)
  )`;
const provenReadingParams = [EVENT_CODE, cutoff, EVENT_CODE, cutoff];

async function scalar(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);
  return Number(rows[0]?.total ?? 0);
}

async function identifierHash(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);
  const ids = rows.map(row => String(row.id)).sort((a, b) => a.localeCompare(b, "en"));
  return crypto.createHash("sha256").update(ids.join(",")).digest("hex");
}

async function plan(connection) {
  const visits = await scalar(connection, `SELECT COUNT(*) AS total FROM event_participant_sessions s WHERE ${baseWhere}`, baseParams);
  const care = await scalar(connection, `SELECT COUNT(*) AS total FROM event_care c INNER JOIN event_participant_sessions s ON s.id = c.sessionId WHERE ${baseWhere}`, baseParams);
  const answerVisits = await scalar(connection, `SELECT COUNT(*) AS total FROM event_participant_sessions s WHERE ${baseWhere} AND s.answers IS NOT NULL AND JSON_LENGTH(s.answers) > 0`, baseParams);
  const provenReadings = await scalar(connection, `SELECT COUNT(*) AS total FROM health_readings h WHERE ${provenReadingPredicate}`, provenReadingParams);
  const ambiguousSharedReadings = await scalar(connection, `SELECT COUNT(DISTINCT h.id) AS total FROM health_readings h WHERE EXISTS (SELECT 1 FROM event_participant_sessions s WHERE ${baseWhere} AND s.userId = h.userId) AND NOT (${provenReadingPredicate})`, [...baseParams, ...provenReadingParams]);
  const visitScopeHash = await identifierHash(connection, `SELECT s.id FROM event_participant_sessions s WHERE ${baseWhere}`, baseParams);
  const careScopeHash = await identifierHash(connection, `SELECT c.sessionId AS id FROM event_care c INNER JOIN event_participant_sessions s ON s.id = c.sessionId WHERE ${baseWhere}`, baseParams);
  const provenReadingScopeHash = await identifierHash(connection, `SELECT h.id FROM health_readings h WHERE ${provenReadingPredicate}`, provenReadingParams);
  const manifest = {
    eventCode: EVENT_CODE,
    cutoff: cutoff.toISOString(),
    visits,
    care,
    answerVisits,
    provenReadings,
    ambiguousSharedReadings,
    visitScopeHash,
    careScopeHash,
    provenReadingScopeHash,
  };
  return {
    ...manifest,
    manifestHash: crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
  };
}

function printPlan(current) {
  console.log(JSON.stringify({
    mode: args.has("apply") ? "guarded-apply-request" : "dry-run",
    deleteOnly: {
      visits: current.visits,
      care: current.care,
      answerBearingVisits: current.answerVisits,
      provenReadingRows: current.provenReadings,
    },
    preserve: {
      ambiguousOrSharedReadingRows: current.ambiguousSharedReadings,
      accounts: true,
      profilesSettingsTracksStaffResearchOtp: true,
    },
    cutoff: current.cutoff,
    manifestHash: current.manifestHash,
  }, null, 2));
}

function expectedEquals(current) {
  const fields = [
    ["visits", "visits"],
    ["care", "care"],
    ["answer-visits", "answerVisits"],
    ["proven-readings", "provenReadings"],
  ];
  return fields.every(([arg, key]) => args.get(`expected-${arg}`) === String(current[key]));
}

const connection = await mysql.createConnection(connectionOptions(process.env.DATABASE_URL));
try {
  const current = await plan(connection);
  if (!args.has("apply")) {
    printPlan(current);
    process.exitCode = 0;
  } else {
    const exact =
      args.get("confirm") === CONFIRMATION &&
      args.get("expected-manifest") === current.manifestHash &&
      expectedEquals(current);
    if (!exact) {
      printPlan(current);
      throw new Error("Refusing purge: exact dry-run counts/hash and confirmation token are all required.");
    }

    await connection.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await connection.beginTransaction();
    try {
      const locked = await plan(connection);
      if (locked.manifestHash !== current.manifestHash) {
        throw new Error("Refusing purge: data changed after the reviewed manifest was calculated.");
      }

      const [careResult] = await connection.query(
        `DELETE c FROM event_care c INNER JOIN event_participant_sessions s ON s.id = c.sessionId WHERE ${baseWhere}`,
        baseParams
      );
      const [readingResult] = await connection.query(
        `DELETE h FROM health_readings h WHERE ${provenReadingPredicate}`,
        provenReadingParams
      );
      const [visitResult] = await connection.query(
        `DELETE FROM event_participant_sessions WHERE eventCode = ? AND createdAt < ?`,
        baseParams
      );
      if (
        Number(careResult.affectedRows) !== current.care ||
        Number(readingResult.affectedRows) !== current.provenReadings ||
        Number(visitResult.affectedRows) !== current.visits
      ) {
        throw new Error("Refusing purge: affected row counts differ from reviewed manifest.");
      }
      await connection.commit();
      console.log(JSON.stringify({ deleted: { visits: current.visits, care: current.care, provenReadingRows: current.provenReadings }, preservedAmbiguousOrSharedReadingRows: current.ambiguousSharedReadings }));
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
