const db = require('./db');

const resources = [
    { name: 'Edit Bay A', type: 'FACILITY' },
    { name: 'Sound Stage 1', type: 'FACILITY' },
    { name: 'Red Camera Kit 1', type: 'EQUIPMENT' },
    { name: 'Lighting Grid B', type: 'EQUIPMENT' },
    { name: 'John Doe (Editor)', type: 'STAFF' },
    { name: 'Jane Smith (Colorist)', type: 'STAFF' },
];

async function seed() {
    try {
        console.log('Seeding resources...');
        for (const r of resources) {
            await db.query(
                'INSERT INTO resources (name, type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [r.name, r.type]
            );
        }
        console.log('Seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding:', err);
        process.exit(1);
    }
}

seed();
