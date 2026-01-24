const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'db', 'migration_v2.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration v2...');
        await db.query(migrationSql);
        console.log('Migration v2 complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error running migration:', err);
        process.exit(1);
    }
}

runMigration();
