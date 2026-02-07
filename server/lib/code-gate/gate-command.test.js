/**
 * Gate Command Tests
 *
 * /tlc:gate command to install, configure, and run the code gate.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  createGateCommand,
  parseGateArgs,
} = require('./gate-command.js');

describe('Gate Command', () => {
  describe('parseGateArgs', () => {
    it('parses install subcommand', () => {
      const args = parseGateArgs('install');
      expect(args.subcommand).toBe('install');
    });

    it('parses check subcommand', () => {
      const args = parseGateArgs('check');
      expect(args.subcommand).toBe('check');
    });

    it('parses status subcommand', () => {
      const args = parseGateArgs('status');
      expect(args.subcommand).toBe('status');
    });

    it('defaults to check when no subcommand', () => {
      const args = parseGateArgs('');
      expect(args.subcommand).toBe('check');
    });

    it('parses config subcommand', () => {
      const args = parseGateArgs('config');
      expect(args.subcommand).toBe('config');
    });
  });

  describe('createGateCommand', () => {
    it('creates command with injectable dependencies', () => {
      const cmd = createGateCommand({ projectPath: '/test' });
      expect(cmd).toBeDefined();
      expect(cmd.execute).toBeTypeOf('function');
    });

    it('install subcommand calls hooks installer', async () => {
      const mockInstallHooks = vi.fn().mockResolvedValue({ installed: ['pre-commit', 'pre-push'] });
      const cmd = createGateCommand({
        projectPath: '/test',
        installHooks: mockInstallHooks,
      });

      const result = await cmd.execute('install');
      expect(mockInstallHooks).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('check subcommand runs gate engine', async () => {
      const mockRunGate = vi.fn().mockResolvedValue({
        passed: true,
        findings: [],
        summary: { total: 0, block: 0, warn: 0, info: 0 },
      });
      const mockGetStagedFiles = vi.fn().mockResolvedValue([]);
      const cmd = createGateCommand({
        projectPath: '/test',
        runGate: mockRunGate,
        getStagedFiles: mockGetStagedFiles,
      });

      const result = await cmd.execute('check');
      expect(result.passed).toBe(true);
    });

    it('status subcommand returns gate configuration', async () => {
      const mockLoadConfig = vi.fn().mockReturnValue({
        enabled: true,
        strictness: 'strict',
        preCommit: true,
        prePush: true,
      });
      const mockIsInstalled = vi.fn().mockReturnValue(true);
      const cmd = createGateCommand({
        projectPath: '/test',
        loadConfig: mockLoadConfig,
        isHookInstalled: mockIsInstalled,
      });

      const result = await cmd.execute('status');
      expect(result.config).toBeDefined();
      expect(result.config.strictness).toBe('strict');
      expect(result.hooks).toBeDefined();
    });

    it('config subcommand updates .tlc.json', async () => {
      let savedConfig = null;
      const mockSaveConfig = vi.fn((config) => { savedConfig = config; });
      const cmd = createGateCommand({
        projectPath: '/test',
        saveConfig: mockSaveConfig,
        loadConfig: vi.fn().mockReturnValue({ enabled: true, strictness: 'strict' }),
      });

      const result = await cmd.execute('config', { strictness: 'standard' });
      expect(mockSaveConfig).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
