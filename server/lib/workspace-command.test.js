import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { WorkspaceCommand } = await import('./workspace-command.js');

describe('WorkspaceCommand', () => {
  let tempDir;
  let command;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-cmd-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createRepo(name, options = {}) {
    const repoPath = path.join(tempDir, name);
    fs.mkdirSync(repoPath, { recursive: true });

    fs.writeFileSync(
      path.join(repoPath, 'package.json'),
      JSON.stringify({
        name: options.packageName || name,
        version: '1.0.0',
        scripts: { test: 'echo "pass"' },
        dependencies: options.dependencies || {},
      }, null, 2)
    );

    if (options.hasTlc) {
      fs.writeFileSync(
        path.join(repoPath, '.tlc.json'),
        JSON.stringify({ project: name }, null, 2)
      );
    }

    return repoPath;
  }

  describe('init', () => {
    it('scans subdirectories for repos', async () => {
      createRepo('repo-a');
      createRepo('repo-b');

      command = new WorkspaceCommand(tempDir);
      const result = await command.init({ dryRun: true });

      expect(result.discovered).toContain('repo-a');
      expect(result.discovered).toContain('repo-b');
    });

    it('shows which repos need TLC setup', async () => {
      createRepo('initialized', { hasTlc: true });
      createRepo('uninitialized', { hasTlc: false });

      command = new WorkspaceCommand(tempDir);
      const result = await command.init({ dryRun: true });

      expect(result.needsInit).toContain('uninitialized');
      expect(result.needsInit).not.toContain('initialized');
    });

    it('bulk-initializes repos on confirm', async () => {
      createRepo('new-repo-1');
      createRepo('new-repo-2');

      command = new WorkspaceCommand(tempDir);
      const result = await command.init({ confirm: true });

      expect(fs.existsSync(path.join(tempDir, 'new-repo-1', '.tlc.json'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'new-repo-2', '.tlc.json'))).toBe(true);
      expect(result.initialized).toBe(2);
    });

    it('creates .tlc-workspace.json', async () => {
      createRepo('my-repo');

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });

      const configPath = path.join(tempDir, '.tlc-workspace.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.repos).toContain('my-repo');
    });

    it('skips hidden directories and node_modules', async () => {
      createRepo('valid-repo');
      fs.mkdirSync(path.join(tempDir, '.hidden'));
      fs.writeFileSync(path.join(tempDir, '.hidden', 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, 'node_modules'));
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'package.json'), '{}');

      command = new WorkspaceCommand(tempDir);
      const result = await command.init({ dryRun: true });

      expect(result.discovered).toContain('valid-repo');
      expect(result.discovered).not.toContain('.hidden');
      expect(result.discovered).not.toContain('node_modules');
    });
  });

  describe('add', () => {
    it('adds repo to workspace', async () => {
      createRepo('existing-repo', { hasTlc: true });

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      await command.add('existing-repo');

      const config = command.getConfig();
      expect(config.repos).toContain('existing-repo');
    });

    it('auto-initializes repo if no .tlc.json', async () => {
      createRepo('uninit-repo');

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      await command.add('uninit-repo');

      expect(fs.existsSync(path.join(tempDir, 'uninit-repo', '.tlc.json'))).toBe(true);
    });

    it('throws if repo does not exist', async () => {
      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });

      await expect(command.add('nonexistent')).rejects.toThrow(/not found/i);
    });
  });

  describe('remove', () => {
    it('removes repo from config', async () => {
      createRepo('to-remove', { hasTlc: true });

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      await command.remove('to-remove');

      const config = command.getConfig();
      expect(config.repos).not.toContain('to-remove');
    });

    it('does not delete repo files', async () => {
      createRepo('keep-files', { hasTlc: true });

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      await command.remove('keep-files');

      // Files should still exist
      expect(fs.existsSync(path.join(tempDir, 'keep-files', 'package.json'))).toBe(true);
    });
  });

  describe('list', () => {
    it('shows repos with status (ready/needs-init)', async () => {
      createRepo('ready-repo', { hasTlc: true });
      createRepo('needs-init-repo', { hasTlc: false });

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      const list = await command.list();

      const readyRepo = list.find(r => r.name === 'ready-repo');
      const needsInitRepo = list.find(r => r.name === 'needs-init-repo');

      expect(readyRepo.status).toBe('ready');
      // After init with confirm, all repos should be ready
      expect(needsInitRepo.status).toBe('ready');
    });

    it('shows repo names and paths', async () => {
      createRepo('my-app', { packageName: '@org/my-app' });

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      const list = await command.list();

      const repo = list.find(r => r.name === 'my-app');
      expect(repo.packageName).toBe('@org/my-app');
      expect(repo.path).toBe('my-app');
    });
  });

  describe('test', () => {
    it('runs unified test runner', async () => {
      createRepo('test-repo');

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      const result = await command.test();

      expect(result.summary.total).toBe(1);
      expect(result.summary.passed).toBe(1);
    });

    it('passes options to test runner', async () => {
      createRepo('repo-1');
      createRepo('repo-2');

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      const result = await command.test({ filter: ['repo-1'] });

      expect(Object.keys(result.repos)).toEqual(['repo-1']);
    });
  });

  describe('graph', () => {
    it('outputs Mermaid diagram', async () => {
      createRepo('core', { packageName: 'core' });
      createRepo('api', {
        packageName: 'api',
        dependencies: { core: 'workspace:*' },
      });

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      const diagram = await command.graph();

      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('api');
      expect(diagram).toContain('core');
      expect(diagram).toContain('-->');
    });
  });

  describe('status', () => {
    it('shows repo health overview', async () => {
      createRepo('healthy-repo', { hasTlc: true });

      command = new WorkspaceCommand(tempDir);
      await command.init({ confirm: true });
      const status = await command.status();

      expect(status.repos).toHaveLength(1);
      expect(status.repos[0].name).toBe('healthy-repo');
      expect(status.repos[0].hasTlc).toBe(true);
    });
  });

  describe('error handling', () => {
    it('handles workspace not initialized error', async () => {
      command = new WorkspaceCommand(tempDir);

      await expect(command.list()).rejects.toThrow(/not initialized/i);
    });

    it('handles empty workspace', async () => {
      command = new WorkspaceCommand(tempDir);
      const result = await command.init({ confirm: true });

      expect(result.discovered).toEqual([]);
      expect(result.initialized).toBe(0);
    });
  });
});
