const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// ============================================
// COST CALCULATION HELPER
// ============================================

/**
 * Calculate cost for a workorder resource
 * @param {Object} resource - The workorder resource
 * @param {number} typeHourlyRate - The type's hourly rate
 * @returns {number} - Calculated cost
 */
function calculateResourceCost(resource, typeHourlyRate) {
    if (resource.cost_type === 'FLAT') {
        return parseFloat(resource.flat_rate) || 0;
    }

    // HOURLY with 8-hour minimum
    const startTime = new Date(resource.start_time);
    const endTime = new Date(resource.end_time);
    const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);
    const billableHours = Math.max(hoursWorked, 8); // 8-hour minimum

    const rate = resource.hourly_rate_override || typeHourlyRate || resource.position_hourly_rate || 0;
    return billableHours * parseFloat(rate);
}

// ============================================
// WORKORDERS
// ============================================

// GET all workorders (with optional filters)
router.get('/', requireAuth, requirePermission('view_schedules'), async (req, res) => {
    try {
        const { project_id, status, start_date, end_date } = req.query;

        let query = `
            SELECT w.*,
                   p.title as project_title,
                   p.client_name,
                   json_agg(
                       json_build_object(
                           'id', wr.id,
                           'resource_id', wr.resource_id,
                           'resource_name', r.name,
                           'resource_type', r.type,
                           'type_id', COALESCE(wr.type_id, wr.position_id),
                           'type_name', COALESCE(t.name, pos.name),
                           'type_abbrev', COALESCE(t.abbreviation, pos.abbreviation),
                           'category_name', c.name,
                           'category_color', c.color,
                           'group_name', COALESCE(g.name, pg.name),
                           'group_color', COALESCE(g.color, pg.color),
                           'start_time', wr.start_time,
                           'end_time', wr.end_time,
                           'cost_type', wr.cost_type,
                           'flat_rate', wr.flat_rate,
                           'hourly_rate_override', wr.hourly_rate_override,
                           'type_hourly_rate', COALESCE(t.hourly_rate, pos.hourly_rate),
                           'notes', wr.notes,
                           'position_id', wr.position_id,
                           'position_name', pos.name,
                           'position_abbrev', pos.abbreviation,
                           'pay_type_override', wr.pay_type_override,
                           'work_state_override', wr.work_state_override
                       ) ORDER BY wr.start_time
                   ) FILTER (WHERE wr.id IS NOT NULL) as resources
            FROM workorders w
            JOIN projects p ON w.project_id = p.id
            LEFT JOIN workorder_resources wr ON w.id = wr.workorder_id
            LEFT JOIN resources r ON wr.resource_id = r.id
            LEFT JOIN types t ON wr.type_id = t.id
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN groups g ON c.group_id = g.id
            LEFT JOIN positions pos ON wr.position_id = pos.id
            LEFT JOIN position_groups pg ON pos.position_group_id = pg.id
        `;

        const params = [];
        const conditions = [];

        if (project_id) {
            params.push(project_id);
            conditions.push(`w.project_id = $${params.length}`);
        }

        if (status) {
            params.push(status);
            conditions.push(`w.status = $${params.length}`);
        }

        if (start_date) {
            params.push(start_date);
            conditions.push(`w.scheduled_date >= $${params.length}`);
        }

        if (end_date) {
            params.push(end_date);
            conditions.push(`w.scheduled_date <= $${params.length}`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY w.id, p.title, p.client_name ORDER BY w.scheduled_date, w.start_time';

        const { rows } = await db.query(query, params);

        // Calculate costs for each workorder
        const workordersWithCosts = rows.map(workorder => {
            let totalCost = 0;
            if (workorder.resources) {
                workorder.resources.forEach(resource => {
                    resource.calculated_cost = calculateResourceCost(resource, resource.type_hourly_rate);
                    totalCost += resource.calculated_cost;
                });
            }
            workorder.total_cost = totalCost;
            return workorder;
        });

        res.json(workordersWithCosts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single workorder by ID
router.get('/:id', requireAuth, requirePermission('view_schedules'), async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await db.query(`
            SELECT w.*,
                   p.title as project_title,
                   p.client_name,
                   json_agg(
                       json_build_object(
                           'id', wr.id,
                           'resource_id', wr.resource_id,
                           'resource_name', r.name,
                           'resource_type', r.type,
                           'type_id', COALESCE(wr.type_id, wr.position_id),
                           'type_name', COALESCE(t.name, pos.name),
                           'type_abbrev', COALESCE(t.abbreviation, pos.abbreviation),
                           'category_name', c.name,
                           'category_color', c.color,
                           'group_name', COALESCE(g.name, pg.name),
                           'group_color', COALESCE(g.color, pg.color),
                           'start_time', wr.start_time,
                           'end_time', wr.end_time,
                           'cost_type', wr.cost_type,
                           'flat_rate', wr.flat_rate,
                           'hourly_rate_override', wr.hourly_rate_override,
                           'type_hourly_rate', COALESCE(t.hourly_rate, pos.hourly_rate),
                           'notes', wr.notes,
                           'position_id', wr.position_id,
                           'position_name', pos.name,
                           'position_abbrev', pos.abbreviation,
                           'pay_type_override', wr.pay_type_override,
                           'work_state_override', wr.work_state_override
                       ) ORDER BY wr.start_time
                   ) FILTER (WHERE wr.id IS NOT NULL) as resources
            FROM workorders w
            JOIN projects p ON w.project_id = p.id
            LEFT JOIN workorder_resources wr ON w.id = wr.workorder_id
            LEFT JOIN resources r ON wr.resource_id = r.id
            LEFT JOIN types t ON wr.type_id = t.id
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN groups g ON c.group_id = g.id
            LEFT JOIN positions pos ON wr.position_id = pos.id
            LEFT JOIN position_groups pg ON pos.position_group_id = pg.id
            WHERE w.id = $1
            GROUP BY w.id, p.title, p.client_name
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Workorder not found' });
        }

        const workorder = rows[0];

        // Calculate costs
        let totalCost = 0;
        if (workorder.resources) {
            workorder.resources.forEach(resource => {
                resource.calculated_cost = calculateResourceCost(resource, resource.type_hourly_rate);
                totalCost += resource.calculated_cost;
            });
        }
        workorder.total_cost = totalCost;

        res.json(workorder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create workorder
router.post('/', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const {
        project_id,
        title,
        description,
        status,
        scheduled_date,
        start_time,
        end_time,
        location,
        notes,
        job_type,
        location_category,
        location_region,
        resources
    } = req.body;

    if (!project_id || !title) {
        return res.status(400).json({ error: 'project_id and title are required' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Create workorder
        const { rows: workorderRows } = await client.query(`
            INSERT INTO workorders (
                project_id, title, description, status, scheduled_date,
                start_time, end_time, location, notes, created_by, job_type,
                location_category, location_region
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            project_id,
            title,
            description || null,
            status || 'PENDING',
            scheduled_date || null,
            start_time || null,
            end_time || null,
            location || null,
            notes || null,
            req.user.id,
            job_type || null,
            location_category || null,
            location_region || null
        ]);

        const workorder = workorderRows[0];

        // Add resources if provided
        if (resources && Array.isArray(resources) && resources.length > 0) {
            for (const resource of resources) {
                // Convert position_id to type_id if needed using the mapping view
                let typeId = resource.type_id || null;
                if (!typeId && resource.position_id) {
                    const mappingResult = await client.query(
                        'SELECT type_id FROM position_to_type_mapping WHERE position_id = $1',
                        [resource.position_id]
                    );
                    typeId = mappingResult.rows[0]?.type_id || null;
                }

                await client.query(`
                    INSERT INTO workorder_resources (
                        workorder_id, resource_id, type_id, position_id, start_time, end_time,
                        cost_type, flat_rate, hourly_rate_override, notes,
                        pay_type_override, work_state_override
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    workorder.id,
                    resource.resource_id,
                    typeId,
                    resource.position_id || null,
                    resource.start_time,
                    resource.end_time,
                    resource.cost_type || 'HOURLY',
                    resource.flat_rate || null,
                    resource.hourly_rate_override || null,
                    resource.notes || null,
                    resource.pay_type_override || null,
                    resource.work_state_override || null
                ]);
            }
        }

        await client.query('COMMIT');

        await logActivity(
            req.user.id,
            'WORKORDER_CREATE',
            'workorder',
            workorder.id,
            { title, project_id, resource_count: resources?.length || 0 },
            req
        );

        res.status(201).json(workorder);
    } catch (err) {
        await client.query('ROLLBACK');

        if (err.code === '23P01') {
            return res.status(409).json({
                error: 'Double booking detected. One or more resources are unavailable for the selected times.'
            });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid project, resource, or position ID' });
        }
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    } finally {
        client.release();
    }
});

// PUT update workorder
router.put('/:id', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        status,
        scheduled_date,
        start_time,
        end_time,
        location,
        notes,
        job_type,
        location_category,
        location_region,
        resources
    } = req.body;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Update workorder
        const { rows } = await client.query(`
            UPDATE workorders
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                scheduled_date = COALESCE($4, scheduled_date),
                start_time = COALESCE($5, start_time),
                end_time = COALESCE($6, end_time),
                location = COALESCE($7, location),
                notes = COALESCE($8, notes),
                job_type = COALESCE($10, job_type),
                location_category = COALESCE($11, location_category),
                location_region = COALESCE($12, location_region),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `, [title, description, status, scheduled_date, start_time, end_time, location, notes, id, job_type, location_category, location_region]);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Workorder not found' });
        }

        // Update resources if provided
        if (resources && Array.isArray(resources)) {
            // Debug: Log received resources
            console.log('Updating workorder resources:', JSON.stringify(resources, null, 2));

            // Remove existing resources
            await client.query('DELETE FROM workorder_resources WHERE workorder_id = $1', [id]);

            // Add new resources
            for (const resource of resources) {
                console.log(`Resource ${resource.resource_id}: pay_type_override = ${resource.pay_type_override}`);
                // Convert position_id to type_id if needed using the mapping view
                let typeId = resource.type_id || null;
                if (!typeId && resource.position_id) {
                    const mappingResult = await client.query(
                        'SELECT type_id FROM position_to_type_mapping WHERE position_id = $1',
                        [resource.position_id]
                    );
                    typeId = mappingResult.rows[0]?.type_id || null;
                }

                await client.query(`
                    INSERT INTO workorder_resources (
                        workorder_id, resource_id, type_id, position_id, start_time, end_time,
                        cost_type, flat_rate, hourly_rate_override, notes,
                        pay_type_override, work_state_override
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    id,
                    resource.resource_id,
                    typeId,
                    resource.position_id || null,
                    resource.start_time,
                    resource.end_time,
                    resource.cost_type || 'HOURLY',
                    resource.flat_rate || null,
                    resource.hourly_rate_override || null,
                    resource.notes || null,
                    resource.pay_type_override || null,
                    resource.work_state_override || null
                ]);
            }
        }

        await client.query('COMMIT');

        await logActivity(
            req.user.id,
            'WORKORDER_UPDATE',
            'workorder',
            parseInt(id),
            { changes: { title, status, resource_count: resources?.length } },
            req
        );

        res.json(rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');

        if (err.code === '23P01') {
            return res.status(409).json({
                error: 'Double booking detected. One or more resources are unavailable for the selected times.'
            });
        }
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    } finally {
        client.release();
    }
});

// DELETE workorder
router.delete('/:id', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM workorders WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Workorder not found' });
        }

        await logActivity(
            req.user.id,
            'WORKORDER_DELETE',
            'workorder',
            parseInt(id),
            {},
            req
        );

        res.json({ message: 'Workorder deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST duplicate workorder
router.post('/:id/duplicate', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const { id } = req.params;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get original workorder
        const { rows: originals } = await client.query('SELECT * FROM workorders WHERE id = $1', [id]);
        if (originals.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Workorder not found' });
        }
        const original = originals[0];

        // 2. Create new workorder details (append (Copy) to title)
        const newTitle = `${original.title} (Copy)`;

        const { rows: newWos } = await client.query(`
            INSERT INTO workorders (
                project_id, title, description, status, scheduled_date,
                start_time, end_time, location, notes, created_by,
                workorder_number, bid_number, po_number, job_type,
                location_category, location_region
            ) VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, NULL, $10, $11, $12, $13, $14)
            RETURNING *
        `, [
            original.project_id,
            newTitle,
            original.description,
            original.scheduled_date,
            original.start_time,
            original.end_time,
            original.location,
            original.notes,
            req.user.id,
            original.bid_number,
            original.po_number,
            original.job_type,
            original.location_category,
            original.location_region
        ]);
        const newWo = newWos[0];

        // 3. Copy resources
        const { rows: resources } = await client.query('SELECT * FROM workorder_resources WHERE workorder_id = $1', [id]);

        for (const r of resources) {
            await client.query(`
                INSERT INTO workorder_resources (
                    workorder_id, resource_id, type_id, position_id, start_time, end_time,
                    cost_type, flat_rate, hourly_rate_override, notes,
                    pay_type_override, work_state_override
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                newWo.id,
                r.resource_id,
                r.type_id,
                r.position_id,
                r.start_time,
                r.end_time,
                r.cost_type,
                r.flat_rate,
                r.hourly_rate_override,
                r.notes,
                r.pay_type_override,
                r.work_state_override
            ]);
        }

        await client.query('COMMIT');

        await logActivity(
            req.user.id,
            'WORKORDER_DUPLICATE',
            'workorder',
            newWo.id,
            { original_id: id, new_title: newTitle },
            req
        );

        res.status(201).json(newWo);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        if (err.code === '23P01') {
            return res.status(409).json({
                error: 'Could not copy: Resources are double-booked in the new slot.'
            });
        }
        res.status(500).json({ error: 'Internal server error during duplication' });
    } finally {
        client.release();
    }
});

// POST add resource to workorder
router.post('/:id/resources', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const { id } = req.params;
    const { resource_id, type_id, position_id, start_time, end_time, cost_type, flat_rate, hourly_rate_override, notes, pay_type_override, work_state_override } = req.body;

    if (!resource_id || !start_time || !end_time) {
        return res.status(400).json({ error: 'resource_id, start_time, and end_time are required' });
    }

    try {
        // Convert position_id to type_id if needed using the mapping view
        let finalTypeId = type_id || null;
        if (!finalTypeId && position_id) {
            const mappingResult = await db.query(
                'SELECT type_id FROM position_to_type_mapping WHERE position_id = $1',
                [position_id]
            );
            finalTypeId = mappingResult.rows[0]?.type_id || null;
        }

        const { rows } = await db.query(`
            INSERT INTO workorder_resources (
                workorder_id, resource_id, type_id, position_id, start_time, end_time,
                cost_type, flat_rate, hourly_rate_override, notes,
                pay_type_override, work_state_override
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [id, resource_id, finalTypeId, position_id || null, start_time, end_time,
            cost_type || 'HOURLY', flat_rate || null, hourly_rate_override || null, notes || null,
            pay_type_override || null, work_state_override || null]);

        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23P01') {
            return res.status(409).json({
                error: 'Double booking detected. This resource is unavailable for the selected times.'
            });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE remove resource from workorder
router.delete('/:id/resources/:resourceAssignmentId', requireAuth, requirePermission('edit_schedules'), async (req, res) => {
    const { id, resourceAssignmentId } = req.params;

    try {
        const { rowCount } = await db.query(
            'DELETE FROM workorder_resources WHERE id = $1 AND workorder_id = $2',
            [resourceAssignmentId, id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Resource assignment not found' });
        }

        res.json({ message: 'Resource removed from workorder' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
