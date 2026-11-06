-- =====================================================
-- V39: Create admin audit logs and feedbacks tables
-- =====================================================

CREATE TABLE IF NOT EXISTS core.audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID        REFERENCES core.users(id) ON DELETE SET NULL,
    admin_username  VARCHAR(100) NOT NULL,
    admin_full_name VARCHAR(255),
    action          VARCHAR(100) NOT NULL,
    target_entity   VARCHAR(100) NOT NULL,
    target_id       VARCHAR(255),
    description     TEXT,
    ip_address      VARCHAR(50),
    status          VARCHAR(50)  NOT NULL DEFAULT 'SUCCESS',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON core.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON core.audit_logs(target_entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON core.audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS core.feedbacks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        REFERENCES core.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT        NOT NULL,
    category        VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    priority        VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    admin_reply     TEXT,
    replied_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON core.feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON core.feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON core.feedbacks(created_at DESC);

