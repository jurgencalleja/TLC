/**
 * Fail2ban Configuration Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateJailConfig,
  generateSshdJail,
  generateHttpAuthJail,
  generateCustomFilter,
  validateJailConfig,
  JAIL_DEFAULTS,
  createFail2banConfig,
} from './fail2ban-config.js';

describe('fail2ban-config', () => {
  describe('JAIL_DEFAULTS', () => {
    it('defines default settings', () => {
      expect(JAIL_DEFAULTS.banTime).toBeDefined();
      expect(JAIL_DEFAULTS.findTime).toBeDefined();
      expect(JAIL_DEFAULTS.maxRetry).toBeDefined();
    });
  });

  describe('generateSshdJail', () => {
    it('generates sshd jail config', () => {
      const config = generateSshdJail();

      expect(config).toContain('[sshd]');
      expect(config).toContain('enabled = true');
    });

    it('sets ban time', () => {
      const config = generateSshdJail({ banTime: 3600 });

      expect(config).toContain('bantime = 3600');
    });

    it('sets max retry', () => {
      const config = generateSshdJail({ maxRetry: 3 });

      expect(config).toContain('maxretry = 3');
    });

    it('configures custom port', () => {
      const config = generateSshdJail({ port: 2222 });

      expect(config).toContain('port = 2222');
    });

    it('includes whitelist', () => {
      const config = generateSshdJail({
        ignoreIps: ['192.168.1.0/24', '10.0.0.1'],
      });

      expect(config).toContain('ignoreip');
      expect(config).toContain('192.168.1.0/24');
      expect(config).toContain('10.0.0.1');
    });
  });

  describe('generateHttpAuthJail', () => {
    it('generates http-auth jail config', () => {
      const config = generateHttpAuthJail();

      expect(config).toContain('[http-auth]');
      expect(config).toContain('enabled = true');
    });

    it('sets filter', () => {
      const config = generateHttpAuthJail({ filter: 'apache-auth' });

      expect(config).toContain('filter = apache-auth');
    });

    it('configures log path', () => {
      const config = generateHttpAuthJail({
        logPath: '/var/log/nginx/access.log',
      });

      expect(config).toContain('logpath = /var/log/nginx/access.log');
    });

    it('supports multiple log paths', () => {
      const config = generateHttpAuthJail({
        logPaths: ['/var/log/nginx/access.log', '/var/log/nginx/error.log'],
      });

      expect(config).toContain('/var/log/nginx/access.log');
      expect(config).toContain('/var/log/nginx/error.log');
    });
  });

  describe('generateCustomFilter', () => {
    it('generates filter definition', () => {
      const filter = generateCustomFilter({
        name: 'custom-auth',
        failregex: 'Authentication failed for user .* from <HOST>',
      });

      expect(filter).toContain('[Definition]');
      expect(filter).toContain('failregex');
      expect(filter).toContain('<HOST>');
    });

    it('supports multiple fail patterns', () => {
      const filter = generateCustomFilter({
        name: 'custom-auth',
        failregex: [
          'Authentication failed for user .* from <HOST>',
          'Invalid password from <HOST>',
        ],
      });

      expect(filter).toContain('Authentication failed');
      expect(filter).toContain('Invalid password');
    });

    it('includes ignore patterns', () => {
      const filter = generateCustomFilter({
        name: 'custom-auth',
        failregex: 'Failed from <HOST>',
        ignoreregex: 'Successful login',
      });

      expect(filter).toContain('ignoreregex');
      expect(filter).toContain('Successful login');
    });

    it('sets date pattern', () => {
      const filter = generateCustomFilter({
        name: 'custom-auth',
        failregex: 'Failed from <HOST>',
        datepattern: '%Y-%m-%d %H:%M:%S',
      });

      expect(filter).toContain('datepattern');
    });
  });

  describe('generateJailConfig', () => {
    it('generates complete jail.local config', () => {
      const config = generateJailConfig({
        jails: ['sshd', 'http-auth'],
      });

      expect(config).toContain('[sshd]');
      expect(config).toContain('[http-auth]');
    });

    it('includes DEFAULT section', () => {
      const config = generateJailConfig({
        jails: ['sshd'],
        defaults: {
          banTime: 7200,
          findTime: 600,
          maxRetry: 5,
        },
      });

      expect(config).toContain('[DEFAULT]');
      expect(config).toContain('bantime = 7200');
      expect(config).toContain('findtime = 600');
      expect(config).toContain('maxretry = 5');
    });

    it('configures action', () => {
      const config = generateJailConfig({
        jails: ['sshd'],
        action: 'action_mwl',
      });

      expect(config).toContain('action = %(action_mwl)s');
    });

    it('sets ban action', () => {
      const config = generateJailConfig({
        jails: ['sshd'],
        banAction: 'ufw',
      });

      expect(config).toContain('banaction = ufw');
    });
  });

  describe('validateJailConfig', () => {
    it('validates correct jail config', () => {
      const config = `
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
`;
      const result = validateJailConfig(config);

      expect(result.valid).toBe(true);
    });

    it('detects missing enabled directive', () => {
      const config = `
[sshd]
port = ssh
`;
      const result = validateJailConfig(config);

      expect(result.warnings).toContainEqual(expect.stringContaining('enabled'));
    });

    it('validates ban time format', () => {
      const config = `
[sshd]
enabled = true
bantime = invalid
`;
      const result = validateJailConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('bantime'));
    });

    it('validates log path exists', () => {
      const config = `
[sshd]
enabled = true
logpath = /nonexistent/path.log
`;
      const result = validateJailConfig(config, { checkPaths: true });

      expect(result.warnings).toContainEqual(expect.stringContaining('logpath'));
    });
  });

  describe('createFail2banConfig', () => {
    it('creates config manager with methods', () => {
      const manager = createFail2banConfig();

      expect(manager.addJail).toBeDefined();
      expect(manager.addFilter).toBeDefined();
      expect(manager.generate).toBeDefined();
      expect(manager.validate).toBeDefined();
    });

    it('adds jails', () => {
      const manager = createFail2banConfig();

      manager.addJail('sshd', { maxRetry: 3 });
      manager.addJail('http-auth');

      const config = manager.generate();
      expect(config).toContain('[sshd]');
      expect(config).toContain('[http-auth]');
    });

    it('adds custom filters', () => {
      const manager = createFail2banConfig();

      manager.addFilter('tlc-auth', {
        failregex: 'TLC auth failed from <HOST>',
      });

      const filters = manager.getFilters();
      expect(filters['tlc-auth']).toBeDefined();
    });

    it('validates complete config', () => {
      const manager = createFail2banConfig();

      manager.addJail('sshd');

      const result = manager.validate();
      expect(result.valid).toBe(true);
    });
  });
});
