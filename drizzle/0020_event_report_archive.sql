ALTER TABLE event_researchers
  ADD COLUMN reportArchiveAccess int NOT NULL DEFAULT 0;

CREATE TABLE event_report_archives (
  id int AUTO_INCREMENT NOT NULL,
  archiveId varchar(36) NOT NULL,
  sessionId int NOT NULL,
  eventCode varchar(64) NOT NULL,
  reportRevision int NOT NULL,
  snapshotKey varchar(255) NOT NULL,
  snapshotSha256 varchar(64) NOT NULL,
  snapshotStatus varchar(16) NOT NULL DEFAULT 'archived',
  pdfKey varchar(255),
  pdfSha256 varchar(64),
  pdfBytes int,
  pdfStatus varchar(16) NOT NULL DEFAULT 'pending',
  encryptionVersion varchar(32) NOT NULL,
  retentionUntil timestamp NOT NULL,
  archivedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pdfArchivedAt timestamp,
  lastError varchar(255),
  CONSTRAINT event_report_archives_id PRIMARY KEY(id),
  CONSTRAINT event_report_archives_archiveId_unique UNIQUE(archiveId),
  CONSTRAINT event_report_archive_session_revision_unique UNIQUE(sessionId, reportRevision),
  CONSTRAINT event_report_archive_event_session_unique UNIQUE(eventCode, sessionId, reportRevision)
);
