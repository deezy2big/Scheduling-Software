const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// ============================================
// TYPES
// ============================================

// GET all types with hierarchy info
router.get('/', requireAuth, async (req, res) => {
    try {
        const { category_id, group_id } = req.query;

        let query = `
            SELECT t.*,
                   c.name as category_name,
                   c.color as category_color,
                   g.id as group_id,
                   g.name as group_name,
                   g.color as group_color,
                   (SELECT COUNT(*) FROM resource_types WHERE type_id = t.id) as resource_count
            FROM types t
            INNER JOIN categories c ON t.category_id = c.id
            INNER JOIN groups g ON c.group_id = g.id
        `;

        const params = [];
        const conditions = [];

        if (category_id) {
            params.push(category_id);
            conditions.push(`t.category_id = $${params.length}`);
        }

        if (group_id) {
            params.push(group_id);
            conditions.push(`g.id = $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY g.display_order, c.display_order, t.display_order, t.name`;

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single type with resources
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Get type details
        const { rows: typeRows } = await db.query(`
            SELECT t.*,
                   c.name as category_name,
                   c.color as category_color,
                   g.id as group_id,
                   g.name as group_name,
                   g.color as group_color,
                   (SELECT COUNT(*) FROM resource_types WHERE type_id = t.id) as resource_count
            FROM types t
            INNER JOIN categories c ON t.category_id = c.id
            INNER JOIN groups g ON c.group_id = g.id
            WHERE t.id = $1
        `, [id]);

        if (typeRows.length === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }

        const type = typeRows[0];

        // Get resources for this type
        const { rows: resources } = await db.query(`
            SELECT r.*,
                   rt.custom_hourly_rate,
                   rt.created_at as assignment_created_at
            FROM resources r
            INNER JOIN resource_types rt ON r.id = rt.resource_id
            WHERE rt.type_id = $1
            ORDER BY r.name
        `, [id]);

        type.resources = resources;

        res.json(type);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create type (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { category_id, name, abbreviation, hourly_rate, description, display_order } = req.body;

    if (!category_id) {
        return res.status(400).json({ error: 'category_id is required' });
    }

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const { rows } = await db.query(`
            INSERT INTO types (category_id, name, abbreviation, hourly_rate, description, display_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            category_id,
            name,
            abbreviation || null,
            hourly_rate || 0.00,
            description || null,
            display_order || 0
        ]);

        const type = rows[0];

        await logActivity(
            req.user.id,
            'TYPE_CREATE',
            'type',
            type.id,
            { name, category_id, hourly_rate },
            req
        );

        res.status(201).json(type);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Type with this name already exists in this category' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid category ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update type (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { category_id, name, abbreviation, hourly_rate, description, display_order } = req.body;

    try {
        const { rows } = await db.query(`
            UPDATE types
            SET category_id = COALESCE($1, category_id),
                name = COALESCE($2, name),
                abbreviation = COALESCE($3, abbreviation),
                hourly_rate = COALESCE($4, hourly_rate),
                description = COALESCE($5, description),
                display_order = COALESCE($6, display_order),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [category_id, name, abbreviation, hourly_rate, description, display_order, id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }

        await logActivity(
            req.user.id,
            'TYPE_UPDATE',
            'type',
            parseInt(id),
            { changes: { category_id, name, abbreviation, hourly_rate, description, display_order } },
            req
        );

        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Type with this name already exists in this category' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid category ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE type (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM types WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }

        await logActivity(
            req.user.id,
            'TYPE_DELETE',
            'type',
            parseInt(id),
            {},
            req
        );

        res.json({ message: 'Type deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
