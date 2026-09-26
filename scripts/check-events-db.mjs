// Read-only deployment gate. Does not create, alter, or delete production data.
import 'dotenv/config';
import mysql from 'mysql2/promise';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const query of [
    'SELECT id, eventCode, name, active FROM event_tracks LIMIT 0',
    'SELECT eventCode, nursingEnabled, testIds FROM event_settings LIMIT 0',
    'SELECT trackId FROM event_participant_sessions LIMIT 0',
    'SELECT trackId, name, codeHash, credentialVersion FROM event_staff LIMIT 0',
    'SELECT tokenHash, staffId, credentialVersion, expiresAt FROM event_staff_sessions LIMIT 0',
    'SELECT nurseStaffId, doctorStaffId, approvedAt FROM event_care LIMIT 0',
  ]) await connection.query(query);
  const [rows] = await connection.execute('SELECT id FROM event_tracks WHERE eventCode = ? AND active = 1 ORDER BY id LIMIT 1', ['lim-events']);
  if (!rows.length) throw new Error('No active event track. Activate a track in event administration.');
  console.log('Events schema and active registration track: ready.');
} catch (error) {
  console.error('Events deployment blocked:', error.code ?? error.message);
  console.error('Check DATABASE_URL targets the deployed database and review migrations 0011/0012. Apply pending migrations with pnpm exec drizzle-kit migrate, then rerun pnpm db:check-events. Do not mark readiness as successful until this passes.');
  process.exitCode = 1;
} finally { await connection.end(); }
