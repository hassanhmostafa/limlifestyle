-- LIM Events runs as its own browser flow while retaining the shared LIM health backend.
-- Existing table is empty, so required opaque-token columns can be added without data backfill.
ALTER TABLE `event_participant_sessions` ADD COLUMN `accessTokenHash` varchar(64) NOT NULL;
ALTER TABLE `event_participant_sessions` ADD COLUMN `code` varchar(32) NOT NULL;
ALTER TABLE `event_participant_sessions` DROP INDEX `event_participant_sessions_user_event_unique`;
ALTER TABLE `event_participant_sessions` ADD CONSTRAINT `event_participant_sessions_accessTokenHash_unique` UNIQUE(`accessTokenHash`);
ALTER TABLE `event_participant_sessions` ADD CONSTRAINT `event_participant_sessions_code_unique` UNIQUE(`code`);
