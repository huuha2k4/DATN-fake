-- =====================================================
-- Personal Finance Management System - Database Schema
-- Version: 2.1
-- Date: 2026-10-11
-- Total Tables: 55 (47 CORE + 8 OPS, excluding AI)
-- =====================================================

-- =====================================================
-- SCHEMA CREATION
-- =====================================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ops;

-- =====================================================
-- DOMAIN TYPES
-- =====================================================

CREATE DOMAIN money AS NUMERIC(19,4);
CREATE DOMAIN money_pos AS NUMERIC(19,4) CHECK (VALUE > 0);
CREATE DOMAIN money_nonneg AS NUMERIC(19,4) CHECK (VALUE >= 0);
CREATE DOMAIN percentage AS NUMERIC(5,2) CHECK (VALUE BETWEEN 0 AND 100);
CREATE DOMAIN currency_code AS CHAR(3) CHECK (VALUE ~ '^[A-Z]{3}$');
CREATE DOMAIN confidence AS NUMERIC(5,4) CHECK (VALUE BETWEEN 0 AND 1);
CREATE DOMAIN email_addr AS VARCHAR(255) CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- =====================================================
-- ENUM TYPES - CORE
-- =====================================================

CREATE TYPE system_role_enum AS ENUM ('USER', 'ADMIN');
CREATE TYPE subscription_tier_enum AS ENUM ('FREE', 'PREMIUM', 'ENTERPRISE');
CREATE TYPE user_status_enum AS ENUM ('PENDING', 'ACTIVE', 'LOCKED', 'DISABLED', 'DELETED');
CREATE TYPE account_type_enum AS ENUM ('CASH', 'BANK', 'E_WALLET', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'OTHER');
CREATE TYPE transaction_type_enum AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE transaction_source_enum AS ENUM ('MANUAL', 'OCR', 'RECURRING', 'IMPORT', 'BANK_SYNC', 'AI_SUGGESTED');
CREATE TYPE category_kind_enum AS ENUM ('INCOME', 'EXPENSE', 'BOTH');
CREATE TYPE category_status_enum AS ENUM ('CONFIRMED', 'AI_APPLIED', 'NEEDS_REVIEW', 'UNCATEGORIZED');
CREATE TYPE share_role_enum AS ENUM ('VIEWER', 'CHILD', 'EDITOR', 'OWNER');
CREATE TYPE ocr_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'MANUAL_REVIEW');
CREATE TYPE period_type_enum AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');
CREATE TYPE goal_type_enum AS ENUM ('SAVINGS', 'DEBT_PAYOFF', 'PURCHASE', 'INVESTMENT', 'CUSTOM');
CREATE TYPE goal_status_enum AS ENUM ('IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED');
CREATE TYPE goal_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE frequency_type_enum AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE recur_status_enum AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE reminder_type_enum AS ENUM ('BILL_DUE', 'GOAL_DEADLINE', 'BUDGET_ALERT', 'DEBT_PAYMENT', 'CUSTOM');
CREATE TYPE debt_type_enum AS ENUM ('OWED_BY_ME', 'OWED_TO_ME');
CREATE TYPE debt_status_enum AS ENUM ('ACTIVE', 'PAID_OFF', 'OVERDUE', 'SETTLED');
CREATE TYPE split_type_enum AS ENUM ('EQUAL', 'PERCENTAGE', 'EXACT', 'SHARES');
CREATE TYPE settlement_status_enum AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
CREATE TYPE spend_request_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE child_privacy_level_enum AS ENUM ('FULL_ACCESS', 'LIMITED', 'VIEW_ONLY');
CREATE TYPE chore_status_enum AS ENUM ('ASSIGNED', 'COMPLETED', 'VERIFIED', 'PAID');
CREATE TYPE message_type_enum AS ENUM ('TEXT', 'IMAGE', 'EXPENSE_CARD', 'SYSTEM');
CREATE TYPE activity_type_enum AS ENUM ('EXPENSE_ADDED', 'EXPENSE_UPDATED', 'MEMBER_JOINED', 'SETTLEMENT_COMPLETED', 'CHILD_REQUEST');

-- =====================================================
-- ENUM TYPES - OPS
-- =====================================================

CREATE TYPE notification_channel_enum AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');
CREATE TYPE notification_status_enum AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');
CREATE TYPE job_status_enum AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- =====================================================
-- CORE SCHEMA - Tham Chiếu (3 bảng)
-- =====================================================

-- 1. currencies: Danh sách tiền tệ ISO 4217
CREATE TABLE core.currencies (
    code CHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_digits SMALLINT NOT NULL CHECK (decimal_digits BETWEEN 0 AND 4),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. exchange_rates: Tỷ giá hối đoái theo ngày
CREATE TABLE core.exchange_rates (
    id BIGSERIAL PRIMARY KEY,
    base_code CHAR(3) NOT NULL REFERENCES core.currencies(code),
    quote_code CHAR(3) NOT NULL REFERENCES core.currencies(code),
    rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
    rate_date DATE NOT NULL,
    source VARCHAR(50),
    UNIQUE (base_code, quote_code, rate_date)
);

-- 3. banks: Ngân hàng và ví điện tử
CREATE TABLE core.banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    short_name VARCHAR(50),
    bin VARCHAR(10),
    logo_url TEXT,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('BANK', 'E_WALLET')),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- =====================================================
