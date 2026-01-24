const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// ============================================
// COST CALCULATION HELPER
// ============================================

function calculateResourceCost(resource, positionHourlyRate) {
    if (resource.cost_type === 'FLAT') {
        return parseFloat(resource.flat_rate) || 0;
    }

    const startTime = new Date(resource.start_time);
    const endTime = new Date(resource.end_time);
    const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);
    const billableHours = Math.max(hoursWorked, 8);

    const rate = resource.hourly_rate_override || positionHourlyRate || 0;
    return billableHours * parseFloat(rate);
}

// ============================================
// PROJECTS
// ============================================

// GET all projects with workorder counts and total costs
router.get('/', requireAuth, requirePermission('view_schedules'), async (req, res) => {
    try {
        const { status, priority, client_name } = req.query;

        let query = `
            SELECT p.*,
                   COUNT(DISTINCT w.id) as workorder_count,
                   u.full_name as created_by_name
            FROM projects p
            LEFT JOIN workorders w ON p.id = w.project_id
            LEFT JOIN users u ON p.created_by = u.id
        `;

        const params = [];
        const conditions = [];

        if (status) {
            params.push(status);
            conditions.push(`p.status = $${params.length}`);
        }

        if (priority) {
            params.push(priority);
            conditions.push(`p.priority = $${params.length}`);
        }

        if (client_name) {
            params.push(`%${client_name}%`);
            conditions.push(`p.client_name ILIKE $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY p.id, u.full_name ORDER BY p.created_at DESC';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single project by ID with workorders and total cost
router.get('/:id', requireAuth, requirePermission('view_schedules'), async (req, res) => {
    try {
        const { id } = req.params;

        // Get project
        const projectResult = await db.query(`
            SELECT p.*, u.full_name as created_by_name
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.id = $1
        `, [id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const project = projectResult.rows[0];

        // Get workorders with resources
        const workordersResult = await db.query(`
            SELECT w.*,
                   json_agg(
                       json_build_object(
                           'id', wr.id,
                           'resource_id', wr.resource_id,
                           'resource_name', r.name,
                           'resource_type', r.type,
                           'position_id', wr.position_id,
                           'position_name', pos.name,
                           'position_abbrev', pos.abbreviation,
                           'start_time', wr.start_time,
                           'end_time', wr.end_time,
                           'cost_type', wr.cost_type,
                           'flat_rate', wr.flat_rate,
                           'hourly_rate_override', wr.hourly_rate_override,
                           'position_hourly_rate', pos.hourly_rate,
                           'notes', wr.notes
                       ) ORDER BY wr.start_time
                   ) FILTER (WHERE wr.id IS NOT NULL) as resources
            FROM workorders w
            LEFT JOIN workorder_resources wr ON w.id = wr.workorder_id
            LEFT JOIN resources r ON wr.resource_id = r.id
            LEFT JOIN positions pos ON wr.position_id = pos.id
            WHERE w.project_id = $1
            GROUP BY w.id
            ORDER BY w.scheduled_date, w.start_time
        `, [id]);

        // Calculate costs for each workorder
        let projectTotalCost = 0;
        const workorders = workordersResult.rows.map(workorder => {
            let workorderCost = 0;
            if (workorder.resources) {
                workorder.resources.forEach(resource => {
                    resource.calculated_cost = calculateResourceCost(resource, resource.position_hourly_rate);
                    workorderCost += resource.calculated_cost;
                });
            }
            workorder.total_cost = workorderCost;
            projectTotalCost += workorderCost;
            return workorder;
        });

        project.workorders = workorders;
        project.total_cost = projectTotalCost;
        project.workorder_count = workorders.length;

        res.json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET workorders for a project
router.get('/:id/workorders', requireAuth, requirePermission('view_schedules'), async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await db.query(`
            SELECT w.*,
                   json_agg(
                       json_build_object(
                           'id', wr.id,
                           'resource_id', wr.resource_id,
                           'resource_name', r.name,
                           'position_name', pos.name,
                           'start_time', wr.start_time,
                           'end_time', wr.end_time
                       ) ORDER BY wr.start_time
                   ) FILTER (WHERE wr.id IS NOT NULL) as resources
            FROM workorders w
            LEFT JOIN workorder_resources wr ON w.id = wr.workorder_id
            LEFT JOIN resources r ON wr.resource_id = r.id
            LEFT JOIN positions pos ON wr.position_id = pos.id
            WHERE w.project_id = $1
            GROUP BY w.id
            ORDER BY w.scheduled_date, w.start_time
        `, [id]);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST Create a Project (container only, no resources)
router.post('/', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const {
        title, notes, color, client_name, department,
        priority, status, assigned_user_id
    } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const { rows } = await db.query(`
            INSERT INTO projects (
                title, project_name, notes, color, client_name, department,
                priority, status, assigned_user_id, created_by
            ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            title,
            notes || null,
            color || '#3B82F6',
            client_name || null,
            department || null,
            priority || 'NORMAL',
            status || 'PENDING',
            assigned_user_id || null,
            req.user.id
        ]);

        await logActivity(
            req.user.id,
            'PROJECT_CREATE',
            'project',
            rows[0].id,
            { title },
            req
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// PUT Update a Project
router.put('/:id', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const { id } = req.params;
    const {
        title, notes, color, client_name, department,
        priority, status, assigned_user_id
    } = req.body;

    try {
        const { rows } = await db.query(`
            UPDATE projects
            SET title = COALESCE($1, title),
                project_name = COALESCE($1, project_name),
                notes = COALESCE($2, notes),
                color = COALESCE($3, color),
                client_name = COALESCE($4, client_name),
                department = COALESCE($5, department),
                priority = COALESCE($6, priority),
                status = COALESCE($7, status),
                assigned_user_id = COALESCE($8, assigned_user_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `, [title, notes, color, client_name, department, priority, status, assigned_user_id, id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        await logActivity(
            req.user.id,
            'PROJECT_UPDATE',
            'project',
            parseInt(id),
            { changes: { title, status } },
            req
        );

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// DELETE a Project (cascades to workorders)
router.delete('/:id', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM projects WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        await logActivity(
            req.user.id,
            'PROJECT_DELETE',
            'project',
            parseInt(id),
            {},
            req
        );

        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
