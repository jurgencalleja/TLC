/**
 * SSO Session Manager
 *
 * Enhanced session management for SSO with IdP integration.
 * Handles session creation from IdP authentication, token storage,
 * session timeout, single logout, refresh, and concurrent session limits.
 */

const crypto = require('crypto');

/**
 * Default session configuration
 */
const SESSION_DEFAULTS = {
  sessionDuration: 86400000, // 24 hours in milliseconds
  maxConcurrentSessions: 5,
  tokenRefreshThreshold: 300000, // 5 minutes before token expiry
};

/**
 * Generate a UUID for session IDs
 * @returns {string} UUID
 */
function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * Creates an SSO Session Manager instance.
 *
 * @param {Object} options - Manager configuration
 * @param {Object} options.idpManager - IdP Manager instance
 * @param {Object} [options.mfaStore] - MFA Store instance
 * @param {number} [options.sessionDuration] - Session duration in milliseconds
 * @param {number} [options.maxConcurrentSessions] - Max concurrent sessions per user
 * @param {number} [options.tokenRefreshThreshold] - Time before token expiry to trigger refresh
 * @returns {Object} SSO Session Manager instance
 */
function createSsoSessionManager(options = {}) {
  const {
    idpManager,
    mfaStore,
    sessionDuration = SESSION_DEFAULTS.sessionDuration,
    maxConcurrentSessions = SESSION_DEFAULTS.maxConcurrentSessions,
    tokenRefreshThreshold = SESSION_DEFAULTS.tokenRefreshThreshold,
  } = options;

  // In-memory session store
  // Key: session ID, Value: session object
  const sessions = new Map();

  // Index by user ID for efficient lookup
  // Key: user ID, Value: Set of session IDs
  const userSessions = new Map();

  // Index by access token for efficient lookup
  // Key: access token, Value: session ID
  const tokenIndex = new Map();

  /**
   * Create a session from IdP authentication result
   *
   * @param {string} provider - Provider name (e.g., 'github', 'google')
   * @param {Object} authResult - Authentication result from IdP
   * @param {Object} metadata - Session metadata
   * @returns {Promise<Object>} Created session
   */
  async function createSession(provider, authResult, metadata = {}) {
    const { profile, tokens = {}, providerType } = authResult;
    const now = Date.now();

    // Determine MFA verification status
    // mfaVerified is true only if user has MFA enabled AND verified with a code
    let mfaVerified = false;
    if (mfaStore && metadata.mfaCode) {
      const mfaStatus = await mfaStore.getMfaStatus(profile.id);
      if (mfaStatus.enabled) {
        const mfaResult = await mfaStore.verifyMfa(profile.id, metadata.mfaCode);
        mfaVerified = mfaResult.valid;
      }
    }
    // If no mfaCode provided or MFA not enabled, mfaVerified stays false

    // Calculate token expiry
    let tokenExpiry = null;
    if (tokens.expiresIn) {
      tokenExpiry = now + (tokens.expiresIn * 1000);
    }

    const session = {
      id: generateSessionId(),
      userId: profile.id,
      provider,
      providerType: providerType || 'oauth',
      accessToken: tokens.accessToken || null,
      refreshToken: tokens.refreshToken || null,
      tokenExpiry,
      createdAt: now,
      expiresAt: now + sessionDuration,
      lastActivityAt: now,
      userAgent: metadata.userAgent || null,
      ipAddress: metadata.ipAddress || null,
      mfaVerified: mfaVerified === true ? true : false,
      // Store additional profile data for SAML logout
      nameId: profile.nameId || null,
    };

    // Store session
    sessions.set(session.id, session);

    // Update user sessions index
    if (!userSessions.has(session.userId)) {
      userSessions.set(session.userId, new Set());
    }
    userSessions.get(session.userId).add(session.id);

    // Update token index
    if (session.accessToken) {
      tokenIndex.set(session.accessToken, session.id);
    }

    // Enforce session limit
    await enforceSessionLimitForUser(session.userId);

    return session;
  }

  /**
   * Enforce concurrent session limit for a user
   *
   * @param {string} userId - User ID
   */
  async function enforceSessionLimitForUser(userId) {
    const userSessionIds = userSessions.get(userId);
    if (!userSessionIds || userSessionIds.size <= maxConcurrentSessions) {
      return;
    }

    // Get all sessions for this user, sorted by creation time (oldest first)
    const userSessionList = Array.from(userSessionIds)
      .map(id => sessions.get(id))
      .filter(s => s !== undefined)
      .sort((a, b) => a.createdAt - b.createdAt);

    // Remove oldest sessions to enforce limit
    const sessionsToRemove = userSessionList.slice(0, userSessionList.length - maxConcurrentSessions);

    for (const session of sessionsToRemove) {
      await destroySession(session.id);
    }
  }

  /**
   * Get a session by ID
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session or null if not found/expired
   */
  async function getSession(sessionId) {
    const session = sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      return null;
    }

    // Update last activity
    session.lastActivityAt = Date.now();

    return session;
  }

  /**
   * Get a session by access token
   *
   * @param {string} accessToken - Access token
   * @returns {Promise<Object|null>} Session or null if not found
   */
  async function getSessionByToken(accessToken) {
    const sessionId = tokenIndex.get(accessToken);
    if (!sessionId) {
      return null;
    }

    return getSession(sessionId);
  }

  /**
   * Refresh a session
   *
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Refreshed session or null
   */
  async function refreshSession(sessionId) {
    const session = sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      return null;
    }

    const now = Date.now();

    // Extend session lifetime
    session.expiresAt = now + sessionDuration;
    session.lastActivityAt = now;

    // Check if IdP tokens need refreshing
    if (session.tokenExpiry && session.refreshToken) {
      const timeUntilExpiry = session.tokenExpiry - now;

      if (timeUntilExpiry <= tokenRefreshThreshold) {
        await refreshIdpTokens(session);
      }
    }

    return session;
  }

  /**
   * Refresh IdP tokens for a session
   *
   * @param {Object} session - Session object
   */
  async function refreshIdpTokens(session) {
    if (!idpManager || !idpManager.oauthRegistry) {
      return;
    }

    const provider = idpManager.oauthRegistry.getProvider(session.provider);
    if (!provider || !provider.tokenUrl) {
      return;
    }

    try {
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: session.refreshToken,
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
        }),
      });

      if (response.ok) {
        const tokenData = await response.json();

        // Remove old token from index
        if (session.accessToken) {
          tokenIndex.delete(session.accessToken);
        }

        // Update session with new tokens
        session.accessToken = tokenData.access_token;
        if (tokenData.refresh_token) {
          session.refreshToken = tokenData.refresh_token;
        }
        if (tokenData.expires_in) {
          session.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
        }

        // Update token index
        tokenIndex.set(session.accessToken, session.id);
      }
    } catch (error) {
      // Token refresh failed, session continues with old tokens
      console.error('Token refresh failed:', error.message);
    }
  }

  /**
   * Destroy a session
   *
   * @param {string} sessionId - Session ID
   * @param {Object} [options] - Destroy options
   * @param {boolean} [options.triggerIdpLogout] - Trigger IdP logout
   * @returns {Promise<Object>} Result with optional logout URL
   */
  async function destroySession(sessionId, options = {}) {
    const session = sessions.get(sessionId);

    const result = { success: true };

    if (!session) {
      return result;
    }

    // Handle IdP logout if requested
    if (options.triggerIdpLogout && idpManager) {
      // SAML logout
      if (session.providerType === 'saml' && idpManager.samlProvider) {
        const idp = idpManager.samlProvider.getIdP(session.provider);
        if (idp && idp.sloUrl) {
          const logoutRequest = idpManager.samlProvider.createLogoutRequest(session.provider, {
            nameId: session.nameId,
            sessionIndex: session.id,
          });
          result.logoutUrl = logoutRequest.url;
        }
      }

      // OAuth token revocation
      if (session.providerType !== 'saml' && idpManager.oauthRegistry) {
        const provider = idpManager.oauthRegistry.getProvider(session.provider);
        if (provider && provider.revokeUrl && session.accessToken) {
          try {
            await fetch(provider.revokeUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                token: session.accessToken,
                client_id: provider.clientId,
                client_secret: provider.clientSecret,
              }),
            });
          } catch (error) {
            // Token revocation failed, continue with session destruction
            console.error('Token revocation failed:', error.message);
          }
        }
      }
    }

    // Remove from token index
    if (session.accessToken) {
      tokenIndex.delete(session.accessToken);
    }

    // Remove from user sessions index
    const userSessionSet = userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        userSessions.delete(session.userId);
      }
    }

    // Remove session
    sessions.delete(sessionId);

    return result;
  }

  /**
   * Get all active sessions for a user
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>} List of active sessions
   */
  async function getActiveSessions(userId) {
    const userSessionIds = userSessions.get(userId);
    if (!userSessionIds) {
      return [];
    }

    const now = Date.now();
    const activeSessions = [];

    for (const sessionId of userSessionIds) {
      const session = sessions.get(sessionId);
      if (session && now <= session.expiresAt) {
        // Return sanitized session data (no tokens in list view)
        activeSessions.push({
          id: session.id,
          userId: session.userId,
          provider: session.provider,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          lastActivityAt: session.lastActivityAt,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          mfaVerified: session.mfaVerified,
        });
      }
    }

    return activeSessions;
  }

  /**
   * Cleanup expired sessions
   *
   * @returns {Promise<number>} Number of sessions removed
   */
  async function cleanupExpiredSessions() {
    const now = Date.now();
    let removed = 0;

    for (const [sessionId, session] of sessions) {
      if (now > session.expiresAt) {
        await destroySession(sessionId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Destroy all sessions for a user
   *
   * @param {string} userId - User ID
   * @param {Object} [options] - Destroy options
   * @returns {Promise<number>} Number of sessions destroyed
   */
  async function destroyAllUserSessions(userId, options = {}) {
    const userSessionIds = userSessions.get(userId);
    if (!userSessionIds) {
      return 0;
    }

    // Copy the set since we'll be modifying it during iteration
    const sessionIds = Array.from(userSessionIds);
    let removed = 0;

    for (const sessionId of sessionIds) {
      await destroySession(sessionId, options);
      removed++;
    }

    return removed;
  }

  /**
   * Get session statistics
   *
   * @returns {Promise<Object>} Session statistics
   */
  async function getSessionStats() {
    const now = Date.now();
    const byProvider = {};
    const uniqueUsers = new Set();
    let totalSessions = 0;

    for (const session of sessions.values()) {
      if (now <= session.expiresAt) {
        totalSessions++;
        uniqueUsers.add(session.userId);

        if (!byProvider[session.provider]) {
          byProvider[session.provider] = 0;
        }
        byProvider[session.provider]++;
      }
    }

    return {
      totalSessions,
      uniqueUsers: uniqueUsers.size,
      byProvider,
    };
  }

  return {
    // Session lifecycle
    createSession,
    getSession,
    getSessionByToken,
    refreshSession,
    destroySession,

    // User session management
    getActiveSessions,
    destroyAllUserSessions,

    // Maintenance
    cleanupExpiredSessions,

    // Statistics
    getSessionStats,
  };
}

module.exports = {
  createSsoSessionManager,
  SESSION_DEFAULTS,
};
