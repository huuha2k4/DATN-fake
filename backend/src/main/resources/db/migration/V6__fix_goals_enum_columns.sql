-- Migration V6: Convert core.goals status and priority columns to varchar to match JPA enums
DROP INDEX IF EXISTS core.idx_goals_target_date;
DROP INDEX IF EXISTS core.idx_goals_user_status;
DROP INDEX IF EXISTS core.idx_goal_status;

ALTER TABLE core.goals ALTER COLUMN status DROP DEFAULT;
ALTER TABLE core.goals ALTER COLUMN status TYPE varchar(20) USING status::varchar;
ALTER TABLE core.goals ALTER COLUMN status SET DEFAULT 'IN_PROGRESS';

ALTER TABLE core.goals ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE core.goals ALTER COLUMN priority TYPE varchar(20) USING priority::varchar;
ALTER TABLE core.goals ALTER COLUMN priority SET DEFAULT 'MEDIUM';

CREATE INDEX IF NOT EXISTS idx_goal_status ON core.goals(status);
CREATE INDEX IF NOT EXISTS idx_goal_user_status ON core.goals(user_id, status);
