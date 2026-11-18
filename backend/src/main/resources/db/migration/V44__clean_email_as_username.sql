-- V44: Clean up username for users where username was mistakenly populated with full email address
UPDATE core.users
SET username = SPLIT_PART(email, '@', 1)
WHERE (username IS NULL OR username = email OR username LIKE '%@%')
  AND email IS NOT NULL
  AND SPLIT_PART(email, '@', 1) NOT IN (SELECT username FROM core.users WHERE username IS NOT NULL);

