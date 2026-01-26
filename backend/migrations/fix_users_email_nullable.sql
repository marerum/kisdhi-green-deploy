-- Fix users table email column to be nullable
-- This migration makes the email column optional since it's not required for login

-- Make email column nullable if it exists
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL;
