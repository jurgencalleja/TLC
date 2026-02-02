/**
 * OAuth 2.0 Flow Handler
 *
 * Handles OAuth 2.0 authorization code flow with PKCE support.
 * Uses oauth-registry for provider configuration.
 */

const crypto = require('crypto');

/**
 * Default state expiry time (10 minutes).
 */
const DEFAULT_STATE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Generates PKCE code verifier and challenge.
 *
 * @returns {object} PKCE parameters
 * @returns {string} returns.codeVerifier - Random 43-128 character string
 * @returns {string} returns.codeChallenge - base64url(sha256(codeVerifier))
 * @returns {string} returns.codeChallengeMethod - Always 'S256'
 */
function generatePKCE() {
  // Generate random bytes and encode as base64url (43-128 chars)
  // 32 bytes = 43 base64 chars, 96 bytes = 128 base64 chars
  const verifierBytes = crypto.randomBytes(32);
  const codeVerifier = verifierBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // SHA256 hash of verifier, then base64url encode
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Generates an OAuth state parameter with CSRF protection.
 *
 * State format (base64 encoded JSON):
 * {
 *   nonce: 32-char hex string,
 *   provider: provider name,
 *   timestamp: epoch ms,
 *   codeVerifier: PKCE verifier (if usePKCE)
 * }
 *
 * @param {string} provider - Provider name
 * @param {object} [options] - Options
 * @param {boolean} [options.usePKCE] - Include PKCE code verifier
 * @returns {string} Base64 encoded state
 */
function generateState(provider, options = {}) {
  const stateData = {
    nonce: crypto.randomBytes(16).toString('hex'),
    provider,
    timestamp: Date.now(),
  };

  if (options.usePKCE) {
    const pkce = generatePKCE();
    stateData.codeVerifier = pkce.codeVerifier;
  }

  return Buffer.from(JSON.stringify(stateData)).toString('base64');
}

/**
 * Validates an OAuth state parameter.
 *
 * @param {string} state - Base64 encoded state from callback
 * @param {string} expectedProvider - Expected provider name
 * @param {object} [options] - Options
 * @param {number} [options.maxAgeMs] - Maximum state age in ms (default 10 min)
 * @returns {object} Validation result
 * @returns {boolean} returns.valid - Whether state is valid
 * @returns {string} [returns.error] - Error message if invalid
 * @returns {string} [returns.provider] - Provider from state
 * @returns {string} [returns.codeVerifier] - PKCE code verifier if present
 */
function validateState(state, expectedProvider, options = {}) {
  const maxAgeMs = options.maxAgeMs || DEFAULT_STATE_EXPIRY_MS;

  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));

    // Check provider matches
    if (decoded.provider !== expectedProvider) {
      return {
        valid: false,
        error: 'State provider mismatch - possible CSRF attack',
      };
    }

    // Check expiry
    const age = Date.now() - decoded.timestamp;
    if (age > maxAgeMs) {
      return {
        valid: false,
        error: 'State expired',
      };
    }

    return {
      valid: true,
      provider: decoded.provider,
      codeVerifier: decoded.codeVerifier,
    };
  } catch (err) {
    return {
      valid: false,
      error: 'Invalid state format',
    };
  }
}

/**
 * Creates an OAuth flow handler.
 *
 * @param {object} registry - OAuth registry instance from createOAuthRegistry()
 * @returns {object} OAuth flow handler
 */
function createOAuthFlow(registry) {
  /**
   * Generates an authorization URL for the OAuth flow.
   *
   * @param {string} providerName - Provider name
   * @param {object} options - Options
   * @param {string} options.redirectUri - Callback URL
   * @param {string[]} [options.scopes] - Override default scopes
   * @param {boolean} [options.usePKCE] - Use PKCE extension
   * @returns {object} Authorization data
   * @returns {string} returns.url - Authorization URL
   * @returns {string} returns.state - State parameter for validation
   * @returns {string} [returns.codeVerifier] - PKCE code verifier (if usePKCE)
   */
  function getAuthorizationUrl(providerName, options = {}) {
    const provider = registry.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    if (!options.redirectUri) {
      throw new Error('redirectUri is required');
    }

    // Generate state (with PKCE if requested)
    const state = generateState(providerName, { usePKCE: options.usePKCE });

    // Build URL params
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: options.redirectUri,
      response_type: 'code',
      state,
    });

    // Add scopes
    const scopes = options.scopes || provider.scopes || [];
    if (scopes.length > 0) {
      params.set('scope', scopes.join(' '));
    }

    // Add PKCE if requested
    let codeVerifier;
    if (options.usePKCE) {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      codeVerifier = stateData.codeVerifier;

      // Generate challenge from verifier
      const hash = crypto.createHash('sha256').update(codeVerifier).digest();
      const codeChallenge = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    const url = `${provider.authUrl}?${params.toString()}`;

    const result = { url, state };
    if (codeVerifier) {
      result.codeVerifier = codeVerifier;
    }

    return result;
  }

  /**
   * Exchanges an authorization code for tokens.
   *
   * @param {string} providerName - Provider name
   * @param {object} options - Options
   * @param {string} options.code - Authorization code
   * @param {string} options.redirectUri - Redirect URI (must match authorize request)
   * @param {string} [options.codeVerifier] - PKCE code verifier
   * @returns {Promise<object>} Token response
   */
  async function exchangeCode(providerName, options) {
    const provider = registry.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: options.code,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uri: options.redirectUri,
    });

    if (options.codeVerifier) {
      body.set('code_verifier', options.codeVerifier);
    }

    let response;
    try {
      response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });
    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`${data.error}: ${data.error_description || 'Token exchange failed'}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope,
    };
  }

  /**
   * Refreshes an access token using a refresh token.
   *
   * @param {string} providerName - Provider name
   * @param {object} options - Options
   * @param {string} options.refreshToken - Refresh token
   * @returns {Promise<object>} New token response
   */
  async function refreshToken(providerName, options) {
    const provider = registry.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: options.refreshToken,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
    });

    let response;
    try {
      response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });
    } catch (err) {
      throw new Error(`Network error: ${err.message}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`${data.error}: ${data.error_description || 'Token refresh failed'}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope,
    };
  }

  /**
   * Handles an OAuth callback request.
   *
   * @param {string} providerName - Expected provider name
   * @param {object} params - Callback parameters
   * @param {string} [params.code] - Authorization code (if successful)
   * @param {string} params.state - State parameter
   * @param {string} params.redirectUri - Redirect URI for token exchange
   * @param {string} [params.error] - Error code (if failed)
   * @param {string} [params.error_description] - Error description
   * @returns {Promise<object>} Callback result
   */
  async function handleCallback(providerName, params) {
    // Check for OAuth error in callback
    if (params.error) {
      return {
        success: false,
        error: params.error,
        errorDescription: params.error_description,
      };
    }

    // Validate state
    const stateResult = validateState(params.state, providerName);
    if (!stateResult.valid) {
      return {
        success: false,
        error: stateResult.error,
      };
    }

    // Exchange code for tokens
    try {
      const tokens = await exchangeCode(providerName, {
        code: params.code,
        redirectUri: params.redirectUri,
        codeVerifier: stateResult.codeVerifier,
      });

      return {
        success: true,
        provider: providerName,
        tokens,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  return {
    getAuthorizationUrl,
    exchangeCode,
    refreshToken,
    handleCallback,
  };
}

module.exports = {
  createOAuthFlow,
  generateState,
  validateState,
  generatePKCE,
};
