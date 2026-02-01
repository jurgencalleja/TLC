/**
 * Architecture Command Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ArchitectureCommand', () => {
  // Mock graph data for tests
  const mockGraph = {
    nodes: [
      { id: '/project/src/auth/login.js', name: 'src/auth/login.js', imports: 2, importedBy: 1 },
      { id: '/project/src/auth/logout.js', name: 'src/auth/logout.js', imports: 1, importedBy: 0 },
      { id: '/project/src/users/profile.js', name: 'src/users/profile.js', imports: 1, importedBy: 2 },
      { id: '/project/src/utils/helpers.js', name: 'src/utils/helpers.js', imports: 0, importedBy: 5 },
    ],
    edges: [
      { from: '/project/src/auth/login.js', to: '/project/src/utils/helpers.js', fromName: 'src/auth/login.js', toName: 'src/utils/helpers.js' },
      { from: '/project/src/auth/login.js', to: '/project/src/users/profile.js', fromName: 'src/auth/login.js', toName: 'src/users/profile.js' },
      { from: '/project/src/auth/logout.js', to: '/project/src/utils/helpers.js', fromName: 'src/auth/logout.js', toName: 'src/utils/helpers.js' },
      { from: '/project/src/users/profile.js', to: '/project/src/utils/helpers.js', fromName: 'src/users/profile.js', toName: 'src/utils/helpers.js' },
    ],
    external: ['express', 'lodash'],
    stats: {
      totalFiles: 4,
      totalEdges: 4,
      externalDeps: 2,
    },
  };

  // Helper to create mock dependencies
  const createMocks = (overrides = {}) => {
    const dependencyGraph = {
      buildFromDirectory: vi.fn().mockResolvedValue(mockGraph),
      getGraph: vi.fn().mockReturnValue(mockGraph),
      getImporters: vi.fn().mockReturnValue([]),
      getImports: vi.fn().mockReturnValue([]),
      getFiles: vi.fn().mockReturnValue(mockGraph.nodes.map(n => n.id)),
      ...overrides.dependencyGraph,
    };

    const mermaidGenerator = {
      generateFlowchart: vi.fn().mockReturnValue('flowchart TD\n    A --> B'),
      generateModuleDiagram: vi.fn().mockReturnValue('flowchart LR\n    module --> dep'),
      ...overrides.mermaidGenerator,
    };

    const boundaryDetector = {
      detect: vi.fn().mockReturnValue({
        services: [
          { name: 'auth', fileCount: 2, quality: 80, dependencies: ['utils'] },
          { name: 'users', fileCount: 1, quality: 60, dependencies: ['utils'] },
          { name: 'utils', fileCount: 1, quality: 90, dependencies: [] },
        ],
        shared: ['src/utils/helpers.js'],
        suggestions: [
          { type: 'extract-shared', message: 'Consider creating shared kernel' },
        ],
        stats: { totalServices: 3, totalShared: 1, averageCoupling: 2 },
      }),
      ...overrides.boundaryDetector,
    };

    const couplingCalculator = {
      getAllMetrics: vi.fn().mockReturnValue([
        { file: '/project/src/auth/login.js', afferentCoupling: 1, efferentCoupling: 2, instability: 0.67 },
        { file: '/project/src/utils/helpers.js', afferentCoupling: 5, efferentCoupling: 0, instability: 0 },
      ]),
      getHubFiles: vi.fn().mockReturnValue([
        { file: '/project/src/utils/helpers.js', afferentCoupling: 5 },
      ]),
      getDependentFiles: vi.fn().mockReturnValue([
        { file: '/project/src/auth/login.js', efferentCoupling: 3 },
      ]),
      getIsolatedFiles: vi.fn().mockReturnValue([]),
      getHighlyCoupledModules: vi.fn().mockReturnValue([
        { file: '/project/src/utils/helpers.js', totalCoupling: 5, afferentCoupling: 5, efferentCoupling: 0 },
      ]),
      ...overrides.couplingCalculator,
    };

    const cohesionAnalyzer = {
      analyze: vi.fn().mockReturnValue({
        modules: {
          'src/auth': { path: 'src/auth', cohesion: 0.8, internalDeps: 2, externalDeps: 1 },
          'src/users': { path: 'src/users', cohesion: 0.5, internalDeps: 0, externalDeps: 1 },
        },
        lowCohesion: [
          { module: 'src/users', cohesion: 0.25, internalDeps: 0, externalDeps: 3 },
        ],
        suggestions: [],
        summary: {
          totalModules: 3,
          averageCohesion: 0.65,
          lowCohesionCount: 1,
        },
      }),
      ...overrides.cohesionAnalyzer,
    };

    const circularDetector = {
      detect: vi.fn().mockReturnValue({
        hasCycles: false,
        cycleCount: 0,
        cycles: [],
        suggestions: [],
        visualization: 'No circular dependencies detected.',
        stats: { totalNodes: 4, totalEdges: 4, nodesInCycles: 0 },
      }),
      ...overrides.circularDetector,
    };

    return {
      dependencyGraph,
      mermaidGenerator,
      boundaryDetector,
      couplingCalculator,
      cohesionAnalyzer,
      circularDetector,
    };
  };

  describe('--analyze produces full report', () => {
    it('runs all analyses with --analyze flag', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ analyze: true });

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.summary).toBeDefined();
      expect(result.boundaries).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.circular).toBeDefined();
      expect(result.diagram).toBeDefined();
    });

    it('includes summary statistics in full report', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ analyze: true });

      expect(result.analysis.summary.totalFiles).toBe(4);
      expect(result.analysis.summary.totalDependencies).toBe(4);
      expect(result.analysis.summary.externalDependencies).toBe(2);
      expect(result.analysis.summary.suggestedServices).toBe(3);
    });

    it('runs full analysis when no flags specified', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      // No flags = full analysis
      const result = await command.run({});

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
    });
  });

  describe('--boundaries lists suggested services', () => {
    it('returns service boundary analysis', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ boundaries: true });

      expect(result.success).toBe(true);
      expect(result.boundaries).toBeDefined();
      expect(result.boundaries.services).toHaveLength(3);
      expect(result.boundaries.services[0].name).toBe('auth');
    });

    it('includes service dependencies', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ boundaries: true });

      const authService = result.boundaries.services.find(s => s.name === 'auth');
      expect(authService.dependencies).toContain('utils');
    });

    it('includes boundary improvement suggestions', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ boundaries: true });

      expect(result.boundaries.suggestions).toBeDefined();
      expect(result.boundaries.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('--diagram outputs valid Mermaid', () => {
    it('generates Mermaid flowchart', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ diagram: true });

      expect(result.success).toBe(true);
      expect(result.diagram).toBeDefined();
      expect(result.diagram).toContain('flowchart');
    });

    it('generates module-specific diagram with targetPath', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ diagram: true, targetPath: 'src/auth' });

      expect(result.success).toBe(true);
      expect(mocks.mermaidGenerator.generateModuleDiagram).toHaveBeenCalledWith(
        expect.anything(),
        'src/auth',
        expect.anything()
      );
    });

    it('highlights cycles in diagram when present', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks({
        circularDetector: {
          detect: vi.fn().mockReturnValue({
            hasCycles: true,
            cycleCount: 1,
            cycles: [{ path: ['a.js', 'b.js'], pathNames: ['a.js', 'b.js'], length: 2 }],
            suggestions: [],
          }),
        },
      });

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      await command.run({ diagram: true });

      expect(mocks.mermaidGenerator.generateFlowchart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          highlightCycles: true,
          cycles: expect.arrayContaining([['a.js', 'b.js']]),
        })
      );
    });
  });

  describe('--metrics shows coupling data', () => {
    it('returns coupling metrics for all files', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ metrics: true });

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.coupling).toBeDefined();
      expect(result.metrics.coupling.files).toBeDefined();
    });

    it('identifies hub files', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ metrics: true });

      expect(result.metrics.coupling.hubs).toHaveLength(1);
      expect(result.metrics.coupling.hubs[0].file).toContain('helpers.js');
      expect(result.metrics.coupling.hubs[0].dependents).toBe(5);
    });

    it('identifies highly coupled modules', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ metrics: true });

      expect(result.metrics.coupling.highlyCoupled.length).toBeGreaterThan(0);
    });

    it('includes cohesion analysis', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ metrics: true });

      expect(result.metrics.cohesion).toBeDefined();
      expect(result.metrics.cohesion.summary).toBeDefined();
      expect(result.metrics.cohesion.lowCohesion).toBeDefined();
    });

    it('provides coupling summary statistics', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ metrics: true });

      expect(result.metrics.coupling.summary).toBeDefined();
      expect(result.metrics.coupling.summary.hubCount).toBe(1);
    });
  });

  describe('--circular lists all cycles', () => {
    it('detects no cycles when codebase is clean', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ circular: true });

      expect(result.success).toBe(true);
      expect(result.circular.hasCycles).toBe(false);
      expect(result.circular.cycleCount).toBe(0);
    });

    it('lists all detected cycles', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks({
        circularDetector: {
          detect: vi.fn().mockReturnValue({
            hasCycles: true,
            cycleCount: 2,
            cycles: [
              { path: ['a.js', 'b.js'], pathNames: ['a.js', 'b.js'], length: 2 },
              { path: ['c.js', 'd.js', 'e.js'], pathNames: ['c.js', 'd.js', 'e.js'], length: 3 },
            ],
            suggestions: [
              { cycleIndex: 0, breakAt: 'a.js', reason: 'Fewest dependents' },
              { cycleIndex: 1, breakAt: 'c.js', reason: 'Fewest dependents' },
            ],
            visualization: 'Cycles detected',
            stats: { totalNodes: 5, totalEdges: 5, nodesInCycles: 5 },
          }),
        },
      });

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ circular: true });

      expect(result.circular.hasCycles).toBe(true);
      expect(result.circular.cycleCount).toBe(2);
      expect(result.circular.cycles).toHaveLength(2);
    });

    it('includes break-point suggestions for each cycle', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks({
        circularDetector: {
          detect: vi.fn().mockReturnValue({
            hasCycles: true,
            cycleCount: 1,
            cycles: [{ path: ['a.js', 'b.js'], pathNames: ['a.js', 'b.js'], length: 2 }],
            suggestions: [{ cycleIndex: 0, breakAt: 'a.js', reason: 'Fewest dependents' }],
          }),
        },
      });

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ circular: true });

      expect(result.circular.suggestions).toBeDefined();
      expect(result.circular.suggestions.length).toBeGreaterThan(0);
    });

    it('provides cycle visualization', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks({
        circularDetector: {
          detect: vi.fn().mockReturnValue({
            hasCycles: true,
            cycleCount: 1,
            cycles: [{ path: ['a.js', 'b.js'], pathNames: ['a.js', 'b.js'], length: 2 }],
            suggestions: [],
            visualization: 'a.js -> b.js -> a.js',
          }),
        },
      });

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ circular: true });

      expect(result.circular.visualization).toContain('a.js');
    });
  });

  describe('path targeting limits scope', () => {
    it('scans only specified path', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      await command.run({ analyze: true, targetPath: 'src/auth' });

      expect(mocks.dependencyGraph.buildFromDirectory).toHaveBeenCalledWith('/project/src/auth');
    });

    it('includes targetPath in result', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ analyze: true, targetPath: 'src/auth' });

      expect(result.targetPath).toBe('src/auth');
    });

    it('generates targeted module diagram', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      await command.run({ diagram: true, targetPath: 'src/users' });

      expect(mocks.mermaidGenerator.generateModuleDiagram).toHaveBeenCalledWith(
        expect.anything(),
        'src/users',
        expect.anything()
      );
    });
  });

  describe('report generation', () => {
    it('generates text report by default', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ analyze: true });

      expect(result.report).toContain('ARCHITECTURE ANALYSIS REPORT');
    });

    it('generates JSON report when format=json', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ analyze: true, format: 'json' });

      const parsed = JSON.parse(result.report);
      expect(parsed.success).toBe(true);
      expect(parsed.stats).toBeDefined();
    });

    it('generates Markdown report when format=markdown', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ analyze: true, format: 'markdown' });

      expect(result.report).toContain('# Architecture Analysis Report');
      expect(result.report).toContain('## Summary');
      expect(result.report).toContain('|');
    });

    it('includes Mermaid diagram in markdown report', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ analyze: true, format: 'markdown' });

      expect(result.report).toContain('```mermaid');
      expect(result.report).toContain('flowchart');
      expect(result.report).toContain('```');
    });
  });

  describe('error handling', () => {
    it('handles graph building errors gracefully', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks({
        dependencyGraph: {
          buildFromDirectory: vi.fn().mockRejectedValue(new Error('Directory not found')),
          getGraph: vi.fn(),
        },
      });

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ analyze: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Directory not found');
    });

    it('continues with partial results on analysis errors', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks({
        boundaryDetector: {
          detect: vi.fn().mockImplementation(() => {
            throw new Error('Boundary detection failed');
          }),
        },
      });

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ boundaries: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Boundary detection failed');
    });
  });

  describe('progress reporting', () => {
    it('reports progress through callback', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();
      const progressUpdates = [];

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
        onProgress: (update) => progressUpdates.push(update),
      });

      await command.run({ analyze: true });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(u => u.phase === 'building-graph')).toBe(true);
      expect(progressUpdates.some(u => u.phase === 'complete')).toBe(true);
    });

    it('reports each analysis phase', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();
      const progressUpdates = [];

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
        onProgress: (update) => progressUpdates.push(update),
      });

      await command.run({ analyze: true });

      const phases = progressUpdates.map(u => u.phase);
      expect(phases).toContain('building-graph');
      expect(phases).toContain('analyzing-boundaries');
      expect(phases).toContain('generating-diagram');
      expect(phases).toContain('calculating-metrics');
      expect(phases).toContain('detecting-cycles');
    });
  });

  describe('dependency injection', () => {
    it('accepts injected DependencyGraph', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const customGraph = {
        buildFromDirectory: vi.fn().mockResolvedValue(mockGraph),
        getGraph: vi.fn().mockReturnValue(mockGraph),
        getImporters: vi.fn().mockReturnValue([]),
        getImports: vi.fn().mockReturnValue([]),
        getFiles: vi.fn().mockReturnValue([]),
      };

      const command = new ArchitectureCommand({
        dependencyGraph: customGraph,
        basePath: '/project',
      });

      await command.run({ analyze: true });

      expect(customGraph.buildFromDirectory).toHaveBeenCalled();
    });

    it('accepts injected MermaidGenerator', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const customMermaid = {
        generateFlowchart: vi.fn().mockReturnValue('custom diagram'),
      };
      const mocks = createMocks({ mermaidGenerator: customMermaid });

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ diagram: true });

      expect(customMermaid.generateFlowchart).toHaveBeenCalled();
      expect(result.diagram).toBe('custom diagram');
    });

    it('accepts injected CircularDetector', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const customDetector = {
        detect: vi.fn().mockReturnValue({
          hasCycles: true,
          cycleCount: 99,
          cycles: [],
          suggestions: [],
        }),
      };
      const mocks = createMocks({ circularDetector: customDetector });

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({ circular: true });

      expect(customDetector.detect).toHaveBeenCalled();
      expect(result.circular.cycleCount).toBe(99);
    });
  });

  describe('combined flags', () => {
    it('can run multiple analyses together', async () => {
      const { ArchitectureCommand } = await import('./architecture-command.js');
      const mocks = createMocks();

      const command = new ArchitectureCommand({
        ...mocks,
        basePath: '/project',
      });

      const result = await command.run({
        boundaries: true,
        metrics: true,
        circular: true,
      });

      expect(result.success).toBe(true);
      expect(result.boundaries).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.circular).toBeDefined();
      // No diagram unless explicitly requested
      expect(result.diagram).toBeNull();
    });
  });
});
