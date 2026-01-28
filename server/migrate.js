const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'db', 'migration_v11.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration v11...');
        await db.query(sql);
        console.log('Migration v11 completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
