-- LIM: one shared X18 upload credential for the registered device fleet.
-- Existing per-device hashes remain intact for audit/backwards compatibility but
-- are no longer used by the live X18 upload handler.
CREATE TABLE `kiosk_integration_settings` (
  `id` int NOT NULL,
  `apiKeyHash` varchar(64) NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `kiosk_integration_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
-- Preserve the existing first registered device key as the initial fleet key,
-- so a configured physical machine keeps uploading during this migration.
INSERT INTO `kiosk_integration_settings` (`id`, `apiKeyHash`)
SELECT 1, `apiKeyHash`
FROM `kiosk_devices`
WHERE `apiKeyHash` IS NOT NULL
ORDER BY `createdAt` ASC
LIMIT 1;
