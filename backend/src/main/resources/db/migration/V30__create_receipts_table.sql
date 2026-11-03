-- =====================================================
-- V30: Create core.receipts table for OCR scan results
-- =====================================================

CREATE TABLE IF NOT EXISTS core.receipts (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    image_url               TEXT,
    kind                    VARCHAR(20) NOT NULL DEFAULT 'unknown',
    merchant_name           VARCHAR(500),
    transaction_date        DATE,
    transaction_time        TIME,
    total_amount            BIGINT,
    currency                VARCHAR(10) NOT NULL DEFAULT 'VND',
    raw_text                TEXT,
    confidence              DECIMAL(3,2),
    needs_review            BOOLEAN     NOT NULL DEFAULT FALSE,
    ai_category_id          VARCHAR(100),
    ai_category_name        VARCHAR(200),
    ai_category_confidence  DECIMAL(3,2),
    ai_category_source      VARCHAR(50),
    transaction_id          UUID        REFERENCES core.transactions(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id   ON core.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON core.receipts(created_at DESC);
