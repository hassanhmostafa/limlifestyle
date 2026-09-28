ALTER TABLE `event_otp_challenges` ADD COLUMN `codeHash` varchar(64) NULL;
--> statement-breakpoint
CREATE TABLE `event_researchers` (
 `id` int AUTO_INCREMENT PRIMARY KEY, `username` varchar(80) NOT NULL UNIQUE,
 `name` varchar(255) NOT NULL, `codeHash` varchar(64) NOT NULL,
 `allEvents` int NOT NULL DEFAULT 0, `includeIdentity` int NOT NULL DEFAULT 0,
 `active` int NOT NULL DEFAULT 1, `credentialVersion` int NOT NULL DEFAULT 1,
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `event_research_grants` (
 `id` int AUTO_INCREMENT PRIMARY KEY, `researcherId` int NOT NULL, `eventCode` varchar(64) NOT NULL,
 UNIQUE KEY `research_event_unique` (`researcherId`,`eventCode`)
);
--> statement-breakpoint
CREATE TABLE `event_research_sessions` (
 `tokenHash` varchar(64) PRIMARY KEY, `researcherId` int NOT NULL,
 `credentialVersion` int NOT NULL, `expiresAt` timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_research_audit` (
 `id` int AUTO_INCREMENT PRIMARY KEY, `actorId` int NOT NULL, `action` varchar(40) NOT NULL,
 `eventCode` varchar(64) NULL, `rowCount` int NOT NULL DEFAULT 0,
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
