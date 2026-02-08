const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        await pool.query('BEGIN');
        console.log('Reorganizing Engineering category...');

        // 1. Ensure the "Engineering" group exists and is at the bottom (high display_order)
        let { rows: engGroup } = await pool.query('SELECT id FROM position_groups WHERE name = $1', ['Engineering']);
        let engGroupId;

        if (engGroup.length === 0) {
            console.log('Creating Engineering group...');
            const { rows } = await pool.query(
                "INSERT INTO position_groups (name, color, display_order) VALUES ($1, $2, $3) RETURNING id",
                ['Engineering', '#64748b', 99]
            );
            engGroupId = rows[0].id;
        } else {
            engGroupId = engGroup[0].id;
            await pool.query('UPDATE position_groups SET display_order = 99 WHERE id = $1', [engGroupId]);
        }

        // 2. Move "Engineer in Charge" to this group
        await pool.query('UPDATE positions SET position_group_id = $1 WHERE name = $2', [engGroupId, 'Engineer in Charge']);
        console.log('Moved "Engineer in Charge" to Engineering group.');

        await pool.query('COMMIT');
        console.log('Successfully reorganized.');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
