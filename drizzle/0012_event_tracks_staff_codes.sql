CREATE TABLE `event_tracks` (
 `id` int AUTO_INCREMENT PRIMARY KEY,
 `eventCode` varchar(64) NOT NULL,
 `name` varchar(100) NOT NULL,
 `active` int NOT NULL DEFAULT 1,
 UNIQUE KEY `event_track_name_unique` (`eventCode`, `name`)
);
--> statement-breakpoint
INSERT INTO `event_tracks` (`eventCode`, `name`) VALUES ('lim-events', 'المسار 1');
--> statement-breakpoint
ALTER TABLE `event_staff`
 MODIFY `userId` int NULL,
 ADD `trackId` int NULL,
 ADD `name` varchar(255) NULL,
 ADD `codeHash` varchar(64) NULL,
 ADD `credentialVersion` int NOT NULL DEFAULT 1,
 ADD UNIQUE KEY `event_staff_code_unique` (`codeHash`);
--> statement-breakpoint
ALTER TABLE `event_participant_sessions` ADD `trackId` int NULL,
 ADD KEY `event_session_track` (`eventCode`, `trackId`);
--> statement-breakpoint
UPDATE `event_participant_sessions` s JOIN `event_tracks` t ON t.`eventCode` = s.`eventCode` AND t.`name` = 'المسار 1'
 SET s.`trackId` = t.`id` WHERE s.`eventCode` = 'lim-events';
--> statement-breakpoint
UPDATE `event_staff` s JOIN `event_tracks` t ON t.`eventCode` = s.`eventCode` AND t.`name` = 'المسار 1'
 LEFT JOIN `users` u ON u.`id` = s.`userId`
 SET s.`trackId` = t.`id`, s.`name` = u.`name` WHERE s.`eventCode` = 'lim-events';
--> statement-breakpoint
ALTER TABLE `event_care` ADD `nurseStaffId` int NULL, ADD `doctorStaffId` int NULL;
--> statement-breakpoint
CREATE TABLE `event_staff_sessions` (
 `tokenHash` varchar(64) PRIMARY KEY,
 `staffId` int NOT NULL,
 `credentialVersion` int NOT NULL,
 `expiresAt` timestamp NOT NULL,
 KEY `event_staff_session_staff` (`staffId`)
);
