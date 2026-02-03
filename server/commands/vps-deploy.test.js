/**
 * VPS Deploy Command Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { parseVpsArgs, runInit, runPush, runStatus, runRollback, validateSsh, createVpsDeployCommand } from './vps-deploy.js';

describe('vps-deploy command', () => {
  describe('parseVpsArgs', () => {
    it('parses init subcommand', () => {
      const args = parseVpsArgs(['init', '--host', 'server.example.com']);
      expect(args.subcommand).toBe('init');
      expect(args.host).toBe('server.example.com');
    });

    it('parses push subcommand', () => {
      const args = parseVpsArgs(['push', '--branch', 'main']);
      expect(args.subcommand).toBe('push');
      expect(args.branch).toBe('main');
    });

    it('parses status subcommand', () => {
      const args = parseVpsArgs(['status']);
      expect(args.subcommand).toBe('status');
    });

    it('parses rollback subcommand', () => {
      const args = parseVpsArgs(['rollback', '--version', 'v1.0.0']);
      expect(args.subcommand).toBe('rollback');
      expect(args.version).toBe('v1.0.0');
    });

    it('parses logs subcommand', () => {
      const args = parseVpsArgs(['logs', '--follow']);
      expect(args.subcommand).toBe('logs');
      expect(args.follow).toBe(true);
    });
  });

  describe('validateSsh', () => {
    it('validates SSH connection', async () => {
      const mockSsh = vi.fn().mockResolvedValue({ connected: true });
      const result = await validateSsh({ host: 'server.example.com', ssh: mockSsh });
      expect(result.valid).toBe(true);
    });

    it('returns error for failed connection', async () => {
      const mockSsh = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const result = await validateSsh({ host: 'server.example.com', ssh: mockSsh });
      expect(result.valid).toBe(false);
    });
  });

  describe('runInit', () => {
    it('sets up server', async () => {
      const result = await runInit({ host: 'server.example.com', mockSsh: vi.fn().mockResolvedValue({}) });
      expect(result.success).toBe(true);
    });
  });

  describe('runPush', () => {
    it('deploys app', async () => {
      const result = await runPush({ branch: 'main', mockDeploy: vi.fn().mockResolvedValue({}) });
      expect(result.success).toBe(true);
    });
  });

  describe('runStatus', () => {
    it('shows deployment state', async () => {
      const result = await runStatus({ mockStatus: vi.fn().mockResolvedValue({ running: true }) });
      expect(result.status).toBeDefined();
    });
  });

  describe('runRollback', () => {
    it('reverts deployment', async () => {
      const result = await runRollback({ version: 'v1.0.0', mockRollback: vi.fn().mockResolvedValue({}) });
      expect(result.success).toBe(true);
    });
  });

  describe('createVpsDeployCommand', () => {
    it('creates command', () => {
      const command = createVpsDeployCommand();
      expect(command.name).toBe('deploy');
      expect(command.execute).toBeDefined();
    });
  });
});
