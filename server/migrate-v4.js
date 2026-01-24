const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'db', 'migration_v4.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration v4 (Permissions & Logging)...');
        await db.query(migrationSql);
        console.log('✅ Migration v4 complete!');

        // Log successful migration
        console.log('\nChanges applied:');
        console.log('  ✅ Added last_login_at and is_active to users table');
        console.log('  ✅ Created permissions table');
        console.log('  ✅ Created activity_logs table');
        console.log('  ✅ Granted permissions to existing users');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error running migration:', err);
        process.exit(1);
    }
}

runMigration();
