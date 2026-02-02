/**
 * Identity Provider Manager - Tests
 * Unified interface for OAuth and SAML providers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createIdPManager, PROVIDER_TYPES } from './idp-manager.js';

describe('IdP Manager', () => {
  let manager;
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    manager = createIdPManager({
      baseUrl: 'https://app.example.com',
      callbackPath: '/auth/callback',
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('registerProvider', () => {
    it('adds OAuth provider', () => {
      // Register and verify we can retrieve the provider
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'client-123',
        clientSecret: 'secret-456',
      });

      const provider = manager.getProvider('github');
      expect(provider).not.toBeNull();
      expect(provider.type).toBe('oauth');
      expect(provider.config.clientId).toBe('client-123');
    });

    it('adds SAML provider', () => {
      manager.registerProvider('company-idp', {
        type: 'saml',
        entityId: 'https://idp.company.com',
        ssoUrl: 'https://idp.company.com/sso',
        cert: 'MIIC...',
      });

      const provider = manager.getProvider('company-idp');
      expect(provider).not.toBeNull();
      expect(provider.type).toBe('saml');
      expect(provider.config.entityId).toBe('https://idp.company.com');
    });

    it('throws on invalid provider type', () => {
      expect(() => {
        manager.registerProvider('invalid', {
          type: 'ldap', // not supported
          host: 'ldap.example.com',
        });
      }).toThrow(/unsupported provider type/i);
    });

    it('defaults to OAuth when type not specified but has clientId', () => {
      manager.registerProvider('github', {
        clientId: 'client-123',
        clientSecret: 'secret-456',
      });

      const provider = manager.getProvider('github');
      expect(provider.type).toBe('oauth');
    });

    it('defaults to SAML when type not specified but has entityId and ssoUrl', () => {
      manager.registerProvider('company-idp', {
        entityId: 'https://idp.company.com',
        ssoUrl: 'https://idp.company.com/sso',
      });

      const provider = manager.getProvider('company-idp');
      expect(provider.type).toBe('saml');
    });
  });

  describe('getLoginUrl', () => {
    it('returns OAuth authorization URL', () => {
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authUrl: 'https://github.com/login/oauth/authorize',
        scopes: ['read:user', 'user:email'],
      });

      const result = manager.getLoginUrl('github', {
        state: 'random-state',
        redirectUri: 'https://app.example.com/auth/callback/github',
      });

      expect(result).toContain('https://github.com/login/oauth/authorize');
      expect(result).toContain('client_id=client-123');
      expect(result).toContain('state=random-state');
    });

    it('returns SAML redirect URL', () => {
      manager.registerProvider('company-idp', {
        type: 'saml',
        entityId: 'https://idp.company.com',
        ssoUrl: 'https://idp.company.com/sso',
      });

      const result = manager.getLoginUrl('company-idp', {
        relayState: '/dashboard',
      });

      expect(result).toContain('https://idp.company.com/sso');
      expect(result).toContain('SAMLRequest=');
    });

    it('throws for unknown provider', () => {
      expect(() => {
        manager.getLoginUrl('unknown');
      }).toThrow(/provider not found/i);
    });
  });

  describe('handleCallback', () => {
    it('processes OAuth callback', async () => {
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'client-123',
        clientSecret: 'secret-456',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
      });

      // Mock global fetch for OAuth token and user info
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'gho_abc123',
            token_type: 'bearer',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 12345,
            login: 'octocat',
            email: 'octocat@github.com',
            name: 'The Octocat',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          }),
        });

      const result = await manager.handleCallback('github', {
        code: 'auth-code-123',
        state: 'random-state',
        redirectUri: 'https://app.example.com/auth/callback/github',
      });

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile.provider).toBe('github');
      expect(result.profile.providerType).toBe('oauth');
    });

    it('processes SAML response', async () => {
      manager.registerProvider('company-idp', {
        type: 'saml',
        entityId: 'https://idp.company.com',
        ssoUrl: 'https://idp.company.com/sso',
        skipSignatureValidation: true,
      });

      // Create a mock SAML response (base64 encoded)
      const samlResponseXml = `<?xml version="1.0"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          <saml:Assertion>
            <saml:Subject>
              <saml:NameID>user@company.com</saml:NameID>
            </saml:Subject>
            <saml:AttributeStatement>
              <saml:Attribute Name="email">
                <saml:AttributeValue>user@company.com</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="firstName">
                <saml:AttributeValue>John</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="lastName">
                <saml:AttributeValue>Doe</saml:AttributeValue>
              </saml:Attribute>
            </saml:AttributeStatement>
          </saml:Assertion>
        </samlp:Response>`;
      const samlResponse = Buffer.from(samlResponseXml).toString('base64');

      const result = await manager.handleCallback('company-idp', {
        SAMLResponse: samlResponse,
        RelayState: '/dashboard',
      });

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile.provider).toBe('company-idp');
      expect(result.profile.providerType).toBe('saml');
    });

    it('returns error for failed OAuth callback', async () => {
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'client-123',
        clientSecret: 'secret-456',
        tokenUrl: 'https://github.com/login/oauth/access_token',
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      });

      const result = await manager.handleCallback('github', {
        code: 'invalid-code',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for failed SAML response', async () => {
      manager.registerProvider('company-idp', {
        type: 'saml',
        entityId: 'https://idp.company.com',
        ssoUrl: 'https://idp.company.com/sso',
      });

      // Invalid/malformed SAML response
      const result = await manager.handleCallback('company-idp', {
        SAMLResponse: 'invalid-base64-data',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('normalizeProfile', () => {
    it('extracts email from GitHub', () => {
      const profile = manager.normalizeProfile('github', 'oauth', {
        id: 12345,
        login: 'octocat',
        email: 'octocat@github.com',
        name: 'The Octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      });

      expect(profile).toEqual({
        id: '12345',
        email: 'octocat@github.com',
        name: 'The Octocat',
        firstName: 'The',
        lastName: 'Octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        provider: 'github',
        providerType: 'oauth',
        raw: expect.any(Object),
      });
    });

    it('extracts email from Google', () => {
      const profile = manager.normalizeProfile('google', 'oauth', {
        id: '118234567890123456789',
        email: 'user@gmail.com',
        verified_email: true,
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://lh3.googleusercontent.com/a/photo',
      });

      expect(profile).toEqual({
        id: '118234567890123456789',
        email: 'user@gmail.com',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
        provider: 'google',
        providerType: 'oauth',
        raw: expect.any(Object),
      });
    });

    it('extracts email from Azure AD', () => {
      const profile = manager.normalizeProfile('azuread', 'oauth', {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        mail: 'john.doe@company.com',
        displayName: 'John Doe',
        givenName: 'John',
        surname: 'Doe',
        userPrincipalName: 'john.doe@company.onmicrosoft.com',
      });

      expect(profile).toEqual({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        email: 'john.doe@company.com',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        provider: 'azuread',
        providerType: 'oauth',
        raw: expect.any(Object),
      });
    });

    it('falls back to userPrincipalName for Azure AD email', () => {
      const profile = manager.normalizeProfile('azuread', 'oauth', {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        displayName: 'John Doe',
        userPrincipalName: 'john.doe@company.onmicrosoft.com',
      });

      expect(profile.email).toBe('john.doe@company.onmicrosoft.com');
    });

    it('extracts email from SAML assertion', () => {
      const profile = manager.normalizeProfile('company-idp', 'saml', {
        nameId: 'user@company.com',
        email: 'user@company.com',
        firstName: 'Jane',
        lastName: 'Smith',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'user@company.com',
      });

      expect(profile).toEqual({
        id: 'user@company.com',
        email: 'user@company.com',
        name: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        avatarUrl: null,
        provider: 'company-idp',
        providerType: 'saml',
        raw: expect.any(Object),
      });
    });

    it('handles missing name fields gracefully', () => {
      const profile = manager.normalizeProfile('github', 'oauth', {
        id: 12345,
        login: 'octocat',
        email: 'octocat@github.com',
      });

      expect(profile.name).toBe('octocat');
      expect(profile.firstName).toBe('octocat');
      expect(profile.lastName).toBe('');
    });
  });

  describe('cacheMetadata', () => {
    it('stores provider metadata', () => {
      const metadata = {
        entityId: 'https://idp.company.com',
        ssoUrl: 'https://idp.company.com/sso',
        cert: 'MIIC...',
        fetchedAt: new Date(),
      };

      manager.cacheMetadata('company-idp', metadata);
      const cached = manager.getCachedMetadata('company-idp');

      // The cached version includes a 'cachedAt' field added by the manager
      expect(cached.entityId).toBe(metadata.entityId);
      expect(cached.ssoUrl).toBe(metadata.ssoUrl);
      expect(cached.cert).toBe(metadata.cert);
    });

    it('returns null for non-existent cache', () => {
      const cached = manager.getCachedMetadata('non-existent');
      expect(cached).toBeNull();
    });

    it('supports cache expiry check', () => {
      const metadata = {
        entityId: 'https://idp.company.com',
        fetchedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      manager.cacheMetadata('company-idp', metadata);
      const isExpired = manager.isMetadataExpired('company-idp', 24 * 60 * 60 * 1000);

      expect(isExpired).toBe(true);
    });

    it('clears cached metadata', () => {
      manager.cacheMetadata('company-idp', { entityId: 'test' });
      manager.clearMetadataCache('company-idp');

      expect(manager.getCachedMetadata('company-idp')).toBeNull();
    });
  });

  describe('getProvider', () => {
    it('returns correct provider type for OAuth', () => {
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'client-123',
        clientSecret: 'secret-456',
      });

      const provider = manager.getProvider('github');

      expect(provider).toEqual({
        name: 'github',
        type: 'oauth',
        config: expect.objectContaining({
          clientId: 'client-123',
        }),
      });
    });

    it('returns correct provider type for SAML', () => {
      manager.registerProvider('company-idp', {
        type: 'saml',
        entityId: 'https://idp.company.com',
        ssoUrl: 'https://idp.company.com/sso',
      });

      const provider = manager.getProvider('company-idp');

      expect(provider).toEqual({
        name: 'company-idp',
        type: 'saml',
        config: expect.objectContaining({
          entityId: 'https://idp.company.com',
        }),
      });
    });

    it('returns null for unknown provider', () => {
      const provider = manager.getProvider('unknown');
      expect(provider).toBeNull();
    });
  });

  describe('listProviders', () => {
    it('lists all registered providers with types', () => {
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'gh-123',
        clientSecret: 'secret',
      });
      manager.registerProvider('google', {
        type: 'oauth',
        clientId: 'ggl-456',
        clientSecret: 'secret',
      });
      manager.registerProvider('company-idp', {
        type: 'saml',
        entityId: 'https://idp1.com',
        ssoUrl: 'https://idp1.com/sso',
      });
      manager.registerProvider('partner-idp', {
        type: 'saml',
        entityId: 'https://idp2.com',
        ssoUrl: 'https://idp2.com/sso',
      });

      const providers = manager.listProviders();

      expect(providers).toContainEqual(
        expect.objectContaining({ name: 'github', type: 'oauth' })
      );
      expect(providers).toContainEqual(
        expect.objectContaining({ name: 'google', type: 'oauth' })
      );
      expect(providers).toContainEqual(
        expect.objectContaining({ name: 'company-idp', type: 'saml' })
      );
      expect(providers).toContainEqual(
        expect.objectContaining({ name: 'partner-idp', type: 'saml' })
      );
    });
  });

  describe('removeProvider', () => {
    it('removes OAuth provider', () => {
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'client-123',
        clientSecret: 'secret',
      });

      expect(manager.getProvider('github')).not.toBeNull();

      manager.removeProvider('github');

      expect(manager.getProvider('github')).toBeNull();
    });

    it('removes SAML provider', () => {
      manager.registerProvider('company-idp', {
        type: 'saml',
        entityId: 'https://idp.company.com',
        ssoUrl: 'https://idp.company.com/sso',
      });

      expect(manager.getProvider('company-idp')).not.toBeNull();

      manager.removeProvider('company-idp');

      expect(manager.getProvider('company-idp')).toBeNull();
    });
  });

  describe('fetchUserInfo (OAuth)', () => {
    it('fetches user info from provider-specific endpoint', async () => {
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'client-123',
        clientSecret: 'secret',
        userInfoUrl: 'https://api.github.com/user',
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 12345,
          login: 'octocat',
          email: 'octocat@github.com',
        }),
      });

      const userInfo = await manager.fetchUserInfo('github', 'gho_token123');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer gho_token123',
          }),
        })
      );
      expect(userInfo.email).toBe('octocat@github.com');
    });

    it('handles GitHub email endpoint for private emails', async () => {
      manager.registerProvider('github', {
        type: 'oauth',
        clientId: 'client-123',
        clientSecret: 'secret',
        userInfoUrl: 'https://api.github.com/user',
      });

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 12345,
            login: 'octocat',
            email: null, // Private email
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { email: 'secondary@example.com', primary: false, verified: true },
            { email: 'primary@github.com', primary: true, verified: true },
          ]),
        });

      const userInfo = await manager.fetchUserInfo('github', 'gho_token123');

      expect(userInfo.email).toBe('primary@github.com');
    });
  });

  describe('PROVIDER_TYPES constant', () => {
    it('exports OAuth and SAML types', () => {
      expect(PROVIDER_TYPES.OAUTH).toBe('oauth');
      expect(PROVIDER_TYPES.SAML).toBe('saml');
    });
  });
});
