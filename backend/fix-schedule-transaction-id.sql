-- Script để fix lỗi schedule_occurrences.transaction_id
-- Chạy script này TRỰC TIẾP trong PostgreSQL (pgAdmin hoặc psql)

-- Kết nối vào database finance_db

-- Bước 1: Xóa dữ liệu cũ trong bảng schedule_occurrences (vì không thể convert BIGINT -> UUID)
TRUNCATE TABLE core.schedule_occurrences CASCADE;

-- Bước 2: Xóa cột transaction_id cũ
ALTER TABLE core.schedule_occurrences DROP COLUMN IF EXISTS transaction_id;

-- Bước 3: Thêm lại cột transaction_id với kiểu UUID
ALTER TABLE core.schedule_occurrences 
    ADD COLUMN transaction_id UUID;

-- Bước 4: Thêm foreign key constraint
ALTER TABLE core.schedule_occurrences 
    ADD CONSTRAINT fk_transaction_id 
    FOREIGN KEY (transaction_id) 
    REFERENCES core.transactions(id) 
    ON DELETE SET NULL;

-- Bước 5: Tạo lại index
DROP INDEX IF EXISTS core.idx_occurrences_transaction_id;
CREATE INDEX idx_occurrences_transaction_id 
    ON core.schedule_occurrences(transaction_id) 
    WHERE transaction_id IS NOT NULL;

-- Bước 6: Thêm comment
COMMENT ON COLUMN core.schedule_occurrences.transaction_id IS 'ID của transaction được tạo ra (nếu là TRANSACTION type) - UUID';

-- Kiểm tra kết quả
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'core' 
    AND table_name = 'schedule_occurrences' 
    AND column_name = 'transaction_id';

-- Nếu kết quả hiển thị data_type = 'uuid' thì OK!
