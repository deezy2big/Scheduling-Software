-- Migration v4: User Permissions and Activity Logging

-- Update Users table with last login tracking and active status
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_name VARCHAR(50) NOT NULL CHECK (
        permission_name IN (
            'view_schedules',
            'edit_schedules',
            'manage_resources',
            'manage_users',
            'view_logs'
        )
    ),
    granted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_name)
);

-- Create Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);

-- Grant all permissions to existing admin users
INSERT INTO permissions (user_id, permission_name)
SELECT u.id, p.permission_name
FROM users u
CROSS JOIN (VALUES 
    ('view_schedules'),
    ('edit_schedules'),
    ('manage_resources'),
    ('manage_users'),
    ('view_logs')
) AS p(permission_name)
WHERE u.role = 'ADMIN'
ON CONFLICT (user_id, permission_name) DO NOTHING;

-- Grant view/edit permissions to regular users
INSERT INTO permissions (user_id, permission_name)
SELECT u.id, p.permission_name
FROM users u
CROSS JOIN (VALUES 
    ('view_schedules'),
    ('edit_schedules')
) AS p(permission_name)
WHERE u.role = 'USER'
ON CONFLICT (user_id, permission_name) DO NOTHING;
