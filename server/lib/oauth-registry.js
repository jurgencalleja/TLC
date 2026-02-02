/**
 * OAuth Provider Registry
 *
 * Configures and manages OAuth 2.0 providers for authentication.
 * Supports GitHub, Google, Azure AD with sensible defaults.
 */

/**
 * Default configurations for common OAuth providers.
 * Users only need to provide clientId and clientSecret.
 */
const PROVIDER_DEFAULTS = {
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
  },
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  azuread: {
    authUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'email', 'profile'],
  },
};

/**
 * Validates provider configuration.
 *
 * @param {object} config - Provider configuration
 * @param {string} [providerName] - Optional provider name for defaults lookup
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
function validateProviderConfig(config, providerName) {
  const errors = [];

  if (!config) {
    return ['config is required'];
  }

  if (!config.clientId) {
    errors.push('clientId is required');
  }

  if (!config.clientSecret) {
    errors.push('clientSecret is required');
  }

  // Check for authUrl and tokenUrl only if no defaults available
  const defaults = providerName ? PROVIDER_DEFAULTS[providerName.toLowerCase()] : null;

  if (!config.authUrl && !defaults?.authUrl) {
    errors.push('authUrl is required');
  }

  if (!config.tokenUrl && !defaults?.tokenUrl) {
    errors.push('tokenUrl is required');
  }

  return errors;
}

/**
 * Creates a new OAuth provider registry instance.
 *
 * @returns {object} Registry instance with provider management methods
 */
function createOAuthRegistry() {
  const providers = new Map();

  /**
   * Registers an OAuth provider.
   *
   * @param {string} name - Provider name (e.g., 'github', 'google', 'azuread')
   * @param {object} config - Provider configuration
   * @param {string} config.clientId - OAuth client ID
   * @param {string} config.clientSecret - OAuth client secret
   * @param {string} [config.authUrl] - Authorization URL (optional for known providers)
   * @param {string} [config.tokenUrl] - Token URL (optional for known providers)
   * @param {string} [config.userInfoUrl] - User info URL
   * @param {string[]} [config.scopes] - OAuth scopes
   * @throws {Error} If required fields are missing
   */
  function registerProvider(name, config) {
    const normalizedName = name.toLowerCase();
    const defaults = PROVIDER_DEFAULTS[normalizedName] || {};

    // Validate config
    const errors = validateProviderConfig(config, normalizedName);
    if (errors.length > 0) {
      throw new Error(`Invalid provider config: ${errors.join(', ')}`);
    }

    // Merge config with defaults (config takes precedence)
    const mergedConfig = {
      ...defaults,
      ...config,
      name: normalizedName,
    };

    providers.set(normalizedName, mergedConfig);
  }

  /**
   * Gets a registered provider by name.
   *
   * @param {string} name - Provider name
   * @returns {object|null} Provider configuration or null if not found
   */
  function getProvider(name) {
    if (!name) return null;
    return providers.get(name.toLowerCase()) || null;
  }

  /**
   * Lists all registered providers.
   * Secrets are not included in the response.
   *
   * @returns {object[]} Array of provider info (without secrets)
   */
  function listProviders() {
    const result = [];
    for (const [name, config] of providers) {
      // Return provider info without secrets
      const { clientSecret, ...safeConfig } = config;
      result.push(safeConfig);
    }
    return result;
  }

  /**
   * Loads providers from a .tlc.json config object.
   *
   * @param {object} config - The .tlc.json configuration
   * @param {object} [config.oauth] - OAuth configuration section
   * @param {object} [config.oauth.providers] - Providers object
   */
  function loadFromConfig(config) {
    if (!config || !config.oauth || !config.oauth.providers) {
      return;
    }

    const configProviders = config.oauth.providers;
    for (const [name, providerConfig] of Object.entries(configProviders)) {
      registerProvider(name, providerConfig);
    }
  }

  /**
   * Removes a registered provider.
   *
   * @param {string} name - Provider name to remove
   */
  function removeProvider(name) {
    if (!name) return;
    providers.delete(name.toLowerCase());
  }

  /**
   * Checks if a provider is registered.
   *
   * @param {string} name - Provider name
   * @returns {boolean} True if provider exists
   */
  function hasProvider(name) {
    if (!name) return false;
    return providers.has(name.toLowerCase());
  }

  return {
    registerProvider,
    getProvider,
    listProviders,
    loadFromConfig,
    removeProvider,
    hasProvider,
  };
}

module.exports = {
  createOAuthRegistry,
  PROVIDER_DEFAULTS,
  validateProviderConfig,
};
