CREATE TABLE `event_profiles` (
 `eventCode` varchar(64) PRIMARY KEY,
 `name` varchar(255) NOT NULL DEFAULT 'فعالية ليم',
 `startsOn` varchar(10) NULL,
 `endsOn` varchar(10) NULL,
 `location` varchar(500) NOT NULL DEFAULT '',
 `organizer` varchar(255) NOT NULL DEFAULT '',
 `poster` mediumtext NULL,
 `questionnaireIds` json NOT NULL,
 `closed` int NOT NULL DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `event_profiles` (`eventCode`, `questionnaireIds`) VALUES ('lim-events', JSON_ARRAY('lifestyle'));
--> statement-breakpoint
ALTER TABLE `event_participant_sessions` ADD `questionnaireIds` json NULL;
