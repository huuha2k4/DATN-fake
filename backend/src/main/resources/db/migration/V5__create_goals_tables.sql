-- =====================================================
-- Migration V5: Goals Module
-- Tạo các bảng cho quản lý mục tiêu tài chính
-- =====================================================

-- Bảng goals: Lưu thông tin mục tiêu tài chính
CREATE TABLE goals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN (
        'EMERGENCY_FUND', 'PURCHASE', 'VACATION', 'EDUCATION', 
        'RETIREMENT', 'DEBT_PAYOFF', 'INVESTMENT', 'OTHER'
    )),
    target_amount DECIMAL(19, 4) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(19, 4) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'VND',
    target_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN (
        'IN_PROGRESS', 'ACHIEVED', 'CANCELLED', 'FAILED'
    )),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN (
        'LOW', 'MEDIUM', 'HIGH'
    )),
    icon VARCHAR(100),
    color VARCHAR(7),
    description TEXT,
    
    -- Auto-save settings
    auto_save_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_save_amount DECIMAL(19, 4) CHECK (auto_save_amount IS NULL OR auto_save_amount > 0),
    auto_save_frequency VARCHAR(20) CHECK (auto_save_frequency IS NULL OR auto_save_frequency IN (
        'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'
    )),
    next_contribution_date DATE,
    account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    
    -- Completion tracking
    completed_at TIMESTAMP,
    completed_note TEXT,
    actual_amount_used DECIMAL(19, 4),
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT goals_auto_save_check CHECK (
        (auto_save_enabled = FALSE) OR 
        (auto_save_enabled = TRUE AND auto_save_amount IS NOT NULL AND auto_save_frequency IS NOT NULL)
    ),
    CONSTRAINT goals_completion_check CHECK (
        (status != 'ACHIEVED') OR 
        (status = 'ACHIEVED' AND completed_at IS NOT NULL)
    )
);

-- Bảng goal_contributions: Lưu lịch sử đóng góp vào mục tiêu
CREATE TABLE goal_contributions (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount DECIMAL(19, 4) NOT NULL CHECK (amount > 0),
    note TEXT,
    source_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    contributed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0
);

-- Bảng goal_milestones: Lưu các mốc quan trọng của mục tiêu
CREATE TABLE goal_milestones (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    target_amount DECIMAL(19, 4) NOT NULL CHECK (target_amount > 0),
    achieved BOOLEAN NOT NULL DEFAULT FALSE,
    achieved_at TIMESTAMP,
    reward TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT milestones_achievement_check CHECK (
        (achieved = FALSE AND achieved_at IS NULL) OR 
        (achieved = TRUE AND achieved_at IS NOT NULL)
    )
);

-- =====================================================
-- Indexes for performance optimization
-- =====================================================

-- Goals indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_goal_type ON goals(goal_type);
CREATE INDEX idx_goals_priority ON goals(priority);
CREATE INDEX idx_goals_target_date ON goals(target_date);
CREATE INDEX idx_goals_user_status ON goals(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_user_type ON goals(user_id, goal_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_auto_save ON goals(auto_save_enabled, next_contribution_date) 
    WHERE auto_save_enabled = TRUE AND status = 'IN_PROGRESS' AND deleted_at IS NULL;
CREATE INDEX idx_goals_deleted_at ON goals(deleted_at);
CREATE INDEX idx_goals_created_at ON goals(created_at DESC);

-- Goal contributions indexes
CREATE INDEX idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_contributed_at ON goal_contributions(contributed_at DESC);
CREATE INDEX idx_goal_contributions_source_account ON goal_contributions(source_account_id);

-- Goal milestones indexes
CREATE INDEX idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX idx_goal_milestones_achieved ON goal_milestones(achieved);
CREATE INDEX idx_goal_milestones_percentage ON goal_milestones(percentage);

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE goals IS 'Lưu thông tin các mục tiêu tài chính của người dùng';
COMMENT ON COLUMN goals.goal_type IS 'Loại mục tiêu: EMERGENCY_FUND, PURCHASE, VACATION, EDUCATION, RETIREMENT, DEBT_PAYOFF, INVESTMENT, OTHER';
COMMENT ON COLUMN goals.status IS 'Trạng thái: IN_PROGRESS, ACHIEVED, CANCELLED, FAILED';
COMMENT ON COLUMN goals.priority IS 'Độ ưu tiên: LOW, MEDIUM, HIGH';
COMMENT ON COLUMN goals.auto_save_enabled IS 'Có bật tính năng tự động tiết kiệm không';
COMMENT ON COLUMN goals.auto_save_frequency IS 'Tần suất tự động tiết kiệm: DAILY, WEEKLY, MONTHLY, QUARTERLY';
COMMENT ON COLUMN goals.next_contribution_date IS 'Ngày đóng góp tự động tiếp theo';
COMMENT ON COLUMN goals.account_id IS 'Tài khoản nguồn cho auto-save';
COMMENT ON COLUMN goals.actual_amount_used IS 'Số tiền thực tế đã sử dụng khi hoàn thành mục tiêu';

COMMENT ON TABLE goal_contributions IS 'Lưu lịch sử các lần đóng góp vào mục tiêu';
COMMENT ON COLUMN goal_contributions.source_account_id IS 'Tài khoản nguồn của khoản đóng góp';

COMMENT ON TABLE goal_milestones IS 'Lưu các mốc quan trọng (milestones) của mục tiêu';
COMMENT ON COLUMN goal_milestones.percentage IS 'Phần trăm hoàn thành khi đạt mốc này (0-100)';
COMMENT ON COLUMN goal_milestones.target_amount IS 'Số tiền mục tiêu của mốc này';
COMMENT ON COLUMN goal_milestones.reward IS 'Phần thưởng khi đạt mốc này';
