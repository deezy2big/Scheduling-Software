const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// ============================================
// POSITION GROUPS
// ============================================

// GET all position groups
router.get('/groups', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT pg.*, 
                   COUNT(p.id) as position_count
            FROM position_groups pg
            LEFT JOIN positions p ON pg.id = p.position_group_id
            GROUP BY pg.id
            ORDER BY pg.display_order, pg.name
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single position group with positions
router.get('/groups/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(`
            SELECT pg.*, 
                   json_agg(
                       json_build_object(
                           'id', p.id,
                           'name', p.name,
                           'abbreviation', p.abbreviation,
                           'hourly_rate', p.hourly_rate,
                           'description', p.description
                       ) ORDER BY p.name
                   ) FILTER (WHERE p.id IS NOT NULL) as positions
            FROM position_groups pg
            LEFT JOIN positions p ON pg.id = p.position_group_id
            WHERE pg.id = $1
            GROUP BY pg.id
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Position group not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create position group (admin only)
router.post('/groups', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { name, description, color, display_order } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const { rows } = await db.query(`
            INSERT INTO position_groups (name, description, color, display_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [name, description || null, color || '#3B82F6', display_order || 0]);

        await logActivity(
            req.user.id,
            'POSITION_GROUP_CREATE',
            'position_group',
            rows[0].id,
            { name },
            req
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Position group with this name already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update position group (admin only)
router.put('/groups/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, description, color, display_order } = req.body;

    try {
        const { rows } = await db.query(`
            UPDATE position_groups
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                color = COALESCE($3, color),
                display_order = COALESCE($4, display_order),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `, [name, description, color, display_order, id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Position group not found' });
        }

        await logActivity(
            req.user.id,
            'POSITION_GROUP_UPDATE',
            'position_group',
            parseInt(id),
            { changes: { name, description, color } },
            req
        );

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE position group (admin only)
router.delete('/groups/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM position_groups WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Position group not found' });
        }

        await logActivity(
            req.user.id,
            'POSITION_GROUP_DELETE',
            'position_group',
            parseInt(id),
            {},
            req
        );

        res.json({ message: 'Position group deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// POSITIONS
// ============================================

// GET all positions (with optional group filter)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { group_id } = req.query;

        let query = `
            SELECT p.*, 
                   pg.name as group_name,
                   pg.color as group_color
            FROM positions p
            JOIN position_groups pg ON p.position_group_id = pg.id
        `;

        const params = [];
        if (group_id) {
            params.push(group_id);
            query += ` WHERE p.position_group_id = $1`;
        }

        query += ` ORDER BY pg.display_order, pg.name, p.name`;

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single position
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(`
            SELECT p.*, 
                   pg.name as group_name,
                   pg.color as group_color
            FROM positions p
            JOIN position_groups pg ON p.position_group_id = pg.id
            WHERE p.id = $1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Position not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create position (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { name, abbreviation, position_group_id, hourly_rate, description } = req.body;

    if (!name || !position_group_id) {
        return res.status(400).json({ error: 'Name and position_group_id are required' });
    }

    try {
        const { rows } = await db.query(`
            INSERT INTO positions (name, abbreviation, position_group_id, hourly_rate, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, abbreviation || null, position_group_id, hourly_rate || 0, description || null]);

        await logActivity(
            req.user.id,
            'POSITION_CREATE',
            'position',
            rows[0].id,
            { name, position_group_id, hourly_rate },
            req
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Position with this name already exists in this group' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid position group ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update position (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, abbreviation, position_group_id, hourly_rate, description } = req.body;

    try {
        const { rows } = await db.query(`
            UPDATE positions
            SET name = COALESCE($1, name),
                abbreviation = COALESCE($2, abbreviation),
                position_group_id = COALESCE($3, position_group_id),
                hourly_rate = COALESCE($4, hourly_rate),
                description = COALESCE($5, description),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [name, abbreviation, position_group_id, hourly_rate, description, id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Position not found' });
        }

        await logActivity(
            req.user.id,
            'POSITION_UPDATE',
            'position',
            parseInt(id),
            { changes: { name, hourly_rate } },
            req
        );

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE position (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM positions WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Position not found' });
        }

        await logActivity(
            req.user.id,
            'POSITION_DELETE',
            'position',
            parseInt(id),
            {},
            req
        );

        res.json({ message: 'Position deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
