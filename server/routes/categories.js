const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// ============================================
// CATEGORIES
// ============================================

// GET all categories with type counts
router.get('/', requireAuth, async (req, res) => {
    try {
        const { group_id } = req.query;

        let query = `
            SELECT c.*,
                   g.name as group_name,
                   g.color as group_color,
                   (SELECT COUNT(*) FROM types WHERE category_id = c.id) as type_count
            FROM categories c
            INNER JOIN groups g ON c.group_id = g.id
        `;

        const params = [];
        if (group_id) {
            params.push(group_id);
            query += ` WHERE c.group_id = $1`;
        }

        query += ` ORDER BY g.display_order, c.display_order, c.name`;

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single category with types
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Get category details
        const { rows: categoryRows } = await db.query(`
            SELECT c.*,
                   g.name as group_name,
                   g.color as group_color,
                   (SELECT COUNT(*) FROM types WHERE category_id = c.id) as type_count
            FROM categories c
            INNER JOIN groups g ON c.group_id = g.id
            WHERE c.id = $1
        `, [id]);

        if (categoryRows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const category = categoryRows[0];

        // Get types for this category
        const { rows: types } = await db.query(`
            SELECT t.*,
                   (SELECT COUNT(*) FROM resource_types WHERE type_id = t.id) as resource_count
            FROM types t
            WHERE t.category_id = $1
            ORDER BY t.display_order, t.name
        `, [id]);

        category.types = types;

        res.json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create category (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { group_id, name, description, color, display_order } = req.body;

    if (!group_id) {
        return res.status(400).json({ error: 'group_id is required' });
    }

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const { rows } = await db.query(`
            INSERT INTO categories (group_id, name, description, color, display_order)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [group_id, name, description || null, color || '#3B82F6', display_order || 0]);

        const category = rows[0];

        await logActivity(
            req.user.id,
            'CATEGORY_CREATE',
            'category',
            category.id,
            { name, group_id },
            req
        );

        res.status(201).json(category);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Category with this name already exists in this group' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid group ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update category (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { group_id, name, description, color, display_order } = req.body;

    try {
        const { rows } = await db.query(`
            UPDATE categories
            SET group_id = COALESCE($1, group_id),
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                color = COALESCE($4, color),
                display_order = COALESCE($5, display_order),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [group_id, name, description, color, display_order, id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        await logActivity(
            req.user.id,
            'CATEGORY_UPDATE',
            'category',
            parseInt(id),
            { changes: { group_id, name, description, color, display_order } },
            req
        );

        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Category with this name already exists in this group' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid group ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE category (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        await logActivity(
            req.user.id,
            'CATEGORY_DELETE',
            'category',
            parseInt(id),
            {},
            req
        );

        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
