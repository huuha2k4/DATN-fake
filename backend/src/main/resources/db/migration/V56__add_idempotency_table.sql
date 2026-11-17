-- Migration: Add idempotency table for duplicate request prevention
-- Version: V56
-- Description: Simple idempotency tracking without foreign keys

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS ops.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Idempotency key from client (header: Idempotency-Key)
    idempotency_key VARCHAR(255) NOT NULL,
    
    -- User context (no FK - just store UUID for reference)
    user_id UUID NOT NULL,
    
    -- Request context
    endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    request_hash TEXT,  -- SHA256 hash of request body for extra validation
    
    -- Processing status
    status VARCHAR(50) NOT NULL DEFAULT 'PROCESSING',
    -- Status values: PROCESSING, COMPLETED, FAILED
    
    -- Response cache
    response_body TEXT,  -- JSON response to return for duplicate requests
    response_status_code INT,  -- HTTP status code (200, 201, etc.)
    
    -- Resource tracking (optional - for debugging)
    resource_id UUID,  -- ID of created resource (transaction_id, debt_id, etc.)
    resource_type VARCHAR(50),  -- 'transaction', 'debt', 'goal', 'group', etc.
    
    -- Error tracking
    error_message TEXT,  -- If status = FAILED, store error details
    retry_count INT DEFAULT 0,  -- Count duplicate attempts
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    last_retry_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,  -- TTL for auto cleanup
    
    -- Unique constraint: one idempotency key per user
    CONSTRAINT unique_idempotency_key_per_user UNIQUE (idempotency_key, user_id)
);

-- Indexes for fast lookup
CREATE INDEX idx_idempotency_key_lookup 
ON ops.idempotency_keys(idempotency_key, user_id) 
WHERE status IN ('PROCESSING', 'COMPLETED');

-- Index for cleanup job
CREATE INDEX idx_idempotency_expires 
ON ops.idempotency_keys(expires_at) 
WHERE status = 'COMPLETED';

-- Index for monitoring/debugging
CREATE INDEX idx_idempotency_created_at 
ON ops.idempotency_keys(created_at DESC);

-- Index for user lookup (for admin/debugging)
CREATE INDEX idx_idempotency_user_id 
ON ops.idempotency_keys(user_id, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE ops.idempotency_keys IS 'Idempotency tracking for duplicate request prevention';
COMMENT ON COLUMN ops.idempotency_keys.idempotency_key IS 'Client-generated unique key (UUID) sent in Idempotency-Key header';
COMMENT ON COLUMN ops.idempotency_keys.user_id IS 'User who made the request (stored as UUID, no FK for simplicity)';
COMMENT ON COLUMN ops.idempotency_keys.endpoint IS 'API endpoint path (e.g., /api/v1/transactions)';
COMMENT ON COLUMN ops.idempotency_keys.request_hash IS 'SHA256 hash of request body to detect key reuse with different data';
COMMENT ON COLUMN ops.idempotency_keys.status IS 'PROCESSING: in progress, COMPLETED: successful, FAILED: error occurred';
COMMENT ON COLUMN ops.idempotency_keys.response_body IS 'Cached JSON response to return for duplicate requests';
COMMENT ON COLUMN ops.idempotency_keys.resource_id IS 'ID of created resource (for tracking/debugging, not enforced)';
COMMENT ON COLUMN ops.idempotency_keys.expires_at IS 'TTL expiration time (cleanup after 24-48 hours)';
