CREATE TABLE `ai_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planType` enum('health','diet','combined') NOT NULL,
	`content` text NOT NULL,
	`metricsSnapshot` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kioskId` varchar(64) NOT NULL,
	`visitDate` varchar(10) NOT NULL,
	`timeSlot` varchar(20) NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'confirmed',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`expertId` int NOT NULL,
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expert_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`specialty` varchar(128) NOT NULL,
	`credentials` varchar(512) NOT NULL,
	`bio` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expert_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `health_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kioskId` varchar(64) NOT NULL,
	`bloodPressureSystolic` int,
	`bloodPressureDiastolic` int,
	`heartRate` int,
	`weight` decimal(5,1),
	`height` decimal(5,1),
	`bmi` decimal(4,1),
	`temperature` decimal(4,1),
	`notes` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `health_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kiosk_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`label` varchar(255),
	`kioskId` varchar(64),
	`isActive` enum('true','false') NOT NULL DEFAULT 'true',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kiosk_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `kiosk_devices_deviceId_unique` UNIQUE(`deviceId`)
);
--> statement-breakpoint
CREATE TABLE `kiosk_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('create','delete') NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`payload` json NOT NULL,
	`message` text,
	`adminNote` text,
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kiosk_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kiosk_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','active','used','expired') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kiosk_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `kiosk_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `kiosks` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`image` text,
	`rating` decimal(3,1),
	`isActive` enum('true','false') NOT NULL DEFAULT 'true',
	`hours` json,
	`services` json,
	`ownerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kiosks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text NOT NULL DEFAULT (''),
	`fileUrl` varchar(1024),
	`fileName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','expert','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `adminType` enum('kiosk','expert','super');--> statement-breakpoint
ALTER TABLE `users` ADD `specialty` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `gender` enum('male','female');--> statement-breakpoint
ALTER TABLE `users` ADD `birthDate` varchar(10);