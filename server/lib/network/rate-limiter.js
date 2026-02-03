/**
 * Rate Limiter
 * Sliding window rate limiting with whitelist/blacklist support
 */

export const RATE_LIMIT_ALGORITHMS = {
  SLIDING_WINDOW: 'sliding_window',
  TOKEN_BUCKET: 'token_bucket',
  FIXED_WINDOW: 'fixed_window',
};

/**
 * Create a sliding window rate limiter store
 */
export function createSlidingWindow(options) {
  const { windowMs, maxRequests } = options;
  const store = new Map();

  return {
    increment(key) {
      const now = Date.now();
      const record = store.get(key);

      if (!record || now - record.windowStart >= windowMs) {
        // Start new window
        store.set(key, { count: 1, windowStart: now });
        return true;
      }

      if (record.count >= maxRequests) {
        return false;
      }

      record.count++;
      return true;
    },

    getCount(key) {
      const record = store.get(key);
      if (!record) return 0;

      const now = Date.now();
      if (now - record.windowStart >= windowMs) {
        return 0;
      }

      return record.count;
    },

    reset(key) {
      if (key) {
        store.delete(key);
      } else {
        store.clear();
      }
    },
  };
}

/**
 * Check if an IP matches a CIDR range
 */
function ipMatchesCidr(ip, cidr) {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum =
    (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];

  const maskNum = ~((1 << (32 - mask)) - 1);

  return (ipNum & maskNum) === (rangeNum & maskNum);
}

/**
 * Check if IP is in whitelist
 */
export function isWhitelisted(ip, whitelist) {
  if (!whitelist || whitelist.length === 0) {
    return false;
  }

  return whitelist.some((entry) => ipMatchesCidr(ip, entry));
}

/**
 * Check if IP is in blacklist
 */
export function isBlacklisted(ip, blacklist) {
  if (!blacklist || blacklist.length === 0) {
    return false;
  }

  return blacklist.some((entry) => ipMatchesCidr(ip, entry));
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(options) {
  const { ip, endpoint, limits, store } = options;

  // Find the limit configuration for this endpoint
  const limitConfig = limits[endpoint] || limits.default || { maxRequests: 100, windowMs: 60000 };
  const { maxRequests, windowMs } = limitConfig;

  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  // Get or create record
  let record = store.get(key);
  if (!record || now - record.windowStart >= windowMs) {
    record = { count: 0, windowStart: now };
    store.set(key, record);
  }

  const resetTime = record.windowStart + windowMs;

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetTime,
    };
  }

  // Calculate remaining before incrementing
  const remaining = Math.max(0, maxRequests - record.count);

  // Increment counter
  record.count++;

  return {
    allowed: true,
    limit: maxRequests,
    remaining,
    resetTime,
  };
}

/**
 * Generate rate limit headers
 */
export function getRateLimitHeaders(options) {
  const { limit, remaining, resetTime, blocked } = options;

  const headers = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
  };

  if (blocked) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    headers['Retry-After'] = String(Math.max(1, retryAfter));
  }

  return headers;
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config) {
  const { limits, whitelist = [], blacklist = [] } = config;
  const store = new Map();

  return {
    check(options) {
      const { ip, endpoint } = options;

      // Check blacklist first
      if (isBlacklisted(ip, blacklist)) {
        return {
          allowed: false,
          reason: 'IP is on blacklist',
          limit: 0,
          remaining: 0,
        };
      }

      // Check whitelist
      if (isWhitelisted(ip, whitelist)) {
        // Find limit config just for the limit value
        const limitConfig = limits[endpoint] || limits.default || { maxRequests: 100 };
        return {
          allowed: true,
          limit: limitConfig.maxRequests,
          remaining: limitConfig.maxRequests,
          whitelisted: true,
        };
      }

      // Normal rate limiting
      return checkRateLimit({ ip, endpoint, limits, store });
    },

    getHeaders(result) {
      return getRateLimitHeaders({
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.resetTime || Date.now() + 60000,
        blocked: !result.allowed,
      });
    },

    reset(ip) {
      if (ip) {
        // Reset all entries for this IP
        for (const key of store.keys()) {
          if (key.startsWith(`${ip}:`)) {
            store.delete(key);
          }
        }
      } else {
        store.clear();
      }
    },
  };
}
