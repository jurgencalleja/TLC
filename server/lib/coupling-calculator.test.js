/**
 * Coupling Calculator Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('CouplingCalculator', () => {
  describe('afferent coupling (Ca)', () => {
    it('calculates afferent coupling correctly', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') return `import './utils';`;
          if (path === '/project/src/app.js') return `import './utils';`;
          if (path === '/project/src/service.js') return `import './utils';`;
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      await graph.build('/project/src/app.js');
      await graph.build('/project/src/service.js');

      const calculator = new CouplingCalculator(graph);
      const ca = calculator.getAfferentCoupling('/project/src/utils.js');

      expect(ca).toBe(3); // 3 files depend on utils.js
    });

    it('returns 0 for files with no dependents', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') return `import './utils';`;
          return '';
        }),
      });

      await graph.build('/project/src/index.js');

      const calculator = new CouplingCalculator(graph);
      const ca = calculator.getAfferentCoupling('/project/src/index.js');

      expect(ca).toBe(0); // index.js has no dependents
    });
  });

  describe('efferent coupling (Ce)', () => {
    it('calculates efferent coupling correctly', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `
              import './utils';
              import './config';
              import './helpers';
            `;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');

      const calculator = new CouplingCalculator(graph);
      const ce = calculator.getEfferentCoupling('/project/src/index.js');

      expect(ce).toBe(3); // index.js depends on 3 files
    });

    it('returns 0 for files with no dependencies', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') return `import './utils';`;
          return '';
        }),
      });

      await graph.build('/project/src/index.js');

      const calculator = new CouplingCalculator(graph);
      const ce = calculator.getEfferentCoupling('/project/src/utils.js');

      expect(ce).toBe(0); // utils.js has no dependencies
    });
  });

  describe('instability ratio', () => {
    it('calculates instability ratio Ce / (Ca + Ce)', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          // Simple chain: index -> utils -> config
          // utils has Ca=1 (index), Ce=1 (config)
          if (path === '/project/src/index.js') return `import './utils';`;
          if (path === '/project/src/utils.js') return `import './config';`;
          return '';
        }),
      });

      await graph.build('/project/src/index.js');

      const calculator = new CouplingCalculator(graph);
      const instability = calculator.getInstability('/project/src/utils.js');

      // Ce = 1, Ca = 1, Instability = 1 / (1 + 1) = 0.5
      expect(instability).toBe(0.5);
    });

    it('returns 0 for files with no coupling (isolated)', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockResolvedValue(''),
      });

      await graph.build('/project/src/isolated.js');

      const calculator = new CouplingCalculator(graph);
      const instability = calculator.getInstability('/project/src/isolated.js');

      expect(instability).toBe(0); // No coupling means 0 instability
    });

    it('returns 1 for files that only have efferent coupling', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `import './utils';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');

      const calculator = new CouplingCalculator(graph);
      const instability = calculator.getInstability('/project/src/index.js');

      // Ce = 1, Ca = 0, Instability = 1 / (0 + 1) = 1
      expect(instability).toBe(1);
    });

    it('returns 0 for files that only have afferent coupling', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') return `import './utils';`;
          if (path === '/project/src/app.js') return `import './utils';`;
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      await graph.build('/project/src/app.js');

      const calculator = new CouplingCalculator(graph);
      const instability = calculator.getInstability('/project/src/utils.js');

      // Ce = 0, Ca = 2, Instability = 0 / (2 + 0) = 0
      expect(instability).toBe(0);
    });
  });

  describe('hub files (high afferent)', () => {
    it('identifies hub files with high afferent coupling', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          // utils.js is imported by 5 files (hub)
          if (path === '/project/src/a.js') return `import './utils';`;
          if (path === '/project/src/b.js') return `import './utils';`;
          if (path === '/project/src/c.js') return `import './utils';`;
          if (path === '/project/src/d.js') return `import './utils';`;
          if (path === '/project/src/e.js') return `import './utils';`;
          // config.js is imported by 1 file (not a hub)
          if (path === '/project/src/f.js') return `import './config';`;
          return '';
        }),
      });

      await graph.build('/project/src/a.js');
      await graph.build('/project/src/b.js');
      await graph.build('/project/src/c.js');
      await graph.build('/project/src/d.js');
      await graph.build('/project/src/e.js');
      await graph.build('/project/src/f.js');

      const calculator = new CouplingCalculator(graph);
      const hubs = calculator.getHubFiles({ threshold: 3 });

      expect(hubs).toHaveLength(1);
      expect(hubs[0].file).toBe('/project/src/utils.js');
      expect(hubs[0].afferentCoupling).toBe(5);
    });

    it('returns empty array when no hub files exist', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/a.js') return `import './b';`;
          if (path === '/project/src/c.js') return `import './d';`;
          return '';
        }),
      });

      await graph.build('/project/src/a.js');
      await graph.build('/project/src/c.js');

      const calculator = new CouplingCalculator(graph);
      const hubs = calculator.getHubFiles({ threshold: 3 });

      expect(hubs).toHaveLength(0);
    });
  });

  describe('dependent files (high efferent)', () => {
    it('identifies dependent files with high efferent coupling', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          // index.js imports 5 files (high efferent)
          if (path === '/project/src/index.js') {
            return `
              import './a';
              import './b';
              import './c';
              import './d';
              import './e';
            `;
          }
          // simple.js imports 1 file (low efferent)
          if (path === '/project/src/simple.js') return `import './a';`;
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      await graph.build('/project/src/simple.js');

      const calculator = new CouplingCalculator(graph);
      const dependent = calculator.getDependentFiles({ threshold: 3 });

      expect(dependent).toHaveLength(1);
      expect(dependent[0].file).toBe('/project/src/index.js');
      expect(dependent[0].efferentCoupling).toBe(5);
    });

    it('returns empty array when no high efferent files exist', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/a.js') return `import './b';`;
          if (path === '/project/src/c.js') return `import './d';`;
          return '';
        }),
      });

      await graph.build('/project/src/a.js');
      await graph.build('/project/src/c.js');

      const calculator = new CouplingCalculator(graph);
      const dependent = calculator.getDependentFiles({ threshold: 3 });

      expect(dependent).toHaveLength(0);
    });
  });

  describe('isolated files (no coupling)', () => {
    it('handles isolated files with no coupling', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockResolvedValue('// no imports'),
      });

      await graph.build('/project/src/isolated.js');

      const calculator = new CouplingCalculator(graph);

      expect(calculator.getAfferentCoupling('/project/src/isolated.js')).toBe(0);
      expect(calculator.getEfferentCoupling('/project/src/isolated.js')).toBe(0);
      expect(calculator.getInstability('/project/src/isolated.js')).toBe(0);
    });

    it('identifies isolated files', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/connected.js') return `import './utils';`;
          return ''; // isolated files have no imports
        }),
      });

      await graph.build('/project/src/connected.js');
      await graph.build('/project/src/isolated.js');

      const calculator = new CouplingCalculator(graph);
      const isolated = calculator.getIsolatedFiles();

      expect(isolated).toContain('/project/src/isolated.js');
      expect(isolated).not.toContain('/project/src/connected.js');
      expect(isolated).not.toContain('/project/src/utils.js');
    });
  });

  describe('coupling matrix', () => {
    it('generates coupling matrix', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/a.js') return `import './b'; import './c';`;
          if (path === '/project/src/b.js') return `import './c';`;
          return '';
        }),
      });

      await graph.build('/project/src/a.js');
      await graph.build('/project/src/b.js');

      const calculator = new CouplingCalculator(graph);
      const matrix = calculator.getCouplingMatrix();

      expect(matrix.files).toHaveLength(3);
      expect(matrix.matrix).toBeDefined();

      // a.js imports b.js
      const aIndex = matrix.files.indexOf('/project/src/a.js');
      const bIndex = matrix.files.indexOf('/project/src/b.js');
      const cIndex = matrix.files.indexOf('/project/src/c.js');

      expect(matrix.matrix[aIndex][bIndex]).toBe(1);
      expect(matrix.matrix[aIndex][cIndex]).toBe(1);
      expect(matrix.matrix[bIndex][cIndex]).toBe(1);
      expect(matrix.matrix[bIndex][aIndex]).toBe(0);
    });

    it('returns empty matrix for empty graph', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockResolvedValue(''),
      });

      const calculator = new CouplingCalculator(graph);
      const matrix = calculator.getCouplingMatrix();

      expect(matrix.files).toHaveLength(0);
      expect(matrix.matrix).toHaveLength(0);
    });
  });

  describe('coupling metrics for all files', () => {
    it('calculates coupling metrics for all files', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') return `import './utils';`;
          if (path === '/project/src/utils.js') return `import './config';`;
          return '';
        }),
      });

      await graph.build('/project/src/index.js');

      const calculator = new CouplingCalculator(graph);
      const metrics = calculator.getAllMetrics();

      expect(metrics).toHaveLength(3);

      const indexMetrics = metrics.find(m => m.file === '/project/src/index.js');
      expect(indexMetrics.afferentCoupling).toBe(0);
      expect(indexMetrics.efferentCoupling).toBe(1);
      expect(indexMetrics.instability).toBe(1);

      const utilsMetrics = metrics.find(m => m.file === '/project/src/utils.js');
      expect(utilsMetrics.afferentCoupling).toBe(1);
      expect(utilsMetrics.efferentCoupling).toBe(1);
      expect(utilsMetrics.instability).toBe(0.5);

      const configMetrics = metrics.find(m => m.file === '/project/src/config.js');
      expect(configMetrics.afferentCoupling).toBe(1);
      expect(configMetrics.efferentCoupling).toBe(0);
      expect(configMetrics.instability).toBe(0);
    });
  });

  describe('highly coupled modules', () => {
    it('identifies highly coupled modules', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          // index.js is highly coupled (imports 4 files = 4 efferent)
          if (path === '/project/src/index.js') {
            return `
              import './a';
              import './b';
              import './c';
              import './d';
            `;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');

      const calculator = new CouplingCalculator(graph);
      const highlyCoupled = calculator.getHighlyCoupledModules({ threshold: 4 });

      expect(highlyCoupled).toHaveLength(1);
      expect(highlyCoupled[0].file).toBe('/project/src/index.js');
      expect(highlyCoupled[0].totalCoupling).toBe(4);
    });

    it('returns empty array when no highly coupled modules exist', async () => {
      const { CouplingCalculator } = await import('./coupling-calculator.js');
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/a.js') return `import './b';`;
          return '';
        }),
      });

      await graph.build('/project/src/a.js');

      const calculator = new CouplingCalculator(graph);
      const highlyCoupled = calculator.getHighlyCoupledModules({ threshold: 4 });

      expect(highlyCoupled).toHaveLength(0);
    });
  });
});
