const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'db', 'migration_v5.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration v5 (Project-Based Work Orders)...');
        await db.query(migrationSql);
        console.log('✅ Migration v5 complete!');

        console.log('\nChanges applied:');
        console.log('  ✅ Created project_resources junction table');
        console.log('  ✅ Added EXCLUDE constraint for resource double-booking prevention');
        console.log('  ✅ Renamed work_orders → projects');
        console.log('  ✅ Migrated existing data to project_resources');
        console.log('  ✅ Removed resource_id from projects table');
        console.log('\n⚠️  Projects can now have multiple resources!');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error running migration:', err);
        process.exit(1);
    }
}

runMigration();
