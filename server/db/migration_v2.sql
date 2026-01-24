-- Migration Script for RMS v2 Enhancements
-- Run this after the initial schema.sql

-- Enhanced Resources Table
ALTER TABLE resources ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'));

-- Enhanced Bookings Table  
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Untitled Booking';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS color VARCHAR(7);
