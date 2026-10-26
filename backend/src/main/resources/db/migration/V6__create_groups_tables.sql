-- Migration V6: Create Groups Module Tables (Extended)
-- Author: System
-- Date: 2026-10-26
-- Description: Drop and recreate all 13 tables for full Groups Management

-- Drop all existing group-related tables
DROP TABLE IF EXISTS core.transaction_comments CASCADE;
DROP TABLE IF EXISTS core.child_chores CASCADE;
DROP TABLE IF EXISTS core.child_spend_requests CASCADE;
DROP TABLE IF EXISTS core.child_wallets CASCADE;
DROP TABLE IF EXISTS core.group_activities CASCADE;
DROP TABLE IF EXISTS core.group_invitations CASCADE;
DROP TABLE IF EXISTS core.group_message_reads CASCADE;
DROP TABLE IF EXISTS core.group_message_attachments CASCADE;
DROP TABLE IF EXISTS core.group_messages CASCADE;
DROP TABLE IF EXISTS core.group_settlements CASCADE;
DROP TABLE IF EXISTS core.group_expense_splits CASCADE;
DROP TABLE IF EXISTS core.group_expenses CASCADE;
DROP TABLE IF EXISTS core.shared_resources CASCADE;
DROP TABLE IF EXISTS core.group_members CASCADE;
DROP TABLE IF EXISTS core.groups CASCADE;

