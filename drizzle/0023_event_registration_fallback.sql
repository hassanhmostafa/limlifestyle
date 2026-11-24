ALTER TABLE event_profiles ADD COLUMN otpRequired int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE event_staff MODIFY COLUMN duty enum('nurse','doctor','registration') NOT NULL;
--> statement-breakpoint
CREATE TABLE event_registration_requests (
  tokenHash varchar(64) PRIMARY KEY,
  phoneHash varchar(64) NOT NULL,
  trackId int NOT NULL,
  expiresAt timestamp NOT NULL,
  approved int NOT NULL DEFAULT 0,
  INDEX event_registration_phone_track (phoneHash, trackId, expiresAt)
);
