/**
 * Run Migration v9: Add Username to Users
 *
 * Run: node migrate-v9.js
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
        const sql = fs.readFileSync(path.join(__dirname, 'db', 'migration_v9_username.sql'), 'utf8');

        console.log('Running migration v9: Add username to users...');
        await client.query(sql);
        console.log('Migration v9 completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
