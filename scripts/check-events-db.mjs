// Read-only deployment gate. Does not create, alter, or delete production data.
import 'dotenv/config';
import mysql from 'mysql2/promise';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const query of [
    'SELECT id, username, codeHash, allEvents, includeIdentity, credentialVersion FROM event_researchers LIMIT 0',
    'SELECT researcherId, eventCode FROM event_research_grants LIMIT 0',
    'SELECT tokenHash, researcherId, credentialVersion, expiresAt FROM event_research_sessions LIMIT 0',
    'SELECT actorId, action, eventCode, rowCount FROM event_research_audit LIMIT 0',
    'SELECT eventCode, name, startsOn, endsOn, location, organizer, poster, questionnaireIds, closed FROM event_profiles LIMIT 0',
    'SELECT questionnaireIds FROM event_participant_sessions LIMIT 0',
    'SELECT id, eventCode, name, active FROM event_tracks LIMIT 0',
    'SELECT eventCode, nursingEnabled, testIds FROM event_settings LIMIT 0',
    'SELECT trackId FROM event_participant_sessions LIMIT 0',
    'SELECT trackId, name, codeHash, credentialVersion FROM event_staff LIMIT 0',
    'SELECT tokenHash, staffId, credentialVersion, expiresAt FROM event_staff_sessions LIMIT 0',
    'SELECT nurseStaffId, doctorStaffId, approvedAt FROM event_care LIMIT 0',
  ]) await connection.query(query);
  if (process.env.EVENTS_OTP_ENABLED === 'true') {
    if (!process.env.OURSMS_API_KEY?.trim() || !process.env.OURSMS_SENDER_ID?.trim() || (process.env.EVENTS_OTP_SECRET?.length ?? 0) < 32) throw new Error('OURSMS_API_KEY, OURSMS_SENDER_ID and EVENTS_OTP_SECRET (32+ characters) are required');
    await connection.query('SELECT phoneHash, tokenHash, codeHash, expiresAt, attempts, state FROM event_otp_challenges LIMIT 0');
    await connection.query('SELECT bucket, count, lastAt FROM event_otp_limits LIMIT 0');
  }
  const [rows] = await connection.execute('SELECT id FROM event_tracks WHERE eventCode = ? AND active = 1 ORDER BY id LIMIT 1', ['lim-events']);
  if (!rows.length) throw new Error('No active event track. Activate a track in event administration.');
  console.log('Events schema and active registration track: ready.');
} catch (error) {
  console.error('Events deployment blocked:', error.code ?? error.message);
  console.error('Check DATABASE_URL targets the deployed database and review migrations 0011/0012/0013/0014/0015. Apply pending migrations with pnpm exec drizzle-kit migrate, then rerun pnpm db:check-events. Do not mark readiness as successful until this passes.');
  process.exitCode = 1;
} finally { await connection.end(); }
