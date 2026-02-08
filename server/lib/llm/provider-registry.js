/**
 * Provider Registry
 *
 * Runtime registry of available LLM providers with health status.
 * Tracks which providers are available and routes by capability.
 *
 * @module llm/provider-registry
 */

/**
 * Create a provider registry
 * @param {Object} options - Registry options
 * @param {Function} options.healthCheck - Health check function(provider) → { available, version }
 * @param {number} options.cacheTTL - Health cache TTL in ms (default 30000)
 * @returns {Object} Registry instance
 */
function createRegistry(options = {}) {
  const { healthCheck, cacheTTL = 30000 } = options;
  const providers = new Map();
  const healthCache = new Map();

  return {
    /**
     * Register a provider
     * @param {Object} provider - Provider config
     */
    register(provider) {
      providers.set(provider.name, { ...provider, status: 'unknown' });
    },

    /**
     * List all registered providers
     * @returns {Array} Provider list
     */
    list() {
      return Array.from(providers.values());
    },

    /**
     * Check health of a specific provider
     * @param {string} name - Provider name
     * @returns {Promise<Object>} Health status
     */
    async checkHealth(name) {
      const provider = providers.get(name);
      if (!provider) return { available: false, error: 'unknown provider' };

      // Check cache
      const cached = healthCache.get(name);
      if (cached && (Date.now() - cached.timestamp) < cacheTTL) {
        return cached.status;
      }

      const status = await healthCheck(provider);
      provider.status = status.available ? 'available' : 'unavailable';

      healthCache.set(name, { status, timestamp: Date.now() });

      return status;
    },

    /**
     * Get providers by capability
     * @param {string} capability - Capability name (e.g., 'review')
     * @returns {Array} Matching providers
     */
    getByCapability(capability) {
      return Array.from(providers.values())
        .filter(p => p.capabilities && p.capabilities.includes(capability));
    },

    /**
     * Get best available provider for a capability
     * @param {string} capability - Capability name
     * @returns {Promise<Object|null>} Best provider or null
     */
    async getBestProvider(capability) {
      const candidates = this.getByCapability(capability)
        .sort((a, b) => (a.priority || 99) - (b.priority || 99));

      for (const provider of candidates) {
        const status = await this.checkHealth(provider.name);
        if (status.available) return provider;
      }

      return null;
    },

    /**
     * Load providers from config object
     * @param {Object} config - Config with providers map
     */
    loadFromConfig(config) {
      const providerMap = config.providers || {};
      for (const [name, providerConfig] of Object.entries(providerMap)) {
        this.register({ name, ...providerConfig });
      }
    },
  };
}

module.exports = {
  createRegistry,
};