-- ============================================================================
-- 1. CORE GROUPS TABLE
-- ============================================================================
CREATE TABLE core.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('FAMILY', 'TRAVEL', 'ROOMMATE', 'COUPLE', 'PROJECT', 'OTHER')),
    owner_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    base_currency CHAR(3) NOT NULL REFERENCES core.currencies(code),
    avatar_key TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_groups_owner ON core.groups(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_groups_status ON core.groups(status) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. GROUP MEMBERS TABLE (Composite PK)
-- ============================================================================
DROP TABLE IF EXISTS core.group_members CASCADE;

CREATE TABLE core.group_members (
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    contribution_ratio NUMERIC(5,2) CHECK (contribution_ratio >= 0 AND contribution_ratio <= 100),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON core.group_members(user_id);

-- ============================================================================
-- 3. GROUP EXPENSES TABLE
-- ============================================================================
CREATE TABLE core.group_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    description VARCHAR(300) NOT NULL,
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    paid_by_user_id UUID NOT NULL REFERENCES core.users(id),
    category_id UUID REFERENCES core.categories(id) ON DELETE SET NULL,
    split_method VARCHAR(20) NOT NULL CHECK (split_method IN ('EQUAL', 'PERCENTAGE', 'EXACT', 'SHARES')),
    expense_date DATE NOT NULL,
    notes TEXT,
    receipt_key TEXT,
    location JSONB,
    created_by_user_id UUID NOT NULL REFERENCES core.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_group_expenses_group ON core.group_expenses(group_id, expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_group_expenses_paid_by ON core.group_expenses(paid_by_user_id);
CREATE INDEX idx_group_expenses_category ON core.group_expenses(category_id);

-- ============================================================================
-- 4. EXPENSE SPLITS TABLE
-- ============================================================================
CREATE TABLE core.group_expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES core.group_expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id),
    amount NUMERIC(19,4) NOT NULL CHECK (amount >= 0),
    percentage NUMERIC(5,2) CHECK (percentage >= 0 AND percentage <= 100),
    shares NUMERIC(10,2) CHECK (shares >= 0)
);

CREATE INDEX idx_expense_splits_expense ON core.group_expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON core.group_expense_splits(user_id);

-- ============================================================================
-- 5. GROUP SETTLEMENTS TABLE
-- ============================================================================
CREATE TABLE core.group_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES core.users(id),
    to_user_id UUID NOT NULL REFERENCES core.users(id),
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    payment_method VARCHAR(50),
    settlement_date DATE NOT NULL,
    notes TEXT,
    proof_key TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_settlements_group ON core.group_settlements(group_id, created_at DESC);
CREATE INDEX idx_settlements_from_user ON core.group_settlements(from_user_id);
CREATE INDEX idx_settlements_to_user ON core.group_settlements(to_user_id);
CREATE INDEX idx_settlements_status ON core.group_settlements(status);

-- ============================================================================
-- 6. TRANSACTION COMMENTS TABLE (Polymorphic)
-- ============================================================================
CREATE TABLE core.transaction_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    commentable_type VARCHAR(20) NOT NULL CHECK (commentable_type IN ('TRANSACTION', 'GROUP_EXPENSE')),
    commentable_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES core.users(id),
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES core.transaction_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_commentable ON core.transaction_comments(commentable_type, commentable_id);
CREATE INDEX idx_comments_parent ON core.transaction_comments(parent_comment_id);
CREATE INDEX idx_comments_user ON core.transaction_comments(user_id);

-- ============================================================================
-- 7. GROUP ACTIVITIES TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE core.group_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES core.users(id),
    description VARCHAR(500) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_group ON core.group_activities(group_id, created_at DESC);
CREATE INDEX idx_activities_type ON core.group_activities(activity_type);
CREATE INDEX idx_activities_user ON core.group_activities(user_id);

-- ============================================================================
-- 8. GROUP MESSAGES TABLE (Chat)
-- ============================================================================
CREATE TABLE core.group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES core.users(id),
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('TEXT', 'IMAGE', 'EXPENSE_CARD', 'SYSTEM')),
    content TEXT,
    reply_to_message_id UUID REFERENCES core.group_messages(id) ON DELETE SET NULL,
    expense_id UUID REFERENCES core.group_expenses(id) ON DELETE SET NULL,
    mentioned_user_ids JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_group ON core.group_messages(group_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_sender ON core.group_messages(sender_id);
CREATE INDEX idx_messages_expense ON core.group_messages(expense_id);

-- ============================================================================
-- 9. GROUP MESSAGE ATTACHMENTS TABLE
-- ============================================================================
CREATE TABLE core.group_message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES core.group_messages(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    thumbnail_key TEXT
);

CREATE INDEX idx_message_attachments_message ON core.group_message_attachments(message_id);

-- ============================================================================
-- 10. GROUP MESSAGE READS TABLE (Read Receipts)
-- ============================================================================
CREATE TABLE core.group_message_reads (
    message_id UUID NOT NULL REFERENCES core.group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_message_reads_user ON core.group_message_reads(user_id);

-- ============================================================================
-- 11. CHILD WALLETS TABLE (Family Mode)
-- ============================================================================
CREATE TABLE core.child_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    child_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    avatar_key TEXT,
    balance NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency CHAR(3) NOT NULL,
    weekly_allowance NUMERIC(19,4) CHECK (weekly_allowance >= 0),
    next_allowance_date DATE,
    privacy_level VARCHAR(20) NOT NULL CHECK (privacy_level IN ('FULL_ACCESS', 'PARENT_SUPERVISED', 'VIEW_ONLY')),
    spend_limit_daily NUMERIC(19,4) CHECK (spend_limit_daily >= 0),
    spend_limit_weekly NUMERIC(19,4) CHECK (spend_limit_weekly >= 0),
    allowed_categories JSONB DEFAULT '[]',
    require_approval_above NUMERIC(19,4) CHECK (require_approval_above >= 0),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_child_wallets_group ON core.child_wallets(group_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 12. CHILD SPEND REQUESTS TABLE
-- ============================================================================
CREATE TABLE core.child_spend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES core.child_wallets(id) ON DELETE CASCADE,
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    category_id UUID NOT NULL REFERENCES core.categories(id),
    description VARCHAR(300) NOT NULL,
    notes TEXT,
    image_key TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    responded_by_user_id UUID REFERENCES core.users(id),
    responded_at TIMESTAMPTZ,
    response_notes TEXT,
    rejection_reason TEXT,
    transaction_id UUID REFERENCES core.transactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_spend_requests_wallet ON core.child_spend_requests(wallet_id, created_at DESC);
CREATE INDEX idx_spend_requests_status ON core.child_spend_requests(status);

-- ============================================================================
-- 13. CHILD CHORES TABLE (Gamification)
-- ============================================================================
CREATE TABLE core.child_chores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES core.child_wallets(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    reward_amount NUMERIC(19,4) NOT NULL CHECK (reward_amount >= 0),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY')),
    due_date DATE,
    difficulty VARCHAR(20) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    estimated_minutes INTEGER CHECK (estimated_minutes >= 0),
    icon VARCHAR(10),
    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    proof_image_key TEXT,
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    approved_by_user_id UUID REFERENCES core.users(id),
    approved_at TIMESTAMPTZ,
    feedback TEXT,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chores_wallet ON core.child_chores(wallet_id, created_at DESC);
CREATE INDEX idx_chores_status ON core.child_chores(status);
CREATE INDEX idx_chores_due_date ON core.child_chores(due_date) WHERE status IN ('ASSIGNED', 'IN_PROGRESS');

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================================

-- Trigger for groups updated_at
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_groups_updated_at
BEFORE UPDATE ON core.groups
FOR EACH ROW
EXECUTE FUNCTION update_groups_updated_at();

-- Trigger for group_expenses updated_at
CREATE OR REPLACE FUNCTION update_group_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_group_expenses_updated_at
BEFORE UPDATE ON core.group_expenses
FOR EACH ROW
EXECUTE FUNCTION update_group_expenses_updated_at();

-- Trigger for child_wallets updated_at
CREATE OR REPLACE FUNCTION update_child_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_child_wallets_updated_at
BEFORE UPDATE ON core.child_wallets
FOR EACH ROW
EXECUTE FUNCTION update_child_wallets_updated_at();

-- Trigger for transaction_comments updated_at
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON core.transaction_comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_updated_at();

-- Trigger for group_messages updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_updated_at
BEFORE UPDATE ON core.group_messages
FOR EACH ROW
EXECUTE FUNCTION update_messages_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE core.groups IS 'Groups for shared expense management (family, travel, roommates, etc.)';
COMMENT ON TABLE core.group_members IS 'Members of a group with their roles';
COMMENT ON TABLE core.group_expenses IS 'Expenses shared among group members';
COMMENT ON TABLE core.group_expense_splits IS 'How expenses are split among members';
COMMENT ON TABLE core.group_settlements IS 'Payments between group members to settle debts';
COMMENT ON TABLE core.transaction_comments IS 'Comments on transactions or group expenses (polymorphic)';
COMMENT ON TABLE core.group_activities IS 'Audit trail of group activities';
COMMENT ON TABLE core.group_messages IS 'Chat messages within a group';
COMMENT ON TABLE core.group_message_attachments IS 'File attachments for group messages';
COMMENT ON TABLE core.group_message_reads IS 'Read receipts for group messages';
COMMENT ON TABLE core.child_wallets IS 'Child wallets for family mode with parental controls';
COMMENT ON TABLE core.child_spend_requests IS 'Spending requests from children requiring approval';
COMMENT ON TABLE core.child_chores IS 'Chores for children with rewards (gamification)';
