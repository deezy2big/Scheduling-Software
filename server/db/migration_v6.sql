-- Migration v6: Project-Workorder Architecture with Positions and Cost Tracking
-- This migration restructures the database to support:
-- 1. Project → Workorder hierarchy
-- 2. Position Groups and Positions with hourly rates
-- 3. Multi-role resources (staff can have multiple positions)
-- 4. Cost tracking (hourly with 8hr minimum OR flat rate)

-- ============================================
-- STEP 1: Create Position Groups Table
-- ============================================
CREATE TABLE IF NOT EXISTS position_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 2: Create Positions Table
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10),
    position_group_id INTEGER NOT NULL REFERENCES position_groups(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, position_group_id)
);

CREATE INDEX IF NOT EXISTS idx_positions_group ON positions(position_group_id);

-- ============================================
-- STEP 3: Create Resource Positions (qualifications)
-- ============================================
CREATE TABLE IF NOT EXISTS resource_positions (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    custom_hourly_rate DECIMAL(10, 2), -- Override position rate if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_positions_resource ON resource_positions(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_positions_position ON resource_positions(position_id);

-- ============================================
-- STEP 4: Modify Projects Table (simplify to container)
-- ============================================
-- First, add missing columns if they don't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update title from project_name if title is null
UPDATE projects SET title = project_name WHERE title IS NULL AND project_name IS NOT NULL;

-- ============================================
-- STEP 5: Create Workorders Table
-- ============================================
CREATE TABLE IF NOT EXISTS workorders (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    scheduled_date DATE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workorders_project ON workorders(project_id);
CREATE INDEX IF NOT EXISTS idx_workorders_status ON workorders(status);
CREATE INDEX IF NOT EXISTS idx_workorders_date ON workorders(scheduled_date);

-- ============================================
-- STEP 6: Create Workorder Resources Table
-- ============================================
CREATE TABLE IF NOT EXISTS workorder_resources (
    id SERIAL PRIMARY KEY,
    workorder_id INTEGER NOT NULL REFERENCES workorders(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    cost_type VARCHAR(20) DEFAULT 'HOURLY' CHECK (cost_type IN ('HOURLY', 'FLAT')),
    flat_rate DECIMAL(10, 2),
    hourly_rate_override DECIMAL(10, 2), -- Override position/resource rate if needed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint to ensure start_time is before end_time
    CONSTRAINT valid_workorder_resource_duration CHECK (end_time > start_time),
    
    -- Double-booking prevention per resource
    EXCLUDE USING GIST (
        resource_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    )
);

CREATE INDEX IF NOT EXISTS idx_workorder_resources_workorder ON workorder_resources(workorder_id);
CREATE INDEX IF NOT EXISTS idx_workorder_resources_resource ON workorder_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_workorder_resources_position ON workorder_resources(position_id);

-- ============================================
-- STEP 7: Seed Position Groups
-- ============================================
INSERT INTO position_groups (name, description, color, display_order) VALUES
    ('Technical', 'Technical directors and engineers', '#8B5CF6', 1),
    ('Audio', 'Audio engineers and assistants', '#22C55E', 2),
    ('Video', 'Video engineers and camera operators', '#3B82F6', 3),
    ('Lighting', 'Lighting directors and technicians', '#F59E0B', 4),
    ('Production', 'Producers, coordinators, and PAs', '#EC4899', 5),
    ('Graphics', 'Graphics operators and designers', '#06B6D4', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 8: Seed Positions
-- ============================================
INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Technical Director', 'TD', id, 75.00, 'Oversees technical operations'
FROM position_groups WHERE name = 'Technical'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Engineer in Charge', 'EIC', id, 70.00, 'Senior engineer responsible for technical setup'
FROM position_groups WHERE name = 'Technical'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Audio 1', 'A1', id, 55.00, 'Lead audio engineer'
FROM position_groups WHERE name = 'Audio'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Audio 2', 'A2', id, 45.00, 'Assistant audio engineer'
FROM position_groups WHERE name = 'Audio'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Audio Utility', 'AU', id, 35.00, 'Audio utility and cable runner'
FROM position_groups WHERE name = 'Audio'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Video 1', 'V1', id, 55.00, 'Lead video engineer'
FROM position_groups WHERE name = 'Video'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Video 2', 'V2', id, 45.00, 'Assistant video engineer'
FROM position_groups WHERE name = 'Video'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Camera Operator', 'CAM', id, 50.00, 'Camera operator'
FROM position_groups WHERE name = 'Video'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Lighting Director', 'LD', id, 60.00, 'Lighting director'
FROM position_groups WHERE name = 'Lighting'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Lighting Technician', 'LT', id, 40.00, 'Lighting technician'
FROM position_groups WHERE name = 'Lighting'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Grip', 'GRIP', id, 35.00, 'Grip and rigging'
FROM position_groups WHERE name = 'Lighting'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Producer', 'PROD', id, 65.00, 'Show producer'
FROM position_groups WHERE name = 'Production'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Production Coordinator', 'PC', id, 45.00, 'Production coordinator'
FROM position_groups WHERE name = 'Production'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Production Assistant', 'PA', id, 25.00, 'Production assistant'
FROM position_groups WHERE name = 'Production'
ON CONFLICT (name, position_group_id) DO NOTHING;

INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
SELECT 'Graphics Operator', 'GFX', id, 50.00, 'Graphics operator'
FROM position_groups WHERE name = 'Graphics'
ON CONFLICT (name, position_group_id) DO NOTHING;

-- ============================================
-- STEP 9: Update activity_logs entity types
-- ============================================
-- Add new entity types for workorders
-- (no schema change needed, just documentation)

-- ============================================
-- STEP 10: Add position_group_id to resources for filtering
-- ============================================
ALTER TABLE resources ADD COLUMN IF NOT EXISTS default_position_id INTEGER REFERENCES positions(id);
ALTER TABLE resources ADD COLUMN IF NOT EXISTS default_hourly_rate DECIMAL(10, 2);

