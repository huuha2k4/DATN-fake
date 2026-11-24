-- Thêm trường date_of_birth vào bảng core.users nếu chưa có
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
COMMENT ON COLUMN core.users.date_of_birth IS 'Ngày sinh của người dùng';
