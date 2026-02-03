/**
 * Firewall Manager Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateUfwRules,
  generateUfwEnableCommand,
  setDefaultPolicy,
  allowPort,
  allowFromIp,
  denyPort,
  validateRule,
  UFW_POLICIES,
  createFirewallManager,
} from './firewall-manager.js';

describe('firewall-manager', () => {
  describe('UFW_POLICIES', () => {
    it('defines policy constants', () => {
      expect(UFW_POLICIES.ALLOW).toBe('allow');
      expect(UFW_POLICIES.DENY).toBe('deny');
      expect(UFW_POLICIES.REJECT).toBe('reject');
    });
  });

  describe('generateUfwEnableCommand', () => {
    it('generates enable command', () => {
      const command = generateUfwEnableCommand();

      expect(command).toContain('ufw');
      expect(command).toContain('enable');
    });

    it('includes force flag', () => {
      const command = generateUfwEnableCommand({ force: true });

      expect(command).toContain('--force');
    });
  });

  describe('setDefaultPolicy', () => {
    it('sets default deny incoming', () => {
      const command = setDefaultPolicy({
        direction: 'incoming',
        policy: 'deny',
      });

      expect(command).toContain('default deny incoming');
    });

    it('sets default allow outgoing', () => {
      const command = setDefaultPolicy({
        direction: 'outgoing',
        policy: 'allow',
      });

      expect(command).toContain('default allow outgoing');
    });
  });

  describe('allowPort', () => {
    it('generates allow rule for port', () => {
      const rule = allowPort({ port: 443 });

      expect(rule).toContain('allow');
      expect(rule).toContain('443');
    });

    it('supports protocol specification', () => {
      const rule = allowPort({ port: 443, protocol: 'tcp' });

      expect(rule).toContain('443/tcp');
    });

    it('supports port ranges', () => {
      const rule = allowPort({ port: '3000:3010' });

      expect(rule).toContain('3000:3010');
    });

    it('supports named services', () => {
      const rule = allowPort({ port: 'ssh' });

      expect(rule).toContain('ssh');
    });
  });

  describe('allowFromIp', () => {
    it('generates allow rule for IP', () => {
      const rule = allowFromIp({
        ip: '192.168.1.100',
        port: 22,
      });

      expect(rule).toContain('from 192.168.1.100');
      expect(rule).toContain('22');
    });

    it('supports CIDR notation', () => {
      const rule = allowFromIp({
        ip: '10.0.0.0/8',
        port: 22,
      });

      expect(rule).toContain('from 10.0.0.0/8');
    });

    it('supports any destination', () => {
      const rule = allowFromIp({
        ip: '192.168.1.100',
      });

      expect(rule).toContain('from 192.168.1.100');
    });
  });

  describe('denyPort', () => {
    it('generates deny rule for port', () => {
      const rule = denyPort({ port: 23 });

      expect(rule).toContain('deny');
      expect(rule).toContain('23');
    });

    it('supports protocol specification', () => {
      const rule = denyPort({ port: 23, protocol: 'tcp' });

      expect(rule).toContain('23/tcp');
    });
  });

  describe('validateRule', () => {
    it('validates correct rule syntax', () => {
      const result = validateRule('ufw allow 443/tcp');

      expect(result.valid).toBe(true);
    });

    it('rejects invalid port numbers', () => {
      const result = validateRule('ufw allow 99999');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('port');
    });

    it('rejects invalid IP addresses', () => {
      const result = validateRule('ufw allow from 999.999.999.999');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('IP');
    });

    it('validates CIDR notation', () => {
      const validResult = validateRule('ufw allow from 10.0.0.0/8');
      expect(validResult.valid).toBe(true);

      const invalidResult = validateRule('ufw allow from 10.0.0.0/33');
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('generateUfwRules', () => {
    it('generates complete UFW configuration', () => {
      const rules = generateUfwRules({
        allowPorts: [80, 443],
        sshPort: 22,
      });

      expect(rules).toContain('default deny incoming');
      expect(rules).toContain('default allow outgoing');
      expect(rules).toContain('allow 80');
      expect(rules).toContain('allow 443');
      expect(rules).toContain('allow 22');
    });

    it('supports custom SSH port', () => {
      const rules = generateUfwRules({
        allowPorts: [80, 443],
        sshPort: 2222,
      });

      expect(rules).toContain('allow 2222');
      expect(rules).not.toContain('allow 22/tcp');
    });

    it('includes IP allowlist for admin', () => {
      const rules = generateUfwRules({
        allowPorts: [80, 443],
        sshPort: 22,
        adminIps: ['192.168.1.100', '10.0.0.50'],
      });

      expect(rules).toContain('from 192.168.1.100');
      expect(rules).toContain('from 10.0.0.50');
    });

    it('supports rate limiting', () => {
      const rules = generateUfwRules({
        allowPorts: [80, 443],
        sshPort: 22,
        rateLimit: true,
      });

      expect(rules).toContain('limit');
    });

    it('generates script format', () => {
      const rules = generateUfwRules({
        allowPorts: [80, 443],
        sshPort: 22,
        format: 'script',
      });

      expect(rules).toContain('#!/bin/bash');
      expect(rules).toContain('ufw');
    });
  });

  describe('createFirewallManager', () => {
    it('creates manager with methods', () => {
      const manager = createFirewallManager();

      expect(manager.generateRules).toBeDefined();
      expect(manager.allowPort).toBeDefined();
      expect(manager.denyPort).toBeDefined();
      expect(manager.allowFromIp).toBeDefined();
      expect(manager.validate).toBeDefined();
    });

    it('tracks added rules', () => {
      const manager = createFirewallManager();

      manager.allowPort({ port: 80 });
      manager.allowPort({ port: 443 });

      const rules = manager.getRules();
      expect(rules.length).toBe(2);
    });

    it('generates complete config', () => {
      const manager = createFirewallManager({
        sshPort: 22,
      });

      manager.allowPort({ port: 80 });
      manager.allowPort({ port: 443 });

      const config = manager.generateConfig();
      expect(config).toContain('80');
      expect(config).toContain('443');
      expect(config).toContain('22');
    });
  });
});
