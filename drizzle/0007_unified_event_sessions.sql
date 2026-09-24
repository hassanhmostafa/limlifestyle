-- LIM: Event check-in forms are stored separately from health results.
-- Physical X18 measurements remain in health_readings and are linked by user_id.
CREATE TABLE `event_participant_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `eventCode` varchar(64) NOT NULL DEFAULT 'lim-events',
  `displayName` varchar(255),
  `age` int,
  `sex` enum('male','female'),
  `city` varchar(128),
  `consent` enum('true','false') NOT NULL DEFAULT 'false',
  `answers` json,
  `status` enum('checked_in','measured') NOT NULL DEFAULT 'checked_in',
  `latestRecordNo` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `event_participant_sessions_id` PRIMARY KEY(`id`),
  CONSTRAINT `event_participant_sessions_user_event_unique` UNIQUE(`userId`, `eventCode`)
);
