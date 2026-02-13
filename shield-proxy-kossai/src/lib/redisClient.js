/**
 * Redis Client Module for Shield-Proxy
 * Person B - Redis Engineer
 */

const redis = require('redis');

let client = null;
let isConnected = false;

async function connectRedis() {
  if (client && isConnected) {
    console.log('[Redis] Using existing connection');
    return client;
  }

  try {
    client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[Redis] Too many reconnect attempts, giving up');
            return new Error('Redis reconnect failed');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`[Redis] Reconnecting in ${delay}ms...`);
          return delay;
        }
      }
    });

    client.on('error', (err) => {
      console.error('[Redis] Client Error:', err.message);
      isConnected = false;
    });

    client.on('ready', () => {
      console.log('[Redis] Connected and ready');
      isConnected = true;
    });

    await client.connect();
    return client;

  } catch (error) {
    console.error('[Redis] Connection failed:', error.message);
    throw error;
  }
}

async function incr(key) {
  if (!client || !isConnected) {
    throw new Error('[Redis] Client not connected');
  }
  try {
    return await client.incr(key);
  } catch (error) {
    console.error(`[Redis] INCR failed for key "${key}":`, error.message);
    throw error;
  }
}

async function expire(key, seconds) {
  if (!client || !isConnected) {
    throw new Error('[Redis] Client not connected');
  }
  try {
    const result = await client.expire(key, seconds);
    return result === 1;
  } catch (error) {
    console.error(`[Redis] EXPIRE failed for key "${key}":`, error.message);
    throw error;
  }
}

async function get(key) {
  if (!client || !isConnected) {
    throw new Error('[Redis] Client not connected');
  }
  try {
    return await client.get(key);
  } catch (error) {
    console.error(`[Redis] GET failed for key "${key}":`, error.message);
    throw error;
  }
}

function isReady() {
  return isConnected;
}

module.exports = {
  connectRedis,
  incr,
  expire,
  get,
  isReady
};
