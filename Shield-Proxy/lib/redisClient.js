const redis = require('redis');

let redisClient = null;
const useRedis = process.env.USE_REDIS === 'true';

const initRedis = async () => {
    if (useRedis && !redisClient) {
        redisClient = redis.createClient();
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        await redisClient.connect().catch(console.error);
    }
    return redisClient;
};

const getRedisClient = () => redisClient;

module.exports = { initRedis, getRedisClient };
