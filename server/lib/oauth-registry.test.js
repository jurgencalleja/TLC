import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createOAuthRegistry,
  PROVIDER_DEFAULTS,
  validateProviderConfig,
} from './oauth-registry.js';

describe('oauth-registry', () => {
  let registry;

  beforeEach(() => {
    registry = createOAuthRegistry();
  });

  describe('PROVIDER_DEFAULTS', () => {
    it('supports GitHub provider defaults', () => {
      expect(PROVIDER_DEFAULTS.github).toBeDefined();
      expect(PROVIDER_DEFAULTS.github.authUrl).toBe('https://github.com/login/oauth/authorize');
      expect(PROVIDER_DEFAULTS.github.tokenUrl).toBe('https://github.com/login/oauth/access_token');
      expect(PROVIDER_DEFAULTS.github.userInfoUrl).toBe('https://api.github.com/user');
      expect(PROVIDER_DEFAULTS.github.scopes).toContain('read:user');
      expect(PROVIDER_DEFAULTS.github.scopes).toContain('user:email');
    });

    it('supports Google provider defaults', () => {
      expect(PROVIDER_DEFAULTS.google).toBeDefined();
      expect(PROVIDER_DEFAULTS.google.authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(PROVIDER_DEFAULTS.google.tokenUrl).toBe('https://oauth2.googleapis.com/token');
      expect(PROVIDER_DEFAULTS.google.userInfoUrl).toBe('https://www.googleapis.com/oauth2/v2/userinfo');
      expect(PROVIDER_DEFAULTS.google.scopes).toContain('openid');
      expect(PROVIDER_DEFAULTS.google.scopes).toContain('email');
      expect(PROVIDER_DEFAULTS.google.scopes).toContain('profile');
    });

    it('supports Azure AD provider defaults', () => {
      expect(PROVIDER_DEFAULTS.azuread).toBeDefined();
      expect(PROVIDER_DEFAULTS.azuread.authUrl).toBe('https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize');
      expect(PROVIDER_DEFAULTS.azuread.tokenUrl).toBe('https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token');
      expect(PROVIDER_DEFAULTS.azuread.userInfoUrl).toBe('https://graph.microsoft.com/v1.0/me');
      expect(PROVIDER_DEFAULTS.azuread.scopes).toContain('openid');
      expect(PROVIDER_DEFAULTS.azuread.scopes).toContain('email');
      expect(PROVIDER_DEFAULTS.azuread.scopes).toContain('profile');
    });
  });

  describe('registerProvider', () => {
    it('adds provider to registry', () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
      };

      registry.registerProvider('custom', config);

      const provider = registry.getProvider('custom');
      expect(provider).not.toBeNull();
      expect(provider.clientId).toBe('test-client-id');
      expect(provider.clientSecret).toBe('test-client-secret');
    });

    it('validates required fields (clientId, clientSecret, authUrl, tokenUrl)', () => {
      // Missing clientId
      expect(() => registry.registerProvider('test', {
        clientSecret: 'secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
      })).toThrow(/clientId/i);

      // Missing clientSecret
      expect(() => registry.registerProvider('test', {
        clientId: 'id',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
      })).toThrow(/clientSecret/i);

      // Missing authUrl
      expect(() => registry.registerProvider('test', {
        clientId: 'id',
        clientSecret: 'secret',
        tokenUrl: 'https://auth.example.com/token',
      })).toThrow(/authUrl/i);

      // Missing tokenUrl
      expect(() => registry.registerProvider('test', {
        clientId: 'id',
        clientSecret: 'secret',
        authUrl: 'https://auth.example.com/authorize',
      })).toThrow(/tokenUrl/i);
    });

    it('merges with provider defaults when using known provider name', () => {
      registry.registerProvider('github', {
        clientId: 'my-github-client',
        clientSecret: 'my-github-secret',
      });

      const provider = registry.getProvider('github');
      expect(provider.clientId).toBe('my-github-client');
      expect(provider.authUrl).toBe('https://github.com/login/oauth/authorize');
      expect(provider.tokenUrl).toBe('https://github.com/login/oauth/access_token');
      expect(provider.scopes).toContain('read:user');
    });

    it('allows overriding defaults', () => {
      registry.registerProvider('github', {
        clientId: 'my-github-client',
        clientSecret: 'my-github-secret',
        scopes: ['repo', 'user'],
      });

      const provider = registry.getProvider('github');
      expect(provider.scopes).toContain('repo');
      expect(provider.scopes).toContain('user');
      expect(provider.scopes).not.toContain('read:user');
    });
  });

  describe('getProvider', () => {
    it('returns registered provider', () => {
      registry.registerProvider('github', {
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

      const provider = registry.getProvider('github');
      expect(provider).not.toBeNull();
      expect(provider.clientId).toBe('client-id');
    });

    it('returns null for unknown provider', () => {
      const provider = registry.getProvider('unknown');
      expect(provider).toBeNull();
    });

    it('is case-insensitive for provider names', () => {
      registry.registerProvider('GitHub', {
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

      expect(registry.getProvider('github')).not.toBeNull();
      expect(registry.getProvider('GITHUB')).not.toBeNull();
      expect(registry.getProvider('GitHub')).not.toBeNull();
    });
  });

  describe('listProviders', () => {
    it('returns all registered providers', () => {
      registry.registerProvider('github', {
        clientId: 'github-client',
        clientSecret: 'github-secret',
      });
      registry.registerProvider('google', {
        clientId: 'google-client',
        clientSecret: 'google-secret',
      });

      const providers = registry.listProviders();
      expect(providers).toHaveLength(2);
      expect(providers.map(p => p.name)).toContain('github');
      expect(providers.map(p => p.name)).toContain('google');
    });

    it('returns empty array when no providers registered', () => {
      const providers = registry.listProviders();
      expect(providers).toEqual([]);
    });

    it('does not expose client secrets in list', () => {
      registry.registerProvider('github', {
        clientId: 'github-client',
        clientSecret: 'github-secret',
      });

      const providers = registry.listProviders();
      expect(providers[0].clientSecret).toBeUndefined();
      expect(providers[0].clientId).toBe('github-client');
    });
  });

  describe('loadFromConfig', () => {
    it('reads providers from .tlc.json config', () => {
      const config = {
        oauth: {
          providers: {
            github: {
              clientId: 'config-github-client',
              clientSecret: 'config-github-secret',
            },
            google: {
              clientId: 'config-google-client',
              clientSecret: 'config-google-secret',
            },
          },
        },
      };

      registry.loadFromConfig(config);

      expect(registry.getProvider('github')).not.toBeNull();
      expect(registry.getProvider('github').clientId).toBe('config-github-client');
      expect(registry.getProvider('google')).not.toBeNull();
      expect(registry.getProvider('google').clientId).toBe('config-google-client');
    });

    it('handles missing oauth section', () => {
      const config = {};

      expect(() => registry.loadFromConfig(config)).not.toThrow();
      expect(registry.listProviders()).toEqual([]);
    });

    it('handles missing providers section', () => {
      const config = { oauth: {} };

      expect(() => registry.loadFromConfig(config)).not.toThrow();
      expect(registry.listProviders()).toEqual([]);
    });

    it('validates each provider config', () => {
      const config = {
        oauth: {
          providers: {
            github: {
              clientId: 'github-client',
              // Missing clientSecret - should fail
            },
          },
        },
      };

      expect(() => registry.loadFromConfig(config)).toThrow(/clientSecret/i);
    });
  });

  describe('validateConfig', () => {
    it('returns errors for invalid config', () => {
      const errors = validateProviderConfig({});
      expect(errors).toContain('clientId is required');
      expect(errors).toContain('clientSecret is required');
    });

    it('returns errors for missing auth URLs when no defaults', () => {
      const errors = validateProviderConfig({
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(errors).toContain('authUrl is required');
      expect(errors).toContain('tokenUrl is required');
    });

    it('returns empty array for valid config', () => {
      const errors = validateProviderConfig({
        clientId: 'id',
        clientSecret: 'secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
      });
      expect(errors).toEqual([]);
    });

    it('accepts config with known provider name (uses defaults)', () => {
      const errors = validateProviderConfig({
        clientId: 'id',
        clientSecret: 'secret',
      }, 'github');
      expect(errors).toEqual([]);
    });
  });

  describe('removeProvider', () => {
    it('removes a registered provider', () => {
      registry.registerProvider('github', {
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

      expect(registry.getProvider('github')).not.toBeNull();

      registry.removeProvider('github');

      expect(registry.getProvider('github')).toBeNull();
    });

    it('does nothing for unknown provider', () => {
      expect(() => registry.removeProvider('unknown')).not.toThrow();
    });
  });

  describe('hasProvider', () => {
    it('returns true for registered provider', () => {
      registry.registerProvider('github', {
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

      expect(registry.hasProvider('github')).toBe(true);
    });

    it('returns false for unknown provider', () => {
      expect(registry.hasProvider('unknown')).toBe(false);
    });
  });
});
