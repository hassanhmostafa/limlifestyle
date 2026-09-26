CREATE TABLE `event_settings` (
 `eventCode` varchar(64) PRIMARY KEY,
 `nursingEnabled` int NOT NULL DEFAULT 0,
 `testIds` json NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_staff` (
 `id` int AUTO_INCREMENT PRIMARY KEY,
 `eventCode` varchar(64) NOT NULL,
 `userId` int NOT NULL,
 `duty` enum('nurse','doctor') NOT NULL,
 `active` int NOT NULL DEFAULT 1,
 UNIQUE KEY `event_staff_user_unique` (`eventCode`, `userId`)
);
--> statement-breakpoint
CREATE TABLE `event_care` (
 `sessionId` int PRIMARY KEY,
 `nursingEnabled` int NOT NULL,
 `testIds` json NOT NULL,
 `measurements` json NOT NULL,
 `nurseNotes` text,
 `nurseUserId` int,
 `nursingCompletedAt` timestamp NULL,
 `advice` text,
 `doctorUserId` int,
 `doctorName` varchar(255),
 `approvedAt` timestamp NULL,
 `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
