const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = 'http://localhost:8888';

function startAttack(mode, rps) {
    const endpoint = mode === 'api' ? '/api/data' : '/heavy';
    const targetUrl = `${BASE_URL}${endpoint}`;

    console.log(`
      🚀 CYBER-ATTACK SEQUENCE INITIATED
      ---------------------------------
      TARGET   : ${targetUrl}
      MODE     : ${mode.toUpperCase()}
      RATE     : ${rps} requests/sec
      ---------------------------------
      Press Ctrl+C to abort...
    `);

    setInterval(async () => {
        try {
            const response = await axios.get(targetUrl);
            console.log(`✅ [ALLOWED] Mode: ${mode.toUpperCase()} | Status: ${response.status} | Payload: ${JSON.stringify(response.data).substring(0, 50)}...`);
        } catch (error) {
            if (error.response) {
                console.log(`❌ [BLOCKED] Mode: ${mode.toUpperCase()} | Status: ${error.response.status} | Msg: ${error.response.data.substring(0, 80)}`);
            } else {
                console.log(`🚨 [OFFLINE] Cannot reach the Shield on port 8081. Verify Proxy is running.`);
            }
        }
    }, 1000 / rps);
}

// Interactive prompt
console.log("🛠️  SENTINEL SHIELD ATTACK SIMULATOR");
rl.question('Select Target Mode (1: HTML/Heavy, 2: API): ', (choice) => {
    const mode = (choice === '2') ? 'api' : 'html';

    rl.question('Enter Intensity (Requests per second, default 10): ', (rpsInput) => {
        const rps = Number(rpsInput) || 10;

        console.log(`\nConfiguring ${mode.toUpperCase()} attack at ${rps} RPS...`);
        rl.close();

        startAttack(mode, rps);
    });
});