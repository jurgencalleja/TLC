import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { WorkspaceConfig } = await import('./workspace-config.js');

describe('WorkspaceConfig', () => {
  let tempDir;
  let workspaceConfig;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('creates workspace config file', () => {
      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();

      const configPath = path.join(tempDir, '.tlc-workspace.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('initializes with empty repos list', () => {
      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();

      const config = workspaceConfig.getConfig();
      expect(config.repos).toEqual([]);
    });

    it('sets workspace root in config', () => {
      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();

      const config = workspaceConfig.getConfig();
      expect(config.root).toBe(tempDir);
    });
  });

  describe('addRepo', () => {
    it('adds repo to workspace', () => {
      // Create a mock repo directory
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "my-repo"}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();
      workspaceConfig.addRepo('my-repo');

      const config = workspaceConfig.getConfig();
      expect(config.repos).toContain('my-repo');
    });

    it('stores relative paths only', () => {
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();
      workspaceConfig.addRepo(repoPath); // absolute path

      const config = workspaceConfig.getConfig();
      expect(config.repos).toContain('my-repo'); // stored as relative
    });

    it('rejects non-existent repo path', () => {
      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();

      expect(() => workspaceConfig.addRepo('non-existent')).toThrow(/not found|does not exist/i);
    });

    it('prevents duplicate repos', () => {
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();
      workspaceConfig.addRepo('my-repo');
      workspaceConfig.addRepo('my-repo'); // duplicate

      const config = workspaceConfig.getConfig();
      expect(config.repos.filter(r => r === 'my-repo').length).toBe(1);
    });
  });

  describe('removeRepo', () => {
    it('removes repo from workspace', () => {
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();
      workspaceConfig.addRepo('my-repo');
      workspaceConfig.removeRepo('my-repo');

      const config = workspaceConfig.getConfig();
      expect(config.repos).not.toContain('my-repo');
    });

    it('handles removing non-existent repo gracefully', () => {
      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();

      expect(() => workspaceConfig.removeRepo('not-there')).not.toThrow();
    });
  });

  describe('auto-discovery', () => {
    it('auto-discovers repos in subdirectories', () => {
      // Create subdirectories with package.json
      fs.mkdirSync(path.join(tempDir, 'repo-a'));
      fs.writeFileSync(path.join(tempDir, 'repo-a', 'package.json'), '{"name": "repo-a"}');
      fs.mkdirSync(path.join(tempDir, 'repo-b'));
      fs.writeFileSync(path.join(tempDir, 'repo-b', 'package.json'), '{"name": "repo-b"}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      const discovered = workspaceConfig.discoverRepos();

      expect(discovered).toContain('repo-a');
      expect(discovered).toContain('repo-b');
    });

    it('detects package.json in subdirs', () => {
      fs.mkdirSync(path.join(tempDir, 'my-app'));
      fs.writeFileSync(path.join(tempDir, 'my-app', 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      const discovered = workspaceConfig.discoverRepos();

      expect(discovered).toContain('my-app');
    });

    it('ignores node_modules directory', () => {
      fs.mkdirSync(path.join(tempDir, 'node_modules'));
      fs.mkdirSync(path.join(tempDir, 'node_modules', 'some-pkg'));
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'some-pkg', 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      const discovered = workspaceConfig.discoverRepos();

      expect(discovered).not.toContain('node_modules');
      expect(discovered).not.toContain(path.join('node_modules', 'some-pkg'));
    });

    it('ignores .git directory', () => {
      fs.mkdirSync(path.join(tempDir, '.git'));
      fs.writeFileSync(path.join(tempDir, '.git', 'config'), '');

      workspaceConfig = new WorkspaceConfig(tempDir);
      const discovered = workspaceConfig.discoverRepos();

      expect(discovered).not.toContain('.git');
    });

    it('ignores hidden directories', () => {
      fs.mkdirSync(path.join(tempDir, '.hidden-repo'));
      fs.writeFileSync(path.join(tempDir, '.hidden-repo', 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      const discovered = workspaceConfig.discoverRepos();

      expect(discovered).not.toContain('.hidden-repo');
    });
  });

  describe('glob patterns', () => {
    it('expands glob patterns (packages/*)', () => {
      fs.mkdirSync(path.join(tempDir, 'packages'));
      fs.mkdirSync(path.join(tempDir, 'packages', 'core'));
      fs.writeFileSync(path.join(tempDir, 'packages', 'core', 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, 'packages', 'utils'));
      fs.writeFileSync(path.join(tempDir, 'packages', 'utils', 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      const expanded = workspaceConfig.expandGlob('packages/*');

      expect(expanded).toContain('packages/core');
      expect(expanded).toContain('packages/utils');
    });
  });

  describe('npm workspaces detection', () => {
    it('detects npm workspaces from root package.json', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'monorepo',
          workspaces: ['packages/*'],
        })
      );
      fs.mkdirSync(path.join(tempDir, 'packages'));
      fs.mkdirSync(path.join(tempDir, 'packages', 'api'));
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      const workspaces = workspaceConfig.detectNpmWorkspaces();

      expect(workspaces).toContain('packages/api');
    });

    it('returns empty array if no workspaces defined', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'simple-project' })
      );

      workspaceConfig = new WorkspaceConfig(tempDir);
      const workspaces = workspaceConfig.detectNpmWorkspaces();

      expect(workspaces).toEqual([]);
    });

    it('handles missing root package.json', () => {
      workspaceConfig = new WorkspaceConfig(tempDir);
      const workspaces = workspaceConfig.detectNpmWorkspaces();

      expect(workspaces).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('saves config to .tlc-workspace.json', () => {
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();
      workspaceConfig.addRepo('my-repo');

      // Read file directly
      const configPath = path.join(tempDir, '.tlc-workspace.json');
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(saved.repos).toContain('my-repo');
    });

    it('loads existing config on construction', () => {
      // Pre-create config file
      const configPath = path.join(tempDir, '.tlc-workspace.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({ root: tempDir, repos: ['existing-repo'] })
      );

      workspaceConfig = new WorkspaceConfig(tempDir);
      const config = workspaceConfig.getConfig();

      expect(config.repos).toContain('existing-repo');
    });
  });

  describe('getRepoInfo', () => {
    it('returns info about a repo', () => {
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(
        path.join(repoPath, 'package.json'),
        JSON.stringify({ name: 'my-repo', version: '1.0.0' })
      );

      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();
      workspaceConfig.addRepo('my-repo');

      const info = workspaceConfig.getRepoInfo('my-repo');

      expect(info.name).toBe('my-repo');
      expect(info.path).toBe('my-repo');
    });

    it('detects if repo has TLC config', () => {
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{}');
      fs.writeFileSync(path.join(repoPath, '.tlc.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();
      workspaceConfig.addRepo('my-repo');

      const info = workspaceConfig.getRepoInfo('my-repo');

      expect(info.hasTlc).toBe(true);
    });

    it('detects if repo is missing TLC config', () => {
      const repoPath = path.join(tempDir, 'my-repo');
      fs.mkdirSync(repoPath);
      fs.writeFileSync(path.join(repoPath, 'package.json'), '{}');

      workspaceConfig = new WorkspaceConfig(tempDir);
      workspaceConfig.init();
      workspaceConfig.addRepo('my-repo');

      const info = workspaceConfig.getRepoInfo('my-repo');

      expect(info.hasTlc).toBe(false);
    });
  });
});
