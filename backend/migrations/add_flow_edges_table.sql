CREATE TABLE IF NOT EXISTS flow_edges (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    project_id INTEGER NOT NULL,
    from_node_order INTEGER NOT NULL,
    to_node_order INTEGER NOT NULL,
    `condition` TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_flow_edges_project_id (project_id),
    INDEX idx_flow_edges_from_node (from_node_order),
    INDEX idx_flow_edges_to_node (to_node_order)
);
