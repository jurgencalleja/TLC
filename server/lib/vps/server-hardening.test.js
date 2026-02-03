/**
 * Server Hardening Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateSshConfig,
  generateSysctlConfig,
  disableServices,
  enableAutoUpdates,
  createServerHardening,
} from './server-hardening.js';

describe('server-hardening', () => {
  describe('generateSshConfig', () => {
    it('disables password auth', () => {
      const config = generateSshConfig({ passwordAuth: false });
      expect(config).toContain('PasswordAuthentication no');
    });

    it('configures custom port', () => {
      const config = generateSshConfig({ port: 2222 });
      expect(config).toContain('Port 2222');
    });

    it('enables key-only auth', () => {
      const config = generateSshConfig({});
      expect(config).toContain('PubkeyAuthentication yes');
    });

    it('disables root login', () => {
      const config = generateSshConfig({ permitRootLogin: false });
      expect(config).toContain('PermitRootLogin no');
    });
  });

  describe('generateSysctlConfig', () => {
    it('hardens network settings', () => {
      const config = generateSysctlConfig({});
      expect(config).toContain('net.ipv4');
    });

    it('disables IP forwarding', () => {
      const config = generateSysctlConfig({});
      expect(config).toContain('ip_forward = 0');
    });
  });

  describe('disableServices', () => {
    it('generates disable commands', () => {
      const commands = disableServices(['telnet', 'rsh']);
      expect(commands).toContain('systemctl disable telnet');
    });
  });

  describe('enableAutoUpdates', () => {
    it('generates unattended-upgrades config', () => {
      const config = enableAutoUpdates({});
      expect(config).toContain('Unattended-Upgrade');
    });
  });

  describe('createServerHardening', () => {
    it('creates manager with methods', () => {
      const manager = createServerHardening();
      expect(manager.generateSshConfig).toBeDefined();
      expect(manager.generateSysctl).toBeDefined();
      expect(manager.generateAll).toBeDefined();
    });
  });
});
