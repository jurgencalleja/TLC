/**
 * Convert Command Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ConvertCommand', () => {
  // Mock dependencies
  const createMockBoundaryDetector = (overrides = {}) => ({
    detect: vi.fn().mockReturnValue({
      services: [
        { name: 'auth', files: ['auth/login.js', 'auth/logout.js'], quality: 85, dependencies: [] },
        { name: 'users', files: ['users/profile.js'], quality: 70, dependencies: ['auth'] },
        { name: 'api', files: ['api/routes.js', 'api/handlers.js'], quality: 60, dependencies: ['auth', 'users'] },
      ],
      shared: ['lib/utils.js', 'lib/config.js'],
      suggestions: [],
      stats: { totalServices: 3, totalShared: 2, averageCoupling: 2 },
    }),
    ...overrides,
  });

  const createMockConversionPlanner = (overrides = {}) => ({
    planFullConversion: vi.fn().mockReturnValue({
      services: [
        { name: 'auth', files: ['auth/login.js', 'auth/logout.js'], quality: 85, dependencies: [] },
        { name: 'users', files: ['users/profile.js'], quality: 70, dependencies: ['auth'] },
      ],
      shared: ['lib/utils.js'],
      steps: [
        'Create service directories',
        'Move auth files to auth-service/',
        'Update imports',
      ],
      destructiveChanges: [],
    }),
    planServiceExtraction: vi.fn().mockReturnValue({
      service: { name: 'auth', files: ['auth/login.js', 'auth/logout.js'], dependencies: [] },
      shared: ['lib/utils.js'],
      steps: ['Create auth-service directory', 'Move auth files'],
      destructiveChanges: [],
    }),
    ...overrides,
  });

  const createMockServiceScaffold = (overrides = {}) => ({
    createDirectories: vi.fn().mockResolvedValue({
      created: ['services/auth', 'services/users'],
      skipped: [],
    }),
    ...overrides,
  });

  describe('microservice generates full plan', () => {
    it('generates conversion plan for all services', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const boundaryDetector = createMockBoundaryDetector();
      const conversionPlanner = createMockConversionPlanner();
      const serviceScaffold = createMockServiceScaffold();

      const command = new ConvertCommand({
        boundaryDetector,
        conversionPlanner,
        serviceScaffold,
      });

      const result = await command.run('microservice --dry-run', {
        projectDir: '/test/project',
        graph: { nodes: [], edges: [] },
      });

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(boundaryDetector.detect).toHaveBeenCalled();
      expect(conversionPlanner.planFullConversion).toHaveBeenCalled();
    });

    it('includes services in plan output', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice --dry-run', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.output).toContain('Identified Services');
      expect(result.output).toContain('auth');
      expect(result.output).toContain('users');
    });
  });

  describe('--service extracts single service', () => {
    it('extracts specific service when --service flag provided', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const conversionPlanner = createMockConversionPlanner();

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner,
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice --service auth --dry-run', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.success).toBe(true);
      expect(conversionPlanner.planServiceExtraction).toHaveBeenCalled();
      expect(conversionPlanner.planFullConversion).not.toHaveBeenCalled();
    });

    it('returns error for unknown service', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice --service unknown', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service not found');
      expect(result.error).toContain('unknown');
    });

    it('lists available services in error message', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice --service nonexistent', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.error).toContain('auth');
      expect(result.error).toContain('users');
      expect(result.error).toContain('api');
    });
  });

  describe('--dry-run does not modify files', () => {
    it('does not call scaffold when dry-run is set', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const serviceScaffold = createMockServiceScaffold();

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold,
      });

      const result = await command.run('microservice --scaffold --dry-run', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(serviceScaffold.createDirectories).not.toHaveBeenCalled();
    });

    it('shows what would happen in dry-run output', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice --dry-run', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.output).toContain('Dry Run');
      expect(result.output).toContain('No files will be modified');
    });

    it('includes conversion steps in dry-run output', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice --dry-run', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.output).toContain('Conversion Steps');
      expect(result.output).toContain('Create service directories');
    });
  });

  describe('--scaffold creates directories', () => {
    it('creates service directories when scaffold flag is set', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const serviceScaffold = createMockServiceScaffold();

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold,
      });

      const result = await command.run('microservice --scaffold', {
        projectDir: '/test/project',
        graph: { nodes: [], edges: [] },
      });

      expect(result.success).toBe(true);
      expect(serviceScaffold.createDirectories).toHaveBeenCalled();
      expect(result.scaffolded).toContain('services/auth');
      expect(result.scaffolded).toContain('services/users');
    });

    it('includes created directories in output', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice --scaffold', {
        projectDir: '/test/project',
        graph: { nodes: [], edges: [] },
      });

      expect(result.output).toContain('Created Directories');
      expect(result.output).toContain('services/auth');
    });
  });

  describe('confirms before destructive changes', () => {
    it('asks for confirmation before destructive changes', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const conversionPlanner = createMockConversionPlanner({
        planFullConversion: vi.fn().mockReturnValue({
          services: [{ name: 'auth', files: [], dependencies: [] }],
          shared: [],
          steps: [],
          destructiveChanges: [
            { type: 'move', file: 'src/auth.js' },
            { type: 'modify', file: 'src/index.js' },
          ],
        }),
      });

      const onConfirm = vi.fn().mockResolvedValue(true);

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner,
        serviceScaffold: createMockServiceScaffold(),
        onConfirm,
      });

      await command.run('microservice', {
        graph: { nodes: [], edges: [] },
      });

      expect(onConfirm).toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'destructive',
          changes: expect.arrayContaining([
            expect.objectContaining({ type: 'move' }),
          ]),
        })
      );
    });

    it('cancels when user declines confirmation', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const conversionPlanner = createMockConversionPlanner({
        planFullConversion: vi.fn().mockReturnValue({
          services: [],
          shared: [],
          steps: [],
          destructiveChanges: [{ type: 'move', file: 'src/auth.js' }],
        }),
      });

      const onConfirm = vi.fn().mockResolvedValue(false);

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner,
        serviceScaffold: createMockServiceScaffold(),
        onConfirm,
      });

      const result = await command.run('microservice', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.cancelled).toBe(true);
      expect(result.output).toContain('cancelled');
    });

    it('skips confirmation with --force flag', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const conversionPlanner = createMockConversionPlanner({
        planFullConversion: vi.fn().mockReturnValue({
          services: [],
          shared: [],
          steps: [],
          destructiveChanges: [{ type: 'move', file: 'src/auth.js' }],
        }),
      });

      const onConfirm = vi.fn();

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner,
        serviceScaffold: createMockServiceScaffold(),
        onConfirm,
      });

      const result = await command.run('microservice --force', {
        graph: { nodes: [], edges: [] },
      });

      expect(onConfirm).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('does not ask confirmation when no destructive changes', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const onConfirm = vi.fn();

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(), // No destructive changes
        serviceScaffold: createMockServiceScaffold(),
        onConfirm,
      });

      const result = await command.run('microservice', {
        graph: { nodes: [], edges: [] },
      });

      expect(onConfirm).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('parseArgs', () => {
    it('parses microservice action', async () => {
      const { ConvertCommand } = await import('./convert-command.js');
      const command = new ConvertCommand({});

      const options = command.parseArgs('microservice');

      expect(options.action).toBe('microservice');
    });

    it('parses --service flag', async () => {
      const { ConvertCommand } = await import('./convert-command.js');
      const command = new ConvertCommand({});

      const options = command.parseArgs('microservice --service auth');

      expect(options.service).toBe('auth');
    });

    it('parses --dry-run flag', async () => {
      const { ConvertCommand } = await import('./convert-command.js');
      const command = new ConvertCommand({});

      const options = command.parseArgs('microservice --dry-run');

      expect(options.dryRun).toBe(true);
    });

    it('parses --scaffold flag', async () => {
      const { ConvertCommand } = await import('./convert-command.js');
      const command = new ConvertCommand({});

      const options = command.parseArgs('microservice --scaffold');

      expect(options.scaffold).toBe(true);
    });

    it('parses --force flag', async () => {
      const { ConvertCommand } = await import('./convert-command.js');
      const command = new ConvertCommand({});

      const options = command.parseArgs('microservice --force');

      expect(options.force).toBe(true);
    });

    it('parses --output flag', async () => {
      const { ConvertCommand } = await import('./convert-command.js');
      const command = new ConvertCommand({});

      const options = command.parseArgs('microservice --output /tmp/output');

      expect(options.output).toBe('/tmp/output');
    });

    it('parses multiple flags together', async () => {
      const { ConvertCommand } = await import('./convert-command.js');
      const command = new ConvertCommand({});

      const options = command.parseArgs('microservice --service auth --dry-run --scaffold');

      expect(options.action).toBe('microservice');
      expect(options.service).toBe('auth');
      expect(options.dryRun).toBe(true);
      expect(options.scaffold).toBe(true);
    });
  });

  describe('createConvertCommand', () => {
    it('creates command handler with execute method', async () => {
      const { createConvertCommand } = await import('./convert-command.js');

      const handler = createConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      expect(handler.execute).toBeDefined();
      expect(typeof handler.execute).toBe('function');
    });

    it('creates command handler with parseArgs method', async () => {
      const { createConvertCommand } = await import('./convert-command.js');

      const handler = createConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      expect(handler.parseArgs).toBeDefined();
      const options = handler.parseArgs('microservice --dry-run');
      expect(options.dryRun).toBe(true);
    });

    it('creates command handler with formatHelp method', async () => {
      const { createConvertCommand } = await import('./convert-command.js');

      const handler = createConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      expect(handler.formatHelp).toBeDefined();
      const help = handler.formatHelp();
      expect(help).toContain('/tlc:convert');
      expect(help).toContain('microservice');
    });

    it('executes command via handler', async () => {
      const { createConvertCommand } = await import('./convert-command.js');

      const handler = createConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await handler.execute('microservice --dry-run', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns error when no action specified', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No action specified');
      expect(result.output).toContain('Usage');
    });

    it('returns error for unknown action', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('unknown-action', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('handles boundary detector errors', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const boundaryDetector = {
        detect: vi.fn().mockImplementation(() => {
          throw new Error('Detection failed');
        }),
      };

      const command = new ConvertCommand({
        boundaryDetector,
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Detection failed');
    });
  });

  describe('progress reporting', () => {
    it('reports progress during execution', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const progressUpdates = [];

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner: createMockConversionPlanner(),
        serviceScaffold: createMockServiceScaffold(),
        onProgress: (update) => progressUpdates.push(update),
      });

      await command.run('microservice --scaffold', {
        graph: { nodes: [], edges: [] },
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.phase === 'analyzing')).toBe(true);
      expect(progressUpdates.some(p => p.phase === 'planning')).toBe(true);
      expect(progressUpdates.some(p => p.phase === 'scaffolding')).toBe(true);
    });
  });

  describe('shared kernel handling', () => {
    it('includes shared files in dry-run output', async () => {
      const { ConvertCommand } = await import('./convert-command.js');

      const conversionPlanner = createMockConversionPlanner({
        planFullConversion: vi.fn().mockReturnValue({
          services: [{ name: 'auth', files: [], dependencies: [] }],
          shared: ['lib/utils.js', 'lib/config.js', 'lib/logger.js'],
          steps: [],
          destructiveChanges: [],
        }),
      });

      const command = new ConvertCommand({
        boundaryDetector: createMockBoundaryDetector(),
        conversionPlanner,
        serviceScaffold: createMockServiceScaffold(),
      });

      const result = await command.run('microservice --dry-run', {
        graph: { nodes: [], edges: [] },
      });

      expect(result.output).toContain('Shared Kernel');
      expect(result.output).toContain('lib/utils.js');
    });
  });
});
