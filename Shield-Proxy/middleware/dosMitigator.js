const { getRedisClient } = require("../lib/redisClient");
const crypto = require('crypto');

/**
 * SENTINEL TOKEN BUCKET v3.0
 * Features: Atomic Lua/Redis execution, Memory Fallback, Advanced Differentiation, and Multi-tier Isolation.
 */

// LUA Script for Atomic Token Bucket
const LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local now_ms = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill_rate = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local state = redis.call("HMGET", key, "tokens", "last")
local tokens = tonumber(state[1]) or capacity
local last = tonumber(state[2]) or now_ms

-- Refill
local delta = math.max(0, now_ms - last)
tokens = math.min(capacity, tokens + (delta / 1000.0) * refill_rate)

-- Consume
local allowed = 0
local retry_after = 0
if tokens >= 1.0 then
    allowed = 1
    tokens = tokens - 1.0
else
    retry_after = math.ceil((1.0 - tokens) / refill_rate)
end

redis.call("HMSET", key, "tokens", tokens, "last", now_ms)
redis.call("EXPIRE", key, ttl)

return { allowed, tokens, retry_after }
`;

const memoryBuckets = new Map();

// Configuration from Env
const CONFIG = {
    STD: { burst: Number(process.env.RL_CAPACITY || 20), refill: Number(process.env.RL_REFILL_RATE || 5) },
    API: { burst: 5, refill: 1 },
    TTL: Number(process.env.RL_TTL_SECONDS || 600)
};

async function dosMitigator(req, res, next) {
    if (req.path.startsWith('/socket.io/')) return next();

    // 🔬 Enhanced Fingerprinting (IP + UA + ACCOUNT)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || 'unknown';
    const auth = req.headers['authorization'] || 'public'; // The "Driver's License"

    // Create a secure hash to avoid leaking raw IP/Tokens in logs
    const fingerprint = crypto.createHash('md5')
        .update(`${ip}-${ua}-${auth}`)
        .digest('hex');

    // 1. Identify Target Policy
    const isApi = req.path.startsWith('/api/');
    const policy = isApi ? CONFIG.API : CONFIG.STD;
    const type = isApi ? "API" : "STD";

    const redisKey = `bucket:${type}:${fingerprint}`;
    const jailKey = `jail:${fingerprint}`;
    const permKey = `perm:${fingerprint}`;
    const violKey = `viol:${fingerprint}`;

    try {
        const client = getRedisClient();
        const useRedis = process.env.USE_REDIS === 'true' && client;

        // 2. CHECK ISOLATION (Short-circuit)
        if (useRedis) {
            const [perm, jail] = await Promise.all([client.get(permKey), client.get(jailKey)]);
            if (perm) return shieldResponse(res, 403, "PERMANENT ACCESS REVOKED", ip, ua, fingerprint);
            if (jail) return shieldResponse(res, 403, "TEMPORARY ISOLATION (1 HR)", ip, ua, fingerprint);
        } else {
            if (memoryBuckets.get(permKey)) return shieldResponse(res, 403, "PERMANENT ACCESS REVOKED", ip, ua, fingerprint);
            const jailTime = memoryBuckets.get(jailKey);
            if (jailTime && Date.now() < jailTime) return shieldResponse(res, 403, "TEMPORARY ISOLATION (1 HR)", ip, ua, fingerprint);
        }

        // 3. EXECUTE TOKEN BUCKET
        let allowed, tokens, retryAfter;
        if (useRedis) {
            const result = await client.eval(LUA_TOKEN_BUCKET, {
                keys: [redisKey],
                arguments: [String(Date.now()), String(policy.burst), String(policy.refill), String(CONFIG.TTL)]
            });
            [allowed, tokens, retryAfter] = [Number(result[0]) === 1, Number(result[1]), Number(result[2])];
        } else {
            // Local JS Logic
            let b = memoryBuckets.get(redisKey) || { t: policy.burst, l: Date.now() };
            const d = Math.max(0, Date.now() - b.l);
            b.t = Math.min(policy.burst, b.t + (d / 1000.0) * policy.refill);
            b.l = Date.now();
            if (b.t >= 1.0) { allowed = true; b.t -= 1.0; retryAfter = 0; }
            else { allowed = false; retryAfter = Math.ceil((1.0 - b.t) / policy.refill); }
            tokens = b.t;
            memoryBuckets.set(redisKey, b);
        }

        // 4. VIOLATION TRACKING & DASHBOARD
        if (!allowed) {
            let vCount = 0;
            if (useRedis) {
                vCount = await client.incr(violKey);
                await client.expire(violKey, 300);
                if (vCount >= 5) await client.set(jailKey, '1', { EX: 3600 });
                if (vCount >= 15) await client.set(permKey, '1');
            } else {
                let v = memoryBuckets.get(violKey) || 0;
                v++;
                vCount = v;
                memoryBuckets.set(violKey, v);
                if (v >= 5) memoryBuckets.set(jailKey, Date.now() + 3600000);
                if (v >= 15) memoryBuckets.set(permKey, true);
            }

            if (global.io) {
                global.io.emit('ip-banned', { ip, ua, fingerprint, count: `VIOLATIONS: ${vCount}`, bannedUntil: Date.now() + (retryAfter * 1000) });
            }
            res.setHeader("Retry-After", String(retryAfter));
            return res.status(429).send(`Rate Limit Exceeded. Retry in ${retryAfter}s.`);
        }

        // 5. ALERT ON LOW TOKENS
        if (global.io && tokens < policy.burst / 5) {
            global.io.emit('attack-warning', { ip, fingerprint, count: `[${type}] Tokens: ${tokens.toFixed(2)}` });
        }

        return next();
    } catch (err) {
        console.error("SHIELD ERROR:", err);
        return next();
    }
};

/**
 * Manually clear a user's security history (Jailbreak)
 */
async function clearJail(fingerprint) {
    const client = getRedisClient();
    const useRedis = process.env.USE_REDIS === 'true' && client;
    const keys = [
        `jail:${fingerprint}`,
        `perm:${fingerprint}`,
        `viol:${fingerprint}`,
        `bucket:STD:${fingerprint}`,
        `bucket:API:${fingerprint}`
    ];

    if (useRedis) {
        await Promise.all(keys.map(k => client.del(k)));
    } else {
        keys.forEach(k => memoryBuckets.delete(k));
    }
    console.log(`🔓 [SYSTEM] Manual Jailbreak executed for: ${fingerprint}`);
}

/**
 * Update security policies dynamically
 */
function updateConfig(newConfig) {
    if (newConfig.STD) {
        if (newConfig.STD.burst) CONFIG.STD.burst = Number(newConfig.STD.burst);
        if (newConfig.STD.refill) CONFIG.STD.refill = Number(newConfig.STD.refill);
    }
    if (newConfig.API) {
        if (newConfig.API.burst) CONFIG.API.burst = Number(newConfig.API.burst);
        if (newConfig.API.refill) CONFIG.API.refill = Number(newConfig.API.refill);
    }
    console.log("🛠️ [CONFIG] Security policies updated:", CONFIG);
}

function shieldResponse(res, code, msg, ip, ua, fingerprint) {
    if (global.io) global.io.emit('ip-banned', { ip, ua, fingerprint, count: msg, bannedUntil: 'LOCKDOWN' });
    return res.status(code).send(msg);
}

module.exports = { dosMitigator, clearJail, updateConfig, CONFIG };
