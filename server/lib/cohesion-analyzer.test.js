/**
 * Cohesion Analyzer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DependencyGraph for testing
function createMockGraph(nodes, edges) {
  const graphData = {
    nodes: nodes.map(n => ({
      id: n.id,
      name: n.name,
      imports: 0,
      importedBy: 0,
    })),
    edges: edges.map(e => ({
      from: e.from,
      to: e.to,
      fromName: nodes.find(n => n.id === e.from)?.name || e.from,
      toName: nodes.find(n => n.id === e.to)?.name || e.to,
    })),
    external: [],
    stats: {
      totalFiles: nodes.length,
      totalEdges: edges.length,
      externalDeps: 0,
    },
  };

  // Build imports/importedBy maps
  const importsMap = {};
  const importersMap = {};

  for (const node of nodes) {
    importsMap[node.id] = [];
    importersMap[node.id] = [];
  }

  for (const edge of edges) {
    if (importsMap[edge.from]) {
      importsMap[edge.from].push(edge.to);
    }
    if (importersMap[edge.to]) {
      importersMap[edge.to].push(edge.from);
    }
  }

  return {
    getGraph: () => graphData,
    getImports: (file) => importsMap[file] || [],
    getImporters: (file) => importersMap[file] || [],
  };
}

describe('CohesionAnalyzer', () => {
  describe('groupByDirectory', () => {
    it('groups files by directory correctly', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });
      const nodes = [
        { id: '/project/src/utils/helpers.js', name: 'src/utils/helpers.js' },
        { id: '/project/src/utils/format.js', name: 'src/utils/format.js' },
        { id: '/project/src/components/Button.js', name: 'src/components/Button.js' },
        { id: '/project/src/index.js', name: 'src/index.js' },
      ];

      const modules = analyzer.groupByDirectory(nodes);

      expect(Object.keys(modules)).toHaveLength(3);
      expect(modules['src/utils']).toHaveLength(2);
      expect(modules['src/components']).toHaveLength(1);
      expect(modules['src']).toHaveLength(1);
    });

    it('puts root files in (root) module', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });
      const nodes = [
        { id: '/project/index.js', name: 'index.js' },
        { id: '/project/config.js', name: 'config.js' },
      ];

      const modules = analyzer.groupByDirectory(nodes);

      expect(modules['(root)']).toHaveLength(2);
    });
  });

  describe('high cohesion', () => {
    it('scores high when files only import each other', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });

      // Module where files only import each other
      const nodes = [
        { id: '/project/src/utils/a.js', name: 'src/utils/a.js' },
        { id: '/project/src/utils/b.js', name: 'src/utils/b.js' },
        { id: '/project/src/utils/c.js', name: 'src/utils/c.js' },
      ];

      const edges = [
        { from: '/project/src/utils/a.js', to: '/project/src/utils/b.js' },
        { from: '/project/src/utils/b.js', to: '/project/src/utils/c.js' },
        { from: '/project/src/utils/a.js', to: '/project/src/utils/c.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      expect(result.modules['src/utils'].cohesion).toBe(1);
      expect(result.lowCohesion).toHaveLength(0);
    });

    it('reports high average cohesion for well-structured codebase', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });

      const nodes = [
        { id: '/project/src/utils/a.js', name: 'src/utils/a.js' },
        { id: '/project/src/utils/b.js', name: 'src/utils/b.js' },
        { id: '/project/src/lib/x.js', name: 'src/lib/x.js' },
        { id: '/project/src/lib/y.js', name: 'src/lib/y.js' },
      ];

      const edges = [
        { from: '/project/src/utils/a.js', to: '/project/src/utils/b.js' },
        { from: '/project/src/lib/x.js', to: '/project/src/lib/y.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      expect(result.summary.averageCohesion).toBe(1);
    });
  });

  describe('low cohesion', () => {
    it('scores low when files mostly import external', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({
        basePath: '/project',
        lowCohesionThreshold: 0.3,
      });

      // Module where files import mostly from other modules
      const nodes = [
        { id: '/project/src/utils/a.js', name: 'src/utils/a.js' },
        { id: '/project/src/utils/b.js', name: 'src/utils/b.js' },
        { id: '/project/src/lib/x.js', name: 'src/lib/x.js' },
        { id: '/project/src/lib/y.js', name: 'src/lib/y.js' },
        { id: '/project/src/lib/z.js', name: 'src/lib/z.js' },
      ];

      // a and b import from lib instead of each other
      const edges = [
        { from: '/project/src/utils/a.js', to: '/project/src/lib/x.js' },
        { from: '/project/src/utils/a.js', to: '/project/src/lib/y.js' },
        { from: '/project/src/utils/b.js', to: '/project/src/lib/x.js' },
        { from: '/project/src/utils/b.js', to: '/project/src/lib/z.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      expect(result.modules['src/utils'].cohesion).toBe(0);
      expect(result.lowCohesion.length).toBeGreaterThan(0);
      expect(result.lowCohesion[0].module).toBe('src/utils');
    });

    it('identifies all low cohesion modules', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({
        basePath: '/project',
        lowCohesionThreshold: 0.5,
      });

      const nodes = [
        { id: '/project/src/a/1.js', name: 'src/a/1.js' },
        { id: '/project/src/a/2.js', name: 'src/a/2.js' },
        { id: '/project/src/b/1.js', name: 'src/b/1.js' },
        { id: '/project/src/b/2.js', name: 'src/b/2.js' },
        { id: '/project/src/shared.js', name: 'src/shared.js' },
      ];

      // Both modules depend heavily on shared
      const edges = [
        { from: '/project/src/a/1.js', to: '/project/src/shared.js' },
        { from: '/project/src/a/2.js', to: '/project/src/shared.js' },
        { from: '/project/src/b/1.js', to: '/project/src/shared.js' },
        { from: '/project/src/b/2.js', to: '/project/src/shared.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      // Both src/a and src/b should be low cohesion
      const lowModules = result.lowCohesion.map(l => l.module);
      expect(lowModules).toContain('src/a');
      expect(lowModules).toContain('src/b');
    });
  });

  describe('suggestions', () => {
    it('suggests moving outlier files for better cohesion', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });

      // File in utils that mostly depends on lib
      const nodes = [
        { id: '/project/src/utils/a.js', name: 'src/utils/a.js' },
        { id: '/project/src/utils/b.js', name: 'src/utils/b.js' },
        { id: '/project/src/utils/outlier.js', name: 'src/utils/outlier.js' },
        { id: '/project/src/lib/x.js', name: 'src/lib/x.js' },
        { id: '/project/src/lib/y.js', name: 'src/lib/y.js' },
        { id: '/project/src/lib/z.js', name: 'src/lib/z.js' },
      ];

      // outlier imports from lib, not from utils
      const edges = [
        { from: '/project/src/utils/a.js', to: '/project/src/utils/b.js' },
        { from: '/project/src/utils/outlier.js', to: '/project/src/lib/x.js' },
        { from: '/project/src/utils/outlier.js', to: '/project/src/lib/y.js' },
        { from: '/project/src/utils/outlier.js', to: '/project/src/lib/z.js' },
        { from: '/project/src/lib/x.js', to: '/project/src/lib/y.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      const moveSuggestions = result.suggestions.filter(s => s.type === 'move');
      const outlierSuggestion = moveSuggestions.find(s =>
        s.file.includes('outlier')
      );

      expect(outlierSuggestion).toBeDefined();
      expect(outlierSuggestion.from).toBe('src/utils');
      expect(outlierSuggestion.to).toBe('src/lib');
    });

    it('does not suggest moves for well-placed files', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });

      // All files are well-placed
      const nodes = [
        { id: '/project/src/utils/a.js', name: 'src/utils/a.js' },
        { id: '/project/src/utils/b.js', name: 'src/utils/b.js' },
        { id: '/project/src/utils/c.js', name: 'src/utils/c.js' },
      ];

      const edges = [
        { from: '/project/src/utils/a.js', to: '/project/src/utils/b.js' },
        { from: '/project/src/utils/b.js', to: '/project/src/utils/c.js' },
        { from: '/project/src/utils/a.js', to: '/project/src/utils/c.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('single-file modules', () => {
    it('handles single-file modules correctly', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });

      const nodes = [
        { id: '/project/src/utils/single.js', name: 'src/utils/single.js' },
        { id: '/project/src/lib/a.js', name: 'src/lib/a.js' },
        { id: '/project/src/lib/b.js', name: 'src/lib/b.js' },
      ];

      const edges = [
        { from: '/project/src/utils/single.js', to: '/project/src/lib/a.js' },
        { from: '/project/src/lib/a.js', to: '/project/src/lib/b.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      // Single file module should have cohesion of 1
      expect(result.modules['src/utils'].cohesion).toBe(1);
      expect(result.modules['src/utils'].singleFile).toBe(true);
    });

    it('does not mark single-file modules as low cohesion', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({
        basePath: '/project',
        lowCohesionThreshold: 0.5,
      });

      const nodes = [
        { id: '/project/src/single/only.js', name: 'src/single/only.js' },
        { id: '/project/src/other/a.js', name: 'src/other/a.js' },
      ];

      const edges = [
        { from: '/project/src/single/only.js', to: '/project/src/other/a.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      // Single file should not appear in low cohesion list
      const singleInLow = result.lowCohesion.find(
        l => l.module === 'src/single'
      );
      expect(singleInLow).toBeUndefined();
    });
  });

  describe('empty modules', () => {
    it('handles empty graph', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });
      const mockGraph = createMockGraph([], []);

      const result = analyzer.analyze(mockGraph);

      expect(result.modules).toEqual({});
      expect(result.lowCohesion).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
      expect(result.summary.totalModules).toBe(0);
      expect(result.summary.averageCohesion).toBe(1);
    });
  });

  describe('summary statistics', () => {
    it('calculates average cohesion correctly', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });

      const nodes = [
        { id: '/project/src/a/1.js', name: 'src/a/1.js' },
        { id: '/project/src/a/2.js', name: 'src/a/2.js' },
        { id: '/project/src/b/1.js', name: 'src/b/1.js' },
        { id: '/project/src/b/2.js', name: 'src/b/2.js' },
      ];

      // Module a has 100% cohesion, module b has 0%
      const edges = [
        { from: '/project/src/a/1.js', to: '/project/src/a/2.js' },
        { from: '/project/src/b/1.js', to: '/project/src/a/1.js' },
        { from: '/project/src/b/2.js', to: '/project/src/a/2.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      // Average should be between 0 and 1
      expect(result.summary.averageCohesion).toBeGreaterThanOrEqual(0);
      expect(result.summary.averageCohesion).toBeLessThanOrEqual(1);
    });

    it('counts total modules correctly', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });

      const nodes = [
        { id: '/project/src/a/1.js', name: 'src/a/1.js' },
        { id: '/project/src/b/1.js', name: 'src/b/1.js' },
        { id: '/project/src/c/1.js', name: 'src/c/1.js' },
      ];

      const mockGraph = createMockGraph(nodes, []);
      const result = analyzer.analyze(mockGraph);

      expect(result.summary.totalModules).toBe(3);
    });

    it('counts low cohesion modules correctly', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({
        basePath: '/project',
        lowCohesionThreshold: 0.5,
      });

      const nodes = [
        { id: '/project/src/a/1.js', name: 'src/a/1.js' },
        { id: '/project/src/a/2.js', name: 'src/a/2.js' },
        { id: '/project/src/b/1.js', name: 'src/b/1.js' },
        { id: '/project/src/b/2.js', name: 'src/b/2.js' },
        { id: '/project/src/shared.js', name: 'src/shared.js' },
      ];

      // Both a and b have low cohesion
      const edges = [
        { from: '/project/src/a/1.js', to: '/project/src/shared.js' },
        { from: '/project/src/a/2.js', to: '/project/src/shared.js' },
        { from: '/project/src/b/1.js', to: '/project/src/shared.js' },
        { from: '/project/src/b/2.js', to: '/project/src/shared.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      expect(result.summary.lowCohesionCount).toBe(2);
    });
  });

  describe('mixed cohesion scenarios', () => {
    it('handles modules with mixed internal/external deps', async () => {
      const { CohesionAnalyzer } = await import('./cohesion-analyzer.js');

      const analyzer = new CohesionAnalyzer({ basePath: '/project' });

      const nodes = [
        { id: '/project/src/utils/a.js', name: 'src/utils/a.js' },
        { id: '/project/src/utils/b.js', name: 'src/utils/b.js' },
        { id: '/project/src/utils/c.js', name: 'src/utils/c.js' },
        { id: '/project/src/lib/x.js', name: 'src/lib/x.js' },
      ];

      // Some internal deps, some external
      const edges = [
        { from: '/project/src/utils/a.js', to: '/project/src/utils/b.js' },
        { from: '/project/src/utils/b.js', to: '/project/src/utils/c.js' },
        { from: '/project/src/utils/a.js', to: '/project/src/lib/x.js' },
      ];

      const mockGraph = createMockGraph(nodes, edges);
      const result = analyzer.analyze(mockGraph);

      // Cohesion should be between 0 and 1
      const utilsCohesion = result.modules['src/utils'].cohesion;
      expect(utilsCohesion).toBeGreaterThan(0);
      expect(utilsCohesion).toBeLessThan(1);
    });
  });
});
