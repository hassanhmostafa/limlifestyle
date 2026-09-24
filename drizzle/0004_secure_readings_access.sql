-- LIM: keep existing readings, label their origin, and add participant-controlled clinician consent.
ALTER TABLE `health_readings` ADD `source` enum('x18','legacy','simulator','manual','demo') NOT NULL DEFAULT 'manual';
--> statement-breakpoint
UPDATE `health_readings`
SET `source` = 'simulator'
WHERE `kioskId` = 'SIMULATOR' OR `kioskId` LIKE 'RESULTS_PENDING:%';
--> statement-breakpoint
UPDATE `health_readings`
SET `source` = 'demo'
WHERE `userId` = 1 AND `deviceNo` IS NULL AND `recordNo` IS NULL AND `kioskId` LIKE 'kiosk-%';
--> statement-breakpoint
CREATE TABLE `clinician_participant_access` (
  `id` int AUTO_INCREMENT NOT NULL,
  `clinicianUserId` int NOT NULL,
  `participantUserId` int NOT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `grantedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revokedAt` timestamp NULL,
  CONSTRAINT `clinician_participant_access_id` PRIMARY KEY(`id`),
  CONSTRAINT `clinician_participant_access_unique` UNIQUE(`clinicianUserId`,`participantUserId`)
);
