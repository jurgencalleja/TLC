import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { RepoDependencyTracker } = await import('./repo-dependency-tracker.js');

describe('RepoDependencyTracker', () => {
  let tempDir;
  let tracker;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-dep-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createRepo(name, packageJson) {
    const repoPath = path.join(tempDir, name);
    fs.mkdirSync(repoPath, { recursive: true });
    fs.writeFileSync(
      path.join(repoPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    return repoPath;
  }

  describe('dependency detection', () => {
    it('detects workspace:* dependencies', () => {
      createRepo('core', { name: '@myorg/core', version: '1.0.0' });
      createRepo('api', {
        name: '@myorg/api',
        version: '1.0.0',
        dependencies: {
          '@myorg/core': 'workspace:*',
        },
      });

      tracker = new RepoDependencyTracker(tempDir, ['core', 'api']);
      const deps = tracker.getDependencies('api');

      expect(deps).toContain('core');
    });

    it('detects file:../other-repo dependencies', () => {
      createRepo('shared', { name: 'shared-lib', version: '1.0.0' });
      createRepo('app', {
        name: 'my-app',
        version: '1.0.0',
        dependencies: {
          'shared-lib': 'file:../shared',
        },
      });

      tracker = new RepoDependencyTracker(tempDir, ['shared', 'app']);
      const deps = tracker.getDependencies('app');

      expect(deps).toContain('shared');
    });

    it('detects workspace:^ dependencies', () => {
      createRepo('utils', { name: '@myorg/utils', version: '2.0.0' });
      createRepo('web', {
        name: '@myorg/web',
        version: '1.0.0',
        dependencies: {
          '@myorg/utils': 'workspace:^',
        },
      });

      tracker = new RepoDependencyTracker(tempDir, ['utils', 'web']);
      const deps = tracker.getDependencies('web');

      expect(deps).toContain('utils');
    });

    it('detects dependencies in devDependencies', () => {
      createRepo('test-utils', { name: '@myorg/test-utils', version: '1.0.0' });
      createRepo('service', {
        name: '@myorg/service',
        version: '1.0.0',
        devDependencies: {
          '@myorg/test-utils': 'workspace:*',
        },
      });

      tracker = new RepoDependencyTracker(tempDir, ['test-utils', 'service']);
      const deps = tracker.getDependencies('service');

      expect(deps).toContain('test-utils');
    });
  });

  describe('dependency direction', () => {
    it('identifies dependency direction (A depends on B)', () => {
      createRepo('base', { name: 'base', version: '1.0.0' });
      createRepo('derived', {
        name: 'derived',
        version: '1.0.0',
        dependencies: { base: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['base', 'derived']);

      expect(tracker.dependsOn('derived', 'base')).toBe(true);
      expect(tracker.dependsOn('base', 'derived')).toBe(false);
    });

    it('gets dependents of a repo', () => {
      createRepo('core', { name: 'core', version: '1.0.0' });
      createRepo('api', {
        name: 'api',
        version: '1.0.0',
        dependencies: { core: 'workspace:*' },
      });
      createRepo('web', {
        name: 'web',
        version: '1.0.0',
        dependencies: { core: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['core', 'api', 'web']);
      const dependents = tracker.getDependents('core');

      expect(dependents).toContain('api');
      expect(dependents).toContain('web');
    });
  });

  describe('affected repos', () => {
    it('calculates affected repos when one changes', () => {
      createRepo('core', { name: 'core', version: '1.0.0' });
      createRepo('utils', {
        name: 'utils',
        version: '1.0.0',
        dependencies: { core: 'workspace:*' },
      });
      createRepo('api', {
        name: 'api',
        version: '1.0.0',
        dependencies: { utils: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['core', 'utils', 'api']);
      const affected = tracker.getAffectedRepos('core');

      expect(affected).toContain('utils');
      expect(affected).toContain('api');
      expect(affected).not.toContain('core'); // Changed repo not in affected
    });

    it('returns empty array for repo with no dependents', () => {
      createRepo('standalone', { name: 'standalone', version: '1.0.0' });

      tracker = new RepoDependencyTracker(tempDir, ['standalone']);
      const affected = tracker.getAffectedRepos('standalone');

      expect(affected).toEqual([]);
    });
  });

  describe('topological sort', () => {
    it('generates topological sort for build order', () => {
      createRepo('a', { name: 'a', version: '1.0.0' });
      createRepo('b', {
        name: 'b',
        version: '1.0.0',
        dependencies: { a: 'workspace:*' },
      });
      createRepo('c', {
        name: 'c',
        version: '1.0.0',
        dependencies: { b: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['a', 'b', 'c']);
      const order = tracker.getTopologicalOrder();

      const aIndex = order.indexOf('a');
      const bIndex = order.indexOf('b');
      const cIndex = order.indexOf('c');

      expect(aIndex).toBeLessThan(bIndex);
      expect(bIndex).toBeLessThan(cIndex);
    });

    it('handles independent repos in topological sort', () => {
      createRepo('x', { name: 'x', version: '1.0.0' });
      createRepo('y', { name: 'y', version: '1.0.0' });
      createRepo('z', { name: 'z', version: '1.0.0' });

      tracker = new RepoDependencyTracker(tempDir, ['x', 'y', 'z']);
      const order = tracker.getTopologicalOrder();

      expect(order).toHaveLength(3);
      expect(order).toContain('x');
      expect(order).toContain('y');
      expect(order).toContain('z');
    });
  });

  describe('circular dependencies', () => {
    it('detects circular dependencies', () => {
      createRepo('a', {
        name: 'a',
        version: '1.0.0',
        dependencies: { b: 'workspace:*' },
      });
      createRepo('b', {
        name: 'b',
        version: '1.0.0',
        dependencies: { a: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['a', 'b']);
      const cycles = tracker.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('returns empty array when no circular dependencies', () => {
      createRepo('base', { name: 'base', version: '1.0.0' });
      createRepo('app', {
        name: 'app',
        version: '1.0.0',
        dependencies: { base: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['base', 'app']);
      const cycles = tracker.detectCircularDependencies();

      expect(cycles).toEqual([]);
    });

    it('detects transitive circular dependencies', () => {
      createRepo('a', {
        name: 'a',
        version: '1.0.0',
        dependencies: { b: 'workspace:*' },
      });
      createRepo('b', {
        name: 'b',
        version: '1.0.0',
        dependencies: { c: 'workspace:*' },
      });
      createRepo('c', {
        name: 'c',
        version: '1.0.0',
        dependencies: { a: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['a', 'b', 'c']);
      const cycles = tracker.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('Mermaid diagram generation', () => {
    it('generates Mermaid dependency diagram', () => {
      createRepo('core', { name: 'core', version: '1.0.0' });
      createRepo('api', {
        name: 'api',
        version: '1.0.0',
        dependencies: { core: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['core', 'api']);
      const diagram = tracker.generateMermaidDiagram();

      expect(diagram).toContain('graph');
      expect(diagram).toContain('api');
      expect(diagram).toContain('core');
      expect(diagram).toContain('-->');
    });

    it('generates empty diagram for no dependencies', () => {
      createRepo('standalone', { name: 'standalone', version: '1.0.0' });

      tracker = new RepoDependencyTracker(tempDir, ['standalone']);
      const diagram = tracker.generateMermaidDiagram();

      expect(diagram).toContain('graph');
      expect(diagram).toContain('standalone');
    });
  });

  describe('error handling', () => {
    it('handles missing dependencies gracefully', () => {
      createRepo('app', {
        name: 'app',
        version: '1.0.0',
        dependencies: { 'non-existent': 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['app']);
      const deps = tracker.getDependencies('app');

      // Should not throw, non-workspace deps are ignored
      expect(deps).toEqual([]);
    });

    it('handles missing package.json', () => {
      const repoPath = path.join(tempDir, 'no-pkg');
      fs.mkdirSync(repoPath);

      tracker = new RepoDependencyTracker(tempDir, ['no-pkg']);
      const deps = tracker.getDependencies('no-pkg');

      expect(deps).toEqual([]);
    });

    it('handles malformed package.json', () => {
      const repoPath = path.join(tempDir, 'bad-pkg');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), 'not valid json');

      tracker = new RepoDependencyTracker(tempDir, ['bad-pkg']);
      const deps = tracker.getDependencies('bad-pkg');

      expect(deps).toEqual([]);
    });
  });

  describe('dependency graph', () => {
    it('builds complete dependency graph', () => {
      createRepo('a', { name: 'a', version: '1.0.0' });
      createRepo('b', {
        name: 'b',
        version: '1.0.0',
        dependencies: { a: 'workspace:*' },
      });
      createRepo('c', {
        name: 'c',
        version: '1.0.0',
        dependencies: { a: 'workspace:*', b: 'workspace:*' },
      });

      tracker = new RepoDependencyTracker(tempDir, ['a', 'b', 'c']);
      const graph = tracker.getDependencyGraph();

      expect(graph.a).toEqual([]);
      expect(graph.b).toContain('a');
      expect(graph.c).toContain('a');
      expect(graph.c).toContain('b');
    });
  });
});
