-- Additive material-fingerprint marker for corrected X18 uploads sharing a recordNo.
-- No raw measurement payload is copied into the event session.
ALTER TABLE event_participant_sessions
  ADD COLUMN IF NOT EXISTS latestReadingFingerprint varchar(64) NULL;
