const fs = require('fs');
const path = require('path');
const db = require('./db');

async function setup() {
    try {
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema...');
        await db.query(schemaSql);
        console.log('Schema applied.');

        console.log('Running seed...');
        require('./seed');
    } catch (err) {
        console.error('Error setting up DB:', err);
        process.exit(1);
    }
}

setup();
