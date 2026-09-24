-- LIM: one hashed upload credential per physical kiosk device.
-- The plaintext key is generated only when a device is registered or rotated.
ALTER TABLE `kiosk_devices` ADD `apiKeyHash` varchar(64);
