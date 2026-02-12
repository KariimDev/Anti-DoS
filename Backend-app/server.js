// Backend-app/server.js
require('dotenv').config({ path: '../.env' }); 
const express = require('express');
const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.get('/health', (req, res) => {
    res.send('BACKEND OK');
});

app.get('/heavy', (req, res) => {
    console.log("BACKEND: Received request for /heavy");
    // Simulate a 300ms "database" task
    setTimeout(() => {
        console.log("BACKEND: heavy task executed successfully");
        res.send('HEAVY DONE');
    }, 300);
});

app.listen(PORT, () => {
    console.log(`✅ Backend App is live at http://localhost:${PORT}`);
});