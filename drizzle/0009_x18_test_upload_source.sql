-- LIM Events test reports are sent through the exact X18 data-upload endpoint.
-- Keep them visibly distinct from results sent by physical X18 hardware.
ALTER TABLE `health_readings`
  MODIFY `source` enum('x18','x18_test','legacy','simulator','manual','demo') NOT NULL DEFAULT 'manual';
