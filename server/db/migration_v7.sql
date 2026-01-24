-- Migration v7: Pay Types, State Labor Laws, and Overtime Calculations
-- This migration adds:
-- 1. Pay type (Hourly, 8-hour guarantee, 10-hour guarantee) to resources
-- 2. Work state for labor law calculations
-- 3. Labor laws table with state-specific overtime rules

-- ============================================
-- STEP 1: Add pay_type and work_state to resources
-- ============================================
ALTER TABLE resources ADD COLUMN IF NOT EXISTS pay_type VARCHAR(20) DEFAULT 'HOURLY';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS work_state VARCHAR(2) DEFAULT 'CA';

-- Add constraint if it doesn't exist (PostgreSQL doesn't have IF NOT EXISTS for constraints)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'resources_pay_type_check'
    ) THEN
        ALTER TABLE resources ADD CONSTRAINT resources_pay_type_check 
            CHECK (pay_type IN ('HOURLY', 'GUARANTEE_8', 'GUARANTEE_10'));
    END IF;
END $$;

-- ============================================
-- STEP 2: Create labor_laws table
-- ============================================
CREATE TABLE IF NOT EXISTS labor_laws (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(2) NOT NULL UNIQUE,
    state_name VARCHAR(100) NOT NULL,
    -- Daily overtime rules
    daily_ot_threshold DECIMAL(4,2) DEFAULT 8.00,      -- Hours after which OT (1.5x) starts
    daily_ot_multiplier DECIMAL(3,2) DEFAULT 1.5,      -- Time and a half multiplier
    daily_dt_threshold DECIMAL(4,2) DEFAULT 12.00,     -- Hours after which double time starts
    daily_dt_multiplier DECIMAL(3,2) DEFAULT 2.0,      -- Double time multiplier
    -- Weekly overtime
    weekly_ot_threshold DECIMAL(5,2) DEFAULT 40.00,    -- Weekly hours for OT
    weekly_ot_multiplier DECIMAL(3,2) DEFAULT 1.5,
    -- Special rules
    seventh_day_rules BOOLEAN DEFAULT false,           -- Special 7th consecutive day rules
    seventh_day_ot_multiplier DECIMAL(3,2) DEFAULT 1.5,
    seventh_day_dt_threshold DECIMAL(4,2) DEFAULT 8.00,
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 3: Seed labor law data
-- ============================================

-- California - Full daily overtime rules
INSERT INTO labor_laws (
    state_code, state_name,
    daily_ot_threshold, daily_ot_multiplier,
    daily_dt_threshold, daily_dt_multiplier,
    weekly_ot_threshold, weekly_ot_multiplier,
    seventh_day_rules, seventh_day_ot_multiplier, seventh_day_dt_threshold,
    notes
) VALUES (
    'CA', 'California',
    8.00, 1.5,
    12.00, 2.0,
    40.00, 1.5,
    true, 1.5, 8.00,
    'California has daily overtime (OT after 8hrs, DT after 12hrs), weekly overtime (40hrs), and 7th consecutive day rules (first 8hrs at 1.5x, after 8hrs at 2x).'
) ON CONFLICT (state_code) DO UPDATE SET
    state_name = EXCLUDED.state_name,
    daily_ot_threshold = EXCLUDED.daily_ot_threshold,
    daily_ot_multiplier = EXCLUDED.daily_ot_multiplier,
    daily_dt_threshold = EXCLUDED.daily_dt_threshold,
    daily_dt_multiplier = EXCLUDED.daily_dt_multiplier,
    weekly_ot_threshold = EXCLUDED.weekly_ot_threshold,
    weekly_ot_multiplier = EXCLUDED.weekly_ot_multiplier,
    seventh_day_rules = EXCLUDED.seventh_day_rules,
    notes = EXCLUDED.notes;

-- Federal (FLSA) - No daily overtime, only weekly
INSERT INTO labor_laws (
    state_code, state_name,
    daily_ot_threshold, daily_ot_multiplier,
    daily_dt_threshold, daily_dt_multiplier,
    weekly_ot_threshold, weekly_ot_multiplier,
    seventh_day_rules,
    notes
) VALUES (
    'US', 'Federal (FLSA)',
    NULL, NULL,  -- No daily OT
    NULL, NULL,  -- No daily DT
    40.00, 1.5,
    false,
    'Federal FLSA rules: Overtime only after 40 hours per week at 1.5x. No daily overtime requirements.'
) ON CONFLICT (state_code) DO UPDATE SET
    state_name = EXCLUDED.state_name,
    daily_ot_threshold = EXCLUDED.daily_ot_threshold,
    daily_ot_multiplier = EXCLUDED.daily_ot_multiplier,
    weekly_ot_threshold = EXCLUDED.weekly_ot_threshold,
    notes = EXCLUDED.notes;

-- Nevada - Daily OT after 8 hours
INSERT INTO labor_laws (
    state_code, state_name,
    daily_ot_threshold, daily_ot_multiplier,
    daily_dt_threshold, daily_dt_multiplier,
    weekly_ot_threshold, weekly_ot_multiplier,
    seventh_day_rules,
    notes
) VALUES (
    'NV', 'Nevada',
    8.00, 1.5,
    NULL, NULL,  -- No daily double time
    40.00, 1.5,
    false,
    'Nevada requires overtime after 8 hours per day at 1.5x (if hourly rate < 1.5x minimum wage). Also weekly OT after 40 hours.'
) ON CONFLICT (state_code) DO UPDATE SET
    state_name = EXCLUDED.state_name,
    notes = EXCLUDED.notes;

-- Colorado - Daily OT after 12 hours
INSERT INTO labor_laws (
    state_code, state_name,
    daily_ot_threshold, daily_ot_multiplier,
    daily_dt_threshold, daily_dt_multiplier,
    weekly_ot_threshold, weekly_ot_multiplier,
    seventh_day_rules,
    notes
) VALUES (
    'CO', 'Colorado',
    12.00, 1.5,
    NULL, NULL,
    40.00, 1.5,
    false,
    'Colorado requires overtime after 12 hours per day or 40 hours per week at 1.5x.'
) ON CONFLICT (state_code) DO UPDATE SET
    state_name = EXCLUDED.state_name,
    notes = EXCLUDED.notes;

-- Alaska - Daily OT after 8 hours
INSERT INTO labor_laws (
    state_code, state_name,
    daily_ot_threshold, daily_ot_multiplier,
    daily_dt_threshold, daily_dt_multiplier,
    weekly_ot_threshold, weekly_ot_multiplier,
    seventh_day_rules,
    notes
) VALUES (
    'AK', 'Alaska',
    8.00, 1.5,
    NULL, NULL,
    40.00, 1.5,
    false,
    'Alaska requires overtime after 8 hours per day or 40 hours per week at 1.5x.'
) ON CONFLICT (state_code) DO UPDATE SET
    state_name = EXCLUDED.state_name,
    notes = EXCLUDED.notes;

-- ============================================
-- STEP 4: Add pay_type override to workorder_resources
-- ============================================
ALTER TABLE workorder_resources ADD COLUMN IF NOT EXISTS pay_type_override VARCHAR(20);
ALTER TABLE workorder_resources ADD COLUMN IF NOT EXISTS work_state_override VARCHAR(2);

-- Add constraint for pay_type_override
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workorder_resources_pay_type_override_check'
    ) THEN
        ALTER TABLE workorder_resources ADD CONSTRAINT workorder_resources_pay_type_override_check 
            CHECK (pay_type_override IS NULL OR pay_type_override IN ('HOURLY', 'GUARANTEE_8', 'GUARANTEE_10'));
    END IF;
END $$;

-- ============================================
-- STEP 5: Create index for labor_laws lookup
-- ============================================
CREATE INDEX IF NOT EXISTS idx_labor_laws_state_code ON labor_laws(state_code);
