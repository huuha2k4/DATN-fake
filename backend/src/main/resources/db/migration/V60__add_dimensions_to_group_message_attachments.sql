-- V59__add_dimensions_to_group_message_attachments.sql
ALTER TABLE core.group_message_attachments
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER;
