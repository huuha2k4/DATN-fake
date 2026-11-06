ALTER TABLE core.schedule_occurrences
    ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP;
