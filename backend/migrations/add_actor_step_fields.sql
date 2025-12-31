-- Add actor and step fields to flow_nodes table
-- Migration: Add actor and step fields for lane-step template support

ALTER TABLE flow_nodes 
ADD COLUMN actor VARCHAR(100),
ADD COLUMN step VARCHAR(100);

-- Add indexes for better query performance
CREATE INDEX idx_flow_nodes_actor ON flow_nodes(actor);
CREATE INDEX idx_flow_nodes_step ON flow_nodes(step);