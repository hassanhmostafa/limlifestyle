ALTER TABLE `event_participant_sessions`
  ADD COLUMN `consentVersion` varchar(64),
  ADD COLUMN `consentedAt` timestamp;
