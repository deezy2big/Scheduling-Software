/**
 * Run Migration v8: Add Job Code to Projects
 * 
 * Run: node migrate-v8.js
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
        console.log('Starting migration v8 (Add Job Code)...\n');

        // Read and execute the SQL file
        const sqlPath = path.join(__dirname, 'db', 'migration_v8.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);

        console.log('✅ Migration v8 completed successfully!\n');

        // Verify changes
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'job_code'
        `);

        if (res.rows.length > 0) {
            console.log('Verified: job_code column exists in projects table.');
        } else {
            console.error('❌ Verification failed: job_code column NOT found.');
        }

    } catch (err) {
        // If error is "column already exists", that's fine
        if (err.message.includes('already exists')) {
            console.log('Migration notice: job_code column already exists. Skipping.');
        } else {
            console.error('\n❌ Migration failed:', err.message);
            console.error(err);
            process.exit(1);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
