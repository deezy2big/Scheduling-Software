const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET work orders (with filtering options)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { resource_id, start, end, project_name, status, priority, assigned_user_id } = req.query;
        let query = `
      SELECT wo.*, 
             r.name as resource_name, r.type as resource_type, r.color as resource_color,
             u.full_name as assigned_user_name,
             creator.full_name as created_by_name
      FROM work_orders wo
      JOIN resources r ON wo.resource_id = r.id
      LEFT JOIN users u ON wo.assigned_user_id = u.id
      LEFT JOIN users creator ON wo.created_by = creator.id
    `;
        const params = [];
        const conditions = [];

        if (resource_id) {
            params.push(resource_id);
            conditions.push(`wo.resource_id = $${params.length}`);
        }

        if (project_name) {
            params.push(`%${project_name}%`);
            conditions.push(`wo.project_name ILIKE $${params.length}`);
        }

        if (status) {
            params.push(status);
            conditions.push(`wo.status = $${params.length}`);
        }

        if (priority) {
            params.push(priority);
            conditions.push(`wo.priority = $${params.length}`);
        }

        if (assigned_user_id) {
            params.push(assigned_user_id);
            conditions.push(`wo.assigned_user_id = $${params.length}`);
        }

        if (start && end) {
            params.push(start, end);
            conditions.push(`(wo.start_time < $${params.length} AND wo.end_time > $${params.length - 1})`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY wo.start_time ASC';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single work order by ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(
            `SELECT wo.*, 
              r.name as resource_name, r.type as resource_type,
              u.full_name as assigned_user_name,
              creator.full_name as created_by_name
       FROM work_orders wo
       JOIN resources r ON wo.resource_id = r.id
       LEFT JOIN users u ON wo.assigned_user_id = u.id
       LEFT JOIN users creator ON wo.created_by = creator.id
       WHERE wo.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST Create a Work Order
router.post('/', requireAuth, async (req, res) => {
    const {
        resource_id, start_time, end_time, title, project_name, notes, color,
        client_name, department, priority, status, assigned_user_id
    } = req.body;

    if (!resource_id || !start_time || !end_time) {
        return res.status(400).json({ error: 'Resource ID, start time, and end time are required' });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (start >= end) {
        return res.status(400).json({ error: 'End time must be after start time' });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO work_orders (
        resource_id, start_time, end_time, title, project_name, notes, color,
        client_name, department, priority, status, assigned_user_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *`,
            [
                resource_id, start_time, end_time,
                title || 'Untitled Work Order',
                project_name, notes, color,
                client_name, department,
                priority || 'NORMAL',
                status || 'PENDING',
                assigned_user_id,
                req.user.id // created_by from JWT token
            ]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23P01') {
            return res.status(409).json({
                error: 'Double booking detected. This time slot is unavailable for this resource.'
            });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid resource ID or user ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT Update a Work Order
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const {
        resource_id, start_time, end_time, title, project_name, notes, color,
        client_name, department, priority, status, assigned_user_id
    } = req.body;

    try {
        // Check if work order exists
        const existing = await db.query('SELECT * FROM work_orders WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Validate times if provided
        if (start_time && end_time) {
            const start = new Date(start_time);
            const end = new Date(end_time);
            if (start >= end) {
                return res.status(400).json({ error: 'End time must be after start time' });
            }
        }

        const { rows } = await db.query(
            `UPDATE work_orders 
       SET resource_id = COALESCE($1, resource_id),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           title = COALESCE($4, title),
           project_name = COALESCE($5, project_name),
           notes = COALESCE($6, notes),
           color = COALESCE($7, color),
           client_name = COALESCE($8, client_name),
           department = COALESCE($9, department),
           priority = COALESCE($10, priority),
           status = COALESCE($11, status),
           assigned_user_id = COALESCE($12, assigned_user_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
            [
                resource_id, start_time, end_time, title, project_name, notes, color,
                client_name, department, priority, status, assigned_user_id, id
            ]
        );

        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23P01') {
            return res.status(409).json({
                error: 'Double booking detected. This time slot is unavailable for this resource.'
            });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE a Work Order
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM work_orders WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        res.json({ message: 'Work order deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all users (for assignment dropdown)
router.get('/users/list', requireAuth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, email, full_name, role FROM users ORDER BY full_name ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
