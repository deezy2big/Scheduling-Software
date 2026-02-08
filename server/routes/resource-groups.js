const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET all resource groups
router.get('/', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM resource_groups ORDER BY display_order ASC, name ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create resource group (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { name, description, color, display_order } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO resource_groups (name, description, color, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description || null, color || '#3B82F6', display_order || 0]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update resource group (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, description, color, display_order } = req.body;

    try {
        const { rows } = await db.query(
            `UPDATE resource_groups 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           display_order = COALESCE($4, display_order)
       WHERE id = $5
       RETURNING *`,
            [name, description, color, display_order, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Resource group not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE resource group (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM resource_groups WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Resource group not found' });
        }

        res.json({ message: 'Resource group deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
