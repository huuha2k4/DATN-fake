-- V29: Add reactions table for group messages
CREATE TABLE IF NOT EXISTS core.group_message_reactions (
    message_id UUID NOT NULL REFERENCES core.group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON core.group_message_reactions(message_id);

