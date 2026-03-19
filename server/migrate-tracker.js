/**
 * Migration tracker — records which migration scripts have been applied.
 * Creates a `schema_migrations` table to track applied migrations.
 *
 * Usage:
 *   node migrate-tracker.js run migrate-v9.js   # run a specific migration if not applied
 *   node migrate-tracker.js status              # list applied migrations
 */

require('dotenv').config();
const db = require('./db');
const path = require('path');

const MIGRATIONS_TABLE = 'schema_migrations';

async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}

async function isApplied(name) {
    const { rows } = await db.query(
        `SELECT id FROM ${MIGRATIONS_TABLE} WHERE name = $1`,
        [name]
    );
    return rows.length > 0;
}

async function markApplied(name) {
    await db.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [name]
    );
}

async function listApplied() {
    const { rows } = await db.query(
        `SELECT name, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY applied_at ASC`
    );
    return rows;
}

async function runMigration(migrationFile) {
    const name = path.basename(migrationFile);
    await ensureTable();

    if (await isApplied(name)) {
        console.log(`✓ Already applied: ${name}`);
        return;
    }

    console.log(`Running migration: ${name}`);
    const migration = require(path.resolve(migrationFile));

    // Support both default export functions and module.exports = async () => {}
    if (typeof migration === 'function') {
        await migration(db);
    } else if (typeof migration.run === 'function') {
        await migration.run(db);
    } else {
        throw new Error(`Migration ${name} must export a function or { run: function }`);
    }

    await markApplied(name);
    console.log(`✓ Applied: ${name}`);
}

async function main() {
    const [, , command, migrationFile] = process.argv;

    try {
        if (command === 'status') {
            await ensureTable();
            const applied = await listApplied();
            if (applied.length === 0) {
                console.log('No migrations applied yet.');
            } else {
                console.log('Applied migrations:');
                applied.forEach(m => console.log(`  ${m.name}  (${m.applied_at})`));
            }
        } else if (command === 'run' && migrationFile) {
            await runMigration(migrationFile);
        } else {
            console.log('Usage:');
            console.log('  node migrate-tracker.js status');
            console.log('  node migrate-tracker.js run <migration-file.js>');
        }
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    } finally {
        await db.pool.end();
    }
}

main();
