const axios = require('axios');
const { spawn } = require('child_process');

// Start the server
const server = spawn('node', ['index.js'], { cwd: process.cwd(), stdio: 'inherit' });

const API = 'http://localhost:3001/api';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runTests() {
    console.log('Waiting for server to start...');
    await sleep(3000); // Give server time to boot

    try {
        // 1. Health Check
        console.log('Test 1: Health Check');
        await axios.get('http://localhost:3001/health');
        console.log('✅ Server is up');

        // 2. Fetch Resources (Database Check)
        console.log('Test 2: Fetch Resources');
        const resResources = await axios.get(`${API}/resources`);
        if (resResources.data.length > 0) {
            console.log(`✅ Fetched ${resResources.data.length} resources`);
        } else {
            throw new Error('No resources found (Seed failed?)');
        }

        const testResourceId = resResources.data[0].id;

        // 3. Create Valid Booking
        console.log('Test 3: Create Valid Booking (10:00 - 12:00)');
        const start1 = new Date();
        start1.setHours(10, 0, 0, 0);
        const end1 = new Date(start1);
        end1.setHours(12, 0, 0, 0);

        const booking1 = await axios.post(`${API}/bookings`, {
            resource_id: testResourceId,
            start_time: start1.toISOString(),
            end_time: end1.toISOString(),
        });
        console.log('✅ Booking created:', booking1.data.id);

        // 4. Attempt Overlapping Booking (11:00 - 13:00) -> Should Fail
        console.log('Test 4: Attempt Overlapping Booking (11:00 - 13:00)');
        const start2 = new Date(start1);
        start2.setHours(11, 0, 0, 0);
        const end2 = new Date(start1);
        end2.setHours(13, 0, 0, 0);

        try {
            await axios.post(`${API}/bookings`, {
                resource_id: testResourceId,
                start_time: start2.toISOString(),
                end_time: end2.toISOString(),
            });
            console.error('❌ Error: Overlapping booking was ALLOWED!');
            process.exit(1);
        } catch (err) {
            if (err.response && err.response.status === 409) {
                console.log('✅ Overlapping booking correctly REJECTED (409 Conflict)');
            } else {
                console.error('❌ Unexpected error:', err.message);
                process.exit(1);
            }
        }

        console.log('\nALL TESTS PASSED 🎉');

    } catch (err) {
        console.error('Test Failed:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    } finally {
        server.kill();
    }
}

runTests();
