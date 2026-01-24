-- Migration: Add position fields to flow_nodes table
-- This migration adds x and y position fields to store node positions in the visual flow editor

-- Add position_x column (nullable, for backward compatibility)
ALTER TABLE flow_nodes ADD COLUMN position_x REAL;

-- Add position_y column (nullable, for backward compatibility)
ALTER TABLE flow_nodes ADD COLUMN position_y REAL;

-- Optional: Add comment to explain the fields
COMMENT ON COLUMN flow_nodes.position_x IS 'X coordinate of node position in flow editor';
COMMENT ON COLUMN flow_nodes.position_y IS 'Y coordinate of node position in flow editor';
