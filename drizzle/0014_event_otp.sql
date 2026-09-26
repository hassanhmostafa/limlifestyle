CREATE TABLE `event_otp_challenges` (
 `phoneHash` varchar(64) PRIMARY KEY,
 `tokenHash` varchar(64) NOT NULL,
 `expiresAt` timestamp NOT NULL,
 `attempts` int NOT NULL DEFAULT 0,
 `state` varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_otp_limits` (
 `bucket` varchar(64) PRIMARY KEY,
 `count` int NOT NULL DEFAULT 0,
 `lastAt` timestamp NOT NULL
);
