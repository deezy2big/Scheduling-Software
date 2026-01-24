-- Migration v3: Work Order System with Authentication and Resource Groups

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'MANAGER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Resource Groups Table
CREATE TABLE IF NOT EXISTS resource_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add group_id to resources
ALTER TABLE resources ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES resource_groups(id);

-- Rename bookings to work_orders
ALTER TABLE bookings RENAME TO work_orders;

-- Add work order fields
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL' 
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'));
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER REFERENCES users(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_user ON work_orders(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_resources_group ON resources(group_id);
