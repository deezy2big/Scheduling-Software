-- Migration v5: Project-Based Work Orders with Multiple Resources

-- Create junction table for project-resource relationships
CREATE TABLE IF NOT EXISTS project_resources (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Double-booking prevention per resource
    -- This ensures a resource cannot be booked for overlapping times
    EXCLUDE USING GIST (
        resource_id WITH =, 
        tstzrange(start_time, end_time) WITH &&
    )
);

CREATE INDEX IF NOT EXISTS idx_project_resources_project ON project_resources(project_id);
CREATE INDEX IF NOT EXISTS idx_project_resources_resource ON project_resources(resource_id);

-- Rename work_orders to projects for clarity
ALTER TABLE work_orders RENAME TO projects;

-- Migrate existing data: each work_order becomes a project with one resource
-- Insert existing single-resource bookings into junction table
INSERT INTO project_resources (project_id, resource_id, start_time, end_time)
SELECT id, resource_id, start_time, end_time
FROM projects
WHERE resource_id IS NOT NULL;

-- Now remove resource_id from projects table (no longer 1:1)
ALTER TABLE projects DROP COLUMN IF EXISTS resource_id;

-- Update activity_logs to reference 'project' instead of 'work_order'
UPDATE activity_logs 
SET entity_type = 'project' 
WHERE entity_type = 'work_order';
