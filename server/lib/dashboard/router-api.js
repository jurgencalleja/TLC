/**
 * Router Status API
 * Multi-LLM router status API
 */

/**
 * Get router status
 * @param {Object} options - Options
 * @returns {Promise<Object>} Router status
 */
export async function getRouterStatus(options = {}) {
  const { router } = options;

  if (!router) {
    return {
      providers: [],
      overall: 'unknown'
    };
  }

  const providers = router.getProviders();

  // Determine overall status
  const hasError = providers.some(p => p.status === 'error');
  const allActive = providers.every(p => p.status === 'active');

  let overall;
  if (providers.length === 0) {
    overall = 'unknown';
  } else if (allActive) {
    overall = 'healthy';
  } else if (hasError) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return {
    providers,
    overall,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get provider statistics
 * @param {Object} data - Data containing requests
 * @returns {Object} Provider stats
 */
export function getProviderStats(data = {}) {
  const { requests = [] } = data;
  const stats = {};

  // Group requests by provider
  const byProvider = {};
  for (const req of requests) {
    if (!byProvider[req.provider]) {
      byProvider[req.provider] = [];
    }
    byProvider[req.provider].push(req);
  }

  // Calculate stats for each provider
  for (const [provider, providerReqs] of Object.entries(byProvider)) {
    const requestCount = providerReqs.length;

    // Calculate error rate
    const errors = providerReqs.filter(r => r.error === true).length;
    const errorRate = requestCount > 0 ? errors / requestCount : 0;

    // Calculate average latency
    const latencies = providerReqs.filter(r => r.latency !== undefined).map(r => r.latency);
    const avgLatency = latencies.length > 0
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      : 0;

    stats[provider] = {
      requests: requestCount,
      errorRate,
      avgLatency
    };
  }

  return stats;
}

/**
 * Calculate costs from requests
 * @param {Array} requests - Request array
 * @param {Object} pricing - Pricing per provider
 * @returns {Object} Cost breakdown
 */
export function calculateCosts(requests, pricing = {}) {
  const byProvider = {};
  let total = 0;

  for (const req of requests) {
    const provider = req.provider;
    const providerPricing = pricing[provider];

    if (!byProvider[provider]) {
      byProvider[provider] = 0;
    }

    if (providerPricing) {
      const inputCost = (req.inputTokens || 0) * (providerPricing.input || 0) / 1000;
      const outputCost = (req.outputTokens || 0) * (providerPricing.output || 0) / 1000;
      const cost = inputCost + outputCost;
      byProvider[provider] += cost;
      total += cost;
    } else {
      // No pricing available
      byProvider[provider] = 0;
    }
  }

  return {
    total,
    byProvider
  };
}

/**
 * Filter requests by time range
 * @param {Array} requests - Requests to filter
 * @param {Object} range - Time range with start and optional end
 * @returns {Array} Filtered requests
 */
export function filterByTimeRange(requests, range = {}) {
  const { start, end } = range;

  return requests.filter(req => {
    const timestamp = req.timestamp;

    if (start !== undefined && timestamp < start) {
      return false;
    }

    if (end !== undefined && timestamp > end) {
      return false;
    }

    return true;
  });
}

/**
 * Create Router API handler
 * @param {Object} options - Options
 * @returns {Object} API handlers
 */
export function createRouterApi(options = {}) {
  const { router, requestStore } = options;

  return {
    async getStatus() {
      return getRouterStatus({ router });
    },

    getStats(timeRange) {
      let requests = requestStore?.getRequests() || [];
      if (timeRange) {
        requests = filterByTimeRange(requests, timeRange);
      }
      return getProviderStats({ requests });
    },

    getCosts(pricing, timeRange) {
      let requests = requestStore?.getRequests() || [];
      if (timeRange) {
        requests = filterByTimeRange(requests, timeRange);
      }
      return calculateCosts(requests, pricing);
    }
  };
}
