import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('sso-command', () => {
  let SSOCommand;
  let parseArgs;
  let formatProvider;
  let ssoCommand;
  let mockIdPManager;
  let mockRoleMapper;
  let mockSSOSession;
  let mockConfig;
  let mockPrompt;

  beforeEach(async () => {
    // Create mocks
    mockIdPManager = {
      listProviders: vi.fn().mockReturnValue([
        { name: 'github', type: 'oauth' },
        { name: 'google', type: 'oauth' },
        { name: 'okta', type: 'saml' },
      ]),
      registerProvider: vi.fn(),
      removeProvider: vi.fn(),
      getProvider: vi.fn().mockReturnValue({
        name: 'github',
        type: 'oauth',
        config: { clientId: 'test-client-id' },
      }),
      handleCallback: vi.fn().mockResolvedValue({
        success: true,
        profile: { email: 'test@example.com' },
      }),
    };

    mockRoleMapper = {
      getMappings: vi.fn().mockReturnValue({
        mappings: [
          { pattern: 'admins', role: 'admin', priority: 1 },
          { pattern: 'developers', role: 'engineer', priority: 2 },
          { pattern: 'qa-team', role: 'qa', priority: 3 },
        ],
        defaultRole: 'engineer',
      }),
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    };

    mockSSOSession = {
      getStatus: vi.fn().mockReturnValue({
        enabled: true,
        activeSessions: 12,
        mfaRequired: true,
        mfaRoles: ['admin'],
      }),
      testProvider: vi.fn().mockResolvedValue({
        success: true,
        message: 'Provider connectivity verified',
      }),
    };

    mockConfig = {
      sso: {
        enabled: true,
        roleMappings: [
          { pattern: 'admins', role: 'admin', priority: 1 },
          { pattern: 'developers', role: 'engineer', priority: 2 },
        ],
      },
    };

    mockPrompt = vi.fn();

    // Import module
    const module = await import('./sso-command.js');
    SSOCommand = module.SSOCommand;
    parseArgs = module.parseArgs;
    formatProvider = module.formatProvider;

    // Create instance with mocks
    ssoCommand = new SSOCommand({
      idpManager: mockIdPManager,
      roleMapper: mockRoleMapper,
      ssoSession: mockSSOSession,
      config: mockConfig,
      prompt: mockPrompt,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('parseArgs', () => {
    it('parses providers subcommand', () => {
      const result = parseArgs(['providers']);
      expect(result.subcommand).toBe('providers');
    });

    it('parses add subcommand with provider name', () => {
      const result = parseArgs(['add', 'github']);
      expect(result.subcommand).toBe('add');
      expect(result.provider).toBe('github');
    });

    it('parses remove subcommand with provider name', () => {
      const result = parseArgs(['remove', 'okta']);
      expect(result.subcommand).toBe('remove');
      expect(result.provider).toBe('okta');
    });

    it('parses test subcommand with provider name', () => {
      const result = parseArgs(['test', 'google']);
      expect(result.subcommand).toBe('test');
      expect(result.provider).toBe('google');
    });

    it('parses roles subcommand', () => {
      const result = parseArgs(['roles']);
      expect(result.subcommand).toBe('roles');
    });

    it('parses status subcommand', () => {
      const result = parseArgs(['status']);
      expect(result.subcommand).toBe('status');
    });

    it('handles all subcommands correctly', () => {
      expect(parseArgs(['providers']).subcommand).toBe('providers');
      expect(parseArgs(['add', 'test']).subcommand).toBe('add');
      expect(parseArgs(['remove', 'test']).subcommand).toBe('remove');
      expect(parseArgs(['test', 'test']).subcommand).toBe('test');
      expect(parseArgs(['roles']).subcommand).toBe('roles');
      expect(parseArgs(['status']).subcommand).toBe('status');
    });

    it('parses --type flag for add', () => {
      const result = parseArgs(['add', 'custom', '--type', 'oauth']);
      expect(result.type).toBe('oauth');
    });

    it('parses --force flag for remove', () => {
      const result = parseArgs(['remove', 'github', '--force']);
      expect(result.force).toBe(true);
    });

    it('returns help subcommand for empty args', () => {
      const result = parseArgs([]);
      expect(result.subcommand).toBe('help');
    });
  });

  describe('execute providers', () => {
    it('lists all providers', async () => {
      const result = await ssoCommand.execute(['providers']);

      expect(result.success).toBe(true);
      expect(mockIdPManager.listProviders).toHaveBeenCalled();
      expect(result.output).toContain('GitHub');
      expect(result.output).toContain('Google');
      expect(result.output).toContain('Okta');
    });

    it('shows provider types', async () => {
      const result = await ssoCommand.execute(['providers']);

      expect(result.output).toContain('OAuth');
      expect(result.output).toContain('SAML');
    });

    it('shows empty state when no providers', async () => {
      mockIdPManager.listProviders.mockReturnValue([]);

      const result = await ssoCommand.execute(['providers']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('No providers configured');
    });

    it('shows connection status for providers', async () => {
      mockSSOSession.testProvider.mockResolvedValue({ success: true });

      const result = await ssoCommand.execute(['providers']);

      expect(result.output).toMatch(/Connected|Configured/);
    });
  });

  describe('execute add', () => {
    it('prompts for OAuth config when type is oauth', async () => {
      mockPrompt
        .mockResolvedValueOnce('oauth') // type
        .mockResolvedValueOnce('client-id-123') // clientId
        .mockResolvedValueOnce('client-secret-456') // clientSecret
        .mockResolvedValueOnce('https://provider.com/auth') // authUrl
        .mockResolvedValueOnce('https://provider.com/token') // tokenUrl
        .mockResolvedValueOnce('https://provider.com/userinfo'); // userInfoUrl

      const result = await ssoCommand.execute(['add', 'custom-provider']);

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockIdPManager.registerProvider).toHaveBeenCalledWith(
        'custom-provider',
        expect.objectContaining({
          type: 'oauth',
          clientId: 'client-id-123',
        })
      );
      expect(result.success).toBe(true);
    });

    it('prompts for SAML config when type is saml', async () => {
      mockPrompt
        .mockResolvedValueOnce('saml') // type
        .mockResolvedValueOnce('https://idp.example.com/entity') // entityId
        .mockResolvedValueOnce('https://idp.example.com/sso') // ssoUrl
        .mockResolvedValueOnce('-----BEGIN CERTIFICATE-----...'); // certificate

      const result = await ssoCommand.execute(['add', 'enterprise-sso']);

      expect(mockPrompt).toHaveBeenCalled();
      expect(mockIdPManager.registerProvider).toHaveBeenCalledWith(
        'enterprise-sso',
        expect.objectContaining({
          type: 'saml',
          entityId: 'https://idp.example.com/entity',
        })
      );
      expect(result.success).toBe(true);
    });

    it('validates configuration before adding', async () => {
      mockPrompt
        .mockResolvedValueOnce('oauth')
        .mockResolvedValueOnce('') // empty clientId - invalid
        .mockResolvedValueOnce('secret');

      const result = await ssoCommand.execute(['add', 'invalid-provider']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Client ID is required');
    });

    it('uses --type flag when provided', async () => {
      mockPrompt
        .mockResolvedValueOnce('client-id')
        .mockResolvedValueOnce('client-secret')
        .mockResolvedValueOnce('https://auth.example.com')
        .mockResolvedValueOnce('https://token.example.com')
        .mockResolvedValueOnce('https://userinfo.example.com');

      await ssoCommand.execute(['add', 'typed-provider', '--type', 'oauth']);

      expect(mockIdPManager.registerProvider).toHaveBeenCalledWith(
        'typed-provider',
        expect.objectContaining({ type: 'oauth' })
      );
    });
  });

  describe('execute remove', () => {
    it('deletes provider', async () => {
      mockPrompt.mockResolvedValueOnce('yes');

      const result = await ssoCommand.execute(['remove', 'github']);

      expect(mockIdPManager.removeProvider).toHaveBeenCalledWith('github');
      expect(result.success).toBe(true);
      expect(result.output).toContain('removed');
    });

    it('confirms deletion before removing', async () => {
      mockPrompt.mockResolvedValueOnce('no');

      const result = await ssoCommand.execute(['remove', 'github']);

      expect(mockIdPManager.removeProvider).not.toHaveBeenCalled();
      expect(result.output).toContain('cancelled');
    });

    it('skips confirmation with --force', async () => {
      const result = await ssoCommand.execute(['remove', 'github', '--force']);

      expect(mockPrompt).not.toHaveBeenCalled();
      expect(mockIdPManager.removeProvider).toHaveBeenCalledWith('github');
      expect(result.success).toBe(true);
    });

    it('returns error for non-existent provider', async () => {
      mockIdPManager.getProvider.mockReturnValue(null);

      const result = await ssoCommand.execute(['remove', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('execute test', () => {
    it('validates provider connectivity', async () => {
      mockSSOSession.testProvider.mockResolvedValue({
        success: true,
        message: 'Connection successful',
        latency: 150,
      });

      const result = await ssoCommand.execute(['test', 'github']);

      expect(mockSSOSession.testProvider).toHaveBeenCalledWith('github');
      expect(result.success).toBe(true);
      expect(result.output).toContain('successful');
    });

    it('reports errors when test fails', async () => {
      mockSSOSession.testProvider.mockResolvedValue({
        success: false,
        error: 'Connection refused',
      });

      const result = await ssoCommand.execute(['test', 'github']);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Connection refused');
    });

    it('reports detailed error information', async () => {
      mockSSOSession.testProvider.mockResolvedValue({
        success: false,
        error: 'Certificate expired',
        details: {
          expiredAt: '2025-01-01',
          issuer: 'CN=Example CA',
        },
      });

      const result = await ssoCommand.execute(['test', 'okta']);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Certificate expired');
    });

    it('returns error for non-existent provider', async () => {
      mockIdPManager.getProvider.mockReturnValue(null);

      const result = await ssoCommand.execute(['test', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('execute roles', () => {
    it('shows role mappings', async () => {
      const result = await ssoCommand.execute(['roles']);

      expect(result.success).toBe(true);
      expect(mockRoleMapper.getMappings).toHaveBeenCalled();
      expect(result.output).toContain('admins');
      expect(result.output).toContain('admin');
      expect(result.output).toContain('developers');
      expect(result.output).toContain('engineer');
    });

    it('shows unmapped warning when no mappings', async () => {
      mockRoleMapper.getMappings.mockReturnValue({
        mappings: [],
        defaultRole: null,
      });

      const result = await ssoCommand.execute(['roles']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('No role mappings configured');
    });

    it('shows default role when configured', async () => {
      mockRoleMapper.getMappings.mockReturnValue({
        mappings: [{ pattern: 'admins', role: 'admin', priority: 1 }],
        defaultRole: 'engineer',
      });

      const result = await ssoCommand.execute(['roles']);

      expect(result.output).toContain('Default');
      expect(result.output).toContain('engineer');
    });

    it('shows mapping priority order', async () => {
      const result = await ssoCommand.execute(['roles']);

      // Output should show mappings in priority order
      const output = result.output;
      const adminsIndex = output.indexOf('admins');
      const developersIndex = output.indexOf('developers');
      expect(adminsIndex).toBeLessThan(developersIndex);
    });
  });

  describe('execute status', () => {
    it('shows SSO enabled status', async () => {
      mockSSOSession.getStatus.mockReturnValue({
        enabled: true,
        activeSessions: 12,
        mfaRequired: true,
        mfaRoles: ['admin'],
      });

      const result = await ssoCommand.execute(['status']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Enabled');
      expect(result.output).toContain('Yes');
    });

    it('shows SSO disabled status', async () => {
      mockSSOSession.getStatus.mockReturnValue({
        enabled: false,
        activeSessions: 0,
        mfaRequired: false,
        mfaRoles: [],
      });

      const result = await ssoCommand.execute(['status']);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/Enabled.*No/s);
    });

    it('shows provider count', async () => {
      const result = await ssoCommand.execute(['status']);

      expect(result.output).toContain('Providers');
      expect(result.output).toContain('3');
    });

    it('shows active sessions count', async () => {
      const result = await ssoCommand.execute(['status']);

      expect(result.output).toContain('Active Sessions');
      expect(result.output).toContain('12');
    });

    it('shows MFA requirements', async () => {
      const result = await ssoCommand.execute(['status']);

      expect(result.output).toContain('MFA');
      expect(result.output).toContain('admin');
    });

    it('shows role mappings summary', async () => {
      const result = await ssoCommand.execute(['status']);

      expect(result.output).toContain('Role Mappings');
      expect(result.output).toContain('admins');
      expect(result.output).toContain('admin');
    });
  });

  describe('formatProvider', () => {
    it('returns readable output for OAuth provider', () => {
      const provider = { name: 'github', type: 'oauth' };
      const formatted = formatProvider(provider);

      expect(formatted).toContain('GitHub');
      expect(formatted).toContain('OAuth');
    });

    it('returns readable output for SAML provider', () => {
      const provider = { name: 'okta', type: 'saml' };
      const formatted = formatProvider(provider);

      expect(formatted).toContain('Okta');
      expect(formatted).toContain('SAML');
    });

    it('capitalizes provider names properly', () => {
      const provider = { name: 'azure-ad', type: 'oauth' };
      const formatted = formatProvider(provider);

      // azure-ad should display as "Azure AD" (proper branding)
      expect(formatted).toContain('Azure AD');
    });

    it('includes connection status when provided', () => {
      const provider = { name: 'github', type: 'oauth', connected: true };
      const formatted = formatProvider(provider, { showStatus: true });

      expect(formatted).toContain('Connected');
    });
  });

  describe('error handling', () => {
    it('handles unknown subcommand', async () => {
      const result = await ssoCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown subcommand');
    });

    it('handles missing provider name for add', async () => {
      const result = await ssoCommand.execute(['add']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider name required');
    });

    it('handles missing provider name for remove', async () => {
      const result = await ssoCommand.execute(['remove']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider name required');
    });

    it('handles missing provider name for test', async () => {
      const result = await ssoCommand.execute(['test']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider name required');
    });

    it('handles idpManager errors gracefully', async () => {
      mockIdPManager.listProviders.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await ssoCommand.execute(['providers']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('help', () => {
    it('shows help when no subcommand', async () => {
      const result = await ssoCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage');
      expect(result.output).toContain('providers');
      expect(result.output).toContain('add');
      expect(result.output).toContain('remove');
      expect(result.output).toContain('test');
      expect(result.output).toContain('roles');
      expect(result.output).toContain('status');
    });

    it('shows help with --help flag', async () => {
      const result = await ssoCommand.execute(['--help']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage');
    });
  });
});
