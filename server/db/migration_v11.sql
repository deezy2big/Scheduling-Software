-- Migration v11: Add Services Feature
-- Services are templates for bulk-adding positions to workorders

-- ============================================
-- STEP 1: Create services table
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    CONSTRAINT services_name_unique UNIQUE (name)
);

-- ============================================
-- STEP 2: Create service_positions junction table
-- ============================================
CREATE TABLE IF NOT EXISTS service_positions (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_positions_unique UNIQUE (service_id, position_id)
);

-- ============================================
-- STEP 3: Add indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_service_positions_service_id ON service_positions(service_id);
CREATE INDEX IF NOT EXISTS idx_service_positions_position_id ON service_positions(position_id);
