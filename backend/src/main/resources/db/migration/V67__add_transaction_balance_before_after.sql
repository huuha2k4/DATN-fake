-- V67: Lưu số dư ví trước và sau mỗi giao dịch để hiển thị chi tiết biến động trong quản lý thu chi
ALTER TABLE core.transactions
    ADD COLUMN IF NOT EXISTS balance_before NUMERIC(19, 4),
    ADD COLUMN IF NOT EXISTS balance_after NUMERIC(19, 4);
