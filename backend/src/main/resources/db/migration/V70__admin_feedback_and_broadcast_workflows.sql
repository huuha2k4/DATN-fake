ALTER TABLE core.feedbacks
    ADD COLUMN processed_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
    ADD COLUMN processed_at timestamptz;

CREATE TABLE core.feedback_history (
    id uuid PRIMARY KEY,
    feedback_id uuid NOT NULL REFERENCES core.feedbacks(id) ON DELETE CASCADE,
    processed_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
    previous_status varchar(50) NOT NULL,
    next_status varchar(50) NOT NULL,
    request_hash varchar(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE core.broadcast_campaigns (
    id uuid PRIMARY KEY,
    created_by uuid REFERENCES core.users(id) ON DELETE SET NULL,
    title varchar(255) NOT NULL,
    body text NOT NULL,
    audience varchar(20) NOT NULL CHECK (audience IN ('ALL', 'PREMIUM_ONLY', 'FREE_ONLY')),
    priority varchar(20) NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH')),
    action_url varchar(500),
    action_text varchar(100),
    expected_count bigint NOT NULL CHECK (expected_count >= 0),
    notification_count bigint NOT NULL DEFAULT 0 CHECK (notification_count >= 0),
    last_user_id uuid,
    status varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

ALTER TABLE core.notifications
    ADD COLUMN broadcast_campaign_id uuid REFERENCES core.broadcast_campaigns(id),
    ADD CONSTRAINT uq_broadcast_notification_recipient UNIQUE (broadcast_campaign_id, user_id);
