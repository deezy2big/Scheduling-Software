const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'db', 'migration_v12.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration v12...');
        await db.query(sql);
        console.log('Migration v12 completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
