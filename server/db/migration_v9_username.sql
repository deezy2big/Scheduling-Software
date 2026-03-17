-- Migration v9: Add username column to users table
-- Username is optional, unique, and can be used for login instead of email

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;

-- Create index for faster login lookups by username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
