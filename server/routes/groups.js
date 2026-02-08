const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// ============================================
// GROUPS
// ============================================

// GET all groups with category and resource counts
router.get('/', requireAuth, async (req, res) => {
    try {
        const { is_active } = req.query;

        let query = `
            SELECT g.*,
                   (SELECT COUNT(*) FROM categories WHERE group_id = g.id) as category_count,
                   (SELECT COUNT(*) FROM resource_group_memberships WHERE group_id = g.id) as resource_count
            FROM groups g
        `;

        const params = [];
        if (is_active !== undefined) {
            params.push(is_active === 'true');
            query += ` WHERE g.is_active = $1`;
        }

        query += ` ORDER BY g.display_order, g.name`;

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single group with full hierarchy
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Get group details
        const { rows: groupRows } = await db.query(`
            SELECT g.*,
                   (SELECT COUNT(*) FROM categories WHERE group_id = g.id) as category_count,
                   (SELECT COUNT(*) FROM resource_group_memberships WHERE group_id = g.id) as resource_count
            FROM groups g
            WHERE g.id = $1
        `, [id]);

        if (groupRows.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const group = groupRows[0];

        // Get categories for this group
        const { rows: categories } = await db.query(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM types WHERE category_id = c.id) as type_count
            FROM categories c
            WHERE c.group_id = $1
            ORDER BY c.display_order, c.name
        `, [id]);

        group.categories = categories;

        res.json(group);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create group (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { name, description, color, is_active, display_order } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const { rows } = await db.query(`
            INSERT INTO groups (name, description, color, is_active, display_order)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, description || null, color || '#3B82F6', is_active !== false, display_order || 0]);

        const group = rows[0];

        await logActivity(
            req.user.id,
            'GROUP_CREATE',
            'group',
            group.id,
            { name },
            req
        );

        res.status(201).json(group);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Group with this name already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update group (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, description, color, is_active, display_order } = req.body;

    try {
        const { rows } = await db.query(`
            UPDATE groups
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                color = COALESCE($3, color),
                is_active = COALESCE($4, is_active),
                display_order = COALESCE($5, display_order),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [name, description, color, is_active, display_order, id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        await logActivity(
            req.user.id,
            'GROUP_UPDATE',
            'group',
            parseInt(id),
            { changes: { name, description, color, is_active, display_order } },
            req
        );

        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Group with this name already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE group (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM groups WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        await logActivity(
            req.user.id,
            'GROUP_DELETE',
            'group',
            parseInt(id),
            {},
            req
        );

        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// RESOURCE GROUP MEMBERSHIPS
// ============================================

// GET all resources in a group
router.get('/:id/resources', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await db.query(`
            SELECT r.*,
                   rgm.created_at as membership_created_at
            FROM resources r
            INNER JOIN resource_group_memberships rgm ON r.id = rgm.resource_id
            WHERE rgm.group_id = $1
            ORDER BY r.name
        `, [id]);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST add resource to group (admin only)
router.post('/:id/resources/:resourceId', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id, resourceId } = req.params;

    try {
        const { rows } = await db.query(`
            INSERT INTO resource_group_memberships (resource_id, group_id)
            VALUES ($1, $2)
            RETURNING *
        `, [resourceId, id]);

        await logActivity(
            req.user.id,
            'RESOURCE_GROUP_ADD',
            'resource_group_membership',
            rows[0].id,
            { resource_id: parseInt(resourceId), group_id: parseInt(id) },
            req
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Resource is already in this group' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid resource or group ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE remove resource from group (admin only)
router.delete('/:id/resources/:resourceId', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id, resourceId } = req.params;

    try {
        const { rowCount } = await db.query(
            'DELETE FROM resource_group_memberships WHERE group_id = $1 AND resource_id = $2',
            [id, resourceId]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Resource not found in this group' });
        }

        await logActivity(
            req.user.id,
            'RESOURCE_GROUP_REMOVE',
            'resource_group_membership',
            null,
            { resource_id: parseInt(resourceId), group_id: parseInt(id) },
            req
        );

        res.json({ message: 'Resource removed from group successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
