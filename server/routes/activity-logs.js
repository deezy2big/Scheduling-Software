const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// GET activity logs with filtering (requires view_logs permission)
router.get('/', requireAuth, requirePermission('view_logs'), async (req, res) => {
    try {
        const { user_id, action, entity_type, start_date, end_date, limit = 100, offset = 0 } = req.query;

        let query = `
      SELECT al.*, u.email as user_email, u.full_name as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
        const params = [];

        if (user_id) {
            params.push(user_id);
            query += ` AND al.user_id = $${params.length}`;
        }

        if (action) {
            params.push(action);
            query += ` AND al.action = $${params.length}`;
        }

        if (entity_type) {
            params.push(entity_type);
            query += ` AND al.entity_type = $${params.length}`;
        }

        if (start_date) {
            params.push(start_date);
            query += ` AND al.created_at >= $${params.length}`;
        }

        if (end_date) {
            params.push(end_date);
            query += ` AND al.created_at <= $${params.length}`;
        }

        query += ' ORDER BY al.created_at DESC';

        params.push(parseInt(limit));
        query += ` LIMIT $${params.length}`;

        params.push(parseInt(offset));
        query += ` OFFSET $${params.length}`;

        const { rows } = await db.query(query, params);

        // Build a separate count query using the same filters (without LIMIT/OFFSET)
        const countParams = params.slice(0, -2); // Remove limit and offset
        let countQuery = `
      SELECT COUNT(*) as total
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
        let countParamIndex = 1;
        if (user_id) { countQuery += ` AND al.user_id = $${countParamIndex++}`; }
        if (action) { countQuery += ` AND al.action = $${countParamIndex++}`; }
        if (entity_type) { countQuery += ` AND al.entity_type = $${countParamIndex++}`; }
        if (start_date) { countQuery += ` AND al.created_at >= $${countParamIndex++}`; }
        if (end_date) { countQuery += ` AND al.created_at <= $${countParamIndex++}`; }

        const { rows: countRows } = await db.query(countQuery, countParams);

        res.json({
            logs: rows,
            total: parseInt(countRows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET activity log statistics
router.get('/stats', requireAuth, requirePermission('view_logs'), async (req, res) => {
    try {
        const { rows } = await db.query(`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE action LIKE 'WORK_ORDER%') as work_order_actions,
        COUNT(*) FILTER (WHERE action LIKE 'RESOURCE%') as resource_actions,
        COUNT(*) FILTER (WHERE action = 'USER_LOGIN') as login_count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