-- CORE SCHEMA - Định Danh & Bảo Mật (9 bảng)
-- =====================================================

-- 4. users: Tài khoản người dùng
CREATE TABLE core.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email email_addr NOT NULL,
    email_verified_at TIMESTAMPTZ,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    status user_status_enum NOT NULL DEFAULT 'PENDING',
    system_role system_role_enum NOT NULL DEFAULT 'USER',
    subscription_tier subscription_tier_enum NOT NULL DEFAULT 'FREE',
    subscription_expires_at TIMESTAMPTZ,
    base_currency currency_code NOT NULL DEFAULT 'VND' REFERENCES core.currencies(code),
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    locale VARCHAR(10) NOT NULL DEFAULT 'vi-VN',
    failed_login_count SMALLINT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

COMMENT ON COLUMN core.users.system_role IS 'System-level role: USER (người dùng bình thường) hoặc ADMIN (quản trị hệ thống)';
COMMENT ON COLUMN core.users.subscription_tier IS 'Gói dịch vụ: FREE (miễn phí), PREMIUM (trả phí), ENTERPRISE (doanh nghiệp)';
COMMENT ON COLUMN core.users.subscription_expires_at IS 'Ngày hết hạn gói PREMIUM/ENTERPRISE. NULL = vô thời hạn hoặc FREE';

CREATE UNIQUE INDEX idx_users_email_active ON core.users (email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_phone_active ON core.users (phone) WHERE deleted_at IS NULL AND phone IS NOT NULL;

-- 5. user_profiles: Hồ sơ mở rộng
CREATE TABLE core.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150),
    display_name VARCHAR(80),
    avatar_key TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    occupation VARCHAR(100),
    monthly_income_estimate money_nonneg,
    financial_literacy_level SMALLINT CHECK (financial_literacy_level BETWEEN 1 AND 5)
);

-- 6. user_settings: Cài đặt người dùng
CREATE TABLE core.user_settings (
    user_id UUID PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
    month_start_day SMALLINT NOT NULL DEFAULT 1 CHECK (month_start_day BETWEEN 1 AND 28),
    week_start_day SMALLINT NOT NULL DEFAULT 1 CHECK (week_start_day BETWEEN 1 AND 7),
    budget_alert_threshold percentage NOT NULL DEFAULT 80,
    is_ai_enabled BOOLEAN NOT NULL DEFAULT true,
    is_ai_training_consent BOOLEAN NOT NULL DEFAULT false,
    is_auto_categorize BOOLEAN NOT NULL DEFAULT true,
    auto_categorize_min_confidence confidence NOT NULL DEFAULT 0.85,
    notification_prefs JSONB NOT NULL DEFAULT '{}',
    quiet_hours_start TIME,
    quiet_hours_end TIME
);

-- 7. user_sync_state: Trạng thái đồng bộ
CREATE TABLE core.user_sync_state (
    user_id UUID PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
    seq BIGINT NOT NULL DEFAULT 0
);

-- 8. auth_tokens: Token xác thực email/reset password
CREATE TABLE core.auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. oauth_accounts: Liên kết OAuth
CREATE TABLE core.oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('GOOGLE', 'APPLE', 'FACEBOOK')),
    provider_user_id VARCHAR(191) NOT NULL,
    email_at_provider VARCHAR(255),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);

-- 10. refresh_tokens: JWT refresh token
CREATE TABLE core.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    device_id VARCHAR(128),
    device_name VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by_id UUID REFERENCES core.refresh_tokens(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. mfa_credentials: Xác thực hai yếu tố
CREATE TABLE core.mfa_credentials (
    user_id UUID PRIMARY KEY REFERENCES core.users(id) ON DELETE CASCADE,
    totp_secret_enc BYTEA NOT NULL,
    backup_codes_hash TEXT[] NOT NULL,
    confirmed_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

-- 12. groups: Nhóm/gia đình
CREATE TABLE core.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    owner_id UUID NOT NULL REFERENCES core.users(id),
    base_currency currency_code NOT NULL REFERENCES core.currencies(code),
    avatar_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

-- =====================================================
-- CORE SCHEMA - Chia Sẻ Nhóm (3 bảng)
-- =====================================================

-- 13. group_members: Thành viên nhóm
CREATE TABLE core.group_members (
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    role share_role_enum NOT NULL DEFAULT 'VIEWER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    contribution_ratio percentage,
    PRIMARY KEY (group_id, user_id)
);

-- 14. group_invitations: Lời mời tham gia nhóm
CREATE TABLE core.group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES core.users(id),
    role share_role_enum NOT NULL DEFAULT 'VIEWER',
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ
);

-- 15. shared_resources: Tài nguyên được chia sẻ
CREATE TABLE core.shared_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('ACCOUNT', 'BUDGET', 'GOAL')),
    resource_id UUID NOT NULL,
    shared_by UUID NOT NULL REFERENCES core.users(id),
    permission share_role_enum NOT NULL DEFAULT 'VIEWER',
    shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, resource_type, resource_id)
);

CREATE INDEX idx_shared_resources_lookup ON core.shared_resources (resource_type, resource_id);

-- =====================================================
-- CORE SCHEMA - Groups Module Mở Rộng (11 bảng)
-- =====================================================

