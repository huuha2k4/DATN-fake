-- V68: Mở rộng bảng ops.audit_logs thành Enterprise System Audit Log (append-only, không tạo bảng mới)

-- 1. Gỡ bỏ FK cũ trên user_id để audit log không bị phụ thuộc hoặc xóa theo vòng đời tài khoản người dùng
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'ops'
      AND tc.table_name = 'audit_logs'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE ops.audit_logs DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

-- 2. Chuẩn hóa kiểu dữ liệu cột cũ để tương thích Hibernate ddl-auto=validate và bảo vệ dữ liệu
ALTER TABLE ops.audit_logs
    ALTER COLUMN entity_type TYPE VARCHAR(100),
    ALTER COLUMN ip_address TYPE VARCHAR(45) USING host(ip_address);

-- 3. Bổ sung các cột nhận dạng sự kiện, actor, ngữ cảnh request, thay đổi dữ liệu và kết quả
ALTER TABLE ops.audit_logs
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) NOT NULL DEFAULT 'LEGACY_EVENT',
    ADD COLUMN IF NOT EXISTS event_category VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    ADD COLUMN IF NOT EXISTS outcome VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    ADD COLUMN IF NOT EXISTS actor_id UUID,
    ADD COLUMN IF NOT EXISTS actor_type VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS subject_user_id UUID,
    ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN IF NOT EXISTS related_resource_id UUID,
    ADD COLUMN IF NOT EXISTS group_id UUID,
    ADD COLUMN IF NOT EXISTS request_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS http_method VARCHAR(10),
    ADD COLUMN IF NOT EXISTS endpoint VARCHAR(200),
    ADD COLUMN IF NOT EXISTS changed_fields JSONB,
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS reason_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS error_code VARCHAR(100);

-- 4. Index tối ưu cho truy vấn điều tra sự cố (không đánh index toàn bộ cột, không tạo GIN trên toàn bộ metadata)
CREATE INDEX IF NOT EXISTS idx_ops_audit_occurred_at
    ON ops.audit_logs (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_audit_actor_occurred
    ON ops.audit_logs (actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_audit_event_type_occurred
    ON ops.audit_logs (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_audit_resource_occurred
    ON ops.audit_logs (entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_audit_request_id
    ON ops.audit_logs (request_id)
    WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ops_audit_correlation_id
    ON ops.audit_logs (correlation_id)
    WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ops_audit_security_high
    ON ops.audit_logs (occurred_at DESC)
    WHERE severity IN ('HIGH', 'CRITICAL') OR outcome IN ('DENIED', 'FAILURE');

CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_audit_event_id_unique
    ON ops.audit_logs (event_id)
    WHERE event_id IS NOT NULL;

-- 5. Append-only trigger guard: chặn UPDATE / DELETE trực tiếp trừ khi retention job bật session setting hợp lệ
CREATE OR REPLACE FUNCTION ops.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.audit_retention_mode', true) = 'on' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
    END IF;
    RAISE EXCEPTION 'ops.audit_logs is append-only; % operations are prohibited', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ops_audit_logs_append_only ON ops.audit_logs;
CREATE TRIGGER trg_ops_audit_logs_append_only
    BEFORE UPDATE OR DELETE ON ops.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION ops.prevent_audit_log_mutation();

-- 6. Nếu môi trường đã tạo role vận hành/runtime riêng, áp dụng nguyên tắc least privilege
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finora_app_runtime') THEN
        REVOKE ALL ON ops.audit_logs FROM finora_app_runtime;
        GRANT USAGE ON SCHEMA ops TO finora_app_runtime;
        GRANT INSERT ON ops.audit_logs TO finora_app_runtime;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finora_ops_audit_reader') THEN
        REVOKE ALL ON ops.audit_logs FROM finora_ops_audit_reader;
        GRANT USAGE ON SCHEMA ops TO finora_ops_audit_reader;
        GRANT SELECT ON ops.audit_logs TO finora_ops_audit_reader;
    END IF;
END $$;
