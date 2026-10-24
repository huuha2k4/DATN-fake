-- Add avatar_url column to users table
ALTER TABLE core.users 
ADD COLUMN avatar_url VARCHAR(500);

-- Add index for better performance on queries with avatar
CREATE INDEX idx_users_avatar_url ON core.users(avatar_url);

-- Add comment
COMMENT ON COLUMN core.users.avatar_url IS 'Relative path to user avatar image, e.g., /uploads/avatars/uuid.jpg';
