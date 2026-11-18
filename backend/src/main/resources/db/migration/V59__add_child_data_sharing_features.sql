-- V58: Add child data sharing features
-- Support for independent child accounts joining family groups and data sharing controls

-- Add new columns to group_members table
ALTER TABLE core.group_members
ADD COLUMN IF NOT EXISTS can_view_family_expenses BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_child_profile BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS linked_child_wallet_id UUID;

-- Add foreign key constraint for linked_child_wallet_id
ALTER TABLE core.group_members
ADD CONSTRAINT fk_group_members_linked_child_wallet
FOREIGN KEY (linked_child_wallet_id)
REFERENCES core.child_wallets(id)
ON DELETE SET NULL;

-- Create index for linked_child_wallet_id
CREATE INDEX IF NOT EXISTS idx_group_members_linked_child_wallet
ON core.group_members(linked_child_wallet_id)
WHERE linked_child_wallet_id IS NOT NULL;

-- Create child_data_sharing_requests table
CREATE TABLE IF NOT EXISTS core.child_data_sharing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_wallet_id UUID NOT NULL,
    child_user_id UUID NOT NULL,
    requested_by_user_id UUID NOT NULL,
    group_id UUID NOT NULL,
    requested_level VARCHAR(20) NOT NULL CHECK (requested_level IN ('NONE', 'SUMMARY_DAILY', 'DETAILED')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED')),
    request_reason TEXT,
    rejection_reason TEXT,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    -- Foreign keys
    CONSTRAINT fk_sharing_requests_child_wallet
        FOREIGN KEY (child_wallet_id)
        REFERENCES core.child_wallets(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_sharing_requests_child_user
        FOREIGN KEY (child_user_id)
        REFERENCES core.users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_sharing_requests_requested_by
        FOREIGN KEY (requested_by_user_id)
        REFERENCES core.users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_sharing_requests_group
        FOREIGN KEY (group_id)
        REFERENCES core.groups(id)
        ON DELETE CASCADE
);

-- Create indexes for child_data_sharing_requests
CREATE INDEX IF NOT EXISTS idx_sharing_requests_child_wallet
ON core.child_data_sharing_requests(child_wallet_id);

CREATE INDEX IF NOT EXISTS idx_sharing_requests_child_user
ON core.child_data_sharing_requests(child_user_id);

CREATE INDEX IF NOT EXISTS idx_sharing_requests_requested_by
ON core.child_data_sharing_requests(requested_by_user_id);

CREATE INDEX IF NOT EXISTS idx_sharing_requests_group
ON core.child_data_sharing_requests(group_id);

CREATE INDEX IF NOT EXISTS idx_sharing_requests_status
ON core.child_data_sharing_requests(status)
WHERE status IN ('PENDING', 'APPROVED');

-- Create composite index for finding active sharing permissions (simplified - no time check in index)
CREATE INDEX IF NOT EXISTS idx_sharing_requests_active
ON core.child_data_sharing_requests(child_wallet_id, requested_by_user_id, status)
WHERE status = 'APPROVED';

-- Add comments
COMMENT ON TABLE core.child_data_sharing_requests IS 'Quản lý yêu cầu chia sẻ dữ liệu chi tiêu giữa con và bố mẹ';
COMMENT ON COLUMN core.child_data_sharing_requests.requested_level IS 'Mức độ chia sẻ: NONE, SUMMARY_DAILY (chỉ tổng), DETAILED (chi tiết)';
COMMENT ON COLUMN core.child_data_sharing_requests.status IS 'Trạng thái: PENDING, APPROVED, REJECTED, EXPIRED, REVOKED';
COMMENT ON COLUMN core.child_data_sharing_requests.expires_at IS 'Thời điểm hết hạn đồng ý (thường 3 tháng sau khi approve)';

COMMENT ON COLUMN core.group_members.can_view_family_expenses IS 'Thành viên có được xem chi tiêu gia đình không (bố mẹ cài đặt)';
COMMENT ON COLUMN core.group_members.is_child_profile IS 'Đánh dấu thành viên là "con" để áp dụng chính sách quản lý trẻ em';
COMMENT ON COLUMN core.group_members.linked_child_wallet_id IS 'ID của ChildWallet được gắn với thành viên (nếu có)';
