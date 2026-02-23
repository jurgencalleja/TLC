/**
 * Capture Guard - Endpoint hardening for the memory capture API.
 *
 * Provides payload size validation, exchange validation, content deduplication,
 * and per-project rate limiting.
 *
 * @module capture-guard
 */

const crypto = require('crypto');

/** Maximum payload size in bytes (100KB) */
const MAX_PAYLOAD_SIZE = 100 * 1024;

/** Deduplication window in milliseconds (60 seconds) */
const DEDUP_WINDOW_MS = 60 * 1000;

/** Maximum captures per minute per project */
const RATE_LIMIT_PER_MINUTE = 100;

/** Rate limit window in milliseconds (60 seconds) */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * Create a capture guard instance with internal state for dedup and rate limiting.
 *
 * @returns {{ validate: Function, deduplicate: Function, checkRateLimit: Function }}
 */
function createCaptureGuard() {
  /** Map of content hash → timestamp for deduplication */
  const dedupCache = new Map();

  /** Map of projectId → { count, windowStart } for rate limiting */
  const rateLimits = new Map();

  /**
   * Hash exchange content for deduplication.
   * @param {object} exchange
   * @returns {string}
   */
  function hashExchange(exchange) {
    const content = (exchange.user || '') + '|' + (exchange.assistant || '');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Clean expired entries from dedup cache.
   */
  function cleanDedupCache() {
    const now = Date.now();
    for (const [hash, timestamp] of dedupCache) {
      if (now - timestamp > DEDUP_WINDOW_MS) {
        dedupCache.delete(hash);
      }
    }
  }

  /**
   * Validate the capture payload for size and structure.
   *
   * @param {object} payload - The request body
   * @param {string} projectId - Project identifier
   * @returns {{ ok: boolean, status?: number, error?: string }}
   */
  function validate(payload, projectId) {
    // Size check
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      return { ok: false, status: 413, error: `Payload too large: ${payloadSize} bytes (max ${MAX_PAYLOAD_SIZE})` };
    }

    // Exchange validation
    if (!payload.exchanges || !Array.isArray(payload.exchanges)) {
      return { ok: false, status: 400, error: 'exchanges array is required' };
    }

    for (const exchange of payload.exchanges) {
      const hasUser = exchange.user && typeof exchange.user === 'string' && exchange.user.trim().length > 0;
      const hasAssistant = exchange.assistant && typeof exchange.assistant === 'string' && exchange.assistant.trim().length > 0;
      if (!hasUser && !hasAssistant) {
        return { ok: false, status: 400, error: 'Each exchange must have at least one of user or assistant as a non-empty string' };
      }
    }

    return { ok: true };
  }

  /**
   * Filter out duplicate exchanges within the dedup window.
   *
   * @param {Array} exchanges - Array of exchange objects
   * @param {string} projectId - Project identifier
   * @returns {Array} Deduplicated exchanges
   */
  function deduplicate(exchanges, projectId) {
    cleanDedupCache();
    const now = Date.now();
    const unique = [];

    for (const exchange of exchanges) {
      const hash = projectId + ':' + hashExchange(exchange);
      const lastSeen = dedupCache.get(hash);

      if (!lastSeen || (now - lastSeen) > DEDUP_WINDOW_MS) {
        dedupCache.set(hash, now);
        unique.push(exchange);
      }
    }

    return unique;
  }

  /**
   * Check if a project has exceeded its rate limit.
   *
   * @param {string} projectId - Project identifier
   * @returns {{ ok: boolean, status?: number, error?: string }}
   */
  function checkRateLimit(projectId) {
    const now = Date.now();
    let entry = rateLimits.get(projectId);

    if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
      entry = { count: 0, windowStart: now };
      rateLimits.set(projectId, entry);
    }

    entry.count++;

    if (entry.count > RATE_LIMIT_PER_MINUTE) {
      return { ok: false, status: 429, error: `Rate limit exceeded: ${RATE_LIMIT_PER_MINUTE} captures/minute` };
    }

    return { ok: true };
  }

  return { validate, deduplicate, checkRateLimit };
}

module.exports = { createCaptureGuard };
