-- LIM: retain the name, age, and sex transmitted by X18 on each report.
-- These fields belong to the measurement record and are not copied from the LIM account profile.
ALTER TABLE `health_readings` ADD COLUMN `patientName` varchar(255);
ALTER TABLE `health_readings` ADD COLUMN `patientAge` int;
ALTER TABLE `health_readings` ADD COLUMN `patientSex` varchar(32);
