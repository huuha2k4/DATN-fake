-- V28: Add is_recalled column to group_messages
ALTER TABLE core.group_messages ADD COLUMN IF NOT EXISTS is_recalled BOOLEAN NOT NULL DEFAULT FALSE;

