const axios = require('axios');

// 1. TARGET: We attack the "Bouncer" (Sentinel Shield) on port 8080.
// We do NOT attack the actual site on 3000 directly.
const TARGET_URL = 'http://localhost:8081/heavy';

// 2. SPEED: How many requests per second? 
// Start with 1 to test. Change to 20 or 50 to "Attack".
const REQUESTS_PER_SECOND = 10;

async function sendAttack() {
    try {
        const response = await axios.get(TARGET_URL);
        // If the bouncer lets us through, it prints this:
        console.log(`✅ [ALLOWED] Status: ${response.status} - The site says: "${response.data}"`);
    } catch (error) {
        if (error.response) {
            // If the bouncer BLOCKS us, it sends a 429 error.
            console.log(`❌ [BLOCKED] Status: ${error.response.status} - Message: ${error.response.data}`);
        } else {
            // If the Bouncer server isn't even turned on yet.
            console.log(`🚨 [OFFLINE] Cannot reach the Bouncer. Is it running on port 8080?`);
        }
    }
}

// This starts the loop
console.log(`🚀 Starting attack on ${TARGET_URL}...`);
console.log(`Press Ctrl+C to stop the attack.`);

setInterval(sendAttack, 1000 / REQUESTS_PER_SECOND);