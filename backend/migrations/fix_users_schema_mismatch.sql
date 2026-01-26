-- Fix users table schema to match application model
-- This removes columns that don't exist in the code and fixes nullable constraints

-- Make display_name nullable (it's Optional[str] in the model)
ALTER TABLE users MODIFY COLUMN display_name VARCHAR(255) NULL;

-- Make password_hash nullable (not in model, but keep for future use)
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Drop columns that don't exist in current model
-- (We'll keep password_hash for future email+password authentication)
-- ALTER TABLE users DROP COLUMN is_active;
-- ALTER TABLE users DROP COLUMN reset_token;
-- ALTER TABLE users DROP COLUMN reset_token_expires;
