-- V25: Re-create group_invitations table (which was dropped in V6 and not recreated)
CREATE TABLE IF NOT EXISTS core.group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON core.group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee ON core.group_invitations(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_inviter ON core.group_invitations(inviter_id);

COMMENT ON TABLE core.group_invitations IS 'Group membership invitations';

