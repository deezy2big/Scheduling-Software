-- Migration v8: Enhanced Resource Fields
-- This migration adds:
-- 1. First name / Last name split for resources
-- 2. Contact information fields (email, phone, address)
-- 3. Start date field
-- 4. Multi-group support via junction table
-- 5. Rename description to notes

-- ============================================
-- STEP 1: Add new columns to resources table
-- ============================================

-- Split name into first_name and last_name
ALTER TABLE resources ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE resources ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Contact information
ALTER TABLE resources ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE resources ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Address fields
ALTER TABLE resources ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE resources ADD COLUMN IF NOT EXISTS address_unit VARCHAR(50);
ALTER TABLE resources ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
ALTER TABLE resources ADD COLUMN IF NOT EXISTS address_state VARCHAR(50);
ALTER TABLE resources ADD COLUMN IF NOT EXISTS address_zip VARCHAR(20);

-- Start date
ALTER TABLE resources ADD COLUMN IF NOT EXISTS start_date DATE;

-- Rename description to notes (if description exists)
-- We'll add notes and migrate data
ALTER TABLE resources ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate existing description data to notes
UPDATE resources SET notes = description WHERE notes IS NULL AND description IS NOT NULL;

-- ============================================
-- STEP 2: Create resource_group_assignments table for multi-group support
-- ============================================
CREATE TABLE IF NOT EXISTS resource_group_assignments (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES resource_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, group_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resource_group_assignments_resource ON resource_group_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_group_assignments_group ON resource_group_assignments(group_id);

-- ============================================
-- STEP 3: Migrate existing group_id data to new junction table
-- ============================================
INSERT INTO resource_group_assignments (resource_id, group_id)
SELECT id, group_id FROM resources WHERE group_id IS NOT NULL
ON CONFLICT (resource_id, group_id) DO NOTHING;

-- ============================================
-- STEP 4: Create indexes for searchable fields
-- ============================================
CREATE INDEX IF NOT EXISTS idx_resources_first_name ON resources(first_name);
CREATE INDEX IF NOT EXISTS idx_resources_last_name ON resources(last_name);
CREATE INDEX IF NOT EXISTS idx_resources_email ON resources(email);
CREATE INDEX IF NOT EXISTS idx_resources_phone ON resources(phone);
CREATE INDEX IF NOT EXISTS idx_resources_city ON resources(address_city);
CREATE INDEX IF NOT EXISTS idx_resources_zip ON resources(address_zip);

-- ============================================
-- STEP 5: Add color column to resource_groups if not exists
-- ============================================
ALTER TABLE resource_groups ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#3B82F6';
ALTER TABLE resource_groups ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
