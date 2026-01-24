const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * Labor Laws Routes
 * Manages state-specific overtime calculation rules
 */

// GET /api/laborlaws - List all labor law configurations
router.get('/', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, state_code, state_name,
                daily_ot_threshold, daily_ot_multiplier,
                daily_dt_threshold, daily_dt_multiplier,
                weekly_ot_threshold, weekly_ot_multiplier,
                seventh_day_rules, seventh_day_ot_multiplier, seventh_day_dt_threshold,
                notes
            FROM labor_laws
            ORDER BY state_name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching labor laws:', error);
        res.status(500).json({ error: 'Failed to fetch labor laws' });
    }
});

// GET /api/laborlaws/:stateCode - Get specific state's labor law
router.get('/:stateCode', requireAuth, async (req, res) => {
    try {
        const { stateCode } = req.params;

        const result = await pool.query(`
            SELECT 
                id, state_code, state_name,
                daily_ot_threshold, daily_ot_multiplier,
                daily_dt_threshold, daily_dt_multiplier,
                weekly_ot_threshold, weekly_ot_multiplier,
                seventh_day_rules, seventh_day_ot_multiplier, seventh_day_dt_threshold,
                notes
            FROM labor_laws
            WHERE state_code = $1
        `, [stateCode.toUpperCase()]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Labor law not found for this state' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching labor law:', error);
        res.status(500).json({ error: 'Failed to fetch labor law' });
    }
});

