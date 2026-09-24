-- LIM: phone accounts and native X18_5 measurement fields.
-- Existing health-reading values are preserved while their column names are aligned
-- with the machine JSON payload (`sbp`, `dbp`, and `hr`).

ALTER TABLE `users` ADD `phone` varchar(20);
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_phone_unique` UNIQUE(`phone`);
--> statement-breakpoint
ALTER TABLE `health_readings` CHANGE `bloodPressureSystolic` `sbp` int;
--> statement-breakpoint
ALTER TABLE `health_readings` CHANGE `bloodPressureDiastolic` `dbp` int;
--> statement-breakpoint
ALTER TABLE `health_readings` CHANGE `heartRate` `hr` int;
--> statement-breakpoint
ALTER TABLE `health_readings` ADD `machineMetrics` json;
--> statement-breakpoint
ALTER TABLE `health_readings` ADD `recordNo` varchar(64);
--> statement-breakpoint
ALTER TABLE `health_readings` ADD `deviceNo` varchar(64);
--> statement-breakpoint
ALTER TABLE `health_readings` ADD CONSTRAINT `health_readings_user_device_record_unique` UNIQUE(`userId`, `deviceNo`, `recordNo`);
