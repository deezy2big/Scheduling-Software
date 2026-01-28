const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// ============================================
// SERVICES
// ============================================

// GET all services with positions
router.get('/', requireAuth, async (req, res) => {
    try {
        const { is_active } = req.query;

        let query = `
            SELECT s.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', sp.id,
                               'position_id', sp.position_id,
                               'position_name', p.name,
                               'abbreviation', p.abbreviation,
                               'hourly_rate', p.hourly_rate,
                               'group_name', pg.name,
                               'group_color', pg.color,
                               'quantity', sp.quantity,
                               'notes', sp.notes,
                               'display_order', sp.display_order
                           ) ORDER BY sp.display_order, p.name
                       ) FILTER (WHERE sp.id IS NOT NULL),
                       '[]'
                   ) as positions
            FROM services s
            LEFT JOIN service_positions sp ON s.id = sp.service_id
            LEFT JOIN positions p ON sp.position_id = p.id
            LEFT JOIN position_groups pg ON p.position_group_id = pg.id
        `;

        const params = [];
        if (is_active !== undefined) {
            params.push(is_active === 'true');
            query += ` WHERE s.is_active = $1`;
        }

        query += ` GROUP BY s.id ORDER BY s.name`;

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single service with positions
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(`
            SELECT s.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', sp.id,
                               'position_id', sp.position_id,
                               'position_name', p.name,
                               'abbreviation', p.abbreviation,
                               'hourly_rate', p.hourly_rate,
                               'group_name', pg.name,
                               'group_color', pg.color,
                               'quantity', sp.quantity,
                               'notes', sp.notes,
                               'display_order', sp.display_order
                           ) ORDER BY sp.display_order, p.name
                       ) FILTER (WHERE sp.id IS NOT NULL),
                       '[]'
                   ) as positions
            FROM services s
            LEFT JOIN service_positions sp ON s.id = sp.service_id
            LEFT JOIN positions p ON sp.position_id = p.id
            LEFT JOIN position_groups pg ON p.position_group_id = pg.id
            WHERE s.id = $1
            GROUP BY s.id
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create service with positions (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { name, description, is_active, positions } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Create service
        const { rows: serviceRows } = await client.query(`
            INSERT INTO services (name, description, is_active, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [name, description || null, is_active !== false, req.user.id]);

        const service = serviceRows[0];

        // Add positions if provided
        if (positions && Array.isArray(positions) && positions.length > 0) {
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                await client.query(`
                    INSERT INTO service_positions (service_id, position_id, quantity, notes, display_order)
                    VALUES ($1, $2, $3, $4, $5)
                `, [service.id, pos.position_id, pos.quantity || 1, pos.notes || null, i]);
            }
        }

        await client.query('COMMIT');

        await logActivity(
            req.user.id,
            'SERVICE_CREATE',
            'service',
            service.id,
            { name, position_count: positions?.length || 0 },
            req
        );

        // Fetch the full service with positions to return
        const { rows: fullService } = await db.query(`
            SELECT s.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', sp.id,
                               'position_id', sp.position_id,
                               'position_name', p.name,
                               'abbreviation', p.abbreviation,
                               'hourly_rate', p.hourly_rate,
                               'group_name', pg.name,
                               'group_color', pg.color,
                               'quantity', sp.quantity,
                               'notes', sp.notes,
                               'display_order', sp.display_order
                           ) ORDER BY sp.display_order, p.name
                       ) FILTER (WHERE sp.id IS NOT NULL),
                       '[]'
                   ) as positions
            FROM services s
            LEFT JOIN service_positions sp ON s.id = sp.service_id
            LEFT JOIN positions p ON sp.position_id = p.id
            LEFT JOIN position_groups pg ON p.position_group_id = pg.id
            WHERE s.id = $1
            GROUP BY s.id
        `, [service.id]);

        res.status(201).json(fullService[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Service with this name already exists' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid position ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// PUT update service (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, description, is_active, positions } = req.body;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Update service
        const { rows: serviceRows } = await client.query(`
            UPDATE services
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                is_active = COALESCE($3, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [name, description, is_active, id]);

        if (serviceRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Service not found' });
        }

        // Update positions if provided
        if (positions && Array.isArray(positions)) {
            // Remove existing positions
            await client.query('DELETE FROM service_positions WHERE service_id = $1', [id]);

            // Add new positions
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                await client.query(`
                    INSERT INTO service_positions (service_id, position_id, quantity, notes, display_order)
                    VALUES ($1, $2, $3, $4, $5)
                `, [id, pos.position_id, pos.quantity || 1, pos.notes || null, i]);
            }
        }

        await client.query('COMMIT');

        await logActivity(
            req.user.id,
            'SERVICE_UPDATE',
            'service',
            parseInt(id),
            { changes: { name, description, is_active, position_count: positions?.length } },
            req
        );

        // Fetch the full service with positions to return
        const { rows: fullService } = await db.query(`
            SELECT s.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', sp.id,
                               'position_id', sp.position_id,
                               'position_name', p.name,
                               'abbreviation', p.abbreviation,
                               'hourly_rate', p.hourly_rate,
                               'group_name', pg.name,
                               'group_color', pg.color,
                               'quantity', sp.quantity,
                               'notes', sp.notes,
                               'display_order', sp.display_order
                           ) ORDER BY sp.display_order, p.name
                       ) FILTER (WHERE sp.id IS NOT NULL),
                       '[]'
                   ) as positions
            FROM services s
            LEFT JOIN service_positions sp ON s.id = sp.service_id
            LEFT JOIN positions p ON sp.position_id = p.id
            LEFT JOIN position_groups pg ON p.position_group_id = pg.id
            WHERE s.id = $1
            GROUP BY s.id
        `, [id]);

        res.json(fullService[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Service with this name already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// DELETE service (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM services WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        await logActivity(
            req.user.id,
            'SERVICE_DELETE',
            'service',
            parseInt(id),
            {},
            req
        );

        res.json({ message: 'Service deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// SERVICE POSITIONS (individual management)
// ============================================

// POST add position to service (admin only)
router.post('/:id/positions', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { position_id, quantity, notes } = req.body;

    if (!position_id) {
        return res.status(400).json({ error: 'position_id is required' });
    }

    try {
        // Get max display_order for this service
        const { rows: maxOrder } = await db.query(
            'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM service_positions WHERE service_id = $1',
            [id]
        );

        const { rows } = await db.query(`
            INSERT INTO service_positions (service_id, position_id, quantity, notes, display_order)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [id, position_id, quantity || 1, notes || null, maxOrder[0].next_order]);

        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'This position is already in the service' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid service or position ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE remove position from service (admin only)
router.delete('/:id/positions/:positionId', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id, positionId } = req.params;

    try {
        const { rowCount } = await db.query(
            'DELETE FROM service_positions WHERE service_id = $1 AND position_id = $2',
            [id, positionId]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Position not found in this service' });
        }

        res.json({ message: 'Position removed from service successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
