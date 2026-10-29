-- =====================================================
-- V24: Create Notifications Tables
-- =====================================================
-- Description: Create notifications and notification_devices tables
--              for in-app notifications and push notification management
-- Author: System
-- Date: 2026-10-27
-- =====================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS core.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon_url VARCHAR(500),
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    data TEXT, -- JSON data stored as text
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) 
        REFERENCES core.users(id) ON DELETE CASCADE
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user_id ON core.notifications(user_id);
CREATE INDEX idx_notifications_user_created ON core.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON core.notifications(is_read);
CREATE INDEX idx_notifications_type ON core.notifications(type);
CREATE INDEX idx_notifications_priority ON core.notifications(priority);
CREATE INDEX idx_notifications_deleted_at ON core.notifications(deleted_at);

-- Composite indexes for common queries
CREATE INDEX idx_notifications_user_unread ON core.notifications(user_id, is_read) 
    WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_user_type ON core.notifications(user_id, type) 
    WHERE deleted_at IS NULL;

-- Create notification_devices table
CREATE TABLE IF NOT EXISTS core.notification_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_token VARCHAR(500) NOT NULL UNIQUE,
    device_type VARCHAR(20) NOT NULL,
    device_name VARCHAR(255),
    app_version VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    
    CONSTRAINT fk_notification_devices_user FOREIGN KEY (user_id) 
        REFERENCES core.users(id) ON DELETE CASCADE,
    CONSTRAINT chk_notification_devices_type 
        CHECK (device_type IN ('IOS', 'ANDROID', 'WEB'))
);

-- Create indexes for notification_devices
CREATE INDEX idx_notification_devices_user_id ON core.notification_devices(user_id);
CREATE INDEX idx_notification_devices_token ON core.notification_devices(device_token);
CREATE INDEX idx_notification_devices_active ON core.notification_devices(is_active);

-- Composite index for active devices per user
CREATE INDEX idx_notification_devices_user_active 
    ON core.notification_devices(user_id, is_active, last_used_at DESC);

-- Add comments
COMMENT ON TABLE core.notifications IS 'In-app notifications for users';
COMMENT ON TABLE core.notification_devices IS 'Registered devices for push notifications';

COMMENT ON COLUMN core.notifications.type IS 'Type of notification: TRANSACTION, BUDGET_ALERT, GOAL_MILESTONE, etc.';
COMMENT ON COLUMN core.notifications.priority IS 'Priority level: HIGH, NORMAL, LOW';
COMMENT ON COLUMN core.notifications.data IS 'Additional JSON data for the notification';
COMMENT ON COLUMN core.notifications.deleted_at IS 'Soft delete timestamp';

COMMENT ON COLUMN core.notification_devices.device_token IS 'FCM token or APNS token for push notifications';
COMMENT ON COLUMN core.notification_devices.device_type IS 'Device platform: IOS, ANDROID, WEB';
COMMENT ON COLUMN core.notification_devices.last_used_at IS 'Last time this device was used';
