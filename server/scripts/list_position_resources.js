const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        const res = await pool.query(`
      SELECT p.name AS position_name, r.name AS resource_name
      FROM positions p
      JOIN resource_positions rp ON p.id = rp.position_id
      JOIN resources r ON rp.resource_id = r.id
      ORDER BY p.name, r.name;
    `);

        const grouped = res.rows.reduce((acc, row) => {
            if (!acc[row.position_name]) {
                acc[row.position_name] = [];
            }
            acc[row.position_name].push(row.resource_name);
            return acc;
        }, {});

        console.log(JSON.stringify(grouped, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
