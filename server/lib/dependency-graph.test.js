/**
 * Dependency Graph Builder Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('DependencyGraph', () => {
  describe('ES6 imports', () => {
    it('parses default import', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `import utils from './utils';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].toName).toContain('utils');
    });

    it('parses named imports', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `import { foo, bar } from './helpers';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].toName).toContain('helpers');
    });

    it('parses namespace import', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `import * as utils from './utils';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
    });

    it('parses side-effect import', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `import './polyfills';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].toName).toContain('polyfills');
    });
  });

  describe('CommonJS requires', () => {
    it('parses require statement', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `const utils = require('./utils');`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].toName).toContain('utils');
    });

    it('parses destructured require', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `const { foo, bar } = require('./helpers');`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
    });
  });

  describe('dynamic imports', () => {
    it('parses dynamic import', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `const module = await import('./lazy');`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].toName).toContain('lazy');
    });
  });

  describe('path resolution', () => {
    it('resolves relative paths', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/components/Button.js') {
            return `import utils from '../utils';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/components/Button.js');
      const result = graph.getGraph();

      expect(result.edges[0].to).toBe('/project/src/utils.js');
    });

    it('marks node_modules as external', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `
              import React from 'react';
              import lodash from 'lodash';
            `;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.external).toContain('react');
      expect(result.external).toContain('lodash');
      expect(result.edges).toHaveLength(0); // No internal edges
    });

    it('supports tsconfig paths', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        tsConfigPaths: {
          '@/*': ['src/*'],
          '@utils/*': ['src/utils/*'],
        },
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `import utils from '@/utils/helpers';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].to).toContain('src/utils/helpers');
    });
  });

  describe('circular dependencies', () => {
    it('handles circular references without infinite loop', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/a.js') {
            return `import b from './b';`;
          }
          if (path === '/project/src/b.js') {
            return `import a from './a';`;
          }
          return '';
        }),
      });

      // Should not hang
      await graph.build('/project/src/a.js');
      const result = graph.getGraph();

      expect(result.nodes).toHaveLength(2);
      expect(graph.hasCircular()).toBe(true);
    });

    it('detects circular dependency', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/a.js') return `import './b';`;
          if (path === '/project/src/b.js') return `import './c';`;
          if (path === '/project/src/c.js') return `import './a';`;
          return '';
        }),
      });

      await graph.build('/project/src/a.js');

      expect(graph.hasCircular()).toBe(true);
    });

    it('returns false when no circular deps', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/a.js') return `import './b';`;
          if (path === '/project/src/b.js') return `import './c';`;
          if (path === '/project/src/c.js') return ``;
          return '';
        }),
      });

      await graph.build('/project/src/a.js');

      expect(graph.hasCircular()).toBe(false);
    });
  });

  describe('graph statistics', () => {
    it('counts total files', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `
              import './a';
              import './b';
            `;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.stats.totalFiles).toBe(3);
    });

    it('counts total edges', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `
              import './a';
              import './b';
            `;
          }
          if (path === '/project/src/a.js') {
            return `import './b';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.stats.totalEdges).toBe(3);
    });

    it('counts external dependencies', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `
              import React from 'react';
              import express from 'express';
              import lodash from 'lodash';
            `;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.stats.externalDeps).toBe(3);
    });
  });

  describe('getImporters and getImports', () => {
    it('returns files that import a given file', async () => {
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

      const importers = graph.getImporters('/project/src/utils.js');
      expect(importers).toHaveLength(2);
    });

    it('returns files that a given file imports', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `
              import './a';
              import './b';
              import './c';
            `;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');

      const imports = graph.getImports('/project/src/index.js');
      expect(imports).toHaveLength(3);
    });
  });

  describe('export from', () => {
    it('parses export from statements', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockImplementation((path) => {
          if (path === '/project/src/index.js') {
            return `export { foo, bar } from './utils';`;
          }
          return '';
        }),
      });

      await graph.build('/project/src/index.js');
      const result = graph.getGraph();

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].toName).toContain('utils');
    });
  });

  describe('clear', () => {
    it('clears the graph', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readFile: vi.fn().mockResolvedValue(`import './a';`),
      });

      await graph.build('/project/src/index.js');
      expect(graph.getFiles().length).toBeGreaterThan(0);

      graph.clear();
      expect(graph.getFiles()).toHaveLength(0);
    });
  });

  describe('directory scanning', () => {
    it('finds all source files', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const mockFiles = {
        '/project/src': [
          { name: 'index.js', isDirectory: () => false },
          { name: 'utils', isDirectory: () => true },
        ],
        '/project/src/utils': [
          { name: 'helpers.js', isDirectory: () => false },
          { name: 'format.ts', isDirectory: () => false },
        ],
      };

      const graph = new DependencyGraph({
        basePath: '/project',
        fileExists: () => true,
        readDir: vi.fn().mockImplementation((dir) => {
          return mockFiles[dir] || [];
        }),
        readFile: vi.fn().mockResolvedValue(''),
      });

      const files = await graph.findFiles('/project/src');

      expect(files).toContain('/project/src/index.js');
      expect(files).toContain('/project/src/utils/helpers.js');
      expect(files).toContain('/project/src/utils/format.ts');
    });

    it('ignores node_modules', async () => {
      const { DependencyGraph } = await import('./dependency-graph.js');

      const mockFiles = {
        '/project': [
          { name: 'src', isDirectory: () => true },
          { name: 'node_modules', isDirectory: () => true },
        ],
        '/project/src': [
          { name: 'index.js', isDirectory: () => false },
        ],
        '/project/node_modules': [
          { name: 'react', isDirectory: () => true },
        ],
      };

      const graph = new DependencyGraph({
        basePath: '/project',
        readDir: vi.fn().mockImplementation((dir) => mockFiles[dir] || []),
      });

      const files = await graph.findFiles('/project', ['node_modules']);

      expect(files).toContain('/project/src/index.js');
      expect(files.some(f => f.includes('node_modules'))).toBe(false);
    });
  });
});
