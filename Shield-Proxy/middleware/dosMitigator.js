const { getRedisClient } = require("../lib/redisClient");
const UAParser = require('ua-parser-js');
const crypto = require('crypto');

// This Lua code runs INSIDE Redis (so it's atomic / race-safe)
const LUA_TOKEN_BUCKET = `
local key = KEYS[1]

local now_ms       = tonumber(ARGV[1])
local capacity     = tonumber(ARGV[2])
local refill_rate  = tonumber(ARGV[3])  -- tokens per second
local ttl_seconds  = tonumber(ARGV[4])

-- Read saved state
local tokens = redis.call("HGET", key, "tokens")
local last   = redis.call("HGET", key, "last")

if tokens == false then tokens = capacity else tokens = tonumber(tokens) end
if last   == false then last = now_ms   else last   = tonumber(last)   end

-- Refill tokens based on time passed
local delta_ms = now_ms - last
if delta_ms < 0 then delta_ms = 0 end

local refill = (delta_ms / 1000.0) * refill_rate
tokens = tokens + refill
if tokens > capacity then tokens = capacity end

-- Spend 1 token if possible
local allowed = 0
local retry_after = 0

if tokens >= 1.0 then
  allowed = 1
  tokens = tokens - 1.0
else
  allowed = 0
  retry_after = math.ceil((1.0 - tokens) / refill_rate)
  if retry_after < 1 then retry_after = 1 end
end

-- Save updated state (+ TTL so idle users clean up)
redis.call("HSET", key, "tokens", tokens, "last", now_ms)
redis.call("EXPIRE", key, ttl_seconds)

return { allowed, tokens, retry_after }
`;

const CAPACITY = Number(process.env.RL_CAPACITY || 20);        // burst
const REFILL_RATE = Number(process.env.RL_REFILL_RATE || 5);  // per second
const TTL_SECONDS = Number(process.env.RL_TTL_SECONDS || 600);

// In-memory fallback for demo if Redis is disabled
const memoryBuckets = new Map();

module.exports = async function dosMitigator(req, res, next) {
    // 1. Skip mitigation for internal socket.io requests
    if (req.path.startsWith('/socket.io/')) {
        return next();
    }

    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'] || 'unknown';

    // 2. Generate Fingerprint (Person C substitute)
    const fingerprint = crypto.createHash('md5').update(`${ip}-${ua}`).digest('hex');
    req.fingerprint = fingerprint;

    // 2. Advanced Differentiation: Different limits for API calls
    let dynamicCapacity = CAPACITY;
    let dynamicRefill = REFILL_RATE;
    let requestType = "Standard";

    if (req.path.startsWith('/api/')) {
        dynamicCapacity = 5; // Stricter burst for API
        dynamicRefill = 1;   // Stricter refill for API
        requestType = "API";
    }

    const redisKey = `bucket:${requestType}:${fingerprint}`;
    const jailKey = `jail:${fingerprint}`;
    const permanentKey = `permanent:${fingerprint}`;
    const violationKey = `violations:${fingerprint}`;
    const nowMs = Date.now();

    try {
        const client = getRedisClient();
        let allowed = false;
        let retryAfter = 0;
        let currentTokens = 0;
        let isJailed = false;
        let isPermanent = false;

        // 1. Check for Permanent or Temporary Jail
        if (client && process.env.USE_REDIS === 'true') {
            const [perm, jail] = await Promise.all([
                client.get(permanentKey),
                client.get(jailKey)
            ]);
            if (perm) isPermanent = true;
            if (jail) isJailed = true;
        } else {
            if (memoryBuckets.get(permanentKey)) isPermanent = true;
            if (memoryBuckets.get(jailKey)) {
                if (Date.now() < memoryBuckets.get(jailKey)) isJailed = true;
            }
        }

        if (isPermanent) {
            console.log(`🚫 [PERMANENT BAN] ${ip}`);
            if (global.io) global.io.emit('ip-banned', { ip, ua, count: 'PERMANENT', bannedUntil: 'FOREVER' });
            return res.status(403).send('Your access has been permanently revoked due to repeated violations.');
        }

        if (isJailed) {
            console.log(`⚖️ [JAILED] ${ip}`);
            if (global.io) global.io.emit('ip-banned', { ip, ua, count: 'JAILED (1 HR)', bannedUntil: Date.now() + 3600000 });
            return res.status(403).send('Your IP is in jail for 1 hour due to excessive violations.');
        }

        // 2. Token Bucket Evaluation
        if (client && process.env.USE_REDIS === 'true') {
            const result = await client.eval(LUA_TOKEN_BUCKET, {
                keys: [redisKey],
                arguments: [String(nowMs), String(dynamicCapacity), String(dynamicRefill), String(TTL_SECONDS)],
            });

            allowed = Number(result[0]) === 1;
            currentTokens = Number(result[1]);
            retryAfter = Number(result[2]);
        } else {
            // Memory Fallback
            let bucket = memoryBuckets.get(redisKey);
            if (!bucket) bucket = { tokens: dynamicCapacity, last: nowMs };

            const delta = nowMs - bucket.last;
            bucket.tokens = Math.min(dynamicCapacity, bucket.tokens + (delta / 1000.0) * dynamicRefill);
            bucket.last = nowMs;

            if (bucket.tokens >= 1.0) {
                bucket.tokens -= 1.0;
                allowed = true;
            } else {
                allowed = false;
                retryAfter = Math.ceil((1.0 - bucket.tokens) / dynamicRefill);
            }
            currentTokens = bucket.tokens;
            memoryBuckets.set(redisKey, bucket);
        }

        // 3. Violation & Banning Logic
        if (!allowed) {
            let violationCount = 0;
            if (client && process.env.USE_REDIS === 'true') {
                violationCount = await client.incr(violationKey);
                await client.expire(violationKey, 300); // 5 min window

                if (violationCount >= 3) {
                    // Move to Jail for 1 hour
                    await client.set(jailKey, '1', { EX: 3600 });
                    // If they stay high-violation, flag as permanent
                    if (violationCount >= 10) await client.set(permanentKey, '1');
                }
            } else {
                let v = memoryBuckets.get(violationKey) || { count: 0, expiry: Date.now() + 300000 };
                v.count++;
                violationCount = v.count;
                memoryBuckets.set(violationKey, v);

                if (violationCount >= 3) {
                    memoryBuckets.set(jailKey, Date.now() + 3600000);
                    if (violationCount >= 10) memoryBuckets.set(permanentKey, true);
                }
            }
        }

        // 4. Emit to Dashboard
        if (global.io) {
            if (!allowed) {
                global.io.emit('ip-banned', {
                    ip,
                    ua,
                    count: `VIOLATIONS: ${allowed ? 0 : 'INCREASED'}`,
                    bannedUntil: Date.now() + (retryAfter * 1000)
                });
            } else if (currentTokens < dynamicCapacity / 4) {
                global.io.emit('attack-warning', { ip, count: `[${requestType}] Tokens: ${currentTokens.toFixed(1)}` });
            }
        }

        if (!allowed) {
            res.setHeader("Retry-After", String(retryAfter));
            return res.status(429).send(`Too Many Requests. Retry after ${retryAfter} seconds.`);
        }

        return next();
    } catch (err) {
        console.error("Rate limiter failed (allowing request):", err);
        return next();
    }
};
