/**
 * Circular Dependency Detector Tests
 */

import { describe, it, expect } from 'vitest';

describe('CircularDetector', () => {
  describe('direct cycles', () => {
    it('detects A → B → A cycle', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/a.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.hasCycles).toBe(true);
      expect(result.cycleCount).toBe(1);
      expect(result.cycles[0].length).toBe(2);
    });

    it('detects self-import cycle', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [{ id: '/project/a.js', name: 'a.js' }],
        edges: [{ from: '/project/a.js', to: '/project/a.js' }],
      };

      const result = detector.detect(graph);

      expect(result.hasCycles).toBe(true);
    });
  });

  describe('indirect cycles', () => {
    it('detects A → B → C → A cycle', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
          { id: '/project/c.js', name: 'c.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/c.js' },
          { from: '/project/c.js', to: '/project/a.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.hasCycles).toBe(true);
      expect(result.cycleCount).toBe(1);
      expect(result.cycles[0].length).toBe(3);
    });

    it('detects longer chain cycle', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
          { id: '/project/c.js', name: 'c.js' },
          { id: '/project/d.js', name: 'd.js' },
          { id: '/project/e.js', name: 'e.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/c.js' },
          { from: '/project/c.js', to: '/project/d.js' },
          { from: '/project/d.js', to: '/project/e.js' },
          { from: '/project/e.js', to: '/project/a.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.hasCycles).toBe(true);
      expect(result.cycles[0].length).toBe(5);
    });
  });

  describe('multiple cycles', () => {
    it('finds multiple independent cycles', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
          { id: '/project/x.js', name: 'x.js' },
          { id: '/project/y.js', name: 'y.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/a.js' },
          { from: '/project/x.js', to: '/project/y.js' },
          { from: '/project/y.js', to: '/project/x.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.hasCycles).toBe(true);
      expect(result.cycleCount).toBe(2);
    });
  });

  describe('no cycles', () => {
    it('returns false for DAG (no cycles)', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
          { id: '/project/c.js', name: 'c.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/a.js', to: '/project/c.js' },
          { from: '/project/b.js', to: '/project/c.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.hasCycles).toBe(false);
      expect(result.cycleCount).toBe(0);
    });

    it('handles isolated nodes', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
        ],
        edges: [],
      };

      const result = detector.detect(graph);

      expect(result.hasCycles).toBe(false);
    });

    it('handles empty graph', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = { nodes: [], edges: [] };
      const result = detector.detect(graph);

      expect(result.hasCycles).toBe(false);
      expect(result.cycleCount).toBe(0);
    });
  });

  describe('suggestions', () => {
    it('suggests file to break cycle', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/a.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBe(1);
      expect(result.suggestions[0].breakAt).toBeDefined();
      expect(result.suggestions[0].reason).toContain('fewest dependents');
    });

    it('suggests removing specific import', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
          { id: '/project/c.js', name: 'c.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/c.js' },
          { from: '/project/c.js', to: '/project/a.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.suggestions[0].removeImport).toBeDefined();
      expect(result.suggestions[0].removeImport.from).toBeDefined();
      expect(result.suggestions[0].removeImport.to).toBeDefined();
    });
  });

  describe('visualization', () => {
    it('generates ASCII visualization', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/a.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.visualization).toContain('CIRCULAR DEPENDENCIES');
      expect(result.visualization).toContain('Cycle 1');
    });

    it('shows no cycles message when clean', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [{ id: '/project/a.js', name: 'a.js' }],
        edges: [],
      };

      const result = detector.detect(graph);

      expect(result.visualization).toContain('No circular dependencies');
    });
  });

  describe('path output', () => {
    it('reports cycle paths clearly', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/src/a.js', name: 'src/a.js' },
          { id: '/project/src/b.js', name: 'src/b.js' },
        ],
        edges: [
          { from: '/project/src/a.js', to: '/project/src/b.js' },
          { from: '/project/src/b.js', to: '/project/src/a.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.cycles[0].pathNames).toContain('src/a.js');
      expect(result.cycles[0].pathNames).toContain('src/b.js');
    });
  });

  describe('stats', () => {
    it('provides useful stats', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
          { id: '/project/c.js', name: 'c.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/a.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.stats).toBeDefined();
      expect(result.stats.totalNodes).toBe(3);
      expect(result.stats.totalEdges).toBe(2);
      expect(result.stats.nodesInCycles).toBe(2);
    });
  });

  describe('helper methods', () => {
    it('hasCycles returns boolean quickly', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/a.js' },
        ],
      };

      expect(detector.hasCycles(graph)).toBe(true);
    });

    it('getCycles returns just paths', async () => {
      const { CircularDetector } = await import('./circular-detector.js');
      const detector = new CircularDetector({ basePath: '/project' });

      const graph = {
        nodes: [
          { id: '/project/a.js', name: 'a.js' },
          { id: '/project/b.js', name: 'b.js' },
        ],
        edges: [
          { from: '/project/a.js', to: '/project/b.js' },
          { from: '/project/b.js', to: '/project/a.js' },
        ],
      };

      const cycles = detector.getCycles(graph);
      expect(Array.isArray(cycles)).toBe(true);
      expect(cycles.length).toBe(1);
    });
  });
});
