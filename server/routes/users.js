const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const { requireAuth, requirePermission, hasPermission } = require('../middleware/auth');
const { hashPassword } = require('../utils/password');
const { logActivity, ACTIONS } = require('../utils/logger');
const { avatarUpload, processAvatar, deleteAvatar } = require('../utils/upload');

// GET all users (requires manage_users permission)
router.get('/', requireAuth, requirePermission('manage_users'), async (req, res) => {
    try {
        const {
            search = '',
            role = '',
            is_active = '',
            permission = '',
            last_login_from = '',
            last_login_to = '',
            sort_by = 'created_at',
            sort_order = 'desc',
            limit = '50',
            offset = '0'
        } = req.query;

        // Build WHERE clause dynamically
        const whereClauses = [];
        const queryParams = [];
        let paramIndex = 1;

        // Search filter (email or full_name)
        if (search) {
            whereClauses.push(`(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        // Role filter
        if (role) {
            whereClauses.push(`u.role = $${paramIndex}`);
            queryParams.push(role);
            paramIndex++;
        }

        // Active status filter
        if (is_active !== '') {
            whereClauses.push(`u.is_active = $${paramIndex}`);
            queryParams.push(is_active === 'true');
            paramIndex++;
        }

        // Last login date range filters
        if (last_login_from) {
            whereClauses.push(`u.last_login_at >= $${paramIndex}`);
            queryParams.push(last_login_from);
            paramIndex++;
        }

        if (last_login_to) {
            whereClauses.push(`u.last_login_at <= $${paramIndex}`);
            queryParams.push(last_login_to);
            paramIndex++;
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Build HAVING clause for permission filter (must be after GROUP BY)
        let havingClause = '';
        if (permission) {
            havingClause = `HAVING $${paramIndex} = ANY(array_agg(p.permission_name))`;
            queryParams.push(permission);
            paramIndex++;
        }

        // Validate sort field to prevent SQL injection
        const validSortFields = ['created_at', 'last_login_at', 'email', 'full_name', 'role'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        // Add limit and offset params
        queryParams.push(parseInt(limit, 10));
        const limitParam = `$${paramIndex}`;
        paramIndex++;

        queryParams.push(parseInt(offset, 10));
        const offsetParam = `$${paramIndex}`;

        // Get total count for pagination (before LIMIT/OFFSET)
        const countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            LEFT JOIN permissions p ON u.id = p.user_id
            ${whereClause}
            ${havingClause}
        `;

        const { rows: countRows } = await db.query(countQuery, queryParams.slice(0, -2)); // Exclude limit/offset
        const total = parseInt(countRows[0]?.total || 0, 10);

        // Get users with filters
        const usersQuery = `
            SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.last_login_at, u.created_at,
                   u.avatar_url, u.avatar_uploaded_at,
                   COALESCE(json_agg(p.permission_name) FILTER (WHERE p.permission_name IS NOT NULL), '[]') as permissions
            FROM users u
            LEFT JOIN permissions p ON u.id = p.user_id
            ${whereClause}
            GROUP BY u.id
            ${havingClause}
            ORDER BY u.${sortField} ${sortDirection}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        const { rows: users } = await db.query(usersQuery, queryParams);

        res.json({
            users,
            total,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create new user with permissions (requires manage_users permission)
router.post('/', requireAuth, requirePermission('manage_users'), async (req, res) => {
    const { email, password, full_name, role, permissions } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Check if email already exists
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Create user
        const { rows } = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, created_at`,
            [email, password_hash, full_name || null, role || 'USER']
        );

        const newUser = rows[0];

        // Grant permissions if provided
        if (permissions && Array.isArray(permissions) && permissions.length > 0) {
            for (const permName of permissions) {
                await db.query(
                    'INSERT INTO permissions (user_id, permission_name, granted_by) VALUES ($1, $2, $3)',
                    [newUser.id, permName, req.user.id]
                );

                // Log permission grant
                await logActivity(
                    req.user.id,
                    ACTIONS.PERMISSION_GRANT,
                    'user',
                    newUser.id,
                    { permission: permName, target_user: email },
                    req
                );
            }
        }

        // Log user creation
        await logActivity(
            req.user.id,
            ACTIONS.USER_CREATE,
            'user',
            newUser.id,
            { email: newUser.email, role: newUser.role },
            req
        );

        res.status(201).json({
            message: 'User created successfully',
            user: newUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update user (requires manage_users permission)
router.put('/:id', requireAuth, requirePermission('manage_users'), async (req, res) => {
    const { id } = req.params;
    const { email, full_name, role, is_active, password } = req.body;

    try {
        // Check if email is being changed and if it already exists
        if (email) {
            const existing = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, id]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use by another user' });
            }
        }

        // Hash password if provided
        let password_hash;
        if (password) {
            password_hash = await hashPassword(password);
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (email) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (full_name !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(full_name);
        }
        if (role !== undefined) {
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }
        if (password_hash) {
            updates.push(`password_hash = $${paramCount++}`);
            values.push(password_hash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(id);
        const query = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, email, full_name, role, is_active
        `;

        const { rows } = await db.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log user update
        await logActivity(
            req.user.id,
            ACTIONS.USER_UPDATE,
            'user',
            parseInt(id),
            { changes: { email, full_name, role, is_active, password_changed: !!password } },
            req
        );

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update user password only (requires manage_users permission)
router.put('/:id/password', requireAuth, requirePermission('manage_users'), async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const password_hash = await hashPassword(password);

        const { rows } = await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email',
            [password_hash, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log password reset
        await logActivity(
            req.user.id,
            ACTIONS.USER_UPDATE,
            'user',
            parseInt(id),
            { action: 'password_reset', target_user: rows[0].email },
            req
        );

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update user permissions (requires manage_users permission)
router.put('/:id/permissions', requireAuth, requirePermission('manage_users'), async (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Permissions must be an array' });
    }

    try {
        // Remove all existing permissions for this user
        await db.query('DELETE FROM permissions WHERE user_id = $1', [id]);

        // Add new permissions
        for (const permName of permissions) {
            await db.query(
                'INSERT INTO permissions (user_id, permission_name, granted_by) VALUES ($1, $2, $3)',
                [id, permName, req.user.id]
            );
        }

        // Log permission changes
        await logActivity(
            req.user.id,
            ACTIONS.PERMISSION_GRANT,
            'user',
            parseInt(id),
            { permissions },
            req
        );

        res.json({ message: 'Permissions updated successfully', permissions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================================
// Avatar Management Routes
// ============================================================================

// POST /api/users/:id/avatar - Upload user avatar
router.post('/:id/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
    const { id } = req.params;

    // Permission check: can upload own avatar OR have manage_users permission
    if (req.user.id !== parseInt(id) && !(await hasPermission(req.user.id, 'manage_users'))) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // Process the image (resize and optimize)
        await processAvatar(req.file.path);

        // Get the processed filename (with .jpg extension)
        const filename = req.file.filename.replace(path.extname(req.file.filename), '.jpg');

        // Delete old avatar if exists
        const { rows: oldUser } = await db.query('SELECT avatar_filename FROM users WHERE id = $1', [id]);
        if (oldUser[0]?.avatar_filename) {
            deleteAvatar(oldUser[0].avatar_filename);
        }

        // Update database with new avatar info
        const avatarUrl = `/uploads/avatars/${filename}`;
        const { rows } = await db.query(
            `UPDATE users
       SET avatar_url = $1, avatar_filename = $2, avatar_uploaded_at = NOW()
       WHERE id = $3
       RETURNING id, avatar_url, avatar_uploaded_at`,
            [avatarUrl, filename, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log activity
        await logActivity(
            req.user.id,
            'USER_AVATAR_UPLOAD',
            'user',
            parseInt(id),
            { filename },
            req
        );

        res.json({
            message: 'Avatar uploaded successfully',
            avatar_url: rows[0].avatar_url,
            avatar_uploaded_at: rows[0].avatar_uploaded_at
        });
    } catch (err) {
        console.error('Avatar upload error:', err);

        // Clean up uploaded file on error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ error: err.message || 'Failed to upload avatar' });
    }
});

// GET /api/users/:id/avatar - Serve user avatar image
router.get('/:id/avatar', async (req, res) => {
    const { id } = req.params;

    try {
        const { rows } = await db.query('SELECT avatar_filename FROM users WHERE id = $1', [id]);

        if (!rows[0] || !rows[0].avatar_filename) {
            return res.status(404).json({ error: 'Avatar not found' });
        }

        const filePath = path.join(__dirname, '../uploads/avatars', rows[0].avatar_filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Avatar file not found' });
        }

        // Send the image file
        res.sendFile(filePath);
    } catch (err) {
        console.error('Avatar retrieval error:', err);
        res.status(500).json({ error: 'Failed to retrieve avatar' });
    }
});

// DELETE /api/users/:id/avatar - Delete user avatar
router.delete('/:id/avatar', requireAuth, async (req, res) => {
    const { id } = req.params;

    // Permission check: can delete own avatar OR have manage_users permission
    if (req.user.id !== parseInt(id) && !(await hasPermission(req.user.id, 'manage_users'))) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
        const { rows } = await db.query('SELECT avatar_filename FROM users WHERE id = $1', [id]);

        if (!rows[0]) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete avatar file from filesystem
        if (rows[0].avatar_filename) {
            deleteAvatar(rows[0].avatar_filename);
        }

        // Clear avatar fields in database
        await db.query(
            'UPDATE users SET avatar_url = NULL, avatar_filename = NULL, avatar_uploaded_at = NULL WHERE id = $1',
            [id]
        );

        // Log activity
        await logActivity(
            req.user.id,
            'USER_AVATAR_DELETE',
            'user',
            parseInt(id),
            { filename: rows[0].avatar_filename },
            req
        );

        res.json({ message: 'Avatar deleted successfully' });
    } catch (err) {
        console.error('Avatar deletion error:', err);
        res.status(500).json({ error: 'Failed to delete avatar' });
    }
});

// ============================================================================
// User Activity Routes
// ============================================================================

// GET /api/users/:id/activity - Get user activity timeline
router.get('/:id/activity', requireAuth, async (req, res) => {
    const { id } = req.params;
    const {
        limit = '50',
        offset = '0',
        action_type = '',
        entity_type = '',
        start_date = '',
        end_date = ''
    } = req.query;

    // Permission check: can view own activity OR have view_logs permission
    if (req.user.id !== parseInt(id) && !(await hasPermission(req.user.id, 'view_logs'))) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
        const whereClauses = ['user_id = $1'];
        const queryParams = [id];
        let paramIndex = 2;

        // Filter by action type
        if (action_type) {
            whereClauses.push(`action = $${paramIndex}`);
            queryParams.push(action_type);
            paramIndex++;
        }

        // Filter by entity type
        if (entity_type) {
            whereClauses.push(`entity_type = $${paramIndex}`);
            queryParams.push(entity_type);
            paramIndex++;
        }

        // Filter by date range
        if (start_date) {
            whereClauses.push(`created_at >= $${paramIndex}`);
            queryParams.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            whereClauses.push(`created_at <= $${paramIndex}`);
            queryParams.push(end_date);
            paramIndex++;
        }

        const whereClause = whereClauses.join(' AND ');

        // Get total count
        const { rows: countRows } = await db.query(
            `SELECT COUNT(*) as total FROM activity_logs WHERE ${whereClause}`,
            queryParams
        );
        const total = parseInt(countRows[0]?.total || 0, 10);

        // Add limit and offset
        queryParams.push(parseInt(limit, 10));
        const limitParam = `$${paramIndex}`;
        paramIndex++;

        queryParams.push(parseInt(offset, 10));
        const offsetParam = `$${paramIndex}`;

        // Get activity logs with entity details
        const { rows: activities } = await db.query(
            `SELECT
                al.id,
                al.user_id,
                al.action,
                al.entity_type,
                al.entity_id,
                al.details,
                al.ip_address,
                al.user_agent,
                al.created_at,
                u.email as user_email,
                u.full_name as user_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ${limitParam} OFFSET ${offsetParam}`,
            queryParams
        );

        res.json({
            activities,
            total,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        });
    } catch (err) {
        console.error('Activity fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// GET /api/users/:id/activity/summary - Get user activity summary/analytics
router.get('/:id/activity/summary', requireAuth, async (req, res) => {
    const { id } = req.params;

    // Permission check: can view own activity OR have view_logs permission
    if (req.user.id !== parseInt(id) && !(await hasPermission(req.user.id, 'view_logs'))) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
        // Get overall activity statistics
        const { rows: stats } = await db.query(
            `SELECT
                COUNT(*) as total_actions,
                COUNT(*) FILTER (WHERE action = 'USER_LOGIN') as login_count,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as actions_last_7_days,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as actions_last_30_days,
                COUNT(DISTINCT DATE(created_at)) as active_days,
                MAX(created_at) as last_activity
            FROM activity_logs
            WHERE user_id = $1`,
            [id]
        );

        // Get action breakdown (top 10 actions by count)
        const { rows: actionBreakdown } = await db.query(
            `SELECT
                action,
                COUNT(*) as count
            FROM activity_logs
            WHERE user_id = $1
            GROUP BY action
            ORDER BY count DESC
            LIMIT 10`,
            [id]
        );

        // Get recent logins (last 10)
        const { rows: recentLogins } = await db.query(
            `SELECT
                created_at,
                ip_address,
                user_agent
            FROM activity_logs
            WHERE user_id = $1 AND action = 'USER_LOGIN'
            ORDER BY created_at DESC
            LIMIT 10`,
            [id]
        );

        res.json({
            stats: stats[0],
            actionBreakdown,
            recentLogins
        });
    } catch (err) {
        console.error('Activity summary error:', err);
        res.status(500).json({ error: 'Failed to fetch activity summary' });
    }
});

// ============================================================================
// Bulk Operations Routes
// ============================================================================

// POST /api/users/bulk/import - Import users from CSV
router.post('/bulk/import', requireAuth, requirePermission('manage_users'), async (req, res) => {
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ error: 'No users provided' });
    }

    if (users.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 users per import' });
    }

    const success = [];
    const failed = [];
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        for (const user of users) {
            try {
                const { email, password, full_name, role } = user;

                // Validate required fields
                if (!email || !password) {
                    failed.push({ email: email || 'unknown', error: 'Missing email or password' });
                    continue;
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    failed.push({ email, error: 'Invalid email format' });
                    continue;
                }

                // Check if user already exists
                const { rows: existing } = await client.query(
                    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
                    [email]
                );

                if (existing.length > 0) {
                    failed.push({ email, error: 'User already exists' });
                    continue;
                }

                // Hash password
                const hashedPassword = await hashPassword(password);

                // Insert user
                const { rows } = await client.query(
                    `INSERT INTO users (email, password_hash, full_name, role, is_active, created_at)
                     VALUES ($1, $2, $3, $4, true, NOW())
                     RETURNING id, email, full_name, role`,
                    [email, hashedPassword, full_name || null, role || 'USER']
                );

                success.push(rows[0]);
            } catch (err) {
                failed.push({ email: user.email || 'unknown', error: err.message });
            }
        }

        await client.query('COMMIT');

        // Log activity
        await logActivity(
            req.user.id,
            'BULK_USER_IMPORT',
            'user',
            null,
            { total: users.length, success: success.length, failed: failed.length },
            req
        );

        res.json({
            message: 'Bulk import completed',
            success,
            failed,
            summary: {
                total: users.length,
                imported: success.length,
                failed: failed.length
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk import error:', err);
        res.status(500).json({ error: 'Bulk import failed' });
    } finally {
        client.release();
    }
});

// GET /api/users/export - Export users to CSV
router.get('/export', requireAuth, requirePermission('manage_users'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.last_login_at, u.created_at,
                   COALESCE(array_to_string(array_agg(p.permission_name), '; '), '') as permissions
            FROM users u
            LEFT JOIN permissions p ON u.id = p.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        // Generate CSV
        const headers = ['email', 'full_name', 'role', 'permissions', 'is_active', 'last_login_at', 'created_at'];
        const csvRows = [headers.join(',')];

        rows.forEach(user => {
            const row = [
                user.email,
                user.full_name || '',
                user.role,
                user.permissions,
                user.is_active,
                user.last_login_at || '',
                user.created_at
            ].map(value => {
                // Quote values that contain commas
                const str = String(value);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            });

            csvRows.push(row.join(','));
        });

        const csv = csvRows.join('\n');

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="users_export_${Date.now()}.csv"`);
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export users' });
    }
});

// POST /api/users/bulk/delete - Delete multiple users
router.post('/bulk/delete', requireAuth, requirePermission('manage_users'), async (req, res) => {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'No user IDs provided' });
    }

    // Prevent self-deletion
    if (userIds.includes(req.user.id)) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Delete users (CASCADE will handle permissions)
        const { rowCount } = await client.query(
            'DELETE FROM users WHERE id = ANY($1)',
            [userIds]
        );

        await client.query('COMMIT');

        // Log activity
        await logActivity(
            req.user.id,
            'BULK_USER_DELETE',
            'user',
            null,
            { count: rowCount, userIds },
            req
        );

        res.json({
            message: `Successfully deleted ${rowCount} user(s)`,
            deleted: rowCount
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk delete error:', err);
        res.status(500).json({ error: 'Bulk delete failed' });
    } finally {
        client.release();
    }
});

// POST /api/users/bulk/permissions - Update permissions for multiple users
router.post('/bulk/permissions', requireAuth, requirePermission('manage_users'), async (req, res) => {
    const { userIds, permissions, mode } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'No user IDs provided' });
    }

    if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Invalid permissions array' });
    }

    if (!mode || !['replace', 'add'].includes(mode)) {
        return res.status(400).json({ error: 'Mode must be "replace" or "add"' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        for (const userId of userIds) {
            if (mode === 'replace') {
                // Delete all existing permissions
                await client.query('DELETE FROM permissions WHERE user_id = $1', [userId]);
            }

            // Add new permissions
            for (const permission of permissions) {
                await client.query(
                    `INSERT INTO permissions (user_id, permission_name)
                     VALUES ($1, $2)
                     ON CONFLICT (user_id, permission_name) DO NOTHING`,
                    [userId, permission]
                );
            }
        }

        await client.query('COMMIT');

        // Log activity
        await logActivity(
            req.user.id,
            'BULK_PERMISSION_UPDATE',
            'user',
            null,
            { count: userIds.length, permissions, mode },
            req
        );

        res.json({
            message: `Successfully updated permissions for ${userIds.length} user(s)`,
            updated: userIds.length
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk permissions error:', err);
        res.status(500).json({ error: 'Bulk permissions update failed' });
    } finally {
        client.release();
    }
});

module.exports = router;
