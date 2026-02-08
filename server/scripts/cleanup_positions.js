const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        await pool.query('BEGIN');
        console.log('Starting Cleanup...');

        const mergeTargets = [
            { oldName: 'A1', newName: 'Audio 1' },
            { oldName: 'A2', newName: 'Audio 2' },
            { oldName: 'TD', newName: 'Technical Director' }
        ];

        for (const target of mergeTargets) {
            const { rows: oldRows } = await pool.query('SELECT id FROM positions WHERE name = $1', [target.oldName]);
            const { rows: newRows } = await pool.query('SELECT id FROM positions WHERE name = $1', [target.newName]);

            if (oldRows.length > 0 && newRows.length > 0) {
                console.log(`Merging ${target.oldName} into ${target.newName}...`);

                // Manual merge because ON CONFLICT isn't working as expected or supported in this context
                const { rows: oldQuals } = await pool.query('SELECT resource_id, custom_hourly_rate FROM resource_positions WHERE position_id = $1', [oldRows[0].id]);

                for (const qual of oldQuals) {
                    await pool.query(`
                INSERT INTO resource_positions (resource_id, position_id, custom_hourly_rate)
                VALUES ($1, $2, $3)
                ON CONFLICT (resource_id, position_id) DO NOTHING
            `, [qual.resource_id, newRows[0].id, qual.custom_hourly_rate]);
                }

                await pool.query('DELETE FROM resource_positions WHERE position_id = $1', [oldRows[0].id]);
                await pool.query('DELETE FROM positions WHERE id = $1', [oldRows[0].id]);
            } else if (oldRows.length > 0) {
                console.log(`Renaming ${target.oldName} to ${target.newName}...`);
                await pool.query('UPDATE positions SET name = $1 WHERE name = $2', [target.newName, target.oldName]);
            }
        }

        const keep = [
            'Audio 1', 'Audio 2', 'Technical Director',
            'Engineer in Charge', 'V1', 'V2',
            'Tape Lead', 'Tape RO',
            'Font Coordinator', 'Xpression', 'Bug', 'All In One',
            'Jib Op', 'Hard Camera'
        ];

        const placeholders = keep.map((_, i) => '$' + (i + 1)).join(',');
        await pool.query(`DELETE FROM positions WHERE name NOT IN (${placeholders})`, keep);
        await pool.query(`DELETE FROM position_groups WHERE id NOT IN (SELECT DISTINCT position_group_id FROM positions)`);

        await pool.query('COMMIT');
        console.log('Done.');

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
