import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('zero-retention-command', () => {
  let ZeroRetentionCommand;
  let parseArgs;
  let command;
  let mockZeroRetention;

  beforeEach(async () => {
    // Reset modules
    vi.resetModules();

    // Create mocks for zero-retention module
    mockZeroRetention = {
      enable: vi.fn().mockReturnValue({
        success: true,
        enabled: true,
        subsystems: {
          ephemeralStorage: true,
          sessionPurge: true,
          memoryExclusion: true,
        },
        config: {
          enabled: true,
          ephemeralStorage: { encrypt: true },
          sessionPurge: { aggressive: true },
          memoryExclusion: { excludeAll: true },
          retentionPolicy: { retention: 'immediate', persist: false },
        },
      }),
      disable: vi.fn().mockReturnValue({
        success: true,
        enabled: false,
      }),
      isEnabled: vi.fn().mockReturnValue(false),
      getConfig: vi.fn().mockReturnValue({
        enabled: false,
        ephemeralStorage: null,
        sessionPurge: null,
        memoryExclusion: null,
        retentionPolicy: null,
      }),
      validate: vi.fn().mockReturnValue({
        valid: true,
        conflicts: [],
        warnings: [],
      }),
    };

    // Mock the zero-retention module
    vi.doMock('./zero-retention.js', () => mockZeroRetention);

    // Import the module after mocking
    const module = await import('./zero-retention-command.js');
    ZeroRetentionCommand = module.ZeroRetentionCommand;
    parseArgs = module.parseArgs;

    // Create instance with mocks
    command = new ZeroRetentionCommand({
      zeroRetention: mockZeroRetention,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('parseArgs', () => {
    it('parses empty args', () => {
      const result = parseArgs([]);
      expect(result).toEqual({
        subcommand: null,
        set: null,
        force: false,
      });
    });

    it('parses enable subcommand', () => {
      const result = parseArgs(['enable']);
      expect(result.subcommand).toBe('enable');
    });

    it('parses disable subcommand', () => {
      const result = parseArgs(['disable']);
      expect(result.subcommand).toBe('disable');
    });

    it('parses status subcommand', () => {
      const result = parseArgs(['status']);
      expect(result.subcommand).toBe('status');
    });

    it('parses purge subcommand', () => {
      const result = parseArgs(['purge']);
      expect(result.subcommand).toBe('purge');
    });

    it('parses config subcommand', () => {
      const result = parseArgs(['config']);
      expect(result.subcommand).toBe('config');
    });

    it('parses --set flag with value', () => {
      const result = parseArgs(['config', '--set', 'auditLogging=true']);
      expect(result.subcommand).toBe('config');
      expect(result.set).toBe('auditLogging=true');
    });

    it('parses --set= syntax', () => {
      const result = parseArgs(['config', '--set=auditLogging=true']);
      expect(result.set).toBe('auditLogging=true');
    });

    it('parses --force flag', () => {
      const result = parseArgs(['purge', '--force']);
      expect(result.subcommand).toBe('purge');
      expect(result.force).toBe(true);
    });
  });

  describe('execute', () => {
    describe('enable subcommand', () => {
      it('execute enable activates mode', async () => {
        const result = await command.execute(['enable']);

        expect(result.success).toBe(true);
        expect(mockZeroRetention.enable).toHaveBeenCalled();
        expect(result.output).toContain('enabled');
      });

      it('reports when already enabled', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(true);
        mockZeroRetention.enable.mockReturnValue({
          success: true,
          enabled: true,
        });

        const result = await command.execute(['enable']);

        expect(result.success).toBe(true);
        expect(result.output).toContain('enabled');
      });
    });

    describe('disable subcommand', () => {
      it('execute disable deactivates mode', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(true);

        const result = await command.execute(['disable']);

        expect(result.success).toBe(true);
        expect(mockZeroRetention.disable).toHaveBeenCalled();
        expect(result.output).toContain('disabled');
      });

      it('reports when already disabled', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(false);

        const result = await command.execute(['disable']);

        expect(result.success).toBe(true);
        expect(result.output).toContain('disabled');
      });
    });

    describe('status subcommand', () => {
      it('execute status shows current state', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(true);
        mockZeroRetention.getConfig.mockReturnValue({
          enabled: true,
          ephemeralStorage: { encrypt: true },
          sessionPurge: { aggressive: true },
          memoryExclusion: { excludeAll: true },
          retentionPolicy: { retention: 'immediate', persist: false },
        });

        const result = await command.execute(['status']);

        expect(result.success).toBe(true);
        expect(mockZeroRetention.isEnabled).toHaveBeenCalled();
        expect(result.output).toContain('ENABLED');
      });

      it('execute status shows policy summary', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(true);
        mockZeroRetention.getConfig.mockReturnValue({
          enabled: true,
          ephemeralStorage: { encrypt: true },
          sessionPurge: { aggressive: true },
          memoryExclusion: { excludeAll: true },
          retentionPolicy: { retention: 'immediate', persist: false },
        });
        mockZeroRetention.validate.mockReturnValue({
          valid: true,
          conflicts: [],
          warnings: [],
        });

        const result = await command.execute(['status']);

        expect(result.success).toBe(true);
        expect(result.output).toContain('immediate');
      });

      it('shows disabled state when mode is off', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(false);

        const result = await command.execute(['status']);

        expect(result.success).toBe(true);
        expect(result.output).toContain('DISABLED');
      });

      it('shows warnings if present', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(true);
        mockZeroRetention.getConfig.mockReturnValue({
          enabled: true,
          auditLogging: true,
        });
        mockZeroRetention.validate.mockReturnValue({
          valid: true,
          conflicts: [],
          warnings: ['Audit logging conflicts with zero-retention'],
        });

        const result = await command.execute(['status']);

        expect(result.success).toBe(true);
        expect(result.output).toContain('Warning');
      });
    });

    describe('purge subcommand', () => {
      it('execute purge forces immediate purge', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(true);

        // Mock the purge manager
        const mockPurgeManager = {
          forcePurge: vi.fn().mockReturnValue({
            purgedCount: 5,
            purgedKeys: ['key1', 'key2', 'key3', 'key4', 'key5'],
            forced: true,
          }),
        };

        command = new ZeroRetentionCommand({
          zeroRetention: mockZeroRetention,
          purgeManager: mockPurgeManager,
        });

        const result = await command.execute(['purge']);

        expect(result.success).toBe(true);
        expect(mockPurgeManager.forcePurge).toHaveBeenCalled();
        expect(result.output).toContain('purge');
      });

      it('requires enabled mode for purge', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(false);

        const result = await command.execute(['purge']);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not enabled');
      });
    });

    describe('config subcommand', () => {
      it('execute config shows configuration', async () => {
        mockZeroRetention.getConfig.mockReturnValue({
          enabled: true,
          ephemeralStorage: { encrypt: true },
          sessionPurge: { aggressive: true },
          memoryExclusion: { excludeAll: true },
          retentionPolicy: { retention: 'immediate', persist: false },
        });

        const result = await command.execute(['config']);

        expect(result.success).toBe(true);
        expect(mockZeroRetention.getConfig).toHaveBeenCalled();
        expect(result.output).toContain('ephemeralStorage');
      });

      it('execute config --set updates settings', async () => {
        mockZeroRetention.isEnabled.mockReturnValue(true);
        mockZeroRetention.enable.mockReturnValue({
          success: true,
          enabled: true,
          config: {
            enabled: true,
            auditLogging: true,
          },
        });

        const result = await command.execute(['config', '--set', 'auditLogging=true']);

        expect(result.success).toBe(true);
        expect(mockZeroRetention.enable).toHaveBeenCalledWith(
          expect.objectContaining({ auditLogging: true })
        );
      });

      it('handles invalid --set value', async () => {
        const result = await command.execute(['config', '--set', 'invalidSyntax']);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid');
      });
    });

    describe('error handling', () => {
      it('shows help for unknown subcommand', async () => {
        const result = await command.execute(['unknown']);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown');
      });

      it('shows help when no subcommand', async () => {
        const result = await command.execute([]);

        expect(result.success).toBe(true);
        expect(result.output).toContain('Usage');
      });

      it('handles errors gracefully', async () => {
        mockZeroRetention.enable.mockImplementation(() => {
          throw new Error('Enable failed');
        });

        const result = await command.execute(['enable']);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Enable failed');
      });
    });
  });

  describe('formatStatus', () => {
    it('formatStatus returns readable output', () => {
      const status = {
        enabled: true,
        subsystems: {
          ephemeralStorage: true,
          sessionPurge: true,
          memoryExclusion: true,
        },
        config: {
          retentionPolicy: { retention: 'immediate', persist: false },
        },
        validation: {
          valid: true,
          conflicts: [],
          warnings: [],
        },
      };

      const formatted = command.formatStatus(status);

      expect(formatted).toContain('Zero-Retention Mode');
      expect(formatted).toContain('ENABLED');
      expect(formatted).toContain('ephemeralStorage');
    });

    it('formatStatus shows disabled state', () => {
      const status = {
        enabled: false,
        subsystems: {},
        config: {},
        validation: { valid: true, conflicts: [], warnings: [] },
      };

      const formatted = command.formatStatus(status);

      expect(formatted).toContain('DISABLED');
    });

    it('formatStatus shows conflicts', () => {
      const status = {
        enabled: true,
        subsystems: {},
        config: {},
        validation: {
          valid: false,
          conflicts: ['Persistence enabled with zero-retention'],
          warnings: [],
        },
      };

      const formatted = command.formatStatus(status);

      expect(formatted).toContain('Conflict');
      expect(formatted).toContain('Persistence');
    });

    it('formatStatus shows warnings', () => {
      const status = {
        enabled: true,
        subsystems: {},
        config: {},
        validation: {
          valid: true,
          conflicts: [],
          warnings: ['Audit logging conflicts'],
        },
      };

      const formatted = command.formatStatus(status);

      expect(formatted).toContain('Warning');
    });
  });

  describe('formatConfig', () => {
    it('formatConfig returns readable config', () => {
      const config = {
        enabled: true,
        ephemeralStorage: { encrypt: true, basePath: null },
        sessionPurge: { aggressive: true },
        memoryExclusion: { excludeAll: true },
        retentionPolicy: { retention: 'immediate', persist: false },
      };

      const formatted = command.formatConfig(config);

      expect(formatted).toContain('Configuration');
      expect(formatted).toContain('ephemeralStorage');
      expect(formatted).toContain('sessionPurge');
      expect(formatted).toContain('memoryExclusion');
      expect(formatted).toContain('retentionPolicy');
    });

    it('formatConfig shows disabled config', () => {
      const config = {
        enabled: false,
        ephemeralStorage: null,
        sessionPurge: null,
        memoryExclusion: null,
        retentionPolicy: null,
      };

      const formatted = command.formatConfig(config);

      expect(formatted).toContain('not configured');
    });
  });
});