-- 16. group_expenses: Chi phí nhóm
CREATE TABLE core.group_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    paid_by UUID NOT NULL REFERENCES core.users(id),
    description VARCHAR(255) NOT NULL,
    total_amount money_pos NOT NULL,
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    expense_date DATE NOT NULL,
    category_id UUID,
    split_type split_type_enum NOT NULL DEFAULT 'EQUAL',
    is_settled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. group_expense_splits: Phân chia chi phí
CREATE TABLE core.group_expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES core.group_expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id),
    amount money_nonneg NOT NULL,
    shares NUMERIC(10,2),
    percentage percentage,
    is_paid BOOLEAN NOT NULL DEFAULT false
);

-- 18. group_settlements: Thanh toán công nợ nhóm
CREATE TABLE core.group_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES core.users(id),
    payee_id UUID NOT NULL REFERENCES core.users(id),
    amount money_pos NOT NULL,
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    status settlement_status_enum NOT NULL DEFAULT 'PENDING',
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. transaction_comments: Bình luận trên giao dịch
CREATE TABLE core.transaction_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('transaction', 'group_expense')),
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES core.users(id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_comments_entity ON core.transaction_comments (entity_type, entity_id);

-- 20. group_activities: Lịch sử hoạt động nhóm
CREATE TABLE core.group_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id),
    activity_type activity_type_enum NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_activities_group ON core.group_activities (group_id, created_at DESC);

-- 21. group_messages: Chat nhóm
CREATE TABLE core.group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES core.users(id),
    message_type message_type_enum NOT NULL DEFAULT 'TEXT',
    content TEXT,
    related_expense_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_messages_group ON core.group_messages (group_id, created_at DESC);

-- 22. group_message_attachments: File đính kèm tin nhắn
CREATE TABLE core.group_message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES core.group_messages(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes INTEGER CHECK (file_size_bytes <= 10485760),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. group_message_reads: Trạng thái đã đọc
CREATE TABLE core.group_message_reads (
    message_id UUID NOT NULL REFERENCES core.group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id),
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id)
);

-- 24. child_wallets: Ví con cho trẻ em
CREATE TABLE core.child_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES core.users(id),
    parent_user_id UUID NOT NULL REFERENCES core.users(id),
    balance money_nonneg NOT NULL DEFAULT 0,
    weekly_allowance money_nonneg,
    privacy_level child_privacy_level_enum NOT NULL DEFAULT 'LIMITED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 25. child_spend_requests: Yêu cầu chi tiêu của trẻ
CREATE TABLE core.child_spend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES core.child_wallets(id) ON DELETE CASCADE,
    amount money_pos NOT NULL,
    description VARCHAR(255) NOT NULL,
    status spend_request_status_enum NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES core.users(id),
    reviewed_at TIMESTAMPTZ
);

-- 26. child_chores: Việc nhà gamification
CREATE TABLE core.child_chores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES core.child_wallets(id) ON DELETE CASCADE,
    chore_name VARCHAR(200) NOT NULL,
    reward_amount money_nonneg NOT NULL,
    status chore_status_enum NOT NULL DEFAULT 'ASSIGNED',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ
);

-- =====================================================
-- CORE SCHEMA - Tài Khoản & Tài Sản (4 bảng)
-- =====================================================

-- 27. accounts: Ví/tài khoản
CREATE TABLE core.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type account_type_enum,
    bank_id UUID REFERENCES core.banks(id),
    account_number_masked VARCHAR(30),
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    initial_balance money DEFAULT 0,
    current_balance money DEFAULT 0,
    credit_limit money_nonneg,
    statement_day SMALLINT CHECK (statement_day BETWEEN 1 AND 28),
    due_day SMALLINT CHECK (due_day BETWEEN 1 AND 28),
    icon VARCHAR(50),
    color CHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    is_included_in_total BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    display_order SMALLINT NOT NULL DEFAULT 0,
    sync_seq BIGINT,
    account_type VARCHAR(20) DEFAULT 'E_WALLET',
    balance NUMERIC(15,2) DEFAULT 0,
    account_number VARCHAR(50),
    phone_number VARCHAR(20),
    card_number_last4 VARCHAR(4),
    billing_cycle_day INTEGER,
    payment_due_day INTEGER,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_synced BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_accounts_user_name ON core.accounts (user_id, lower(name)) WHERE deleted_at IS NULL;

-- 28. account_balance_snapshots: Chốt số dư cuối ngày
CREATE TABLE core.account_balance_snapshots (
    id BIGSERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES core.accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    closing_balance money NOT NULL,
    total_inflow money_nonneg NOT NULL DEFAULT 0,
    total_outflow money_nonneg NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE (account_id, snapshot_date)
);

-- 29. assets: Tài sản
CREATE TABLE core.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    asset_type VARCHAR(30) NOT NULL CHECK (asset_type IN ('GOLD', 'REAL_ESTATE', 'VEHICLE', 'STOCK', 'CRYPTO', 'OTHER')),
    quantity NUMERIC(18,6),
    unit VARCHAR(20),
    purchase_price money_nonneg,
    purchase_date DATE,
    current_value money_nonneg NOT NULL DEFAULT 0,
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    is_liquid BOOLEAN NOT NULL DEFAULT false,
    linked_account_id UUID REFERENCES core.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

