-- Migration V10: Đảm bảo schedule_occurrences.transaction_id là UUID
-- Script này sẽ tự động detect và fix nếu cột đang là BIGINT

DO $$
DECLARE
    current_data_type TEXT;
BEGIN
    -- Kiểm tra kiểu dữ liệu hiện tại của cột transaction_id
    SELECT data_type INTO current_data_type
    FROM information_schema.columns
    WHERE table_schema = 'core'
      AND table_name = 'schedule_occurrences'
      AND column_name = 'transaction_id';

    -- Nếu cột là BIGINT hoặc INTEGER, cần chuyển sang UUID
    IF current_data_type IN ('bigint', 'integer') THEN
        RAISE NOTICE 'Phát hiện transaction_id đang là %, chuyển sang UUID...', current_data_type;
        
        -- Xóa dữ liệu cũ vì không thể convert BIGINT -> UUID
        TRUNCATE TABLE core.schedule_occurrences CASCADE;
        
        -- Xóa cột cũ
        ALTER TABLE core.schedule_occurrences DROP COLUMN transaction_id;
        
        -- Thêm lại cột với kiểu UUID
        ALTER TABLE core.schedule_occurrences 
            ADD COLUMN transaction_id UUID;
        
        -- Thêm foreign key constraint
        ALTER TABLE core.schedule_occurrences 
            ADD CONSTRAINT fk_schedule_occurrences_transaction 
            FOREIGN KEY (transaction_id) 
            REFERENCES core.transactions(id) 
            ON DELETE SET NULL;
        
        -- Tạo lại index
        DROP INDEX IF EXISTS core.idx_occurrences_transaction_id;
        CREATE INDEX idx_occurrences_transaction_id 
            ON core.schedule_occurrences(transaction_id) 
            WHERE transaction_id IS NOT NULL;
        
        -- Thêm comment
        COMMENT ON COLUMN core.schedule_occurrences.transaction_id IS 'ID của transaction được tạo ra (nếu là TRANSACTION type) - UUID';
        
        RAISE NOTICE 'Đã chuyển transaction_id sang UUID thành công!';
    ELSE
        RAISE NOTICE 'transaction_id đã là UUID (%), không cần fix', current_data_type;
    END IF;
END $$;
