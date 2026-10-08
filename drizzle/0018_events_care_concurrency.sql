-- Additive safeguards for Event staff concurrency and automatic-generation leases.
ALTER TABLE event_care ADD COLUMN IF NOT EXISTS revision int NOT NULL DEFAULT 1;
ALTER TABLE event_care ADD COLUMN IF NOT EXISTS approvedRecordNo varchar(64) NULL;
ALTER TABLE event_care ADD COLUMN IF NOT EXISTS autoGenerationAttemptToken varchar(64) NULL;
ALTER TABLE event_care ADD COLUMN IF NOT EXISTS autoGenerationStartedAt timestamp NULL;
ALTER TABLE event_care ADD COLUMN IF NOT EXISTS autoGenerationLeaseExpiresAt timestamp NULL;
ALTER TABLE event_care ADD COLUMN IF NOT EXISTS autoGenerationFingerprint varchar(64) NULL;
ALTER TABLE event_care ADD COLUMN IF NOT EXISTS autoGenerationInputRevision int NULL;
ALTER TABLE event_care ADD COLUMN IF NOT EXISTS autoGenerationRecordNo varchar(64) NULL;