-- 30. asset_valuations: Định giá tài sản
CREATE TABLE core.asset_valuations (
    id BIGSERIAL PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES core.assets(id) ON DELETE CASCADE,
    valued_at DATE NOT NULL,
    value money_nonneg NOT NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'MARKET_API')),
    UNIQUE (asset_id, valued_at)
);

-- =====================================================
-- CORE SCHEMA - Danh Mục (3 bảng)
-- =====================================================

-- 31. categories: Danh mục thu chi
CREATE TABLE core.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES core.categories(id),
    code VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    kind category_kind_enum NOT NULL,
    icon VARCHAR(50),
    color CHAR(7),
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_essential BOOLEAN NOT NULL DEFAULT false,
    default_budget_ratio percentage,
    display_order SMALLINT NOT NULL DEFAULT 0,
    sync_seq BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    CHECK (id <> parent_id)
);

CREATE UNIQUE INDEX idx_categories_user_parent_name ON core.categories (user_id, parent_id, lower(name)) WHERE deleted_at IS NULL;

-- 32. merchants: Cửa hàng
CREATE TABLE core.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    normalized_name VARCHAR(150) NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    default_category_id UUID REFERENCES core.categories(id) ON DELETE SET NULL,
    mcc CHAR(4),
    logo_url TEXT,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 33. tags: Nhãn
CREATE TABLE core.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color CHAR(7),
    sync_seq BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_tags_user_name ON core.tags (user_id, lower(name)) WHERE deleted_at IS NULL;

-- =====================================================
-- CORE SCHEMA - Giao Dịch (5 bảng)
-- =====================================================

-- 34. receipts: Hóa đơn OCR
CREATE TABLE core.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(50),
    image_hash CHAR(64) NOT NULL,
    ocr_status ocr_status_enum NOT NULL DEFAULT 'PENDING',
    ocr_attempt_count SMALLINT NOT NULL DEFAULT 0,
    ocr_queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ocr_started_at TIMESTAMPTZ,
    ocr_finished_at TIMESTAMPTZ,
    ocr_engine VARCHAR(50),
    ocr_model_id UUID,
    ocr_raw JSONB,
    ocr_confidence confidence,
    ocr_field_confidences JSONB,
    ocr_error TEXT,
    merchant_name_raw VARCHAR(200),
    merchant_id UUID REFERENCES core.merchants(id) ON DELETE SET NULL,
    total_amount money_nonneg,
    tax_amount money_nonneg,
    purchased_at TIMESTAMPTZ,
    currency_code currency_code REFERENCES core.currencies(code),
    is_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    UNIQUE (user_id, image_hash)
);

-- 35. receipt_items: Dòng hàng hóa đơn
CREATE TABLE core.receipt_items (
    id BIGSERIAL PRIMARY KEY,
    receipt_id UUID NOT NULL REFERENCES core.receipts(id) ON DELETE CASCADE,
    line_no SMALLINT NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(12,3) DEFAULT 1,
    unit_price money_nonneg,
    line_total money_nonneg,
    suggested_category_id UUID REFERENCES core.categories(id) ON DELETE SET NULL,
    confidence confidence,
    UNIQUE (receipt_id, line_no)
);

-- 36. transactions: Giao dịch thu/chi/chuyển khoản ⭐
CREATE TABLE core.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES core.accounts(id) ON DELETE RESTRICT,
    to_account_id UUID REFERENCES core.accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES core.categories(id) ON DELETE RESTRICT,
    merchant_id UUID REFERENCES core.merchants(id) ON DELETE SET NULL,
    receipt_id UUID REFERENCES core.receipts(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL,
    amount money_pos NOT NULL,
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    exchange_rate NUMERIC(18,8) NOT NULL CHECK (exchange_rate > 0),
    is_rate_estimated BOOLEAN NOT NULL DEFAULT false,
    base_amount money_pos NOT NULL,
    fee_amount money_nonneg NOT NULL DEFAULT 0,
    base_fee money_nonneg NOT NULL DEFAULT 0,
    to_amount money_pos,
    occurred_at TIMESTAMPTZ NOT NULL,
    occurred_date DATE NOT NULL,
    note TEXT,
    description_raw TEXT,
    source transaction_source_enum NOT NULL DEFAULT 'MANUAL',
    is_excluded_from_report BOOLEAN NOT NULL DEFAULT false,
    location JSONB,
    category_source VARCHAR(20) CHECK (category_source IN ('USER', 'AI', 'RULE', 'MERCHANT_DEFAULT')),
    category_status category_status_enum NOT NULL DEFAULT 'CONFIRMED',
    ai_confidence confidence,
    external_id VARCHAR(191),
    client_uuid UUID,
    sync_seq BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    CHECK (
        (type = 'TRANSFER' AND to_account_id IS NOT NULL AND to_account_id <> account_id AND category_id IS NULL)
        OR (type <> 'TRANSFER' AND to_account_id IS NULL AND to_amount IS NULL)
    ),
    CHECK ((type <> 'TRANSFER' AND category_id IS NOT NULL) OR type = 'TRANSFER')
);