// POST /api/laborlaws - Create new labor law (Admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
        const {
            state_code,
            state_name,
            daily_ot_threshold,
            daily_ot_multiplier,
            daily_dt_threshold,
            daily_dt_multiplier,
            weekly_ot_threshold,
            weekly_ot_multiplier,
            seventh_day_rules,
            seventh_day_ot_multiplier,
            seventh_day_dt_threshold,
            notes
        } = req.body;

        const result = await pool.query(`
            INSERT INTO labor_laws (
                state_code, state_name,
                daily_ot_threshold, daily_ot_multiplier,
                daily_dt_threshold, daily_dt_multiplier,
                weekly_ot_threshold, weekly_ot_multiplier,
                seventh_day_rules, seventh_day_ot_multiplier, seventh_day_dt_threshold,
                notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            state_code.toUpperCase(), state_name,
            daily_ot_threshold, daily_ot_multiplier,
            daily_dt_threshold, daily_dt_multiplier,
            weekly_ot_threshold, weekly_ot_multiplier,
            seventh_day_rules || false, seventh_day_ot_multiplier, seventh_day_dt_threshold,
            notes
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating labor law:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Labor law for this state already exists' });
        }
        res.status(500).json({ error: 'Failed to create labor law' });
    }
});

// PUT /api/laborlaws/:stateCode - Update labor law (Admin only)
router.put('/:stateCode', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
        const { stateCode } = req.params;
        const {
            state_name,
            daily_ot_threshold,
            daily_ot_multiplier,
            daily_dt_threshold,
            daily_dt_multiplier,
            weekly_ot_threshold,
            weekly_ot_multiplier,
            seventh_day_rules,
            seventh_day_ot_multiplier,
            seventh_day_dt_threshold,
            notes
        } = req.body;

        const result = await pool.query(`
            UPDATE labor_laws SET
                state_name = COALESCE($1, state_name),
                daily_ot_threshold = $2,
                daily_ot_multiplier = $3,
                daily_dt_threshold = $4,
                daily_dt_multiplier = $5,
                weekly_ot_threshold = $6,
                weekly_ot_multiplier = $7,
                seventh_day_rules = COALESCE($8, seventh_day_rules),
                seventh_day_ot_multiplier = $9,
                seventh_day_dt_threshold = $10,
                notes = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE state_code = $12
            RETURNING *
        `, [
            state_name,
            daily_ot_threshold, daily_ot_multiplier,
            daily_dt_threshold, daily_dt_multiplier,
            weekly_ot_threshold, weekly_ot_multiplier,
            seventh_day_rules, seventh_day_ot_multiplier, seventh_day_dt_threshold,
            notes,
            stateCode.toUpperCase()
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Labor law not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating labor law:', error);
        res.status(500).json({ error: 'Failed to update labor law' });
    }
});

/**
 * Calculate cost with overtime based on labor laws
 * This is a utility function that can be used by other routes
 */
function calculateCostWithOvertime(hoursWorked, hourlyRate, laborLaw, payType = 'HOURLY') {
    // Apply guarantee minimum first
    let billableHours = hoursWorked;
    if (payType === 'GUARANTEE_8') {
        billableHours = Math.max(hoursWorked, 8);
    } else if (payType === 'GUARANTEE_10') {
        billableHours = Math.max(hoursWorked, 10);
    }

    // If no labor law or no daily OT rules, just straight time
    if (!laborLaw || !laborLaw.daily_ot_threshold) {
        return {
            regular_hours: billableHours,
            ot_hours: 0,
            dt_hours: 0,
            regular_pay: billableHours * hourlyRate,
            ot_pay: 0,
            dt_pay: 0,
            total_pay: billableHours * hourlyRate
        };
    }

    const otThreshold = parseFloat(laborLaw.daily_ot_threshold);
    const otMultiplier = parseFloat(laborLaw.daily_ot_multiplier) || 1.5;
    const dtThreshold = laborLaw.daily_dt_threshold ? parseFloat(laborLaw.daily_dt_threshold) : null;
    const dtMultiplier = laborLaw.daily_dt_multiplier ? parseFloat(laborLaw.daily_dt_multiplier) : 2.0;

    let regularHours = 0;
    let otHours = 0;
    let dtHours = 0;

    if (dtThreshold && billableHours > dtThreshold) {
        // Has double time
        regularHours = otThreshold;
        otHours = dtThreshold - otThreshold;
        dtHours = billableHours - dtThreshold;
    } else if (billableHours > otThreshold) {
        // Only overtime, no double time
        regularHours = otThreshold;
        otHours = billableHours - otThreshold;
        dtHours = 0;
    } else {
        // No overtime
        regularHours = billableHours;
        otHours = 0;
        dtHours = 0;
    }

    const regularPay = regularHours * hourlyRate;
    const otPay = otHours * hourlyRate * otMultiplier;
    const dtPay = dtHours * hourlyRate * dtMultiplier;

    return {
        regular_hours: regularHours,
        ot_hours: otHours,
        dt_hours: dtHours,
        regular_pay: regularPay,
        ot_pay: otPay,
        dt_pay: dtPay,
        total_pay: regularPay + otPay + dtPay,
        ot_multiplier: otMultiplier,
        dt_multiplier: dtMultiplier
    };
}

// POST /api/laborlaws/calculate - Calculate cost with overtime (utility endpoint)
router.post('/calculate', requireAuth, async (req, res) => {
    try {
        const { hours_worked, hourly_rate, state_code, pay_type } = req.body;

        if (!hours_worked || !hourly_rate) {
            return res.status(400).json({ error: 'hours_worked and hourly_rate are required' });
        }

        // Get labor law for the state
        let laborLaw = null;
        if (state_code) {
            const lawResult = await pool.query(
                'SELECT * FROM labor_laws WHERE state_code = $1',
                [state_code.toUpperCase()]
            );
            if (lawResult.rows.length > 0) {
                laborLaw = lawResult.rows[0];
            }
        }

        const result = calculateCostWithOvertime(
            parseFloat(hours_worked),
            parseFloat(hourly_rate),
            laborLaw,
            pay_type || 'HOURLY'
        );

        res.json({
            ...result,
            state_code: state_code || 'N/A',
            pay_type: pay_type || 'HOURLY',
            hours_worked: parseFloat(hours_worked),
            hourly_rate: parseFloat(hourly_rate)
        });
    } catch (error) {
        console.error('Error calculating cost:', error);
        res.status(500).json({ error: 'Failed to calculate cost' });
    }
});

// Export the calculation function for use in other routes
router.calculateCostWithOvertime = calculateCostWithOvertime;

module.exports = router;
