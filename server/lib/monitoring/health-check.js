/**
 * Health Check Manager
 * Liveness/readiness probes for container orchestration
 */

export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded',
};

/**
 * Create a liveness probe that checks if the process is running
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeMemory - Include memory usage in response
 * @returns {Object} Liveness probe with check method
 */
export function createLivenessProbe(options = {}) {
  const { includeMemory = false } = options;

  return {
    async check() {
      const result = {
        status: HEALTH_STATUS.HEALTHY,
        pid: process.pid,
        uptime: process.uptime(),
      };

      if (includeMemory) {
        result.memory = process.memoryUsage();
      }

      return result;
    },
  };
}

/**
 * Create a readiness probe that checks dependencies
 * @param {Object} options - Configuration options
 * @param {Array} options.checks - Array of { name, check } objects
 * @param {number} options.timeout - Timeout for each check in ms
 * @returns {Object} Readiness probe with check method
 */
export function createReadinessProbe(options = {}) {
  const { checks = [], timeout = 5000 } = options;

  return {
    async check() {
      const failed = [];
      const results = {};

      for (const { name, check } of checks) {
        try {
          const checkPromise = check();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeout)
          );

          const result = await Promise.race([checkPromise, timeoutPromise]);
          results[name] = result;

          if (!result) {
            failed.push(name);
          }
        } catch (error) {
          results[name] = false;
          failed.push(name);
        }
      }

      return {
        status: failed.length === 0 ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY,
        checks: results,
        failed,
      };
    },
  };
}

/**
 * Create a deep health check for detailed verification
 * @param {Object} options - Configuration options
 * @param {Object} options.db - Database client
 * @param {Object} options.cache - Cache client
 * @param {Function} options.fetch - Fetch function for external services
 * @returns {Object} Deep health check with various check methods
 */
export function createDeepHealthCheck(options = {}) {
  const { db, cache, fetch: fetchFn } = options;

  return {
    async checkDatabase() {
      if (!db) {
        return { healthy: false, error: 'No database configured' };
      }

      try {
        await db.query('SELECT 1');
        return { healthy: true };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    },

    async checkCache() {
      if (!cache) {
        return { healthy: false, error: 'No cache configured' };
      }

      try {
        const result = await cache.ping();
        return { healthy: result === 'PONG' };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    },

    async checkExternal(url) {
      if (!fetchFn) {
        return { healthy: false, error: 'No fetch configured' };
      }

      try {
        const response = await fetchFn(url);
        return { healthy: response.ok };
      } catch (error) {
        return { healthy: false, error: error.message };
      }
    },

    async getStatus() {
      // Return status without sensitive info
      return {
        database: db ? 'configured' : 'not configured',
        cache: cache ? 'configured' : 'not configured',
      };
    },
  };
}

/**
 * Run all configured health checks
 * @param {Object} options - Configuration options
 * @param {boolean} options.liveness - Include liveness check
 * @param {boolean} options.readiness - Include readiness check
 * @param {Array} options.checks - Additional checks to run
 * @returns {Object} Health check results
 */
export async function runHealthCheck(options = {}) {
  const { liveness = false, readiness = false, checks = [] } = options;
  const result = {};
  let allHealthy = true;

  if (liveness) {
    const livenessProbe = createLivenessProbe();
    result.liveness = await livenessProbe.check();
    if (result.liveness.status !== HEALTH_STATUS.HEALTHY) {
      allHealthy = false;
    }
  }

  if (readiness) {
    const readinessProbe = createReadinessProbe({ checks });
    result.readiness = await readinessProbe.check();
    if (result.readiness.status !== HEALTH_STATUS.HEALTHY) {
      allHealthy = false;
    }
  }

  // Run individual checks if no liveness/readiness specified
  if (!liveness && !readiness && checks.length > 0) {
    for (const { name, check } of checks) {
      try {
        const checkResult = await check();
        result[name] = checkResult;
        if (!checkResult) {
          allHealthy = false;
        }
      } catch (error) {
        result[name] = false;
        allHealthy = false;
      }
    }
  }

  result.overall = allHealthy ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNHEALTHY;

  return result;
}

/**
 * Create a health check manager
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Check interval in ms
 * @returns {Object} Health check manager
 */
export function createHealthCheckManager(options = {}) {
  const { interval = 30000 } = options;
  const checks = [];

  const livenessProbe = createLivenessProbe();

  return {
    addCheck(check) {
      checks.push(check);
    },

    async runAll() {
      return runHealthCheck({ liveness: true, readiness: true, checks });
    },

    async getLiveness() {
      return livenessProbe.check();
    },

    async getReadiness() {
      const readinessProbe = createReadinessProbe({ checks });
      return readinessProbe.check();
    },

    getInterval() {
      return interval;
    },
  };
}
