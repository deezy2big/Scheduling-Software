/**
 * Run Migration v7: Pay Types and Labor Laws
 * 
 * Run: node migrate-v7.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'rms_pro',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('Starting migration v7 (Pay Types and Labor Laws)...\n');

        // Read and execute the SQL file
        const sqlPath = path.join(__dirname, 'db', 'migration_v7.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);

        console.log('✅ Migration v7 completed successfully!\n');

        // Verify the changes
        console.log('Verifying changes:');

        // Check labor_laws table
        const lawsResult = await client.query('SELECT state_code, state_name, daily_ot_threshold, daily_dt_threshold FROM labor_laws ORDER BY state_code');
        console.log('\nLabor Laws:');
        lawsResult.rows.forEach(row => {
            console.log(`  ${row.state_code}: ${row.state_name} (OT after ${row.daily_ot_threshold || 'N/A'}hrs, DT after ${row.daily_dt_threshold || 'N/A'}hrs)`);
        });

        // Check resources columns
        const columnsResult = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'resources' AND column_name IN ('pay_type', 'work_state')
            ORDER BY column_name
        `);
        console.log('\nResources columns added:');
        columnsResult.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
        });

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
