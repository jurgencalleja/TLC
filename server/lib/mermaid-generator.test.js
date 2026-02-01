/**
 * Mermaid Generator Tests
 */

import { describe, it, expect } from 'vitest';

describe('MermaidGenerator', () => {
  describe('flowchart generation', () => {
    it('generates valid flowchart syntax', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator();

      const graph = {
        nodes: [
          { id: '/src/index.js', name: 'src/index.js', imports: 2, importedBy: 0 },
          { id: '/src/utils.js', name: 'src/utils.js', imports: 0, importedBy: 1 },
        ],
        edges: [
          { from: '/src/index.js', to: '/src/utils.js', fromName: 'src/index.js', toName: 'src/utils.js' },
        ],
        external: [],
      };

      const mermaid = generator.generateFlowchart(graph);

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('-->');
    });

    it('creates subgraphs for directories', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator({ groupByDirectory: true });

      const graph = {
        nodes: [
          { id: '/src/api/routes.js', name: 'src/api/routes.js', imports: 1, importedBy: 0 },
          { id: '/src/api/handlers.js', name: 'src/api/handlers.js', imports: 0, importedBy: 1 },
          { id: '/src/utils/helpers.js', name: 'src/utils/helpers.js', imports: 0, importedBy: 0 },
        ],
        edges: [
          { from: '/src/api/routes.js', to: '/src/api/handlers.js', fromName: 'src/api/routes.js', toName: 'src/api/handlers.js' },
        ],
        external: [],
      };

      const mermaid = generator.generateFlowchart(graph);

      expect(mermaid).toContain('subgraph');
      expect(mermaid).toContain('src_api');
      expect(mermaid).toContain('src_utils');
    });

    it('highlights cycles with red styling', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator({ highlightCycles: true });

      const graph = {
        nodes: [
          { id: '/src/a.js', name: 'src/a.js', imports: 1, importedBy: 1 },
          { id: '/src/b.js', name: 'src/b.js', imports: 1, importedBy: 1 },
        ],
        edges: [
          { from: '/src/a.js', to: '/src/b.js', fromName: 'src/a.js', toName: 'src/b.js' },
          { from: '/src/b.js', to: '/src/a.js', fromName: 'src/b.js', toName: 'src/a.js' },
        ],
        external: [],
      };

      const mermaid = generator.generateFlowchart(graph, {
        cycles: [{ path: ['src/a.js', 'src/b.js'] }],
      });

      expect(mermaid).toContain('classDef cycle');
      expect(mermaid).toContain('class');
      expect(mermaid).toContain('cycle');
    });

    it('filters to specific module', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator();

      const graph = {
        nodes: [
          { id: '/src/api/routes.js', name: 'src/api/routes.js', imports: 1, importedBy: 0 },
          { id: '/src/api/handlers.js', name: 'src/api/handlers.js', imports: 0, importedBy: 1 },
          { id: '/src/utils/helpers.js', name: 'src/utils/helpers.js', imports: 0, importedBy: 0 },
          { id: '/src/db/models.js', name: 'src/db/models.js', imports: 0, importedBy: 0 },
        ],
        edges: [
          { from: '/src/api/routes.js', to: '/src/api/handlers.js', fromName: 'src/api/routes.js', toName: 'src/api/handlers.js' },
        ],
        external: [],
      };

      const mermaid = generator.generateModuleDiagram(graph, 'src/api');

      expect(mermaid).toContain('routes');
      expect(mermaid).toContain('handlers');
      expect(mermaid).not.toContain('models');
    });

    it('handles large graphs (truncation)', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator({ maxNodes: 5 });

      const nodes = [];
      for (let i = 0; i < 20; i++) {
        nodes.push({ id: `/src/file${i}.js`, name: `src/file${i}.js`, imports: 0, importedBy: 0 });
      }

      const graph = { nodes, edges: [], external: [] };
      const mermaid = generator.generateFlowchart(graph);

      expect(mermaid).toContain('Showing 5 of 20');
    });

    it('escapes special characters in filenames', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator({ groupByDirectory: false });

      const graph = {
        nodes: [
          { id: '/src/[id].js', name: 'src/[id].js', imports: 0, importedBy: 0 },
          { id: '/src/<dynamic>.js', name: 'src/<dynamic>.js', imports: 0, importedBy: 0 },
        ],
        edges: [],
        external: [],
      };

      const mermaid = generator.generateFlowchart(graph);

      // Should not contain raw brackets
      expect(mermaid).not.toMatch(/\[id\]/);
      expect(mermaid).not.toMatch(/<dynamic>/);
    });
  });

  describe('external dependencies', () => {
    it('shows external deps in subgraph', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator({ showExternal: true });

      const graph = {
        nodes: [{ id: '/src/index.js', name: 'src/index.js', imports: 2, importedBy: 0 }],
        edges: [],
        external: ['react', 'lodash', 'express'],
      };

      const mermaid = generator.generateFlowchart(graph);

      expect(mermaid).toContain('External Dependencies');
      expect(mermaid).toContain('react');
      expect(mermaid).toContain('lodash');
    });

    it('hides external deps when disabled', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator({ showExternal: false });

      const graph = {
        nodes: [{ id: '/src/index.js', name: 'src/index.js', imports: 2, importedBy: 0 }],
        edges: [],
        external: ['react', 'lodash'],
      };

      const mermaid = generator.generateFlowchart(graph);

      expect(mermaid).not.toContain('External Dependencies');
    });
  });

  describe('coupling matrix', () => {
    it('generates coupling matrix diagram', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator();

      const couplingData = {
        modules: [
          { name: 'api', afferent: 3, efferent: 2 },
          { name: 'utils', afferent: 5, efferent: 0 },
          { name: 'db', afferent: 2, efferent: 1 },
        ],
        matrix: [
          [0, 1, 1],
          [0, 0, 0],
          [0, 1, 0],
        ],
      };

      const mermaid = generator.generateCouplingMatrix(couplingData);

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('api');
      expect(mermaid).toContain('Ca:3');
      expect(mermaid).toContain('Ce:2');
    });

    it('handles empty coupling data', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator();

      const mermaid = generator.generateCouplingMatrix({ modules: [], matrix: [] });

      expect(mermaid).toContain('No coupling data');
    });
  });

  describe('boundary diagram', () => {
    it('generates service boundary diagram', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator();

      const boundaryData = {
        services: [
          { name: 'auth', files: ['src/auth/login.js', 'src/auth/logout.js'], dependencies: ['users'] },
          { name: 'users', files: ['src/users/model.js', 'src/users/api.js'], dependencies: [] },
        ],
        shared: ['src/utils/helpers.js', 'src/config.js'],
      };

      const mermaid = generator.generateBoundaryDiagram(boundaryData);

      expect(mermaid).toContain('Shared Kernel');
      expect(mermaid).toContain('auth');
      expect(mermaid).toContain('users');
      expect(mermaid).toContain('-->'); // Service dependency
    });

    it('handles no services', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator();

      const mermaid = generator.generateBoundaryDiagram({ services: [], shared: [] });

      expect(mermaid).toContain('No services detected');
    });
  });

  describe('hub highlighting', () => {
    it('highlights hub files', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator({
        highlightHubs: true,
        hubThreshold: 3,
        groupByDirectory: false,
      });

      const graph = {
        nodes: [
          { id: '/src/utils.js', name: 'src/utils.js', imports: 0, importedBy: 10 },
          { id: '/src/index.js', name: 'src/index.js', imports: 1, importedBy: 0 },
        ],
        edges: [],
        external: [],
      };

      const mermaid = generator.generateFlowchart(graph);

      expect(mermaid).toContain('classDef hub');
      expect(mermaid).toContain('class src_utils_js hub');
    });
  });

  describe('direction options', () => {
    it('supports different directions', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');

      const graph = {
        nodes: [{ id: '/a.js', name: 'a.js', imports: 0, importedBy: 0 }],
        edges: [],
        external: [],
      };

      const tdGenerator = new MermaidGenerator({ direction: 'TD' });
      expect(tdGenerator.generateFlowchart(graph)).toContain('flowchart TD');

      const lrGenerator = new MermaidGenerator({ direction: 'LR' });
      expect(lrGenerator.generateFlowchart(graph)).toContain('flowchart LR');
    });
  });

  describe('sanitization', () => {
    it('sanitizes IDs correctly', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator();

      expect(generator.sanitizeId('src/api/routes.js')).toBe('src_api_routes_js');
      expect(generator.sanitizeId('[dynamic]')).toBe('dynamic');
      expect(generator.sanitizeId('file-name.test.ts')).toBe('file_name_test_ts');
    });

    it('escapes labels correctly', async () => {
      const { MermaidGenerator } = await import('./mermaid-generator.js');
      const generator = new MermaidGenerator();

      expect(generator.escapeLabel('file[0].js')).toBe('file(0).js');
      expect(generator.escapeLabel('<component>')).toBe('(component)');
      expect(generator.escapeLabel('say "hello"')).toBe("say 'hello'");
    });
  });
});
