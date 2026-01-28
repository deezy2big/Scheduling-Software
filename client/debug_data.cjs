const http = require('http');
// Actually, I can't easily rely on node-fetch being installed. 
// I'll use a simple node http script or curl.



function get(path) {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:3001/api' + path, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log("Fetching Positions...");
        const positions = await get('/positions');
        if (positions.length > 0) {
            console.log("First Position Schema:", JSON.stringify(positions[0], null, 2));
            console.log("Sample Position with group_id:", JSON.stringify(positions.find(p => p.group_id), null, 2));
        } else {
            console.log("No positions found.");
        }

        console.log("\nFetching Resources...");
        const resources = await get('/resources');
        if (resources.length > 0) {
            console.log("First Resource Schema:", JSON.stringify(resources[0], null, 2));
            // Check for potential group keys
            const r = resources[0];
            const keys = Object.keys(r).filter(k => k.includes('group'));
            console.log("Resource keys containing 'group':", keys);
        } else {
            console.log("No resources found.");
        }

    } catch (e) {
        console.error(e);
    }
}

run();
