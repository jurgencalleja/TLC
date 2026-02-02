/**
 * Identity Provider Manager
 *
 * Unified interface for OAuth and SAML identity providers.
 * Routes authentication requests to the appropriate provider type,
 * normalizes user profiles, and manages provider metadata caching.
 */

const { createOAuthRegistry } = require('./oauth-registry.js');
const { createSAMLProvider } = require('./saml-provider.js');

/**
 * Provider type constants
 */
const PROVIDER_TYPES = {
  OAUTH: 'oauth',
  SAML: 'saml',
};

/**
 * Profile field mappings for different OAuth providers
 */
const OAUTH_PROFILE_MAPPINGS = {
  github: {
    id: (data) => String(data.id),
    email: (data) => data.email,
    name: (data) => data.name || data.login,
    firstName: (data) => (data.name ? data.name.split(' ')[0] : data.login),
    lastName: (data) => (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
    avatarUrl: (data) => data.avatar_url,
  },
  google: {
    id: (data) => String(data.id),
    email: (data) => data.email,
    name: (data) => data.name,
    firstName: (data) => data.given_name || (data.name ? data.name.split(' ')[0] : ''),
    lastName: (data) => data.family_name || (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
    avatarUrl: (data) => data.picture,
  },
  azuread: {
    id: (data) => String(data.id),
    email: (data) => data.mail || data.userPrincipalName,
    name: (data) => data.displayName,
    firstName: (data) => data.givenName || (data.displayName ? data.displayName.split(' ')[0] : ''),
    lastName: (data) => data.surname || (data.displayName ? data.displayName.split(' ').slice(1).join(' ') : ''),
    avatarUrl: () => null, // Azure AD requires separate Graph API call for photo
  },
};

/**
 * SAML attribute claim URIs
 */
const SAML_CLAIMS = {
  email: [
    'email',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    'http://schemas.xmlsoap.org/claims/EmailAddress',
    'urn:oid:0.9.2342.19200300.100.1.3',
  ],
  firstName: [
    'firstName',
    'givenName',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    'urn:oid:2.5.4.42',
  ],
  lastName: [
    'lastName',
    'surname',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    'urn:oid:2.5.4.4',
  ],
  name: [
    'name',
    'displayName',
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    'urn:oid:2.16.840.1.113730.3.1.241',
  ],
};

/**
 * Find a value from SAML attributes using multiple possible claim names
 *
 * @param {Object} attrs - SAML attributes object
 * @param {string[]} claimNames - Possible claim names to check
 * @returns {string|null} The value or null if not found
 */
function findSAMLAttribute(attrs, claimNames) {
  for (const name of claimNames) {
    if (attrs[name]) {
      return attrs[name];
    }
  }
  return null;
}

/**
 * Detect provider type from configuration
 *
 * @param {Object} config - Provider configuration
 * @returns {string} 'oauth' or 'saml'
 */
function detectProviderType(config) {
  if (config.type) {
    return config.type.toLowerCase();
  }

  // Infer from config properties
  if (config.clientId || config.clientSecret) {
    return PROVIDER_TYPES.OAUTH;
  }

  if (config.entityId || config.ssoUrl) {
    return PROVIDER_TYPES.SAML;
  }

  return null;
}

/**
 * Creates an Identity Provider Manager instance.
 *
 * @param {Object} options - Manager configuration
 * @param {string} options.baseUrl - Base URL for the application
 * @param {string} [options.callbackPath] - Callback path for authentication
 * @returns {Object} IdP Manager instance
 */
function createIdPManager(options = {}) {
  const { baseUrl, callbackPath = '/auth/callback' } = options;

  // Create underlying provider instances
  const oauthRegistry = createOAuthRegistry();
  const samlProvider = createSAMLProvider({
    entityId: baseUrl,
    callbackUrl: `${baseUrl}${callbackPath}/saml`,
  });

  // Metadata cache
  const metadataCache = new Map();

  // Track registered provider types
  const providerTypes = new Map();

  /**
   * Register an identity provider
   *
   * @param {string} name - Provider name
   * @param {Object} config - Provider configuration
   */
  function registerProvider(name, config) {
    const type = detectProviderType(config);

    if (!type) {
      throw new Error('Unable to detect provider type. Specify type: "oauth" or "saml"');
    }

    if (type !== PROVIDER_TYPES.OAUTH && type !== PROVIDER_TYPES.SAML) {
      throw new Error(`Unsupported provider type: ${type}`);
    }

    if (type === PROVIDER_TYPES.OAUTH) {
      oauthRegistry.registerProvider(name, config);
      providerTypes.set(name.toLowerCase(), PROVIDER_TYPES.OAUTH);
    } else {
      samlProvider.registerIdP(name, config);
      providerTypes.set(name.toLowerCase(), PROVIDER_TYPES.SAML);
    }
  }

  /**
   * Get login URL for a provider
   *
   * @param {string} name - Provider name
   * @param {Object} options - Login options
   * @returns {string} Login URL
   */
  function getLoginUrl(name, options = {}) {
    const normalizedName = name.toLowerCase();

    // Try OAuth first
    const oauthProvider = oauthRegistry.getProvider(normalizedName);
    if (oauthProvider) {
      const params = new URLSearchParams();
      params.set('client_id', oauthProvider.clientId);
      params.set('response_type', 'code');

      if (options.redirectUri) {
        params.set('redirect_uri', options.redirectUri);
      } else {
        params.set('redirect_uri', `${baseUrl}${callbackPath}/${normalizedName}`);
      }

      if (options.state) {
        params.set('state', options.state);
      }

      if (oauthProvider.scopes) {
        params.set('scope', oauthProvider.scopes.join(' '));
      }

      return `${oauthProvider.authUrl}?${params.toString()}`;
    }

    // Try SAML
    const samlIdP = samlProvider.getIdP(normalizedName);
    if (samlIdP) {
      const request = samlProvider.createLoginRequest(normalizedName, {
        relayState: options.relayState || options.state,
        binding: options.binding || 'redirect',
      });
      return request.url;
    }

    throw new Error(`Provider not found: ${name}`);
  }

  /**
   * Handle authentication callback
   *
   * @param {string} name - Provider name
   * @param {Object} params - Callback parameters
   * @returns {Promise<Object>} Authentication result with profile
   */
  async function handleCallback(name, params) {
    const normalizedName = name.toLowerCase();

    // Try OAuth first
    const oauthProvider = oauthRegistry.getProvider(normalizedName);
    if (oauthProvider) {
      return handleOAuthCallback(normalizedName, oauthProvider, params);
    }

    // Try SAML
    const samlIdP = samlProvider.getIdP(normalizedName);
    if (samlIdP) {
      return handleSAMLCallback(normalizedName, params);
    }

    return {
      success: false,
      error: `Provider not found: ${name}`,
    };
  }

  /**
   * Handle OAuth callback
   *
   * @param {string} name - Provider name
   * @param {Object} provider - Provider configuration
   * @param {Object} params - Callback parameters
   * @returns {Promise<Object>} Authentication result
   */
  async function handleOAuthCallback(name, provider, params) {
    const { code, state, redirectUri } = params;

    try {
      // Exchange code for token
      const tokenResponse = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri || `${baseUrl}${callbackPath}/${name}`,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json().catch(() => ({}));
        return {
          success: false,
          error: error.error || 'Failed to exchange authorization code',
        };
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user info
      const userInfo = await fetchUserInfo(name, accessToken);

      // Normalize profile
      const profile = normalizeProfile(name, PROVIDER_TYPES.OAUTH, userInfo);

      return {
        success: true,
        profile,
        tokens: {
          accessToken,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
        },
        state,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle SAML callback
   *
   * @param {string} name - Provider name
   * @param {Object} params - Callback parameters
   * @returns {Promise<Object>} Authentication result
   */
  async function handleSAMLCallback(name, params) {
    const { SAMLResponse, RelayState } = params;

    try {
      const result = await samlProvider.handleLoginResponse(SAMLResponse, {
        idpId: name,
        relayState: RelayState,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.errors ? result.errors.join(', ') : 'SAML authentication failed',
        };
      }

      // Normalize profile
      const profile = normalizeProfile(name, PROVIDER_TYPES.SAML, result.user);

      return {
        success: true,
        profile,
        relayState: RelayState,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Normalize user profile from different providers
   *
   * @param {string} provider - Provider name
   * @param {string} providerType - 'oauth' or 'saml'
   * @param {Object} rawProfile - Raw profile data
   * @returns {Object} Normalized profile
   */
  function normalizeProfile(provider, providerType, rawProfile) {
    if (providerType === PROVIDER_TYPES.OAUTH) {
      return normalizeOAuthProfile(provider, rawProfile);
    } else {
      return normalizeSAMLProfile(provider, rawProfile);
    }
  }

  /**
   * Normalize OAuth profile
   *
   * @param {string} provider - Provider name
   * @param {Object} data - Raw profile data
   * @returns {Object} Normalized profile
   */
  function normalizeOAuthProfile(provider, data) {
    const mapping = OAUTH_PROFILE_MAPPINGS[provider.toLowerCase()] || {
      id: (d) => String(d.id || d.sub),
      email: (d) => d.email,
      name: (d) => d.name || d.login || d.username,
      firstName: (d) => d.given_name || (d.name ? d.name.split(' ')[0] : ''),
      lastName: (d) => d.family_name || (d.name ? d.name.split(' ').slice(1).join(' ') : ''),
      avatarUrl: (d) => d.picture || d.avatar_url || null,
    };

    return {
      id: mapping.id(data),
      email: mapping.email(data),
      name: mapping.name(data),
      firstName: mapping.firstName(data),
      lastName: mapping.lastName(data),
      avatarUrl: mapping.avatarUrl(data),
      provider,
      providerType: PROVIDER_TYPES.OAUTH,
      raw: data,
    };
  }

  /**
   * Normalize SAML profile
   *
   * @param {string} provider - Provider name
   * @param {Object} attrs - SAML attributes
   * @returns {Object} Normalized profile
   */
  function normalizeSAMLProfile(provider, attrs) {
    const email = findSAMLAttribute(attrs, SAML_CLAIMS.email) || attrs.nameId;
    const firstName = findSAMLAttribute(attrs, SAML_CLAIMS.firstName);
    const lastName = findSAMLAttribute(attrs, SAML_CLAIMS.lastName);
    const name = findSAMLAttribute(attrs, SAML_CLAIMS.name) ||
      (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null);

    return {
      id: attrs.nameId || email,
      email,
      name,
      firstName: firstName || null,
      lastName: lastName || null,
      avatarUrl: null,
      provider,
      providerType: PROVIDER_TYPES.SAML,
      raw: attrs,
    };
  }

  /**
   * Fetch user info from OAuth provider
   *
   * @param {string} name - Provider name
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} User info
   */
  async function fetchUserInfo(name, accessToken) {
    const provider = oauthRegistry.getProvider(name);
    if (!provider || !provider.userInfoUrl) {
      throw new Error(`No user info URL configured for provider: ${name}`);
    }

    const response = await fetch(provider.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const userInfo = await response.json();

    // GitHub special case: email might be private
    if (name.toLowerCase() === 'github' && !userInfo.email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        if (primaryEmail) {
          userInfo.email = primaryEmail.email;
        }
      }
    }

    return userInfo;
  }

  /**
   * Cache provider metadata
   *
   * @param {string} name - Provider name
   * @param {Object} metadata - Metadata to cache
   */
  function cacheMetadata(name, metadata) {
    metadataCache.set(name.toLowerCase(), {
      ...metadata,
      cachedAt: metadata.fetchedAt || new Date(),
    });
  }

  /**
   * Get cached metadata
   *
   * @param {string} name - Provider name
   * @returns {Object|null} Cached metadata or null
   */
  function getCachedMetadata(name) {
    return metadataCache.get(name.toLowerCase()) || null;
  }

  /**
   * Check if cached metadata is expired
   *
   * @param {string} name - Provider name
   * @param {number} maxAgeMs - Max age in milliseconds
   * @returns {boolean} True if expired or not cached
   */
  function isMetadataExpired(name, maxAgeMs) {
    const cached = metadataCache.get(name.toLowerCase());
    if (!cached) {
      return true;
    }

    const age = Date.now() - new Date(cached.fetchedAt || cached.cachedAt).getTime();
    return age > maxAgeMs;
  }

  /**
   * Clear cached metadata
   *
   * @param {string} name - Provider name
   */
  function clearMetadataCache(name) {
    metadataCache.delete(name.toLowerCase());
  }

  /**
   * Get provider by name
   *
   * @param {string} name - Provider name
   * @returns {Object|null} Provider info or null
   */
  function getProvider(name) {
    const normalizedName = name.toLowerCase();

    // Try OAuth first
    const oauthProvider = oauthRegistry.getProvider(normalizedName);
    if (oauthProvider) {
      return {
        name: normalizedName,
        type: PROVIDER_TYPES.OAUTH,
        config: oauthProvider,
      };
    }

    // Try SAML
    const samlIdP = samlProvider.getIdP(normalizedName);
    if (samlIdP) {
      return {
        name: normalizedName,
        type: PROVIDER_TYPES.SAML,
        config: samlIdP,
      };
    }

    return null;
  }

  /**
   * List all registered providers
   *
   * @returns {Object[]} List of providers with names and types
   */
  function listProviders() {
    const providers = [];

    // Get OAuth providers
    const oauthProviders = oauthRegistry.listProviders();
    for (const provider of oauthProviders) {
      providers.push({
        name: provider.name,
        type: PROVIDER_TYPES.OAUTH,
      });
    }

    // Get SAML providers
    const samlIdPs = samlProvider.listIdPs();
    for (const idpId of samlIdPs) {
      providers.push({
        name: idpId,
        type: PROVIDER_TYPES.SAML,
      });
    }

    return providers;
  }

  /**
   * Remove a provider
   *
   * @param {string} name - Provider name
   */
  function removeProvider(name) {
    const normalizedName = name.toLowerCase();

    if (oauthRegistry.hasProvider(normalizedName)) {
      oauthRegistry.removeProvider(normalizedName);
      providerTypes.delete(normalizedName);
    } else if (samlProvider.getIdP(normalizedName)) {
      samlProvider.removeIdP(normalizedName);
      providerTypes.delete(normalizedName);
    }

    // Also clear metadata cache
    clearMetadataCache(normalizedName);
  }

  return {
    // Provider management
    registerProvider,
    getProvider,
    listProviders,
    removeProvider,

    // Authentication
    getLoginUrl,
    handleCallback,
    fetchUserInfo,

    // Profile normalization
    normalizeProfile,

    // Metadata caching
    cacheMetadata,
    getCachedMetadata,
    isMetadataExpired,
    clearMetadataCache,

    // Expose underlying providers for advanced use
    oauthRegistry,
    samlProvider,
  };
}

module.exports = {
  createIdPManager,
  PROVIDER_TYPES,
};
