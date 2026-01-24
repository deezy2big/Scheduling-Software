const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { hashPassword } = require('../utils/password');
const { logActivity, ACTIONS } = require('../utils/logger');

// GET all users (requires manage_users permission)
router.get('/', requireAuth, requirePermission('manage_users'), async (req, res) => {
    try {
        const { rows } = await db.query(`
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.last_login_at, u.created_at,
             COALESCE(json_agg(p.permission_name) FILTER (WHERE p.permission_name IS NOT NULL), '[]') as permissions
      FROM users u
      LEFT JOIN permissions p ON u.id = p.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

        res.json(rows);
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

module.exports = router;
