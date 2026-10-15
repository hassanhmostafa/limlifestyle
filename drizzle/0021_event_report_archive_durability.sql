ALTER TABLE event_report_archives ADD COLUMN snapshotPayload mediumtext NULL;
ALTER TABLE event_report_archives ADD COLUMN originEligible int NOT NULL DEFAULT 0;
ALTER TABLE event_report_archives MODIFY COLUMN retentionUntil timestamp NULL;
