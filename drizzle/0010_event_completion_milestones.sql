-- LIM Events: consultation and final-report completion are explicit,
-- participant-controlled milestones after the physical body measurement.
ALTER TABLE `event_participant_sessions`
  ADD COLUMN `consultationCompletedAt` timestamp NULL,
  ADD COLUMN `reportCompletedAt` timestamp NULL;
