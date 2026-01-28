-- Migration v9: Enhanced Tracking Fields (Media Pulse/ScheduALL inspired)
-- Adds workorder numbers, bid numbers, PO numbers for industry-standard tracking

-- ============================================
-- STEP 1: Add workorder_number to workorders
-- ============================================
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS workorder_number VARCHAR(20);

-- Create unique index for workorder numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_workorders_number ON workorders(workorder_number) WHERE workorder_number IS NOT NULL;

-- ============================================
-- STEP 2: Add bid tracking fields to projects
-- ============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bid_number VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS po_number VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_budget DECIMAL(12, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(12, 2);

-- ============================================
-- STEP 3: Add bid tracking to workorders
-- ============================================
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS bid_number VARCHAR(50);
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS po_number VARCHAR(50);

-- ============================================
-- STEP 4: Create sequence for workorder numbers
-- ============================================
CREATE SEQUENCE IF NOT EXISTS workorder_number_seq START WITH 1;

-- ============================================
-- STEP 5: Create function to auto-generate workorder numbers
-- ============================================
CREATE OR REPLACE FUNCTION generate_workorder_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workorder_number IS NULL THEN
        NEW.workorder_number := 'WO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('workorder_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: Create trigger for auto-generating workorder numbers
-- ============================================
DROP TRIGGER IF EXISTS trg_generate_workorder_number ON workorders;
CREATE TRIGGER trg_generate_workorder_number
    BEFORE INSERT ON workorders
    FOR EACH ROW
    EXECUTE FUNCTION generate_workorder_number();

-- ============================================
-- STEP 7: Generate workorder numbers for existing workorders
-- ============================================
UPDATE workorders 
SET workorder_number = 'WO-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(id::TEXT, 5, '0')
WHERE workorder_number IS NULL;

-- ============================================
-- STEP 8: Add indexes for searching
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_bid_number ON projects(bid_number) WHERE bid_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_po_number ON projects(po_number) WHERE po_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workorders_bid_number ON workorders(bid_number) WHERE bid_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workorders_po_number ON workorders(po_number) WHERE po_number IS NOT NULL;

-- Full text search index for project titles and client names
CREATE INDEX IF NOT EXISTS idx_projects_title_search ON projects USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(client_name, '')));
CREATE INDEX IF NOT EXISTS idx_workorders_title_search ON workorders USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_resources_name_search ON resources USING gin(to_tsvector('english', COALESCE(name, '')));
