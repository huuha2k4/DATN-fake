-- Tăng độ dài cột icon của bảng goals lên 50 ký tự để lưu tên icon định danh
ALTER TABLE core.goals ALTER COLUMN icon TYPE VARCHAR(50);

-- Cho phép target_amount >= 0 để hỗ trợ các khoản tiết kiệm tự do / quỹ tích lũy không áp đặt target bắt buộc
ALTER TABLE core.goals ALTER COLUMN target_amount TYPE core.money_nonneg;

