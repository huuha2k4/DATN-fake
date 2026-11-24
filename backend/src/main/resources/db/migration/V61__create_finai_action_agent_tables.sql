CREATE TABLE IF NOT EXISTS core.finai_pending_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES core.ai_chat_sessions(id) ON DELETE SET NULL,
    plan_id UUID,
    tool_name VARCHAR(100) NOT NULL,
    arguments_json TEXT NOT NULL,
    preview_json TEXT NOT NULL,
    status VARCHAR(30) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    result_json TEXT,
    error TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_finai_pending_action_status CHECK (
        status IN ('PENDING', 'CONFIRMED', 'EXECUTING', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED')
    )
);

CREATE INDEX IF NOT EXISTS idx_finai_actions_user_created
    ON core.finai_pending_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finai_actions_conversation
    ON core.finai_pending_actions(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_finai_actions_pending_expiry
    ON core.finai_pending_actions(status, expires_at);

CREATE TABLE IF NOT EXISTS core.finai_action_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES core.finai_pending_actions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    event VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finai_action_audit_action
    ON core.finai_action_audit_logs(action_id, created_at);

ALTER TABLE core.ai_chat_messages
    ADD COLUMN IF NOT EXISTS metadata_json TEXT;

