/**
 * Uptime Monitor
 * Uptime monitoring and alerting
 */

export const UPTIME_STATUS = {
  UP: 'up',
  DOWN: 'down',
  DEGRADED: 'degraded',
};

/**
 * Ping an endpoint and return status
 * @param {string} url - URL to ping
 * @param {Object} options - Configuration options
 * @param {Function} options.fetch - Fetch function
 * @param {number} options.timeout - Timeout in ms
 * @returns {Object} Ping result with status and response time
 */
export async function pingEndpoint(url, options = {}) {
  const { fetch: fetchFn = fetch, timeout = 5000 } = options;

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchPromise = fetchFn(url, { signal: controller.signal });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeout)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: UPTIME_STATUS.UP,
        responseTime,
        statusCode: response.status,
      };
    } else {
      return {
        status: UPTIME_STATUS.DOWN,
        responseTime,
        statusCode: response.status,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error.message === 'timeout' || error.name === 'AbortError') {
      return {
        status: UPTIME_STATUS.DOWN,
        responseTime,
        error: 'timeout',
      };
    }

    return {
      status: UPTIME_STATUS.DOWN,
      responseTime,
      error: error.message,
    };
  }
}

/**
 * Calculate uptime percentage from check results
 * @param {Array} checks - Array of check results
 * @returns {number} Uptime percentage
 */
export function calculateUptime(checks) {
  if (checks.length === 0) return 100;

  const upCount = checks.filter((check) => check.status === UPTIME_STATUS.UP).length;
  return (upCount / checks.length) * 100;
}

/**
 * Generate an uptime report
 * @param {Object} options - Report options
 * @param {string} options.endpoint - Endpoint URL
 * @param {string} options.period - Report period (day, week, month)
 * @param {Array} options.checks - Check results
 * @returns {Object} Uptime report
 */
export function generateUptimeReport(options = {}) {
  const { endpoint, period = 'day', checks = [] } = options;

  const uptime = calculateUptime(checks);

  // Calculate average response time
  const responseTimes = checks
    .filter((c) => c.responseTime !== undefined)
    .map((c) => c.responseTime);

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  // Count incidents (transitions from up to down)
  let incidents = 0;
  for (let i = 1; i < checks.length; i++) {
    if (checks[i - 1].status === UPTIME_STATUS.UP && checks[i].status === UPTIME_STATUS.DOWN) {
      incidents++;
    }
  }

  return {
    endpoint,
    period,
    uptime,
    avgResponseTime,
    totalChecks: checks.length,
    incidents,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create an uptime monitor
 * @param {Object} options - Configuration options
 * @param {Function} options.fetch - Fetch function
 * @param {number} options.interval - Check interval in ms
 * @returns {Object} Uptime monitor
 */
export function createUptimeMonitor(options = {}) {
  const { fetch: fetchFn = fetch, interval = 60000 } = options;

  const endpoints = new Map();
  const checkHistory = new Map();

  return {
    addEndpoint(url, endpointOptions = {}) {
      endpoints.set(url, {
        url,
        ...endpointOptions,
      });
      checkHistory.set(url, []);
    },

    removeEndpoint(url) {
      endpoints.delete(url);
      checkHistory.delete(url);
    },

    getEndpoints() {
      return Array.from(endpoints.values());
    },

    async check(url) {
      const urlsToCheck = url ? [url] : Array.from(endpoints.keys());

      for (const endpointUrl of urlsToCheck) {
        const result = await pingEndpoint(endpointUrl, { fetch: fetchFn });
        result.timestamp = Date.now();

        const history = checkHistory.get(endpointUrl) || [];
        history.push(result);
        checkHistory.set(endpointUrl, history);
      }
    },

    getStatus(url) {
      const history = checkHistory.get(url);
      if (!history || history.length === 0) {
        return UPTIME_STATUS.UP; // Default to up if no checks
      }
      return history[history.length - 1].status;
    },

    getHistory(url) {
      return checkHistory.get(url) || [];
    },

    getReport(url, period = 'day') {
      const history = checkHistory.get(url) || [];
      return generateUptimeReport({
        endpoint: url,
        period,
        checks: history,
      });
    },

    getInterval() {
      return interval;
    },
  };
}