CREATE INDEX idx_transactions_user_date ON core.transactions (user_id, occurred_date DESC, id DESC);
CREATE INDEX idx_transactions_user_category ON core.transactions (user_id, category_id, occurred_date DESC);
CREATE INDEX idx_transactions_user_sync ON core.transactions (user_id, sync_seq);
CREATE UNIQUE INDEX idx_transactions_receipt ON core.transactions (receipt_id) WHERE receipt_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_transactions_external ON core.transactions (user_id, external_id) WHERE external_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_transactions_client_uuid ON core.transactions (user_id, client_uuid) WHERE client_uuid IS NOT NULL AND deleted_at IS NULL;

-- 37. transaction_tags: Nối giao dịch ↔ nhãn
CREATE TABLE core.transaction_tags (
    transaction_id UUID NOT NULL REFERENCES core.transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES core.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE INDEX idx_transaction_tags_tag ON core.transaction_tags (tag_id);

-- 38. attachments: File đính kèm giao dịch
CREATE TABLE core.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES core.transactions(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes INTEGER CHECK (file_size_bytes <= 10485760),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CORE SCHEMA - Ngân Sách (2 bảng)
-- =====================================================

-- 39. budgets: Ngân sách
CREATE TABLE core.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    group_id UUID REFERENCES core.groups(id),
    category_id UUID REFERENCES core.categories(id),
    name VARCHAR(100) NOT NULL DEFAULT 'Ngân sách',
    amount money_pos,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    spent_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(15,2),
    percentage_used DOUBLE PRECISION,
    status VARCHAR(20) NOT NULL DEFAULT 'ON_TRACK',
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    period_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    rollover_enabled BOOLEAN NOT NULL DEFAULT false,
    alert_threshold_pct percentage,
    alert_threshold_percentage INTEGER NOT NULL DEFAULT 80,
    last_calculated_at TIMESTAMP,
    sync_seq BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_budgets_user_period ON core.budgets (user_id, start_date, end_date);
CREATE INDEX idx_budgets_category ON core.budgets (category_id);

-- 40. budget_items: Hạn mức theo danh mục
CREATE TABLE core.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES core.budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES core.categories(id),
    name VARCHAR(100),
    allocated_amount money_pos,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    spent_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    remaining NUMERIC(15,2),
    percentage_used DOUBLE PRECISION,
    alert_level VARCHAR(20) DEFAULT 'OK',
    alert_threshold_percentage INTEGER NOT NULL DEFAULT 80,
    transaction_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version INTEGER NOT NULL DEFAULT 0,
    UNIQUE (budget_id, category_id)
);

-- =====================================================
-- CORE SCHEMA - Mục Tiêu (2 bảng)
-- =====================================================

-- 41. goals: Mục tiêu tài chính
CREATE TABLE core.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    group_id UUID REFERENCES core.groups(id),
    name VARCHAR(255) NOT NULL,
    goal_type goal_type_enum NOT NULL,
    target_amount money_pos NOT NULL,
    current_amount money_nonneg NOT NULL DEFAULT 0,
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    target_date DATE,
    status goal_status_enum NOT NULL DEFAULT 'IN_PROGRESS',
    priority goal_priority_enum NOT NULL DEFAULT 'MEDIUM',
    auto_save_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_save_amount money_nonneg,
    auto_save_frequency frequency_type_enum,
    linked_account_id UUID REFERENCES core.accounts(id),
    description TEXT,
    sync_seq BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_goals_user_status ON core.goals (user_id, status);
CREATE INDEX idx_goals_target_date ON core.goals (target_date) WHERE status = 'IN_PROGRESS';

-- 42. goal_contributions: Đóng góp vào mục tiêu
CREATE TABLE core.goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES core.goals(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES core.transactions(id),
    amount money_pos NOT NULL,
    contribution_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_contributions_goal ON core.goal_contributions (goal_id, contribution_date);

-- =====================================================
-- CORE SCHEMA - Lịch & Nhắc Nhở (2 bảng)
-- =====================================================

-- 43. schedules: Lịch định kỳ
CREATE TABLE core.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    template_name VARCHAR(255) NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    account_id UUID NOT NULL REFERENCES core.accounts(id),
    to_account_id UUID REFERENCES core.accounts(id),
    category_id UUID REFERENCES core.categories(id),
    merchant_id UUID REFERENCES core.merchants(id),
    amount money_pos NOT NULL,
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    description TEXT,
    frequency frequency_type_enum NOT NULL,
    frequency_interval SMALLINT NOT NULL DEFAULT 1 CHECK (frequency_interval > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    next_occurrence DATE NOT NULL,
    auto_create BOOLEAN NOT NULL DEFAULT false,
    status recur_status_enum NOT NULL DEFAULT 'ACTIVE',
    sync_seq BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_schedules_next_occurrence ON core.schedules (next_occurrence) WHERE status = 'ACTIVE';
CREATE INDEX idx_schedules_user ON core.schedules (user_id, status);

-- 44. schedule_occurrences: Từng lần đến hạn
CREATE TABLE core.schedule_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES core.schedules(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    transaction_id UUID REFERENCES core.transactions(id),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    is_skipped BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_occurrences_schedule ON core.schedule_occurrences (schedule_id, scheduled_date);

-- =====================================================
-- CORE SCHEMA - Khoản Nợ (2 bảng)
-- =====================================================

-- 45. debts: Khoản nợ
CREATE TABLE core.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    debt_type debt_type_enum NOT NULL,
    counterparty_name VARCHAR(255) NOT NULL,
    principal_amount money_pos NOT NULL,
    remaining_amount money_nonneg NOT NULL,
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    interest_rate NUMERIC(5,2) CHECK (interest_rate >= 0),
    start_date DATE NOT NULL,
    due_date DATE,
    status debt_status_enum NOT NULL DEFAULT 'ACTIVE',
    linked_account_id UUID REFERENCES core.accounts(id),
    description TEXT,
    sync_seq BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_debts_user_status ON core.debts (user_id, status);
CREATE INDEX idx_debts_due_date ON core.debts (due_date) WHERE status IN ('ACTIVE', 'OVERDUE');

-- 46. debt_payments: Thanh toán nợ
CREATE TABLE core.debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES core.debts(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES core.transactions(id),
    payment_amount money_pos NOT NULL,
    principal_amount money_nonneg NOT NULL,
    interest_amount money_nonneg NOT NULL DEFAULT 0,
    payment_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debt_payments_debt ON core.debt_payments (debt_id, payment_date);

-- =====================================================
-- CORE SCHEMA - Tổng Hợp (1 bảng)
-- =====================================================

-- 47. monthly_summaries: Tổng hợp tháng
CREATE TABLE core.monthly_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES core.categories(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_income money_nonneg NOT NULL DEFAULT 0,
    total_expense money_nonneg NOT NULL DEFAULT 0,
    net_amount money NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    currency_code currency_code NOT NULL REFERENCES core.currencies(code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, period_start, category_id)
);

CREATE INDEX idx_monthly_summaries_user_period ON core.monthly_summaries (user_id, period_start DESC);

-- =====================================================
-- CORE SCHEMA - Features & Subscription (3 bảng)
-- =====================================================

-- 48. features: Danh sách tính năng hệ thống
CREATE TABLE core.features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE core.features IS 'Danh sách tính năng hệ thống';

-- 49. subscription_features: Map tier -> features
CREATE TABLE core.subscription_features (
    tier subscription_tier_enum NOT NULL,
    feature_code VARCHAR(50) NOT NULL REFERENCES core.features(code),
    limit_value INTEGER,
    PRIMARY KEY (tier, feature_code)
);

COMMENT ON TABLE core.subscription_features IS 'Tính năng theo từng gói dịch vụ';
COMMENT ON COLUMN core.subscription_features.limit_value IS 'Giới hạn số lượng (VD: 10 accounts cho FREE, -1 = unlimited)';

-- 50. feature_usage: Track usage theo user
CREATE TABLE core.feature_usage (
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    feature_code VARCHAR(50) NOT NULL REFERENCES core.features(code),
    usage_count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, feature_code)
);

COMMENT ON TABLE core.feature_usage IS 'Theo dõi usage features của user (reset theo tháng)';
COMMENT ON COLUMN core.feature_usage.reset_at IS 'Thời điểm reset counter (thường đầu tháng)';

CREATE INDEX idx_feature_usage_reset ON core.feature_usage(user_id, reset_at);

-- =====================================================
-- OPS SCHEMA (8 bảng)
-- =====================================================

-- 1. notifications: Thông báo
CREATE TABLE ops.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    channel notification_channel_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status notification_status_enum NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_status ON ops.notifications (user_id, status, created_at DESC);

-- 2. device_tokens: Token thiết bị
CREATE TABLE ops.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('IOS', 'ANDROID', 'WEB')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, device_id)
);

-- 3. audit_logs: Nhật ký kiểm toán
CREATE TABLE ops.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES core.users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON ops.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON ops.audit_logs (entity_type, entity_id);

-- 4. outbox_events: Transactional outbox
CREATE TABLE ops.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status job_status_enum NOT NULL DEFAULT 'PENDING',
    retry_count SMALLINT NOT NULL DEFAULT 0,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_events_status ON ops.outbox_events (status, created_at);

-- 5. export_jobs: Job xuất báo cáo
CREATE TABLE ops.export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('PDF', 'EXCEL', 'CSV')),
    filters JSONB,
    status job_status_enum NOT NULL DEFAULT 'PENDING',
    file_path TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_export_jobs_user ON ops.export_jobs (user_id, created_at DESC);

-- 6. backup_jobs: Job sao lưu
CREATE TABLE ops.backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('FULL', 'INCREMENTAL')),
    status job_status_enum NOT NULL DEFAULT 'PENDING',
    backup_path TEXT,
    file_size_bytes BIGINT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backup_jobs_user ON ops.backup_jobs (user_id, created_at DESC);

