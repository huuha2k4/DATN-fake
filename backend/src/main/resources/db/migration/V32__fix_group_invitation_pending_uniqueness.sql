-- One user may have historical ACCEPTED/REJECTED/CANCELLED invitations for a group.
-- Only a second simultaneous pending invitation must be prevented.
ALTER TABLE core.group_invitations
    DROP CONSTRAINT IF EXISTS uq_group_invitee_pending;

DROP INDEX IF EXISTS core.uq_group_invitee_pending;

CREATE UNIQUE INDEX uq_group_invitee_pending
    ON core.group_invitations (group_id, invitee_id)
    WHERE status = 'PENDING';
