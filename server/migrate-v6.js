/**
 * Migration v6: Project-Workorder Architecture
 * 
 * Run this script to apply the v6 migration:
 * node migrate-v6.js
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
        console.log('Starting migration v6: Project-Workorder Architecture...\n');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'db', 'migration_v6.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await client.query('BEGIN');

        // Execute the entire migration as one transaction
        await client.query(migrationSQL);

        await client.query('COMMIT');

        console.log('✅ Migration v6 completed successfully!\n');

        // Show summary of new tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('Current tables:');
        tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

        // Show position groups
        const groups = await client.query('SELECT * FROM position_groups ORDER BY display_order');
        console.log('\nPosition Groups:');
        groups.rows.forEach(row => console.log(`  - ${row.name} (${row.color})`));

        // Show positions count
        const positions = await client.query('SELECT COUNT(*) as count FROM positions');
        console.log(`\nPositions created: ${positions.rows[0].count}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', err.message);
        console.error('Detail:', err.detail || 'N/A');
        console.error('Hint:', err.hint || 'N/A');
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
