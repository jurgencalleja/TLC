/**
 * Workspace Scanner Tests
 * Discover and index repos in workspace
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { WorkspaceScanner } = await import('./workspace-scanner.js');
const { WorkspaceConfig } = await import('./workspace-config.js');

describe('WorkspaceScanner', () => {
  let tempDir;
  let workspaceConfig;
  let scanner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-scanner-test-'));
    workspaceConfig = new WorkspaceConfig(tempDir);
    workspaceConfig.init();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('scanning single repo', () => {
    it('scans single repo for project info', () => {
      // Create a repo with package.json
      const repoPath = path.join(tempDir, 'my-app');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          name: 'my-app',
          version: '1.0.0',
          dependencies: { lodash: '^4.0.0' },
        })
      );

      workspaceConfig.addRepo('my-app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].name).toBe('my-app');
      expect(result.repos[0].version).toBe('1.0.0');
    });

    it('extracts dependencies from package.json', () => {
      const repoPath = path.join(tempDir, 'my-app');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          name: 'my-app',
          version: '1.0.0',
          dependencies: {
            lodash: '^4.0.0',
            express: '^4.18.0',
          },
          devDependencies: {
            vitest: '^1.0.0',
          },
        })
      );

      workspaceConfig.addRepo('my-app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.repos[0].dependencies).toContain('lodash');
      expect(result.repos[0].dependencies).toContain('express');
      expect(result.repos[0].devDependencies).toContain('vitest');
    });
  });

  describe('scanning multiple repos', () => {
    it('scans multiple repos in workspace', () => {
      // Create two repos
      const repo1 = path.join(tempDir, 'api');
      fs.mkdirSync(repo1);
      fs.writeFileSync(
        path.join(repo1, 'package.json'),
        JSON.stringify({ name: '@workspace/api', version: '1.0.0' })
      );

      const repo2 = path.join(tempDir, 'web');
      fs.mkdirSync(repo2);
      fs.writeFileSync(
        path.join(repo2, 'package.json'),
        JSON.stringify({ name: '@workspace/web', version: '2.0.0' })
      );

      workspaceConfig.addRepo('api');
      workspaceConfig.addRepo('web');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.repos).toHaveLength(2);
      expect(result.repos.map(r => r.name)).toContain('@workspace/api');
      expect(result.repos.map(r => r.name)).toContain('@workspace/web');
    });

    it('returns repos indexed by path', () => {
      const repo1 = path.join(tempDir, 'api');
      fs.mkdirSync(repo1);
      fs.writeFileSync(
        path.join(repo1, 'package.json'),
        JSON.stringify({ name: '@workspace/api', version: '1.0.0' })
      );

      workspaceConfig.addRepo('api');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.byPath['api']).toBeDefined();
      expect(result.byPath['api'].name).toBe('@workspace/api');
    });
  });

  describe('extracting package.json info', () => {
    it('extracts name, version, and description', () => {
      const repoPath = path.join(tempDir, 'my-lib');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          name: '@workspace/my-lib',
          version: '3.2.1',
          description: 'A helpful library',
        })
      );

      workspaceConfig.addRepo('my-lib');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.repos[0].name).toBe('@workspace/my-lib');
      expect(result.repos[0].version).toBe('3.2.1');
      expect(result.repos[0].description).toBe('A helpful library');
    });

    it('extracts main and module entry points', () => {
      const repoPath = path.join(tempDir, 'my-lib');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          name: 'my-lib',
          main: 'dist/index.js',
          module: 'dist/index.mjs',
        })
      );

      workspaceConfig.addRepo('my-lib');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.repos[0].main).toBe('dist/index.js');
      expect(result.repos[0].module).toBe('dist/index.mjs');
    });

    it('extracts scripts', () => {
      const repoPath = path.join(tempDir, 'my-app');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({
          name: 'my-app',
          scripts: {
            test: 'vitest',
            build: 'tsc',
            start: 'node dist/index.js',
          },
        })
      );

      workspaceConfig.addRepo('my-app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.repos[0].scripts.test).toBe('vitest');
      expect(result.repos[0].scripts.build).toBe('tsc');
    });
  });

  describe('detecting npm workspace dependencies', () => {
    it('detects workspace:* protocol dependencies', () => {
      // Create two repos where one depends on the other
      const coreRepo = path.join(tempDir, 'core');
      fs.mkdirSync(coreRepo);
      fs.writeFileSync(
        path.join(coreRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/core', version: '1.0.0' })
      );

      const appRepo = path.join(tempDir, 'app');
      fs.mkdirSync(appRepo);
      fs.writeFileSync(
        path.join(appRepo, 'package.json'),
        JSON.stringify({
          name: '@workspace/app',
          version: '1.0.0',
          dependencies: {
            '@workspace/core': 'workspace:*',
          },
        })
      );

      workspaceConfig.addRepo('core');
      workspaceConfig.addRepo('app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      const appInfo = result.byPath['app'];
      expect(appInfo.workspaceDeps).toContain('@workspace/core');
    });

    it('detects workspace:^ version dependencies', () => {
      const coreRepo = path.join(tempDir, 'core');
      fs.mkdirSync(coreRepo);
      fs.writeFileSync(
        path.join(coreRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/core', version: '1.0.0' })
      );

      const appRepo = path.join(tempDir, 'app');
      fs.mkdirSync(appRepo);
      fs.writeFileSync(
        path.join(appRepo, 'package.json'),
        JSON.stringify({
          name: '@workspace/app',
          dependencies: {
            '@workspace/core': 'workspace:^',
          },
        })
      );

      workspaceConfig.addRepo('core');
      workspaceConfig.addRepo('app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.byPath['app'].workspaceDeps).toContain('@workspace/core');
    });

    it('detects file: protocol dependencies to other repos', () => {
      const coreRepo = path.join(tempDir, 'core');
      fs.mkdirSync(coreRepo);
      fs.writeFileSync(
        path.join(coreRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/core', version: '1.0.0' })
      );

      const appRepo = path.join(tempDir, 'app');
      fs.mkdirSync(appRepo);
      fs.writeFileSync(
        path.join(appRepo, 'package.json'),
        JSON.stringify({
          name: '@workspace/app',
          dependencies: {
            '@workspace/core': 'file:../core',
          },
        })
      );

      workspaceConfig.addRepo('core');
      workspaceConfig.addRepo('app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.byPath['app'].workspaceDeps).toContain('@workspace/core');
    });
  });

  describe('detecting import references to other repos', () => {
    it('detects imports of workspace packages by name', () => {
      // Core repo
      const coreRepo = path.join(tempDir, 'core');
      fs.mkdirSync(coreRepo);
      fs.mkdirSync(path.join(coreRepo, 'src'));
      fs.writeFileSync(
        path.join(coreRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/core', version: '1.0.0' })
      );
      fs.writeFileSync(path.join(coreRepo, 'src', 'index.js'), 'module.exports = {};');

      // App repo that imports core
      const appRepo = path.join(tempDir, 'app');
      fs.mkdirSync(appRepo);
      fs.mkdirSync(path.join(appRepo, 'src'));
      fs.writeFileSync(
        path.join(appRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/app', version: '1.0.0' })
      );
      fs.writeFileSync(
        path.join(appRepo, 'src', 'index.js'),
        `const core = require('@workspace/core');`
      );

      workspaceConfig.addRepo('core');
      workspaceConfig.addRepo('app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan({ scanImports: true });

      expect(result.byPath['app'].importedRepos).toContain('@workspace/core');
    });

    it('detects ES6 imports of workspace packages', () => {
      const coreRepo = path.join(tempDir, 'core');
      fs.mkdirSync(coreRepo);
      fs.mkdirSync(path.join(coreRepo, 'src'));
      fs.writeFileSync(
        path.join(coreRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/core' })
      );

      const appRepo = path.join(tempDir, 'app');
      fs.mkdirSync(appRepo);
      fs.mkdirSync(path.join(appRepo, 'src'));
      fs.writeFileSync(
        path.join(appRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/app' })
      );
      fs.writeFileSync(
        path.join(appRepo, 'src', 'main.js'),
        `import { helper } from '@workspace/core';`
      );

      workspaceConfig.addRepo('core');
      workspaceConfig.addRepo('app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan({ scanImports: true });

      expect(result.byPath['app'].importedRepos).toContain('@workspace/core');
    });
  });

  describe('building dependency graph', () => {
    it('builds dependency order for test runs', () => {
      // Create three repos: core -> utils -> app
      const coreRepo = path.join(tempDir, 'core');
      fs.mkdirSync(coreRepo);
      fs.writeFileSync(
        path.join(coreRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/core' })
      );

      const utilsRepo = path.join(tempDir, 'utils');
      fs.mkdirSync(utilsRepo);
      fs.writeFileSync(
        path.join(utilsRepo, 'package.json'),
        JSON.stringify({
          name: '@workspace/utils',
          dependencies: { '@workspace/core': 'workspace:*' },
        })
      );

      const appRepo = path.join(tempDir, 'app');
      fs.mkdirSync(appRepo);
      fs.writeFileSync(
        path.join(appRepo, 'package.json'),
        JSON.stringify({
          name: '@workspace/app',
          dependencies: { '@workspace/utils': 'workspace:*' },
        })
      );

      workspaceConfig.addRepo('core');
      workspaceConfig.addRepo('utils');
      workspaceConfig.addRepo('app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      const order = result.dependencyOrder;
      const coreIndex = order.indexOf('core');
      const utilsIndex = order.indexOf('utils');
      const appIndex = order.indexOf('app');

      // Core should come before utils, utils before app
      expect(coreIndex).toBeLessThan(utilsIndex);
      expect(utilsIndex).toBeLessThan(appIndex);
    });

    it('returns dependency graph structure', () => {
      const coreRepo = path.join(tempDir, 'core');
      fs.mkdirSync(coreRepo);
      fs.writeFileSync(
        path.join(coreRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/core' })
      );

      const appRepo = path.join(tempDir, 'app');
      fs.mkdirSync(appRepo);
      fs.writeFileSync(
        path.join(appRepo, 'package.json'),
        JSON.stringify({
          name: '@workspace/app',
          dependencies: { '@workspace/core': 'workspace:*' },
        })
      );

      workspaceConfig.addRepo('core');
      workspaceConfig.addRepo('app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.dependencyGraph).toBeDefined();
      expect(result.dependencyGraph['app']).toContain('core');
      expect(result.dependencyGraph['core']).toEqual([]);
    });

    it('calculates affected repos when one changes', () => {
      const coreRepo = path.join(tempDir, 'core');
      fs.mkdirSync(coreRepo);
      fs.writeFileSync(
        path.join(coreRepo, 'package.json'),
        JSON.stringify({ name: '@workspace/core' })
      );

      const utilsRepo = path.join(tempDir, 'utils');
      fs.mkdirSync(utilsRepo);
      fs.writeFileSync(
        path.join(utilsRepo, 'package.json'),
        JSON.stringify({
          name: '@workspace/utils',
          dependencies: { '@workspace/core': 'workspace:*' },
        })
      );

      const appRepo = path.join(tempDir, 'app');
      fs.mkdirSync(appRepo);
      fs.writeFileSync(
        path.join(appRepo, 'package.json'),
        JSON.stringify({
          name: '@workspace/app',
          dependencies: { '@workspace/utils': 'workspace:*' },
        })
      );

      workspaceConfig.addRepo('core');
      workspaceConfig.addRepo('utils');
      workspaceConfig.addRepo('app');
      scanner = new WorkspaceScanner(workspaceConfig);
      scanner.scan();

      const affected = scanner.getAffectedRepos('core');

      // Changes to core affect utils and app
      expect(affected).toContain('utils');
      expect(affected).toContain('app');
    });
  });

  describe('handling missing package.json', () => {
    it('handles repo with missing package.json gracefully', () => {
      // Create repo without package.json
      const repoPath = path.join(tempDir, 'legacy-app');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'index.js'), 'console.log("hello");');

      workspaceConfig.addRepo('legacy-app');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].name).toBe('legacy-app'); // Falls back to directory name
      expect(result.repos[0].hasPackageJson).toBe(false);
    });

    it('marks repos without package.json', () => {
      const repoPath = path.join(tempDir, 'scripts');
      fs.mkdirSync(repoPath);

      workspaceConfig.addRepo('scripts');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.repos[0].hasPackageJson).toBe(false);
      expect(result.repos[0].dependencies).toEqual([]);
    });
  });

  describe('handling circular dependencies', () => {
    it('detects circular dependencies between repos', () => {
      // Create two repos that depend on each other
      const repoA = path.join(tempDir, 'repo-a');
      fs.mkdirSync(repoA);
      fs.writeFileSync(
        path.join(repoA, 'package.json'),
        JSON.stringify({
          name: '@workspace/repo-a',
          dependencies: { '@workspace/repo-b': 'workspace:*' },
        })
      );

      const repoB = path.join(tempDir, 'repo-b');
      fs.mkdirSync(repoB);
      fs.writeFileSync(
        path.join(repoB, 'package.json'),
        JSON.stringify({
          name: '@workspace/repo-b',
          dependencies: { '@workspace/repo-a': 'workspace:*' },
        })
      );

      workspaceConfig.addRepo('repo-a');
      workspaceConfig.addRepo('repo-b');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.hasCircularDeps).toBe(true);
      expect(result.circularDeps).toBeDefined();
      expect(result.circularDeps.length).toBeGreaterThan(0);
    });

    it('does not loop infinitely on circular deps', () => {
      const repoA = path.join(tempDir, 'repo-a');
      fs.mkdirSync(repoA);
      fs.writeFileSync(
        path.join(repoA, 'package.json'),
        JSON.stringify({
          name: '@workspace/repo-a',
          dependencies: { '@workspace/repo-b': 'workspace:*' },
        })
      );

      const repoB = path.join(tempDir, 'repo-b');
      fs.mkdirSync(repoB);
      fs.writeFileSync(
        path.join(repoB, 'package.json'),
        JSON.stringify({
          name: '@workspace/repo-b',
          dependencies: { '@workspace/repo-a': 'workspace:*' },
        })
      );

      workspaceConfig.addRepo('repo-a');
      workspaceConfig.addRepo('repo-b');
      scanner = new WorkspaceScanner(workspaceConfig);

      // Should complete without hanging
      const result = scanner.scan();
      expect(result.repos).toHaveLength(2);
    });

    it('provides dependency order even with circular deps (best effort)', () => {
      const repoA = path.join(tempDir, 'repo-a');
      fs.mkdirSync(repoA);
      fs.writeFileSync(
        path.join(repoA, 'package.json'),
        JSON.stringify({
          name: '@workspace/repo-a',
          dependencies: { '@workspace/repo-b': 'workspace:*' },
        })
      );

      const repoB = path.join(tempDir, 'repo-b');
      fs.mkdirSync(repoB);
      fs.writeFileSync(
        path.join(repoB, 'package.json'),
        JSON.stringify({
          name: '@workspace/repo-b',
          dependencies: { '@workspace/repo-a': 'workspace:*' },
        })
      );

      workspaceConfig.addRepo('repo-a');
      workspaceConfig.addRepo('repo-b');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      // Should still return an order (even if arbitrary for circular deps)
      expect(result.dependencyOrder).toHaveLength(2);
      expect(result.dependencyOrder).toContain('repo-a');
      expect(result.dependencyOrder).toContain('repo-b');
    });

    it('handles self-referencing dependency', () => {
      const repoA = path.join(tempDir, 'repo-a');
      fs.mkdirSync(repoA);
      fs.writeFileSync(
        path.join(repoA, 'package.json'),
        JSON.stringify({
          name: '@workspace/repo-a',
          dependencies: { '@workspace/repo-a': 'workspace:*' },
        })
      );

      workspaceConfig.addRepo('repo-a');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      // Self-reference is technically circular
      expect(result.hasCircularDeps).toBe(true);
    });
  });

  describe('additional features', () => {
    it('indexes repos by package name', () => {
      const repoPath = path.join(tempDir, 'packages-core');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: '@acme/core', version: '1.0.0' })
      );

      workspaceConfig.addRepo('packages-core');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.byName['@acme/core']).toBeDefined();
      expect(result.byName['@acme/core'].path).toBe('packages-core');
    });

    it('returns scan statistics', () => {
      const repo1 = path.join(tempDir, 'api');
      fs.mkdirSync(repo1);
      fs.writeFileSync(path.join(repo1, 'package.json'), JSON.stringify({ name: 'api' }));

      const repo2 = path.join(tempDir, 'web');
      fs.mkdirSync(repo2);
      fs.writeFileSync(path.join(repo2, 'package.json'), JSON.stringify({ name: 'web' }));

      workspaceConfig.addRepo('api');
      workspaceConfig.addRepo('web');
      scanner = new WorkspaceScanner(workspaceConfig);
      const result = scanner.scan();

      expect(result.stats.totalRepos).toBe(2);
      expect(result.stats.reposWithPackageJson).toBe(2);
    });

    it('caches scan results', () => {
      const repoPath = path.join(tempDir, 'my-app');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '1.0.0' })
      );

      workspaceConfig.addRepo('my-app');
      scanner = new WorkspaceScanner(workspaceConfig);

      const result1 = scanner.scan();
      const result2 = scanner.scan(); // Should return cached result

      expect(result1).toEqual(result2);
    });

    it('can force rescan to refresh cache', () => {
      const repoPath = path.join(tempDir, 'my-app');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '1.0.0' })
      );

      workspaceConfig.addRepo('my-app');
      scanner = new WorkspaceScanner(workspaceConfig);

      scanner.scan();

      // Update the package.json
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '2.0.0' })
      );

      const result = scanner.scan({ force: true });
      expect(result.repos[0].version).toBe('2.0.0');
    });
  });
});
