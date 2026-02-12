// Shield-Proxy/index.js
require('dotenv').config({ path: '../.env' });
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dosMitigator = require('./middleware/dosMitigator');
const { initRedis } = require('./lib/redisClient');

initRedis();

const http = require('http');
const socketIo = require('socket.io');

const app = express();
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
app.use(express.json());

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
