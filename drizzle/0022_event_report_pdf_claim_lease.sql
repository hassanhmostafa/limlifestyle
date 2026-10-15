ALTER TABLE event_report_archives ADD COLUMN pdfClaimToken varchar(36) NULL;
ALTER TABLE event_report_archives ADD COLUMN pdfLeaseExpiresAt timestamp NULL;
ALTER TABLE event_care ADD COLUMN archiveRequestedRevision int NULL;
