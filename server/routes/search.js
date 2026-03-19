const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth: authenticateToken } = require('../middleware/auth');

// Helper function to build search vector for full-text search
const buildSearchVector = (query) => {
    if (!query) return '';
    // Split by spaces, filter empty strings, add :* for prefix matching, join with &
    return query
        .split(/\s+/)
        .filter(term => term.length > 0)
        .map(term => term.replace(/[^\w]/g, '') + ':*')
        .join(' & ');
};

// Quick Search Endpoint (for sidebar dropdown - backward compatible)
router.get('/', authenticateToken, async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.json({ projects: [], workorders: [], resources: [] });
    }

    try {
        const searchTerm = `%${q}%`;

        // 1. Search Projects
        const projectsQuery = `
            SELECT id, title, client_name, status, 'project' as type
            FROM projects
            WHERE title ILIKE $1
            OR client_name ILIKE $1
            OR job_code ILIKE $1
            OR bid_number ILIKE $1
            OR po_number ILIKE $1
            ORDER BY created_at DESC
            LIMIT 5
        `;
        const projects = await pool.query(projectsQuery, [searchTerm]);

        // 2. Search Workorders
        const workordersQuery = `
            SELECT w.id, w.title, w.status, w.workorder_number, p.title as project_title, 'workorder' as type
            FROM workorders w
            JOIN projects p ON w.project_id = p.id
            WHERE w.title ILIKE $1
            OR w.workorder_number ILIKE $1
            OR w.location ILIKE $1
            ORDER BY w.created_at DESC
            LIMIT 5
        `;
        const workorders = await pool.query(workordersQuery, [searchTerm]);

        // 3. Search Resources
        const resourcesQuery = `
            SELECT id, name, type, 'resource' as type
            FROM resources
            WHERE name ILIKE $1
            ORDER BY name ASC
            LIMIT 5
        `;
        const resources = await pool.query(resourcesQuery, [searchTerm]);

        res.json({
            projects: projects.rows,
            workorders: workorders.rows,
            resources: resources.rows
        });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Full Search Endpoint (Detailed - backward compatible)
router.get('/full', authenticateToken, async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.json({ projects: [], workorders: [], resources: [] });
    }

    try {
        const searchTerm = `%${q}%`;

        // 1. Search Projects (All columns)
        const projectsQuery = `
            SELECT *,
                (SELECT COUNT(*) FROM workorders WHERE project_id = projects.id) as workorder_count
            FROM projects
            WHERE title ILIKE $1
            OR client_name ILIKE $1
            OR job_code ILIKE $1
            OR bid_number ILIKE $1
            OR po_number ILIKE $1
            OR description ILIKE $1
            ORDER BY created_at DESC
            LIMIT 50
        `;
        const projects = await pool.query(projectsQuery, [searchTerm]);

        // 2. Search Workorders (All columns + relations)
        const workordersQuery = `
            SELECT w.*,
                p.title as project_title,
                p.client_name,
                p.color as project_color,
                (
                    SELECT COUNT(*)
                    FROM workorder_resources
                    WHERE workorder_id = w.id
                ) as resource_count,
                (
                    SELECT COALESCE(SUM(
                        CASE
                            WHEN wr.cost_type = 'FLAT' THEN wr.flat_rate
                            ELSE (
                                EXTRACT(EPOCH FROM (wr.end_time - wr.start_time)) / 3600 *
                                COALESCE(wr.hourly_rate_override, pos.hourly_rate, 0)
                            )
                        END
                    ), 0)
                    FROM workorder_resources wr
                    LEFT JOIN positions pos ON wr.position_id = pos.id
                    WHERE wr.workorder_id = w.id
                ) as total_cost
            FROM workorders w
            JOIN projects p ON w.project_id = p.id
            WHERE w.title ILIKE $1
            OR w.workorder_number ILIKE $1
            OR w.location ILIKE $1
            OR w.bid_number ILIKE $1
            OR w.po_number ILIKE $1
            OR w.description ILIKE $1
            ORDER BY w.created_at DESC
            LIMIT 50
        `;
        const workorders = await pool.query(workordersQuery, [searchTerm]);

        // 3. Search Resources (All columns)
        const resourcesQuery = `
            SELECT
                r.*,
                ARRAY_AGG(DISTINCT pg.name) FILTER (WHERE pg.name IS NOT NULL) as position_groups,
                ARRAY_AGG(DISTINCT pos.name) FILTER (WHERE pos.name IS NOT NULL) as positions,
                ARRAY_AGG(DISTINCT rg.name) FILTER (WHERE rg.name IS NOT NULL) as resource_groups
            FROM resources r
            LEFT JOIN resource_positions rp ON rp.resource_id = r.id
            LEFT JOIN positions pos ON pos.id = rp.position_id
            LEFT JOIN position_groups pg ON pg.id = pos.position_group_id
            LEFT JOIN resource_group_assignments rga ON rga.resource_id = r.id
            LEFT JOIN resource_groups rg ON rg.id = rga.group_id
            WHERE r.name ILIKE $1
            OR r.email ILIKE $1
            OR r.phone ILIKE $1
            GROUP BY r.id
            ORDER BY r.name ASC
            LIMIT 50
        `;
        const resources = await pool.query(resourcesQuery, [searchTerm]);

        res.json({
            projects: projects.rows,
            workorders: workorders.rows,
            resources: resources.rows
        });
    } catch (err) {
        console.error('Full search error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Advanced Search Endpoint (Full-text search with pagination and filters)
router.get('/advanced', authenticateToken, async (req, res) => {
    const {
        q,
        type = 'all', // 'all' | 'projects' | 'workorders' | 'resources'
        page = 1,
        limit = 25,
        sort = 'relevance', // 'relevance' | 'date_desc' | 'date_asc' | 'name'
        // Project filters
        project_status,
        project_priority,
        department,
        client_name,
        // Workorder filters
        date_from,
        date_to,
        workorder_status,
        location,
        cost_min,
        cost_max,
        // Resource filters
        resource_type,
        resource_status,
        pay_type,
        position_group_id,
    } = req.query;

    if (!q || q.length < 2) {
        return res.json({
            results: { projects: [], workorders: [], resources: [] },
            totals: { projects: 0, workorders: 0, resources: 0 },
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: 0
        });
    }

    try {
        const searchVector = buildSearchVector(q);
        const searchTerm = `%${q}%`;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const results = { projects: [], workorders: [], resources: [] };
        const totals = { projects: 0, workorders: 0, resources: 0 };

        // Search Projects
        if (type === 'all' || type === 'projects') {
            let projectsQuery = `
                SELECT
                    p.*,
                    (SELECT COUNT(*) FROM workorders WHERE project_id = p.id) as workorder_count,
                    (
                        SELECT COALESCE(SUM(
                            (
                                SELECT COALESCE(SUM(
                                    CASE
                                        WHEN wr.cost_type = 'FLAT' THEN wr.flat_rate
                                        ELSE (
                                            EXTRACT(EPOCH FROM (wr.end_time - wr.start_time)) / 3600 *
                                            COALESCE(wr.hourly_rate_override, pos.hourly_rate, 0)
                                        )
                                    END
                                ), 0)
                                FROM workorder_resources wr
                                LEFT JOIN positions pos ON wr.position_id = pos.id
                                WHERE wr.workorder_id = w.id
                            )
                        ), 0)
                        FROM workorders w
                        WHERE w.project_id = p.id
                    ) as total_cost,
                    ts_rank(
                        to_tsvector('english',
                            COALESCE(p.title, '') || ' ' ||
                            COALESCE(p.client_name, '') || ' ' ||
                            COALESCE(p.job_code, '') || ' ' ||
                            COALESCE(p.notes, '')
                        ),
                        to_tsquery('english', $1)
                    ) as relevance
                FROM projects p
                WHERE (
                    to_tsvector('english',
                        COALESCE(p.title, '') || ' ' ||
                        COALESCE(p.client_name, '') || ' ' ||
                        COALESCE(p.job_code, '') || ' ' ||
                        COALESCE(p.notes, '')
                    ) @@ to_tsquery('english', $1)
                    OR p.title ILIKE $2
                    OR p.client_name ILIKE $2
                    OR p.job_code ILIKE $2
                    OR p.bid_number ILIKE $2
                    OR p.po_number ILIKE $2
                )
            `;

            const queryParams = [searchVector, searchTerm];
            let paramIndex = 3;

            // Add filters
            if (project_status) {
                projectsQuery += ` AND p.status = $${paramIndex}`;
                queryParams.push(project_status);
                paramIndex++;
            }

            if (project_priority) {
                projectsQuery += ` AND p.priority = $${paramIndex}`;
                queryParams.push(project_priority);
                paramIndex++;
            }

            if (department) {
                projectsQuery += ` AND p.department ILIKE $${paramIndex}`;
                queryParams.push(`%${department}%`);
                paramIndex++;
            }

            if (client_name) {
                projectsQuery += ` AND p.client_name ILIKE $${paramIndex}`;
                queryParams.push(`%${client_name}%`);
                paramIndex++;
            }

            // Add sorting
            if (sort === 'relevance') {
                projectsQuery += ' ORDER BY relevance DESC, p.created_at DESC';
            } else if (sort === 'date_desc') {
                projectsQuery += ' ORDER BY p.created_at DESC';
            } else if (sort === 'date_asc') {
                projectsQuery += ' ORDER BY p.created_at ASC';
            } else if (sort === 'name') {
                projectsQuery += ' ORDER BY p.title ASC';
            }

            projectsQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            queryParams.push(parseInt(limit), offset);

            const projects = await pool.query(projectsQuery, queryParams);
            results.projects = projects.rows;

            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(*) as total
                FROM projects p
                WHERE (
                    to_tsvector('english',
                        COALESCE(p.title, '') || ' ' ||
                        COALESCE(p.client_name, '') || ' ' ||
                        COALESCE(p.job_code, '') || ' ' ||
                        COALESCE(p.notes, '')
                    ) @@ to_tsquery('english', $1)
                    OR p.title ILIKE $2
                    OR p.client_name ILIKE $2
                    OR p.job_code ILIKE $2
                    OR p.bid_number ILIKE $2
                    OR p.po_number ILIKE $2
                )
            `;
            const countParams = [searchVector, searchTerm];
            let countParamIndex = 3;

            if (project_status) {
                countQuery += ` AND p.status = $${countParamIndex}`;
                countParams.push(project_status);
                countParamIndex++;
            }
            if (project_priority) {
                countQuery += ` AND p.priority = $${countParamIndex}`;
                countParams.push(project_priority);
                countParamIndex++;
            }
            if (department) {
                countQuery += ` AND p.department ILIKE $${countParamIndex}`;
                countParams.push(`%${department}%`);
                countParamIndex++;
            }
            if (client_name) {
                countQuery += ` AND p.client_name ILIKE $${countParamIndex}`;
                countParams.push(`%${client_name}%`);
                countParamIndex++;
            }

            const projectCount = await pool.query(countQuery, countParams);
            totals.projects = parseInt(projectCount.rows[0].total);
        }

        // Search Workorders
        if (type === 'all' || type === 'workorders') {
            let workordersQuery = `
                SELECT
                    w.*,
                    p.title as project_title,
                    p.client_name,
                    p.color as project_color,
                    (
                        SELECT COUNT(*)
                        FROM workorder_resources
                        WHERE workorder_id = w.id
                    ) as resource_count,
                    (
                        SELECT COALESCE(SUM(
                            CASE
                                WHEN wr.cost_type = 'FLAT' THEN wr.flat_rate
                                ELSE (
                                    EXTRACT(EPOCH FROM (wr.end_time - wr.start_time)) / 3600 *
                                    COALESCE(wr.hourly_rate_override, pos.hourly_rate, 0)
                                )
                            END
                        ), 0)
                        FROM workorder_resources wr
                        LEFT JOIN positions pos ON wr.position_id = pos.id
                        WHERE wr.workorder_id = w.id
                    ) as total_cost,
                    ts_rank(
                        to_tsvector('english',
                            COALESCE(w.title, '') || ' ' ||
                            COALESCE(w.description, '') || ' ' ||
                            COALESCE(w.location, '')
                        ),
                        to_tsquery('english', $1)
                    ) as relevance
                FROM workorders w
                JOIN projects p ON w.project_id = p.id
                WHERE (
                    to_tsvector('english',
                        COALESCE(w.title, '') || ' ' ||
                        COALESCE(w.description, '') || ' ' ||
                        COALESCE(w.location, '')
                    ) @@ to_tsquery('english', $1)
                    OR w.title ILIKE $2
                    OR w.workorder_number ILIKE $2
                    OR w.location ILIKE $2
                    OR w.bid_number ILIKE $2
                    OR w.po_number ILIKE $2
                )
            `;

            const queryParams = [searchVector, searchTerm];
            let paramIndex = 3;

            // Add filters
            if (workorder_status) {
                workordersQuery += ` AND w.status = $${paramIndex}`;
                queryParams.push(workorder_status);
                paramIndex++;
            }

            if (date_from) {
                workordersQuery += ` AND w.scheduled_date >= $${paramIndex}`;
                queryParams.push(date_from);
                paramIndex++;
            }

            if (date_to) {
                workordersQuery += ` AND w.scheduled_date <= $${paramIndex}`;
                queryParams.push(date_to);
                paramIndex++;
            }

            if (location) {
                workordersQuery += ` AND w.location ILIKE $${paramIndex}`;
                queryParams.push(`%${location}%`);
                paramIndex++;
            }

            // Note: Cost filtering would require wrapping in a subquery since total_cost is calculated
            // For now, cost filtering is done client-side after results are returned
            // Future enhancement: Add HAVING clause with cost calculation

            // Add sorting
            if (sort === 'relevance') {
                workordersQuery += ' ORDER BY relevance DESC, w.scheduled_date DESC';
            } else if (sort === 'date_desc') {
                workordersQuery += ' ORDER BY w.scheduled_date DESC, w.start_time DESC';
            } else if (sort === 'date_asc') {
                workordersQuery += ' ORDER BY w.scheduled_date ASC, w.start_time ASC';
            } else if (sort === 'name') {
                workordersQuery += ' ORDER BY w.title ASC';
            }

            workordersQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            queryParams.push(parseInt(limit), offset);

            const workorders = await pool.query(workordersQuery, queryParams);
            results.workorders = workorders.rows;

            // Get total count
            let countQuery = `
                SELECT COUNT(*) as total
                FROM workorders w
                JOIN projects p ON w.project_id = p.id
                WHERE (
                    to_tsvector('english',
                        COALESCE(w.title, '') || ' ' ||
                        COALESCE(w.description, '') || ' ' ||
                        COALESCE(w.location, '')
                    ) @@ to_tsquery('english', $1)
                    OR w.title ILIKE $2
                    OR w.workorder_number ILIKE $2
                    OR w.location ILIKE $2
                    OR w.bid_number ILIKE $2
                    OR w.po_number ILIKE $2
                )
            `;
            const countParams = [searchVector, searchTerm];
            let countParamIndex = 3;

            if (workorder_status) {
                countQuery += ` AND w.status = $${countParamIndex}`;
                countParams.push(workorder_status);
                countParamIndex++;
            }
            if (date_from) {
                countQuery += ` AND w.scheduled_date >= $${countParamIndex}`;
                countParams.push(date_from);
                countParamIndex++;
            }
            if (date_to) {
                countQuery += ` AND w.scheduled_date <= $${countParamIndex}`;
                countParams.push(date_to);
                countParamIndex++;
            }
            if (location) {
                countQuery += ` AND w.location ILIKE $${countParamIndex}`;
                countParams.push(`%${location}%`);
                countParamIndex++;
            }

            const workorderCount = await pool.query(countQuery, countParams);
            totals.workorders = parseInt(workorderCount.rows[0].total);
        }

        // Search Resources
        if (type === 'all' || type === 'resources') {
            let resourcesQuery = `
                SELECT
                    r.*,
                    ARRAY_AGG(DISTINCT pg.name) FILTER (WHERE pg.name IS NOT NULL) as position_groups,
                    ARRAY_AGG(DISTINCT pos.name) FILTER (WHERE pos.name IS NOT NULL) as positions,
                    ARRAY_AGG(DISTINCT rg.name) FILTER (WHERE rg.name IS NOT NULL) as resource_groups,
                    ts_rank(
                        to_tsvector('english',
                            COALESCE(r.name, '') || ' ' ||
                            COALESCE(r.email, '')
                        ),
                        to_tsquery('english', $1)
                    ) as relevance
                FROM resources r
                LEFT JOIN resource_positions rp ON rp.resource_id = r.id
                LEFT JOIN positions pos ON pos.id = rp.position_id
                LEFT JOIN position_groups pg ON pg.id = pos.position_group_id
                LEFT JOIN resource_group_assignments rga ON rga.resource_id = r.id
                LEFT JOIN resource_groups rg ON rg.id = rga.group_id
                WHERE (
                    to_tsvector('english',
                        COALESCE(r.name, '') || ' ' ||
                        COALESCE(r.email, '')
                    ) @@ to_tsquery('english', $1)
                    OR r.name ILIKE $2
                    OR r.email ILIKE $2
                    OR r.phone ILIKE $2
                )
            `;

            const queryParams = [searchVector, searchTerm];
            let paramIndex = 3;

            // Add filters
            if (resource_type) {
                resourcesQuery += ` AND r.type = $${paramIndex}`;
                queryParams.push(resource_type);
                paramIndex++;
            }

            if (resource_status) {
                resourcesQuery += ` AND r.status = $${paramIndex}`;
                queryParams.push(resource_status);
                paramIndex++;
            }

            if (pay_type) {
                resourcesQuery += ` AND r.pay_type = $${paramIndex}`;
                queryParams.push(pay_type);
                paramIndex++;
            }

            if (position_group_id) {
                resourcesQuery += ` AND pg.id = $${paramIndex}`;
                queryParams.push(parseInt(position_group_id));
                paramIndex++;
            }

            resourcesQuery += ' GROUP BY r.id';

            // Add sorting
            if (sort === 'relevance') {
                resourcesQuery += ' ORDER BY relevance DESC, r.name ASC';
            } else if (sort === 'name') {
                resourcesQuery += ' ORDER BY r.name ASC';
            } else {
                resourcesQuery += ' ORDER BY r.created_at DESC';
            }

            resourcesQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            queryParams.push(parseInt(limit), offset);

            const resources = await pool.query(resourcesQuery, queryParams);
            results.resources = resources.rows;

            // Get total count
            let countQuery = `
                SELECT COUNT(DISTINCT r.id) as total
                FROM resources r
                LEFT JOIN resource_positions rp ON rp.resource_id = r.id
                LEFT JOIN positions pos ON pos.id = rp.position_id
                LEFT JOIN position_groups pg ON pg.id = pos.position_group_id
                WHERE (
                    to_tsvector('english',
                        COALESCE(r.name, '') || ' ' ||
                        COALESCE(r.email, '')
                    ) @@ to_tsquery('english', $1)
                    OR r.name ILIKE $2
                    OR r.email ILIKE $2
                    OR r.phone ILIKE $2
                )
            `;
            const countParams = [searchVector, searchTerm];
            let countParamIndex = 3;

            if (resource_type) {
                countQuery += ` AND r.type = $${countParamIndex}`;
                countParams.push(resource_type);
                countParamIndex++;
            }
            if (resource_status) {
                countQuery += ` AND r.status = $${countParamIndex}`;
                countParams.push(resource_status);
                countParamIndex++;
            }
            if (pay_type) {
                countQuery += ` AND r.pay_type = $${countParamIndex}`;
                countParams.push(pay_type);
                countParamIndex++;
            }
            if (position_group_id) {
                countQuery += ` AND pg.id = $${countParamIndex}`;
                countParams.push(parseInt(position_group_id));
                countParamIndex++;
            }

            const resourceCount = await pool.query(countQuery, countParams);
            totals.resources = parseInt(resourceCount.rows[0].total);
        }

        // Calculate total pages
        const maxTotal = Math.max(totals.projects, totals.workorders, totals.resources);
        const total_pages = Math.ceil(maxTotal / parseInt(limit));

        res.json({
            results,
            totals,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages
        });
    } catch (err) {
        console.error('Advanced search error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Suggestions Endpoint (for autocomplete)
router.get('/suggestions', authenticateToken, async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.json({
            projects: [],
            workorders: [],
            resources: []
        });
    }

    try {
        const searchTerm = `%${q}%`;

        // Get top 5 from each category
        const projectsQuery = `
            SELECT id, title, client_name, status
            FROM projects
            WHERE title ILIKE $1 OR client_name ILIKE $1 OR job_code ILIKE $1
            ORDER BY created_at DESC
            LIMIT 5
        `;
        const projects = await pool.query(projectsQuery, [searchTerm]);

        const workordersQuery = `
            SELECT w.id, w.title, w.workorder_number, w.status, p.title as project_title
            FROM workorders w
            JOIN projects p ON w.project_id = p.id
            WHERE w.title ILIKE $1 OR w.workorder_number ILIKE $1
            ORDER BY w.created_at DESC
            LIMIT 5
        `;
        const workorders = await pool.query(workordersQuery, [searchTerm]);

        const resourcesQuery = `
            SELECT id, name, type, status
            FROM resources
            WHERE name ILIKE $1 OR email ILIKE $1
            ORDER BY name ASC
            LIMIT 5
        `;
        const resources = await pool.query(resourcesQuery, [searchTerm]);

        res.json({
            projects: projects.rows,
            workorders: workorders.rows,
            resources: resources.rows
        });
    } catch (err) {
        console.error('Suggestions error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
