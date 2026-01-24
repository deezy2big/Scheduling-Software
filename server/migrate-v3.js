const fs = require('fs');
const path = require('path');
const db = require('./db');
const { hashPassword } = require('./utils/password');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'db', 'migration_v3.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration v3...');
        await db.query(migrationSql);
        console.log('Migration v3 complete.');

        // Create initial admin user
        console.log('\nCreating initial admin user...');
        const adminEmail = 'admin@rms.local';
        const adminPassword = 'admin123'; // Change this in production!
        const adminPasswordHash = await hashPassword(adminPassword);

        try {
            const { rows } = await db.query(
                `INSERT INTO users (email, password_hash, full_name, role) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, full_name, role`,
                [adminEmail, adminPasswordHash, 'System Administrator', 'ADMIN']
            );

            if (rows.length > 0) {
                console.log('✅ Admin user created successfully!');
                console.log(`   Email: ${adminEmail}`);
                console.log(`   Password: ${adminPassword}`);
                console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
            } else {
                console.log('ℹ️  Admin user already exists.');
            }
        } catch (userErr) {
            console.error('Error creating admin user:', userErr);
        }

        // Create default resource groups
        console.log('\nCreating default resource groups...');
        const defaultGroups = [
            { name: 'Edit Suites', description: 'Video editing facilities' },
            { name: 'Production Spaces', description: 'Sound stages and studios' },
            { name: 'Camera Equipment', description: 'Cameras and related gear' },
            { name: 'Audio Equipment', description: 'Microphones, mixers, etc.' },
            { name: 'Post-Production Staff', description: 'Editors, colorists, etc.' },
        ];

        for (const group of defaultGroups) {
            try {
                await db.query(
                    'INSERT INTO resource_groups (name, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [group.name, group.description]
                );
                console.log(`   ✅ Created group: ${group.name}`);
            } catch (groupErr) {
                // Ignore duplicates
            }
        }

        console.log('\n✅ Migration and setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error running migration:', err);
        process.exit(1);
    }
}

runMigration();
