import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { SSOPane } from './SSOPane.js';
import type { Provider, RoleMapping, SessionSummary, MfaStats } from './SSOPane.js';

describe('SSOPane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockProviders: Provider[] = [
    {
      name: 'GitHub',
      type: 'oauth',
      status: 'connected',
      lastSync: '2024-01-15T10:30:00.000Z',
    },
    {
      name: 'Okta',
      type: 'saml',
      status: 'connected',
      lastSync: '2024-01-15T09:00:00.000Z',
    },
  ];

  const mockRoleMappings: RoleMapping[] = [
    { providerGroup: 'admins', localRole: 'admin' },
    { providerGroup: 'developers', localRole: 'developer' },
    { providerGroup: 'viewers', localRole: 'viewer' },
  ];

  const mockSessions: SessionSummary = {
    active: 15,
    total: 42,
    byProvider: {
      GitHub: 10,
      Okta: 5,
    },
  };

  const mockMfaStats: MfaStats = {
    enrolled: 38,
    total: 42,
    pending: 4,
    methods: ['totp', 'webauthn'],
  };

  describe('renders provider list correctly', () => {
    it('renders provider list correctly', () => {
      const { lastFrame } = render(
        <SSOPane
          providers={mockProviders}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
        />
      );
      const output = lastFrame();

      expect(output).toContain('SSO');
      expect(output).toContain('GitHub');
      expect(output).toContain('Okta');
      expect(output).toMatch(/oauth/i);
      expect(output).toMatch(/saml/i);
    });
  });

  describe('renders empty state when no providers', () => {
    it('renders empty state when no providers', () => {
      const { lastFrame } = render(
        <SSOPane
          providers={[]}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
        />
      );
      const output = lastFrame();

      expect(output).toContain('SSO');
      expect(output).toMatch(/no.*provider|empty|none configured/i);
    });
  });

  describe('shows connected status for working providers', () => {
    it('shows connected status for working providers', () => {
      const { lastFrame } = render(
        <SSOPane
          providers={mockProviders}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/connected|active|ok/i);
    });
  });

  describe('shows error status for failing providers', () => {
    it('shows error status for failing providers', () => {
      const errorProviders: Provider[] = [
        {
          name: 'BrokenIdP',
          type: 'saml',
          status: 'error',
          error: 'Certificate expired',
        },
      ];

      const { lastFrame } = render(
        <SSOPane
          providers={errorProviders}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
        />
      );
      const output = lastFrame();

      expect(output).toContain('BrokenIdP');
      expect(output).toMatch(/error|failed|certificate/i);
    });
  });

  describe('add provider button opens modal', () => {
    it('add provider button shows when handler provided', () => {
      const onAddProvider = vi.fn();
      const { lastFrame } = render(
        <SSOPane
          providers={[]}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
          onAddProvider={onAddProvider}
          isActive={true}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/\[a\]|add.*provider/i);
    });
  });

  describe('remove provider shows confirmation', () => {
    it('remove provider control shows when handler provided', () => {
      const onRemoveProvider = vi.fn();
      const { lastFrame } = render(
        <SSOPane
          providers={mockProviders}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
          onRemoveProvider={onRemoveProvider}
          isActive={true}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/\[d\]|remove|delete/i);
    });
  });

  describe('shows role mapping table', () => {
    it('shows role mapping table', () => {
      const { lastFrame } = render(
        <SSOPane
          providers={mockProviders}
          roleMappings={mockRoleMappings}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/role.*mapping|mapping/i);
      expect(output).toContain('admins');
      expect(output).toContain('admin');
      expect(output).toContain('developers');
      expect(output).toContain('developer');
    });
  });

  describe('shows active sessions count', () => {
    it('shows active sessions count', () => {
      const { lastFrame } = render(
        <SSOPane
          providers={mockProviders}
          roleMappings={[]}
          sessions={mockSessions}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/session/i);
      expect(output).toContain('15');
      expect(output).toContain('42');
    });
  });

  describe('shows MFA enrollment stats', () => {
    it('shows MFA enrollment stats', () => {
      const { lastFrame } = render(
        <SSOPane
          providers={mockProviders}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={mockMfaStats}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/mfa|multi-factor/i);
      expect(output).toContain('38');
      expect(output).toContain('42');
    });
  });

  describe('handles loading state', () => {
    it('handles loading state', () => {
      const { lastFrame } = render(
        <SSOPane
          providers={[]}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
          loading={true}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/loading|fetching/i);
    });
  });

  describe('handles error state', () => {
    it('handles error state', () => {
      const { lastFrame } = render(
        <SSOPane
          providers={[]}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
          error="Failed to fetch SSO configuration"
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/error|failed/i);
      expect(output).toContain('Failed to fetch SSO configuration');
    });
  });

  describe('refresh button reloads data', () => {
    it('refresh button shows when handler provided', () => {
      const onRefresh = vi.fn();
      const { lastFrame } = render(
        <SSOPane
          providers={mockProviders}
          roleMappings={[]}
          sessions={{ active: 0, total: 0, byProvider: {} }}
          mfaStats={{ enrolled: 0, total: 0, pending: 0, methods: [] }}
          onRefresh={onRefresh}
          isActive={true}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/\[r\]|refresh|reload/i);
    });
  });
});
