-- V43: Fix Super Admin username if it was mistakenly set as email
UPDATE core.users 
SET username = 'admin' 
WHERE email = 'admin@finance.com' AND (username IS NULL OR username = 'admin@finance.com');

