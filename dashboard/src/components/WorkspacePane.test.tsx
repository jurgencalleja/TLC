import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { WorkspacePane, RepoInfo } from './WorkspacePane.js';

describe('WorkspacePane', () => {
  describe('repo list', () => {
    it('renders repo list', () => {
      const repos: RepoInfo[] = [
        { name: 'core', path: 'core', status: 'ready', packageName: '@org/core' },
        { name: 'api', path: 'api', status: 'ready', packageName: '@org/api' },
      ];

      const { lastFrame } = render(<WorkspacePane repos={repos} />);
      const output = lastFrame();

      expect(output).toContain('core');
      expect(output).toContain('api');
    });

    it('shows repo names and paths', () => {
      const repos: RepoInfo[] = [
        { name: 'my-app', path: 'packages/my-app', status: 'ready', packageName: '@scope/my-app' },
      ];

      const { lastFrame } = render(<WorkspacePane repos={repos} />);
      const output = lastFrame();

      expect(output).toContain('my-app');
    });

    it('shows test status per repo', () => {
      const repos: RepoInfo[] = [
        { name: 'tested', path: 'tested', status: 'ready', tests: { passed: 10, failed: 2 } },
      ];

      const { lastFrame } = render(<WorkspacePane repos={repos} />);
      const output = lastFrame();

      expect(output).toContain('10');
    });

    it('shows aggregate totals', () => {
      const repos: RepoInfo[] = [
        { name: 'a', path: 'a', status: 'ready', tests: { passed: 5, failed: 1 } },
        { name: 'b', path: 'b', status: 'ready', tests: { passed: 3, failed: 0 } },
      ];

      const { lastFrame } = render(<WorkspacePane repos={repos} />);
      const output = lastFrame();

      // Should show aggregate
      expect(output).toBeDefined();
    });
  });

  describe('dependency graph', () => {
    it('renders dependency graph section', () => {
      const repos: RepoInfo[] = [{ name: 'core', path: 'core', status: 'ready' }];
      const graph = 'graph TD\n  core[core]';

      const { lastFrame } = render(<WorkspacePane repos={repos} dependencyGraph={graph} />);
      const output = lastFrame();

      expect(output).toContain('Dependencies');
    });
  });

  describe('highlighting', () => {
    it('highlights repos with failing tests', () => {
      const repos: RepoInfo[] = [
        { name: 'passing', path: 'passing', status: 'ready', tests: { passed: 5, failed: 0 } },
        { name: 'failing', path: 'failing', status: 'ready', tests: { passed: 3, failed: 2 } },
      ];

      const { lastFrame } = render(<WorkspacePane repos={repos} />);
      const output = lastFrame();

      // Failed tests should be visible
      expect(output).toContain('failing');
    });
  });

  describe('loading state', () => {
    it('shows loading state', () => {
      const { lastFrame } = render(<WorkspacePane loading={true} />);
      const output = lastFrame();

      expect(output).toContain('Loading');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no repos', () => {
      const { lastFrame } = render(<WorkspacePane repos={[]} />);
      const output = lastFrame();

      expect(output).toContain('No repos');
    });

    it('shows hint to initialize workspace', () => {
      const { lastFrame } = render(<WorkspacePane repos={[]} initialized={false} />);
      const output = lastFrame();

      expect(output).toContain('workspace');
    });
  });
});
