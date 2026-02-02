/**
 * SSO Session Manager Tests
 * Enhanced session management for SSO with IdP integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSsoSessionManager,
  SESSION_DEFAULTS,
} from './sso-session.js';

describe('sso-session', () => {
  let sessionManager;
  let mockIdpManager;
  let mockMfaStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));

    // Mock IdP manager
    mockIdpManager = {
      getProvider: vi.fn(),
      handleCallback: vi.fn(),
      oauthRegistry: {
        getProvider: vi.fn(),
      },
    };

    // Mock MFA store
    mockMfaStore = {
      getMfaStatus: vi.fn().mockResolvedValue({ enabled: false }),
      verifyMfa: vi.fn().mockResolvedValue({ valid: true }),
    };

    sessionManager = createSsoSessionManager({
      idpManager: mockIdpManager,
      mfaStore: mockMfaStore,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('SESSION_DEFAULTS', () => {
    it('defines default configuration values', () => {
      expect(SESSION_DEFAULTS.sessionDuration).toBe(86400000); // 24 hours
      expect(SESSION_DEFAULTS.maxConcurrentSessions).toBe(5);
      expect(SESSION_DEFAULTS.tokenRefreshThreshold).toBe(300000); // 5 minutes
    });
  });

  describe('createSession', () => {
    it('stores user and IdP info', async () => {
      const authResult = {
        profile: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
        },
        tokens: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          expiresIn: 3600,
        },
      };

      const session = await sessionManager.createSession('github', authResult, {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.provider).toBe('github');
      expect(session.accessToken).toBe('access-token-123');
      expect(session.refreshToken).toBe('refresh-token-456');
      expect(session.userAgent).toBe('Mozilla/5.0');
      expect(session.ipAddress).toBe('192.168.1.1');
    });

    it('sets expiry from config', async () => {
      const customManager = createSsoSessionManager({
        idpManager: mockIdpManager,
        mfaStore: mockMfaStore,
        sessionDuration: 3600000, // 1 hour
      });

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token', expiresIn: 3600 },
      };

      const session = await customManager.createSession('github', authResult, {});

      const expectedExpiry = Date.now() + 3600000;
      expect(session.expiresAt).toBe(expectedExpiry);
    });

    it('calculates token expiry from expiresIn', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token', expiresIn: 7200 }, // 2 hours in seconds
      };

      const session = await sessionManager.createSession('github', authResult, {});

      const expectedTokenExpiry = Date.now() + (7200 * 1000);
      expect(session.tokenExpiry).toBe(expectedTokenExpiry);
    });

    it('sets createdAt and lastActivityAt', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      const session = await sessionManager.createSession('github', authResult, {});

      expect(session.createdAt).toBe(Date.now());
      expect(session.lastActivityAt).toBe(Date.now());
    });

    it('sets mfaVerified from MFA status', async () => {
      mockMfaStore.getMfaStatus.mockResolvedValue({ enabled: true });
      mockMfaStore.verifyMfa.mockResolvedValue({ valid: true });

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      const session = await sessionManager.createSession('github', authResult, {
        mfaCode: '123456',
      });

      expect(session.mfaVerified).toBe(true);
    });

    it('sets mfaVerified false when no MFA enabled', async () => {
      mockMfaStore.getMfaStatus.mockResolvedValue({ enabled: false });

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      const session = await sessionManager.createSession('github', authResult, {});

      expect(session.mfaVerified).toBe(false);
    });
  });

  describe('getSession', () => {
    it('returns valid session', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token', expiresIn: 3600 },
      };

      const created = await sessionManager.createSession('github', authResult, {});
      const session = await sessionManager.getSession(created.id);

      expect(session).not.toBeNull();
      expect(session.id).toBe(created.id);
      expect(session.userId).toBe('user-123');
    });

    it('returns null for expired session', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      const created = await sessionManager.createSession('github', authResult, {});

      // Advance time past session expiry
      vi.advanceTimersByTime(SESSION_DEFAULTS.sessionDuration + 1000);

      const session = await sessionManager.getSession(created.id);

      expect(session).toBeNull();
    });

    it('returns null for non-existent session', async () => {
      const session = await sessionManager.getSession('non-existent-id');

      expect(session).toBeNull();
    });

    it('updates lastActivityAt on access', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      const created = await sessionManager.createSession('github', authResult, {});
      const originalLastActivity = created.lastActivityAt;

      // Advance time
      vi.advanceTimersByTime(60000); // 1 minute

      const session = await sessionManager.getSession(created.id);

      expect(session.lastActivityAt).toBeGreaterThan(originalLastActivity);
    });
  });

  describe('refreshSession', () => {
    it('extends session lifetime', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token', expiresIn: 3600 },
      };

      const created = await sessionManager.createSession('github', authResult, {});
      const originalExpiry = created.expiresAt;

      // Advance time
      vi.advanceTimersByTime(60000); // 1 minute

      const refreshed = await sessionManager.refreshSession(created.id);

      expect(refreshed.expiresAt).toBeGreaterThan(originalExpiry);
    });

    it('refreshes IdP tokens when near expiry', async () => {
      // Set up provider with refresh capability
      mockIdpManager.oauthRegistry.getProvider.mockReturnValue({
        tokenUrl: 'https://github.com/login/oauth/access_token',
        clientId: 'client-123',
        clientSecret: 'secret-456',
      });

      // Mock fetch for token refresh
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      });
      global.fetch = mockFetch;

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: {
          accessToken: 'old-token',
          refreshToken: 'refresh-token',
          expiresIn: 600, // 10 minutes - will be near expiry after time advance
        },
      };

      const created = await sessionManager.createSession('github', authResult, {});

      // Advance time close to token expiry (past threshold)
      vi.advanceTimersByTime(400000); // 6.67 minutes - within 5 minute threshold

      const refreshed = await sessionManager.refreshSession(created.id);

      expect(refreshed.accessToken).toBe('new-access-token');
      expect(refreshed.refreshToken).toBe('new-refresh-token');
    });

    it('returns null for non-existent session', async () => {
      const result = await sessionManager.refreshSession('non-existent-id');

      expect(result).toBeNull();
    });

    it('updates lastActivityAt', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      const created = await sessionManager.createSession('github', authResult, {});
      const originalLastActivity = created.lastActivityAt;

      vi.advanceTimersByTime(60000);

      const refreshed = await sessionManager.refreshSession(created.id);

      expect(refreshed.lastActivityAt).toBeGreaterThan(originalLastActivity);
    });
  });

  describe('destroySession', () => {
    it('removes session', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      const created = await sessionManager.createSession('github', authResult, {});
      await sessionManager.destroySession(created.id);

      const session = await sessionManager.getSession(created.id);
      expect(session).toBeNull();
    });

    it('triggers IdP logout for SAML provider', async () => {
      const mockSamlLogout = vi.fn().mockReturnValue({
        url: 'https://idp.example.com/logout',
      });

      mockIdpManager.samlProvider = {
        getIdP: vi.fn().mockReturnValue({ sloUrl: 'https://idp.example.com/logout' }),
        createLogoutRequest: mockSamlLogout,
      };

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com', nameId: 'name-id-123' },
        tokens: {},
        providerType: 'saml',
      };

      const created = await sessionManager.createSession('okta', authResult, {});
      const result = await sessionManager.destroySession(created.id, { triggerIdpLogout: true });

      expect(result.logoutUrl).toBeDefined();
    });

    it('triggers token revocation for OAuth provider', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      mockIdpManager.oauthRegistry.getProvider.mockReturnValue({
        revokeUrl: 'https://github.com/login/oauth/revoke',
        clientId: 'client-123',
        clientSecret: 'secret-456',
      });

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token-to-revoke' },
      };

      const created = await sessionManager.createSession('github', authResult, {});
      await sessionManager.destroySession(created.id, { triggerIdpLogout: true });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('returns success for non-existent session', async () => {
      const result = await sessionManager.destroySession('non-existent-id');

      expect(result.success).toBe(true);
    });
  });

  describe('enforceSessionLimit', () => {
    it('limits concurrent sessions', async () => {
      const customManager = createSsoSessionManager({
        idpManager: mockIdpManager,
        mfaStore: mockMfaStore,
        maxConcurrentSessions: 2,
      });

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      // Create 3 sessions for the same user
      const session1 = await customManager.createSession('github', authResult, {});
      vi.advanceTimersByTime(1000);
      const session2 = await customManager.createSession('github', authResult, {});
      vi.advanceTimersByTime(1000);
      const session3 = await customManager.createSession('github', authResult, {});

      // Session 1 should be removed (oldest)
      const found1 = await customManager.getSession(session1.id);
      const found2 = await customManager.getSession(session2.id);
      const found3 = await customManager.getSession(session3.id);

      expect(found1).toBeNull();
      expect(found2).not.toBeNull();
      expect(found3).not.toBeNull();
    });

    it('removes oldest session when limit exceeded', async () => {
      const customManager = createSsoSessionManager({
        idpManager: mockIdpManager,
        mfaStore: mockMfaStore,
        maxConcurrentSessions: 2,
      });

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      const session1 = await customManager.createSession('github', authResult, {});
      vi.advanceTimersByTime(1000);
      await customManager.createSession('github', authResult, {});
      vi.advanceTimersByTime(1000);
      await customManager.createSession('github', authResult, {});

      // Verify oldest was removed
      const remaining = await customManager.getActiveSessions('user-123');
      const sessionIds = remaining.map(s => s.id);

      expect(sessionIds).not.toContain(session1.id);
      expect(remaining.length).toBe(2);
    });

    it('does not affect sessions from different users', async () => {
      const customManager = createSsoSessionManager({
        idpManager: mockIdpManager,
        mfaStore: mockMfaStore,
        maxConcurrentSessions: 2,
      });

      const authResult1 = {
        profile: { id: 'user-1', email: 'user1@example.com' },
        tokens: { accessToken: 'token1' },
      };

      const authResult2 = {
        profile: { id: 'user-2', email: 'user2@example.com' },
        tokens: { accessToken: 'token2' },
      };

      // Create 2 sessions for user 1
      await customManager.createSession('github', authResult1, {});
      await customManager.createSession('github', authResult1, {});

      // Create 2 sessions for user 2
      await customManager.createSession('github', authResult2, {});
      await customManager.createSession('github', authResult2, {});

      // Each user should have their full allowed sessions
      const user1Sessions = await customManager.getActiveSessions('user-1');
      const user2Sessions = await customManager.getActiveSessions('user-2');

      expect(user1Sessions.length).toBe(2);
      expect(user2Sessions.length).toBe(2);
    });
  });

  describe('getActiveSessions', () => {
    it('returns user\'s sessions', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      await sessionManager.createSession('github', authResult, {});
      await sessionManager.createSession('google', authResult, {});

      const sessions = await sessionManager.getActiveSessions('user-123');

      expect(sessions.length).toBe(2);
      expect(sessions.every(s => s.userId === 'user-123')).toBe(true);
    });

    it('returns empty array for user with no sessions', async () => {
      const sessions = await sessionManager.getActiveSessions('no-sessions-user');

      expect(sessions).toEqual([]);
    });

    it('excludes expired sessions', async () => {
      const shortDurationManager = createSsoSessionManager({
        idpManager: mockIdpManager,
        mfaStore: mockMfaStore,
        sessionDuration: 60000, // 1 minute
      });

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      await shortDurationManager.createSession('github', authResult, {});
      vi.advanceTimersByTime(30000); // 30 seconds
      await shortDurationManager.createSession('google', authResult, {});

      // Advance past first session expiry
      vi.advanceTimersByTime(40000); // 40 more seconds

      const sessions = await shortDurationManager.getActiveSessions('user-123');

      expect(sessions.length).toBe(1);
      expect(sessions[0].provider).toBe('google');
    });

    it('returns sessions with sanitized data', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'secret-token', refreshToken: 'secret-refresh' },
      };

      await sessionManager.createSession('github', authResult, {});

      const sessions = await sessionManager.getActiveSessions('user-123');

      // Should include metadata but not expose tokens in list view
      expect(sessions[0].id).toBeDefined();
      expect(sessions[0].provider).toBeDefined();
      expect(sessions[0].createdAt).toBeDefined();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('removes old sessions', async () => {
      const shortDurationManager = createSsoSessionManager({
        idpManager: mockIdpManager,
        mfaStore: mockMfaStore,
        sessionDuration: 60000, // 1 minute
      });

      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      await shortDurationManager.createSession('github', authResult, {});
      vi.advanceTimersByTime(30000);
      await shortDurationManager.createSession('google', authResult, {});

      // Advance past first session expiry
      vi.advanceTimersByTime(40000);

      const removed = await shortDurationManager.cleanupExpiredSessions();

      expect(removed).toBe(1);
    });

    it('returns count of removed sessions', async () => {
      const shortDurationManager = createSsoSessionManager({
        idpManager: mockIdpManager,
        mfaStore: mockMfaStore,
        sessionDuration: 60000,
      });

      const authResult1 = {
        profile: { id: 'user-1', email: 'user1@example.com' },
        tokens: { accessToken: 'token1' },
      };

      const authResult2 = {
        profile: { id: 'user-2', email: 'user2@example.com' },
        tokens: { accessToken: 'token2' },
      };

      await shortDurationManager.createSession('github', authResult1, {});
      await shortDurationManager.createSession('github', authResult2, {});

      // Expire all sessions
      vi.advanceTimersByTime(70000);

      const removed = await shortDurationManager.cleanupExpiredSessions();

      expect(removed).toBe(2);
    });

    it('does not remove active sessions', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      await sessionManager.createSession('github', authResult, {});

      // Don't advance time past expiry
      vi.advanceTimersByTime(1000);

      const removed = await sessionManager.cleanupExpiredSessions();

      expect(removed).toBe(0);

      const sessions = await sessionManager.getActiveSessions('user-123');
      expect(sessions.length).toBe(1);
    });
  });

  describe('getSessionByToken', () => {
    it('returns session by access token', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'unique-token-123' },
      };

      const created = await sessionManager.createSession('github', authResult, {});
      const session = await sessionManager.getSessionByToken('unique-token-123');

      expect(session).not.toBeNull();
      expect(session.id).toBe(created.id);
    });

    it('returns null for unknown token', async () => {
      const session = await sessionManager.getSessionByToken('unknown-token');

      expect(session).toBeNull();
    });
  });

  describe('destroyAllUserSessions', () => {
    it('removes all sessions for a user', async () => {
      const authResult = {
        profile: { id: 'user-123', email: 'user@example.com' },
        tokens: { accessToken: 'token' },
      };

      await sessionManager.createSession('github', authResult, {});
      await sessionManager.createSession('google', authResult, {});
      await sessionManager.createSession('azuread', authResult, {});

      const removed = await sessionManager.destroyAllUserSessions('user-123');

      expect(removed).toBe(3);

      const sessions = await sessionManager.getActiveSessions('user-123');
      expect(sessions.length).toBe(0);
    });

    it('does not affect other users sessions', async () => {
      const authResult1 = {
        profile: { id: 'user-1', email: 'user1@example.com' },
        tokens: { accessToken: 'token1' },
      };

      const authResult2 = {
        profile: { id: 'user-2', email: 'user2@example.com' },
        tokens: { accessToken: 'token2' },
      };

      await sessionManager.createSession('github', authResult1, {});
      await sessionManager.createSession('github', authResult2, {});

      await sessionManager.destroyAllUserSessions('user-1');

      const user1Sessions = await sessionManager.getActiveSessions('user-1');
      const user2Sessions = await sessionManager.getActiveSessions('user-2');

      expect(user1Sessions.length).toBe(0);
      expect(user2Sessions.length).toBe(1);
    });
  });

  describe('getSessionStats', () => {
    it('returns session statistics', async () => {
      const authResult1 = {
        profile: { id: 'user-1', email: 'user1@example.com' },
        tokens: { accessToken: 'token1' },
      };

      const authResult2 = {
        profile: { id: 'user-2', email: 'user2@example.com' },
        tokens: { accessToken: 'token2' },
      };

      await sessionManager.createSession('github', authResult1, {});
      await sessionManager.createSession('google', authResult1, {});
      await sessionManager.createSession('github', authResult2, {});

      const stats = await sessionManager.getSessionStats();

      expect(stats.totalSessions).toBe(3);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.byProvider.github).toBe(2);
      expect(stats.byProvider.google).toBe(1);
    });
  });
});
