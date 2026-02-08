-- Migration v12: Resource Hierarchy Reorganization
-- Reorganizes to: Group > Category > Type > Resource
-- Group (Studio, Remote) > Category (Audio, Video) > Type (A1, A2) > Resource (staff members)

-- ============================================
-- STEP 1: Create new tables
-- ============================================

-- Groups table (new top level - Studio, Remote)
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table (replaces position_groups, now group-specific)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, name)
);

-- Types table (replaces positions)
CREATE TABLE IF NOT EXISTS types (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10),
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
);

-- Resource group memberships (many-to-many: resources <-> groups)
CREATE TABLE IF NOT EXISTS resource_group_memberships (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, group_id)
);

-- Resource types (replaces resource_positions)
CREATE TABLE IF NOT EXISTS resource_types (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    type_id INTEGER NOT NULL REFERENCES types(id) ON DELETE CASCADE,
    custom_hourly_rate DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, type_id)
);

-- ============================================
-- STEP 2: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_groups_is_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_display_order ON groups(display_order);

CREATE INDEX IF NOT EXISTS idx_categories_group_id ON categories(group_id);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

CREATE INDEX IF NOT EXISTS idx_types_category_id ON types(category_id);
CREATE INDEX IF NOT EXISTS idx_types_display_order ON types(display_order);

CREATE INDEX IF NOT EXISTS idx_resource_group_memberships_resource_id ON resource_group_memberships(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_group_memberships_group_id ON resource_group_memberships(group_id);

CREATE INDEX IF NOT EXISTS idx_resource_types_resource_id ON resource_types(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_types_type_id ON resource_types(type_id);

-- ============================================
-- STEP 3: Data Migration
-- ============================================

-- Create default "Studio" group
INSERT INTO groups (name, description, color, is_active, display_order)
VALUES ('Studio', 'Studio-based resources and operations', '#3B82F6', true, 0)
ON CONFLICT (name) DO NOTHING;

-- Migrate position_groups → categories (all under Studio group)
INSERT INTO categories (group_id, name, description, color, display_order, created_at, updated_at)
SELECT
    (SELECT id FROM groups WHERE name = 'Studio'),
    pg.name,
    pg.description,
    pg.color,
    pg.display_order,
    pg.created_at,
    pg.updated_at
FROM position_groups pg
WHERE NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.group_id = (SELECT id FROM groups WHERE name = 'Studio')
    AND c.name = pg.name
);

-- Migrate positions → types (linked to new category IDs)
INSERT INTO types (category_id, name, abbreviation, hourly_rate, description, display_order, created_at, updated_at)
SELECT
    c.id,
    p.name,
    p.abbreviation,
    p.hourly_rate,
    p.description,
    p.id,  -- Use old position ID as display order for now
    p.created_at,
    p.updated_at
FROM positions p
INNER JOIN position_groups pg ON p.position_group_id = pg.id
INNER JOIN categories c ON c.name = pg.name
    AND c.group_id = (SELECT id FROM groups WHERE name = 'Studio')
WHERE NOT EXISTS (
    SELECT 1 FROM types t
    WHERE t.category_id = c.id
    AND t.name = p.name
);

-- Migrate resource_positions → resource_types (with new type IDs)
INSERT INTO resource_types (resource_id, type_id, custom_hourly_rate, created_at)
SELECT
    rp.resource_id,
    t.id,
    rp.custom_hourly_rate,
    rp.created_at
FROM resource_positions rp
INNER JOIN positions p ON rp.position_id = p.id
INNER JOIN position_groups pg ON p.position_group_id = pg.id
INNER JOIN categories c ON c.name = pg.name
    AND c.group_id = (SELECT id FROM groups WHERE name = 'Studio')
INNER JOIN types t ON t.category_id = c.id AND t.name = p.name
WHERE NOT EXISTS (
    SELECT 1 FROM resource_types rt
    WHERE rt.resource_id = rp.resource_id
    AND rt.type_id = t.id
);

-- Assign all STAFF resources to Studio group
INSERT INTO resource_group_memberships (resource_id, group_id)
SELECT
    r.id,
    (SELECT id FROM groups WHERE name = 'Studio')
FROM resources r
WHERE r.type = 'STAFF'
AND NOT EXISTS (
    SELECT 1 FROM resource_group_memberships rgm
    WHERE rgm.resource_id = r.id
    AND rgm.group_id = (SELECT id FROM groups WHERE name = 'Studio')
);

-- ============================================
-- STEP 4: Update foreign keys in workorder_resources
-- ============================================

-- Add new type_id column (nullable at first)
ALTER TABLE workorder_resources ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES types(id) ON DELETE SET NULL;

-- Migrate position_id → type_id
UPDATE workorder_resources wr
SET type_id = t.id
FROM positions p
INNER JOIN position_groups pg ON p.position_group_id = pg.id
INNER JOIN categories c ON c.name = pg.name
    AND c.group_id = (SELECT id FROM groups WHERE name = 'Studio')
INNER JOIN types t ON t.category_id = c.id AND t.name = p.name
WHERE wr.position_id = p.id
AND wr.type_id IS NULL;

-- Create index for type_id
CREATE INDEX IF NOT EXISTS idx_workorder_resources_type_id ON workorder_resources(type_id);

-- ============================================
-- STEP 5: Update foreign keys in service_positions
-- ============================================

-- Add new type_id column (nullable at first)
ALTER TABLE service_positions ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES types(id) ON DELETE CASCADE;

-- Migrate position_id → type_id
UPDATE service_positions sp
SET type_id = t.id
FROM positions p
INNER JOIN position_groups pg ON p.position_group_id = pg.id
INNER JOIN categories c ON c.name = pg.name
    AND c.group_id = (SELECT id FROM groups WHERE name = 'Studio')
INNER JOIN types t ON t.category_id = c.id AND t.name = p.name
WHERE sp.position_id = p.id
AND sp.type_id IS NULL;

-- Create index for type_id
CREATE INDEX IF NOT EXISTS idx_service_positions_type_id ON service_positions(type_id);

-- ============================================
-- STEP 6: Create mapping view for backward compatibility
-- ============================================

-- View to map old position IDs to new type IDs (for queries during transition)
CREATE OR REPLACE VIEW position_to_type_mapping AS
SELECT
    p.id as position_id,
    t.id as type_id,
    p.name as position_name,
    t.name as type_name,
    pg.name as position_group_name,
    c.name as category_name
FROM positions p
INNER JOIN position_groups pg ON p.position_group_id = pg.id
INNER JOIN categories c ON c.name = pg.name
    AND c.group_id = (SELECT id FROM groups WHERE name = 'Studio')
INNER JOIN types t ON t.category_id = c.id AND t.name = p.name;

-- ============================================
-- Migration Complete
-- ============================================

-- Note: Old tables (position_groups, positions, resource_positions) are kept for now
-- They can be dropped in a future migration after verifying the new structure works
-- To drop them, run:
--   DROP TABLE resource_positions CASCADE;
--   DROP TABLE positions CASCADE;
--   DROP TABLE position_groups CASCADE;
