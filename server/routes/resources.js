const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET all resources (with optional type filter)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { type, status, search } = req.query;
        let query = `
          SELECT r.*, 
                 COALESCE(
                   (SELECT json_agg(json_build_object('position_id', p.id, 'group_id', p.position_group_id))
                    FROM resource_positions rp
                    JOIN positions p ON rp.position_id = p.id
                    WHERE rp.resource_id = r.id),
                   '[]'
                 ) as positions,
                 COALESCE(
                   (SELECT json_agg(json_build_object('id', rg.id, 'name', rg.name, 'color', rg.color))
                    FROM resource_group_assignments rga
                    JOIN resource_groups rg ON rga.group_id = rg.id
                    WHERE rga.resource_id = r.id),
                   '[]'
                 ) as groups
          FROM resources r
        `;
        const params = [];
        const conditions = [];

        if (type) {
            params.push(type);
            conditions.push(`r.type = $${params.length}`);
        }

        if (status) {
            params.push(status);
            conditions.push(`r.status = $${params.length}`);
        }

        if (search) {
            params.push(`%${search.toLowerCase()}%`);
            conditions.push(`(
                LOWER(r.name) LIKE $${params.length} OR
                LOWER(r.first_name) LIKE $${params.length} OR
                LOWER(r.last_name) LIKE $${params.length} OR
                LOWER(r.email) LIKE $${params.length} OR
                r.phone LIKE $${params.length} OR
                LOWER(r.address_street) LIKE $${params.length} OR
                LOWER(r.address_city) LIKE $${params.length} OR
                LOWER(r.address_state) LIKE $${params.length} OR
                r.address_zip LIKE $${params.length} OR
                LOWER(r.notes) LIKE $${params.length} OR
                CAST(r.start_date AS TEXT) LIKE $${params.length}
            )`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY r.type, COALESCE(r.last_name, r.name), r.first_name ASC';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single resource by ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(`
            SELECT r.*,
                   COALESCE(
                     (SELECT json_agg(json_build_object('id', rg.id, 'name', rg.name, 'color', rg.color))
                      FROM resource_group_assignments rga
                      JOIN resource_groups rg ON rga.group_id = rg.id
                      WHERE rga.resource_id = r.id),
                     '[]'
                   ) as groups
            FROM resources r
            WHERE r.id = $1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create a new resource (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const {
        name, first_name, last_name, type, notes, color, status, pay_type, work_state,
        email, phone, address_street, address_unit, address_city, address_state, address_zip,
        start_date, group_ids
    } = req.body;

    // For backwards compatibility, accept either name OR first_name/last_name
    const resourceName = name || `${first_name || ''} ${last_name || ''}`.trim();

    if (!resourceName || !type) {
        return res.status(400).json({ error: 'Name (or first_name/last_name) and type are required' });
    }

    const validTypes = ['FACILITY', 'EQUIPMENT', 'STAFF'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }

    const validPayTypes = ['HOURLY', 'GUARANTEE_8', 'GUARANTEE_10'];
    if (pay_type && !validPayTypes.includes(pay_type)) {
        return res.status(400).json({ error: `Pay type must be one of: ${validPayTypes.join(', ')}` });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO resources (
                name, first_name, last_name, type, notes, color, status, pay_type, work_state,
                email, phone, address_street, address_unit, address_city, address_state, address_zip,
                start_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *`,
            [
                resourceName, first_name || null, last_name || null, type, notes || null,
                color || '#3B82F6', status || 'ACTIVE', pay_type || 'HOURLY', work_state || 'CA',
                email || null, phone || null, address_street || null, address_unit || null,
                address_city || null, address_state || null, address_zip || null,
                start_date || null
            ]
        );

        const newResource = rows[0];

        // Handle multi-group assignments
        if (group_ids && Array.isArray(group_ids) && group_ids.length > 0) {
            for (const groupId of group_ids) {
                await db.query(
                    'INSERT INTO resource_group_assignments (resource_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [newResource.id, groupId]
                );
            }
        }

        res.status(201).json(newResource);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update a resource (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const {
        name, first_name, last_name, type, notes, color, status, pay_type, work_state,
        email, phone, address_street, address_unit, address_city, address_state, address_zip,
        start_date, group_ids
    } = req.body;

    try {
        // Check if resource exists
        const existing = await db.query('SELECT * FROM resources WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        // Build dynamic name if first/last provided
        let resourceName = name;
        if (!name && (first_name || last_name)) {
            resourceName = `${first_name || ''} ${last_name || ''}`.trim();
        }

        const { rows } = await db.query(
            `UPDATE resources 
             SET name = COALESCE($1, name),
                 first_name = COALESCE($2, first_name),
                 last_name = COALESCE($3, last_name),
                 type = COALESCE($4, type),
                 notes = COALESCE($5, notes),
                 color = COALESCE($6, color),
                 status = COALESCE($7, status),
                 pay_type = COALESCE($8, pay_type),
                 work_state = COALESCE($9, work_state),
                 email = COALESCE($10, email),
                 phone = COALESCE($11, phone),
                 address_street = COALESCE($12, address_street),
                 address_unit = COALESCE($13, address_unit),
                 address_city = COALESCE($14, address_city),
                 address_state = COALESCE($15, address_state),
                 address_zip = COALESCE($16, address_zip),
                 start_date = COALESCE($17, start_date)
             WHERE id = $18
             RETURNING *`,
            [
                resourceName, first_name, last_name, type, notes, color, status, pay_type, work_state,
                email, phone, address_street, address_unit, address_city, address_state, address_zip,
                start_date, id
            ]
        );

        // Handle multi-group assignments if provided
        if (group_ids !== undefined) {
            console.log(`Updating groups for resource ${id}:`, group_ids);
            // Clear existing assignments
            await db.query('DELETE FROM resource_group_assignments WHERE resource_id = $1', [id]);

            // Add new assignments
            if (Array.isArray(group_ids) && group_ids.length > 0) {
                for (const groupId of group_ids) {
                    await db.query(
                        'INSERT INTO resource_group_assignments (resource_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [id, groupId]
                    );
                }
            }
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE a resource (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM resources WHERE id = $1', [id]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json({ message: 'Resource deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// RESOURCE POSITIONS (Qualifications)
// ============================================

// GET positions a resource is qualified for
router.get('/:id/positions', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await db.query(`
            SELECT rp.id as qualification_id,
                   rp.custom_hourly_rate,
                   p.id as position_id,
                   p.name as position_name,
                   p.abbreviation,
                   p.hourly_rate as default_hourly_rate,
                   pg.id as group_id,
                   pg.name as group_name,
                   pg.color as group_color
            FROM resource_positions rp
            JOIN positions p ON rp.position_id = p.id
            JOIN position_groups pg ON p.position_group_id = pg.id
            WHERE rp.resource_id = $1
            ORDER BY pg.display_order, pg.name, p.name
        `, [id]);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST add position qualification to resource (admin only)
router.post('/:id/positions', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { position_id, custom_hourly_rate } = req.body;

    if (!position_id) {
        return res.status(400).json({ error: 'position_id is required' });
    }

    try {
        // Verify resource exists and is STAFF type
        const resource = await db.query('SELECT * FROM resources WHERE id = $1', [id]);
        if (resource.rows.length === 0) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        if (resource.rows[0].type !== 'STAFF') {
            return res.status(400).json({ error: 'Only STAFF resources can have position qualifications' });
        }

        const { rows } = await db.query(`
            INSERT INTO resource_positions (resource_id, position_id, custom_hourly_rate)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [id, position_id, custom_hourly_rate || null]);

        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Resource already has this position qualification' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid position ID' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update position qualification rate (admin only)
router.put('/:id/positions/:positionId', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id, positionId } = req.params;
    const { custom_hourly_rate } = req.body;

    try {
        const { rows } = await db.query(`
            UPDATE resource_positions
            SET custom_hourly_rate = $1
            WHERE resource_id = $2 AND position_id = $3
            RETURNING *
        `, [custom_hourly_rate, id, positionId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Position qualification not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE remove position qualification from resource (admin only)
router.delete('/:id/positions/:positionId', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { id, positionId } = req.params;

    try {
        const { rowCount } = await db.query(
            'DELETE FROM resource_positions WHERE resource_id = $1 AND position_id = $2',
            [id, positionId]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Position qualification not found' });
        }

        res.json({ message: 'Position qualification removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET resources by position (staff qualified for a specific position)
router.get('/by-position/:positionId', requireAuth, async (req, res) => {
    try {
        const { positionId } = req.params;

        const { rows } = await db.query(`
            SELECT r.*,
                   rp.custom_hourly_rate,
                   p.hourly_rate as default_hourly_rate
            FROM resources r
            JOIN resource_positions rp ON r.id = rp.resource_id
            JOIN positions p ON rp.position_id = p.id
            WHERE rp.position_id = $1 AND r.status = 'ACTIVE'
            ORDER BY r.name
        `, [positionId]);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

