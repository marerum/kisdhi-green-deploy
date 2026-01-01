-- Add users table and update projects table
-- Migration: Add simple user authentication support

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_user_id (user_id)
);

-- Add user_id column to projects table
ALTER TABLE projects 
ADD COLUMN user_id INT NOT NULL DEFAULT 1;

-- Add foreign key constraint
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Insert a default user for existing projects
INSERT INTO users (user_id, display_name) VALUES ('admin', 'Administrator');