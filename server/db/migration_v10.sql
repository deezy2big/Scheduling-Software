-- Migration v10: Add Job Type and Structured Location Support
-- Adds job_type to workorders to distinguish between Remote and Studio jobs
-- Adds fields for location hierarchy

-- ============================================
-- STEP 1: Add job_type to workorders
-- ============================================
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) CHECK (job_type IN ('REMOTE', 'STUDIO'));

-- ============================================
-- STEP 2: Add flexible location fields
-- ============================================
-- We keep the existing 'location' column as the specific spot (Level 3), 
-- but add parent levels for the hierarchy described by the user.
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS location_category VARCHAR(100); -- e.g. "Venue" or "Control Room"
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS location_region VARCHAR(100);   -- e.g. "Arizona" or "Control Rooms" (Level 2)

-- ============================================
-- STEP 3: Add index for job type filtering
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workorders_job_type ON workorders(job_type);
