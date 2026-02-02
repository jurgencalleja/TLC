import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createOAuthFlow,
  generateState,
  validateState,
  generatePKCE,
} from './oauth-flow.js';
import { createOAuthRegistry } from './oauth-registry.js';

describe('oauth-flow', () => {
  let registry;
  let oauthFlow;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T12:00:00Z'));

    registry = createOAuthRegistry();
    registry.registerProvider('github', {
      clientId: 'test-github-client',
      clientSecret: 'test-github-secret',
    });
    registry.registerProvider('google', {
      clientId: 'test-google-client',
      clientSecret: 'test-google-secret',
    });

    oauthFlow = createOAuthFlow(registry);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('generateState', () => {
    it('creates state with nonce and timestamp', () => {
      const state = generateState('github');
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));

      expect(decoded.nonce).toBeDefined();
      expect(decoded.nonce).toHaveLength(32); // 16 bytes hex = 32 chars
      expect(decoded.provider).toBe('github');
      expect(decoded.timestamp).toBe(Date.now());
    });

    it('includes code verifier for PKCE', () => {
      const state = generateState('github', { usePKCE: true });
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));

      expect(decoded.codeVerifier).toBeDefined();
      expect(decoded.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(decoded.codeVerifier.length).toBeLessThanOrEqual(128);
    });

    it('generates unique states each time', () => {
      const state1 = generateState('github');
      const state2 = generateState('github');

      expect(state1).not.toBe(state2);
    });
  });

  describe('validateState', () => {
    it('returns valid for fresh state', () => {
      const state = generateState('github');
      const result = validateState(state, 'github');

      expect(result.valid).toBe(true);
      expect(result.provider).toBe('github');
    });

    it('detects state mismatch (CSRF protection)', () => {
      const state = generateState('github');
      const result = validateState(state, 'google'); // Different provider

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/provider mismatch/i);
    });

    it('detects expired state', () => {
      const state = generateState('github');

      // Advance time by 11 minutes (default expiry is 10 minutes)
      vi.advanceTimersByTime(11 * 60 * 1000);

      const result = validateState(state, 'github');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/expired/i);
    });

    it('allows custom expiry time', () => {
      const state = generateState('github');

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      // With 3 minute expiry, should be expired
      const result = validateState(state, 'github', { maxAgeMs: 3 * 60 * 1000 });

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/expired/i);
    });

    it('rejects malformed state', () => {
      const result = validateState('not-valid-base64!!!', 'github');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid state/i);
    });

    it('returns code verifier when present', () => {
      const state = generateState('github', { usePKCE: true });
      const result = validateState(state, 'github');

      expect(result.valid).toBe(true);
      expect(result.codeVerifier).toBeDefined();
      expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
    });
  });

  describe('generatePKCE', () => {
    it('generates code verifier of valid length', () => {
      const pkce = generatePKCE();

      expect(pkce.codeVerifier).toBeDefined();
      expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(pkce.codeVerifier.length).toBeLessThanOrEqual(128);
    });

    it('generates code challenge using S256', () => {
      const pkce = generatePKCE();

      expect(pkce.codeChallenge).toBeDefined();
      expect(pkce.codeChallengeMethod).toBe('S256');
    });

    it('generates base64url encoded challenge', () => {
      const pkce = generatePKCE();

      // base64url should not contain + / =
      expect(pkce.codeChallenge).not.toMatch(/[+/=]/);
    });

    it('generates unique PKCE values each time', () => {
      const pkce1 = generatePKCE();
      const pkce2 = generatePKCE();

      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('generates valid URL with state', () => {
      const { url, state } = oauthFlow.getAuthorizationUrl('github', {
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-github-client');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('state=');
      expect(state).toBeDefined();
    });

    it('includes scopes in URL', () => {
      const { url } = oauthFlow.getAuthorizationUrl('github', {
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(url).toContain('scope=');
      expect(url).toContain('read%3Auser'); // URL encoded read:user
    });

    it('allows custom scopes', () => {
      const { url } = oauthFlow.getAuthorizationUrl('github', {
        redirectUri: 'http://localhost:3000/callback',
        scopes: ['repo', 'user'],
      });

      expect(url).toContain('scope=repo+user');
    });

    it('supports PKCE code challenge', () => {
      const { url, state, codeVerifier } = oauthFlow.getAuthorizationUrl('github', {
        redirectUri: 'http://localhost:3000/callback',
        usePKCE: true,
      });

      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(codeVerifier).toBeDefined();
    });

    it('throws for unknown provider', () => {
      expect(() => oauthFlow.getAuthorizationUrl('unknown', {
        redirectUri: 'http://localhost:3000/callback',
      })).toThrow(/provider not found/i);
    });

    it('throws when redirectUri is missing', () => {
      expect(() => oauthFlow.getAuthorizationUrl('github', {})).toThrow(/redirectUri/i);
    });
  });

  describe('exchangeCode', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      delete global.fetch;
    });

    it('sends correct request to token endpoint', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          scope: 'read:user user:email',
        }),
      });

      await oauthFlow.exchangeCode('github', {
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          }),
        })
      );

      // Check body contains required params
      const callArgs = global.fetch.mock.calls[0];
      const body = callArgs[1].body;
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth-code-123');
      expect(body).toContain('client_id=test-github-client');
      expect(body).toContain('client_secret=test-github-secret');
      expect(body).toContain('redirect_uri=');
    });

    it('returns access and refresh tokens', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'read:user user:email',
        }),
      });

      const result = await oauthFlow.exchangeCode('github', {
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toBe('test-refresh-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600);
      expect(result.scope).toBe('read:user user:email');
    });

    it('includes code verifier for PKCE', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test-access-token',
          token_type: 'Bearer',
        }),
      });

      await oauthFlow.exchangeCode('github', {
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/callback',
        codeVerifier: 'test-code-verifier-43-chars-minimum-length',
      });

      const callArgs = global.fetch.mock.calls[0];
      const body = callArgs[1].body;
      expect(body).toContain('code_verifier=test-code-verifier-43-chars-minimum-length');
    });

    it('handles error response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'The authorization code has expired',
        }),
      });

      await expect(oauthFlow.exchangeCode('github', {
        code: 'expired-code',
        redirectUri: 'http://localhost:3000/callback',
      })).rejects.toThrow(/invalid_grant/);
    });

    it('handles network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(oauthFlow.exchangeCode('github', {
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/callback',
      })).rejects.toThrow(/network error/i);
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      delete global.fetch;
    });

    it('exchanges refresh token for new access token', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });

      const result = await oauthFlow.refreshToken('github', {
        refreshToken: 'old-refresh-token',
      });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');

      // Verify correct request
      const callArgs = global.fetch.mock.calls[0];
      const body = callArgs[1].body;
      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('refresh_token=old-refresh-token');
      expect(body).toContain('client_id=test-github-client');
      expect(body).toContain('client_secret=test-github-secret');
    });

    it('handles expired refresh token', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Refresh token has expired',
        }),
      });

      await expect(oauthFlow.refreshToken('github', {
        refreshToken: 'expired-refresh-token',
      })).rejects.toThrow(/invalid_grant/);
    });
  });

  describe('handleCallback', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      delete global.fetch;
    });

    it('processes successful OAuth callback', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'callback-access-token',
          refresh_token: 'callback-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });

      const state = generateState('github');
      const callbackParams = {
        code: 'callback-auth-code',
        state: state,
        redirectUri: 'http://localhost:3000/callback',
      };

      const result = await oauthFlow.handleCallback('github', callbackParams);

      expect(result.success).toBe(true);
      expect(result.tokens.accessToken).toBe('callback-access-token');
      expect(result.tokens.refreshToken).toBe('callback-refresh-token');
      expect(result.provider).toBe('github');
    });

    it('processes successful PKCE callback', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'pkce-access-token',
          token_type: 'Bearer',
        }),
      });

      const state = generateState('github', { usePKCE: true });
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));

      const result = await oauthFlow.handleCallback('github', {
        code: 'pkce-auth-code',
        state: state,
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result.success).toBe(true);

      // Verify code_verifier was included in token exchange
      const callArgs = global.fetch.mock.calls[0];
      const body = callArgs[1].body;
      expect(body).toContain('code_verifier=');
    });

    it('rejects invalid state (CSRF protection)', async () => {
      const validState = generateState('github');
      const tamperedState = Buffer.from(JSON.stringify({
        nonce: 'tampered',
        provider: 'google', // Different provider
        timestamp: Date.now(),
      })).toString('base64');

      const result = await oauthFlow.handleCallback('github', {
        code: 'auth-code',
        state: tamperedState,
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/state/i);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects expired state', async () => {
      const state = generateState('github');

      // Advance time past expiry
      vi.advanceTimersByTime(15 * 60 * 1000);

      const result = await oauthFlow.handleCallback('github', {
        code: 'auth-code',
        state: state,
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/expired/i);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles OAuth error in callback', async () => {
      const state = generateState('github');

      const result = await oauthFlow.handleCallback('github', {
        error: 'access_denied',
        error_description: 'The user denied the request',
        state: state,
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/access_denied/);
      expect(result.errorDescription).toMatch(/user denied/i);
    });
  });
});
