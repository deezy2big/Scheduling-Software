-- Migration v13: User Management Enhancements
-- Adds support for: bulk operations, avatars, advanced filtering, activity history

-- ============================================================================
-- Feature 1: Bulk User Operations - Performance Indexes
-- ============================================================================

-- Index for case-insensitive email search (bulk import duplicate checking)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Composite index for filtering by role and active status
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);


-- ============================================================================
-- Feature 2: User Profile Pictures/Avatars - Schema Changes
-- ============================================================================

-- Add avatar fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_filename VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Index for users with avatars
CREATE INDEX IF NOT EXISTS idx_users_avatar ON users(id) WHERE avatar_url IS NOT NULL;


-- ============================================================================
-- Feature 3: Advanced Filtering and Search - Performance Indexes
-- ============================================================================

-- Index for sorting by last login (DESC with NULLS LAST for never-logged-in users)
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC NULLS LAST);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Index for permission filtering
CREATE INDEX IF NOT EXISTS idx_permissions_permission_name ON permissions(permission_name);

-- Full-text search index for user search (name and email)
CREATE INDEX IF NOT EXISTS idx_users_search ON users
  USING gin(to_tsvector('english', COALESCE(full_name, '') || ' ' || email));


-- ============================================================================
-- Feature 4: User Activity History - Indexes and Views
-- ============================================================================

-- Composite index for user activity queries (user_id + created_at descending)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
  ON activity_logs(user_id, created_at DESC);

-- Partial index for user-related activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_user
  ON activity_logs(entity_type, entity_id)
  WHERE entity_type = 'user';

-- Create materialized view for user activity summary (performance optimization)
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  u.id as user_id,
  u.email,
  u.full_name,
  COUNT(al.id) as total_actions,
  MAX(al.created_at) as last_activity,
  COUNT(al.id) FILTER (WHERE al.action = 'USER_LOGIN') as login_count,
  COUNT(al.id) FILTER (WHERE al.created_at >= NOW() - INTERVAL '7 days') as actions_last_7_days,
  COUNT(al.id) FILTER (WHERE al.created_at >= NOW() - INTERVAL '30 days') as actions_last_30_days,
  COUNT(DISTINCT DATE(al.created_at)) as active_days
FROM users u
LEFT JOIN activity_logs al ON u.id = al.user_id
GROUP BY u.id, u.email, u.full_name;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration v13 completed successfully';
  RAISE NOTICE 'Added % indexes for user management enhancements',
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('users', 'activity_logs', 'permissions')
     AND indexname LIKE 'idx_%');
END $$;