-- 7. sync_tombstones: Đánh dấu xóa cứng
CREATE TABLE ops.sync_tombstones (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_tombstones_user ON ops.sync_tombstones (user_id, entity_type, deleted_at);

-- 8. reconciliation_logs: Nhật ký đối chiếu
CREATE TABLE ops.reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    expected_value NUMERIC(19,4),
    actual_value NUMERIC(19,4),
    difference NUMERIC(19,4),
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reconciliation_logs_unresolved ON ops.reconciliation_logs (is_resolved, created_at) WHERE NOT is_resolved;

-- =====================================================
-- SEED DATA - Currencies
-- =====================================================

INSERT INTO core.currencies (code, name, symbol, decimal_digits, is_active) VALUES
('VND', 'Vietnamese Dong', '₫', 0, true),
('USD', 'US Dollar', '$', 2, true),
('EUR', 'Euro', '€', 2, true),
('GBP', 'British Pound', '£', 2, true),
('JPY', 'Japanese Yen', '¥', 0, true),
('CNY', 'Chinese Yuan', '¥', 2, true),
('KRW', 'South Korean Won', '₩', 0, true),
('THB', 'Thai Baht', '฿', 2, true),
('SGD', 'Singapore Dollar', 'S$', 2, true),
('MYR', 'Malaysian Ringgit', 'RM', 2, true);

-- =====================================================
-- SEED DATA - Banks (Ngân hàng Việt Nam)
-- =====================================================

INSERT INTO core.banks (code, name, short_name, bin, kind, is_active) VALUES
('VCB', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'Vietcombank', '970436', 'BANK', true),
('TCB', 'Ngân hàng TMCP Kỹ Thương Việt Nam', 'Techcombank', '970407', 'BANK', true),
('BIDV', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 'BIDV', '970418', 'BANK', true),
('VTB', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'Vietinbank', '970415', 'BANK', true),
('ACB', 'Ngân hàng TMCP Á Châu', 'ACB', '970416', 'BANK', true),
('MB', 'Ngân hàng TMCP Quân Đội', 'MB Bank', '970422', 'BANK', true),
('VPB', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 'VPBank', '970432', 'BANK', true),
('SHB', 'Ngân hàng TMCP Sài Gòn - Hà Nội', 'SHB', '970443', 'BANK', true),
('TPB', 'Ngân hàng TMCP Tiên Phong', 'TPBank', '970423', 'BANK', true),
('AGR', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn VN', 'Agribank', '970405', 'BANK', true),
('STB', 'Ngân hàng TMCP Sài Gòn Thương Tín', 'Sacombank', '970403', 'BANK', true),
('HDB', 'Ngân hàng TMCP Phát triển TP.HCM', 'HDBank', '970437', 'BANK', true),
('VIB', 'Ngân hàng TMCP Quốc tế Việt Nam', 'VIB', '970441', 'BANK', true),
('OCB', 'Ngân hàng TMCP Phương Đông', 'OCB', '970448', 'BANK', true),
('MSB', 'Ngân hàng TMCP Hàng Hải Việt Nam', 'MSB', '970426', 'BANK', true),
('SEAB', 'Ngân hàng TMCP Đông Nam Á', 'SeABank', '970440', 'BANK', true),
('VIETCAPITAL', 'Ngân hàng TMCP Bản Việt', 'BVBank', '970454', 'BANK', true),
('LPB', 'Ngân hàng TMCP Lộc Phát Việt Nam', 'LPBank', '970449', 'BANK', true),
('MOMO', 'Ví điện tử MoMo', 'MoMo', NULL, 'E_WALLET', true),
('VNPAY', 'Ví điện tử VNPay', 'VNPay', NULL, 'E_WALLET', true),
('ZALOPAY', 'Ví điện tử ZaloPay', 'ZaloPay', NULL, 'E_WALLET', true),
('SHOPEEPAY', 'Ví điện tử ShopeePay', 'ShopeePay', NULL, 'E_WALLET', true),
('VIETTELMONEY', 'Hệ sinh thái tài chính số Viettel Money', 'Viettel Money', NULL, 'E_WALLET', true),
('VNPTMONEY', 'Ví điện tử VNPT Money', 'VNPT Money', NULL, 'E_WALLET', true);

-- =====================================================
-- SEED DATA - System Categories
-- =====================================================

-- Thu nhập (INCOME)
INSERT INTO core.categories (id, code, name, kind, icon, color, is_system, display_order) VALUES
(gen_random_uuid(), 'SALARY', 'Lương', 'INCOME', 'briefcase', '#10b981', true, 1),
(gen_random_uuid(), 'BONUS', 'Thưởng', 'INCOME', 'gift', '#059669', true, 2),
(gen_random_uuid(), 'INVESTMENT_INCOME', 'Thu nhập từ đầu tư', 'INCOME', 'trending-up', '#0d9488', true, 3),
(gen_random_uuid(), 'BUSINESS_INCOME', 'Thu nhập kinh doanh', 'INCOME', 'store', '#0284c7', true, 4),
(gen_random_uuid(), 'OTHER_INCOME', 'Thu nhập khác', 'INCOME', 'plus-circle', '#16a34a', true, 5);

-- Chi tiêu (EXPENSE)
INSERT INTO core.categories (id, code, name, kind, icon, color, is_system, is_essential, display_order) VALUES
(gen_random_uuid(), 'FOOD_DRINK', 'Ăn uống', 'EXPENSE', 'coffee', '#f43f5e', true, true, 10),
(gen_random_uuid(), 'SHOPPING', 'Mua sắm', 'EXPENSE', 'shopping-bag', '#ec4899', true, false, 11),
(gen_random_uuid(), 'TRANSPORTATION', 'Đi lại', 'EXPENSE', 'car', '#f59e0b', true, true, 12),
(gen_random_uuid(), 'HOUSING', 'Nhà ở', 'EXPENSE', 'home', '#8b5cf6', true, true, 13),
(gen_random_uuid(), 'UTILITIES', 'Hóa đơn, tiện ích', 'EXPENSE', 'zap', '#0ea5e9', true, true, 14),
(gen_random_uuid(), 'HEALTHCARE', 'Y tế, sức khỏe', 'EXPENSE', 'heart', '#ef4444', true, true, 15),
(gen_random_uuid(), 'EDUCATION', 'Giáo dục', 'EXPENSE', 'book', '#6366f1', true, true, 16),
(gen_random_uuid(), 'ENTERTAINMENT', 'Giải trí', 'EXPENSE', 'film', '#d946ef', true, false, 17),
(gen_random_uuid(), 'TRAVEL', 'Du lịch', 'EXPENSE', 'map', '#14b8a6', true, false, 18),
(gen_random_uuid(), 'INSURANCE', 'Bảo hiểm', 'EXPENSE', 'shield', '#64748b', true, true, 19),
(gen_random_uuid(), 'SAVINGS_INVESTMENT', 'Tiết kiệm, đầu tư', 'EXPENSE', 'piggy-bank', '#059669', true, false, 20),
(gen_random_uuid(), 'DEBT_PAYMENT', 'Trả nợ', 'EXPENSE', 'credit-card', '#e11d48', true, true, 21),
(gen_random_uuid(), 'UNCATEGORIZED', 'Chưa phân loại', 'EXPENSE', 'help-circle', '#6b7280', true, false, 99);

-- =====================================================
-- SEED DATA - Features & Subscription
-- =====================================================

-- Danh sách features
INSERT INTO core.features (code, name, description) VALUES
('MAX_ACCOUNTS', 'Số lượng tài khoản', 'Giới hạn số ví/tài khoản có thể tạo'),
('MAX_BUDGETS', 'Số lượng ngân sách', 'Giới hạn số ngân sách có thể tạo'),
('MAX_GOALS', 'Số lượng mục tiêu', 'Giới hạn số mục tiêu tài chính'),
('OCR_RECEIPT', 'OCR hóa đơn', 'Quét hóa đơn tự động bằng AI'),
('AI_ASSISTANT', 'Trợ lý AI', 'Chatbot tài chính thông minh'),
('EXPORT_PDF', 'Xuất báo cáo PDF', 'Xuất báo cáo chi tiết PDF'),
('EXPORT_EXCEL', 'Xuất Excel', 'Xuất dữ liệu Excel'),
('GROUP_SHARING', 'Chia sẻ nhóm', 'Chia sẻ tài chính với gia đình'),
('BANK_SYNC', 'Đồng bộ ngân hàng', 'Tự động đồng bộ giao dịch từ ngân hàng'),
('ADVANCED_ANALYTICS', 'Phân tích nâng cao', 'Biểu đồ và insights chuyên sâu'),
('PRIORITY_SUPPORT', 'Hỗ trợ ưu tiên', 'Hỗ trợ khách hàng ưu tiên'),
('NO_ADS', 'Không quảng cáo', 'Trải nghiệm không quảng cáo');

-- Features cho FREE tier
INSERT INTO core.subscription_features (tier, feature_code, limit_value) VALUES
('FREE', 'MAX_ACCOUNTS', 3),
('FREE', 'MAX_BUDGETS', 5),
('FREE', 'MAX_GOALS', 3),
('FREE', 'OCR_RECEIPT', 10),
('FREE', 'GROUP_SHARING', 1),
('FREE', 'AI_ASSISTANT', 20);

-- Features cho PREMIUM tier
INSERT INTO core.subscription_features (tier, feature_code, limit_value) VALUES
('PREMIUM', 'MAX_ACCOUNTS', -1),
('PREMIUM', 'MAX_BUDGETS', -1),
('PREMIUM', 'MAX_GOALS', -1),
('PREMIUM', 'OCR_RECEIPT', -1),
('PREMIUM', 'AI_ASSISTANT', -1),
('PREMIUM', 'EXPORT_PDF', -1),
('PREMIUM', 'EXPORT_EXCEL', -1),
('PREMIUM', 'GROUP_SHARING', 5),
('PREMIUM', 'BANK_SYNC', -1),
('PREMIUM', 'ADVANCED_ANALYTICS', -1),
('PREMIUM', 'NO_ADS', -1);

-- Features cho ENTERPRISE tier
INSERT INTO core.subscription_features (tier, feature_code, limit_value) VALUES
('ENTERPRISE', 'MAX_ACCOUNTS', -1),
('ENTERPRISE', 'MAX_BUDGETS', -1),
('ENTERPRISE', 'MAX_GOALS', -1),
('ENTERPRISE', 'OCR_RECEIPT', -1),
('ENTERPRISE', 'AI_ASSISTANT', -1),
('ENTERPRISE', 'EXPORT_PDF', -1),
('ENTERPRISE', 'EXPORT_EXCEL', -1),
('ENTERPRISE', 'GROUP_SHARING', -1),
('ENTERPRISE', 'BANK_SYNC', -1),
('ENTERPRISE', 'ADVANCED_ANALYTICS', -1),
('ENTERPRISE', 'PRIORITY_SUPPORT', -1),
('ENTERPRISE', 'NO_ADS', -1);

-- =====================================================
-- END OF MIGRATION
-- =====================================================

COMMENT ON SCHEMA core IS 'Core business schema - 50 tables (36 base + 11 Groups + 3 Features)';
COMMENT ON SCHEMA ops IS 'Operational schema - 8 tables';

-- Total: 58 tables (50 CORE + 8 OPS)
