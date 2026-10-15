ALTER TABLE reminders ADD COLUMN recurrence ENUM('none','daily','weekly','monthly','yearly') NOT NULL DEFAULT 'none';
ALTER TABLE reminders ADD COLUMN recurrenceEndsAt DATETIME;
ALTER TABLE reminders ADD COLUMN parentReminderId INT;
