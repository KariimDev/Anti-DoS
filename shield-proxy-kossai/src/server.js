/**
 * Shield-Proxy Server
 * DoS Mitigation System - Port 3000
 */

const express = require('express');
const redisClient = require('./lib/redisClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Connect to Redis on startup
(async () => {
  try {
    await redisClient.connectRedis();
    console.log('[Server] Redis connection established');
  } catch (error) {
    console.error('[Server] Failed to connect to Redis:', error.message);
    console.error('[Server] Shield-proxy will start but rate limiting will not work!');
  }
})();

// Test route for Redis functionality
app.get('/redis-test', async (req, res) => {
  try {
    if (!redisClient.isReady()) {
      return res.status(503).json({
        error: 'Redis not connected',
        message: 'Rate limiting unavailable'
      });
    }

    const testKey = req.query.key || 'test:counter';
    
    const counter = await redisClient.incr(testKey);
    
    if (counter === 1) {
      await redisClient.expire(testKey, 60);
    }
    
    const value = await redisClient.get(testKey);
    
    res.json({
      success: true,
      key: testKey,
      counter: counter,
      value: value,
      message: 'Redis is working correctly!'
    });
    
  } catch (error) {
    console.error('[Redis Test] Error:', error.message);
    res.status(500).json({
      error: 'Redis operation failed',
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'shield-proxy',
    redis: redisClient.isReady() ? 'connected' : 'disconnected'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Shield-proxy listening on port ${PORT}`);
  console.log(`[Server] Test Redis at: http://localhost:${PORT}/redis-test`);
});
