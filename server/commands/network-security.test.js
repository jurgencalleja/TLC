/**
 * Network Security Command Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parseNetworkArgs,
  runTlsCommand,
  runHeadersCommand,
  runFirewallCommand,
  runAuditCommand,
  formatOutput,
  createNetworkSecurityCommand,
} from './network-security.js';

describe('network-security command', () => {
  describe('parseNetworkArgs', () => {
    it('parses tls subcommand', () => {
      const args = parseNetworkArgs(['tls', '--domain', 'example.com']);

      expect(args.subcommand).toBe('tls');
      expect(args.domain).toBe('example.com');
    });

    it('parses headers subcommand', () => {
      const args = parseNetworkArgs(['headers', '--preset', 'strict']);

      expect(args.subcommand).toBe('headers');
      expect(args.preset).toBe('strict');
    });

    it('parses firewall subcommand', () => {
      const args = parseNetworkArgs(['firewall', '--ssh-port', '2222']);

      expect(args.subcommand).toBe('firewall');
      expect(args.sshPort).toBe(2222);
    });

    it('parses audit subcommand', () => {
      const args = parseNetworkArgs(['audit']);

      expect(args.subcommand).toBe('audit');
    });

    it('parses --output format option', () => {
      const args = parseNetworkArgs(['tls', '--output', 'json']);

      expect(args.output).toBe('json');
    });

    it('parses --apply flag', () => {
      const args = parseNetworkArgs(['firewall', '--apply']);

      expect(args.apply).toBe(true);
    });

    it('parses --dry-run flag', () => {
      const args = parseNetworkArgs(['firewall', '--dry-run']);

      expect(args.dryRun).toBe(true);
    });

    it('returns help for --help flag', () => {
      const args = parseNetworkArgs(['--help']);

      expect(args.help).toBe(true);
    });

    it('parses --server-type option', () => {
      const args = parseNetworkArgs(['tls', '--server-type', 'nginx']);

      expect(args.serverType).toBe('nginx');
    });
  });

  describe('runTlsCommand', () => {
    it('generates TLS config for domain', async () => {
      const result = await runTlsCommand({
        domain: 'example.com',
        serverType: 'caddy',
      });

      expect(result.success).toBe(true);
      expect(result.config).toContain('example.com');
    });

    it('generates Let\'s Encrypt config', async () => {
      const result = await runTlsCommand({
        domain: 'example.com',
        email: 'admin@example.com',
        letsEncrypt: true,
      });

      expect(result.letsEncrypt).toBeDefined();
    });

    it('generates CAA record', async () => {
      const result = await runTlsCommand({
        domain: 'example.com',
        includeCaa: true,
      });

      expect(result.caaRecord).toContain('CAA');
    });

    it('validates domain format', async () => {
      const result = await runTlsCommand({
        domain: 'invalid domain',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('domain');
    });
  });

  describe('runHeadersCommand', () => {
    it('generates security headers', async () => {
      const result = await runHeadersCommand({
        preset: 'strict',
      });

      expect(result.success).toBe(true);
      expect(result.headers['Content-Security-Policy']).toBeDefined();
      expect(result.headers['Strict-Transport-Security']).toBeDefined();
    });

    it('generates custom CSP', async () => {
      const result = await runHeadersCommand({
        cspDirectives: {
          'script-src': ["'self'", 'https://cdn.example.com'],
        },
      });

      expect(result.headers['Content-Security-Policy']).toContain('cdn.example.com');
    });

    it('outputs for specific server type', async () => {
      const result = await runHeadersCommand({
        preset: 'strict',
        serverType: 'nginx',
      });

      expect(result.config).toContain('add_header');
    });

    it('validates generated headers', async () => {
      const result = await runHeadersCommand({
        preset: 'strict',
        validate: true,
      });

      expect(result.validation).toBeDefined();
      expect(result.validation.valid).toBe(true);
    });
  });

  describe('runFirewallCommand', () => {
    it('generates UFW rules', async () => {
      const result = await runFirewallCommand({
        sshPort: 22,
        allowPorts: [80, 443],
      });

      expect(result.success).toBe(true);
      expect(result.rules).toContain('allow 80');
      expect(result.rules).toContain('allow 443');
    });

    it('includes SSH rule', async () => {
      const result = await runFirewallCommand({
        sshPort: 2222,
      });

      expect(result.rules).toContain('2222');
    });

    it('adds IP allowlist', async () => {
      const result = await runFirewallCommand({
        adminIps: ['192.168.1.100'],
      });

      expect(result.rules).toContain('192.168.1.100');
    });

    it('generates fail2ban config', async () => {
      const result = await runFirewallCommand({
        includeFail2ban: true,
      });

      expect(result.fail2ban).toBeDefined();
      expect(result.fail2ban).toContain('[sshd]');
    });

    it('validates rules before apply', async () => {
      const result = await runFirewallCommand({
        sshPort: 22,
        validate: true,
      });

      expect(result.validation.valid).toBe(true);
    });
  });

  describe('runAuditCommand', () => {
    it('checks TLS configuration', async () => {
      const mockCheck = vi.fn().mockResolvedValue({
        tlsVersion: '1.3',
        ciphers: ['TLS_AES_256_GCM_SHA384'],
      });

      const result = await runAuditCommand({
        domain: 'example.com',
        checkTls: mockCheck,
      });

      expect(result.tls).toBeDefined();
      expect(result.tls.version).toBe('1.3');
    });

    it('checks security headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        headers: new Map([
          ['content-security-policy', "default-src 'self'"],
          ['strict-transport-security', 'max-age=31536000'],
        ]),
      });

      const result = await runAuditCommand({
        domain: 'example.com',
        fetch: mockFetch,
      });

      expect(result.headers).toBeDefined();
    });

    it('calculates security score', async () => {
      const result = await runAuditCommand({
        domain: 'example.com',
        mockResults: {
          tls: { score: 100 },
          headers: { score: 90 },
          firewall: { score: 80 },
        },
      });

      expect(result.score).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });

    it('provides recommendations', async () => {
      const result = await runAuditCommand({
        domain: 'example.com',
        mockResults: {
          headers: { missing: ['Content-Security-Policy'] },
        },
      });

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('formatOutput', () => {
    it('formats as JSON', () => {
      const output = formatOutput({ test: 'value' }, 'json');

      expect(JSON.parse(output)).toEqual({ test: 'value' });
    });

    it('formats as YAML', () => {
      const output = formatOutput({ test: 'value' }, 'yaml');

      expect(output).toContain('test:');
      expect(output).toContain('value');
    });

    it('formats as text by default', () => {
      const output = formatOutput({ test: 'value' }, 'text');

      expect(typeof output).toBe('string');
    });
  });

  describe('createNetworkSecurityCommand', () => {
    it('creates command with name and description', () => {
      const command = createNetworkSecurityCommand();

      expect(command.name).toBe('network');
      expect(command.description).toBeDefined();
    });

    it('has execute function', () => {
      const command = createNetworkSecurityCommand();

      expect(command.execute).toBeDefined();
    });

    it('executes tls subcommand', async () => {
      const command = createNetworkSecurityCommand();

      const result = await command.execute(['tls', '--domain', 'example.com'], {});

      expect(result.success).toBe(true);
    });

    it('executes headers subcommand', async () => {
      const command = createNetworkSecurityCommand();

      const result = await command.execute(['headers', '--preset', 'strict'], {});

      expect(result.success).toBe(true);
    });

    it('executes firewall subcommand', async () => {
      const command = createNetworkSecurityCommand();

      const result = await command.execute(['firewall'], {});

      expect(result.success).toBe(true);
    });

    it('executes audit subcommand', async () => {
      const command = createNetworkSecurityCommand();

      const result = await command.execute(['audit', '--domain', 'example.com'], {});

      expect(result).toBeDefined();
    });

    it('shows help when no subcommand', async () => {
      const command = createNetworkSecurityCommand();

      const result = await command.execute([], {});

      expect(result.help).toBe(true);
    });
  });
});
