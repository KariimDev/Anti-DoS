// Shield-Proxy/index.js
require('dotenv').config({ path: '../.env' });
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { dosMitigator, clearJail, updateConfig, CONFIG } = require('./middleware/dosMitigator');
const { initRedis } = require('./lib/redisClient');
const cors = require('cors');
const path = require('path');

initRedis();

const http = require('http');
const socketIo = require('socket.io');

const app = express();

// 1. Serve Dashboard Files
app.use('/sentinel', express.static(path.join(__dirname, '../dashboard')));

// 2. Admin Auth Middleware
const ADMIN_KEY = process.env.ADMIN_KEY || 'SENTINEL-ROOT';
const authMiddleware = (req, res, next) => {
    const key = req.headers['x-sentinel-auth'];
    if (key === ADMIN_KEY) return next();
    res.status(401).json({ status: 'error', message: 'UNAUTHORIZED ACCESS BLOCKED' });
};
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Priority: port in .env, then 8080 (matching attacker script), then 3000
const SHIELD_PORT = process.env.SHIELD_PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

// Global io instance for middleware
global.io = io;

io.on('connection', (socket) => {
    console.log('📊 Dashboard connected');
});

console.log(`🛡️ Sentinel Shield starting...`);
console.log(`Forwarding requests from :${SHIELD_PORT} to ${BACKEND_URL}`);

// App-level middleware
app.use(cors());
app.use(express.json());

// Administrative: Config Endpoints
app.get('/api/config', authMiddleware, (req, res) => {
    res.json(CONFIG);
});

app.post('/api/config', authMiddleware, (req, res) => {
    updateConfig(req.body);
    io.emit('config-updated', CONFIG);
    res.json({ status: "success", config: CONFIG });
});

// Administrative: Unjail Endpoint
app.post('/api/unjail', authMiddleware, async (req, res) => {
    const { fingerprint } = req.body;
    if (!fingerprint) return res.status(400).send("Fingerprint required");

    await clearJail(fingerprint);
    res.json({ status: "success", message: `Subject freed successfully.` });
});

// Apply DoS Mitigation Middleware
app.use(dosMitigator);

// Proxy configuration
app.use('/', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // console.log(`[PROXY] Forwarding: ${req.method} ${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`[PROXY] Backend returned: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error(`[PROXY] Error reaching backend: ${err.message}`);
        res.status(502).send('Gateway Error: Backend is unreachable.');
    }
}));

server.listen(SHIELD_PORT, () => {
    console.log(`✅ Sentinel Shield is active at http://localhost:${SHIELD_PORT}`);
});
