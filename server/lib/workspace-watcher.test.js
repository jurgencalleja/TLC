/**
 * Workspace Watcher Tests
 * Tests for auto-detecting and registering new repos in a workspace.
 *
 * Task 5 (Phase 72): Auto-Detect & Register New Repos
 *   - Detects new directories with .git/ via scan()
 *   - Adds detected repos to projects.json via registry.addProject
 *   - Extracts git remote URL from new repos
 *   - Broadcasts WebSocket event when new project detected
 *   - Ignores directories without .git/
 *   - Configurable enable/disable
 *   - Handles rapid successive additions (multiple new repos)
 *   - Handles directory deletion (removed repos)
 *   - Returns list of newly detected repos from scan
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createWorkspaceWatcher } from './workspace-watcher.js';

/**
 * Creates a mock projects registry with vi.fn() methods.
 * @returns {object} Mock registry
 */
function createMockRegistry() {
  return {
    load: vi.fn().mockReturnValue({ version: 1, projects: [] }),
    save: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    listProjects: vi.fn().mockReturnValue([]),
    detectFromFilesystem: vi.fn().mockReturnValue([]),
  };
}

/**
 * Creates a fake git repo directory with a .git/ subdirectory.
 * Optionally writes a git config file with a remote origin URL.
 * @param {string} parentDir - Parent directory to create the repo in
 * @param {string} repoName - Name of the repo directory
 * @param {string} [remoteUrl] - Optional git remote origin URL
 * @returns {string} Full path to the created repo directory
 */
function createFakeRepo(parentDir, repoName, remoteUrl) {
  const repoPath = path.join(parentDir, repoName);
  fs.mkdirSync(repoPath, { recursive: true });
  fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
  if (remoteUrl) {
    const configContent = [
      '[remote "origin"]',
      `\turl = ${remoteUrl}`,
      '\tfetch = +refs/heads/*:refs/remotes/origin/*',
    ].join('\n');
    fs.writeFileSync(path.join(repoPath, '.git', 'config'), configContent);
  }
  return repoPath;
}

/**
 * Creates a plain directory (not a git repo) inside a parent directory.
 * @param {string} parentDir - Parent directory
 * @param {string} dirName - Directory name
 * @returns {string} Full path to the created directory
 */
function createPlainDir(parentDir, dirName) {
  const dirPath = path.join(parentDir, dirName);
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

describe('workspace-watcher', () => {
  let tempDir;
  let registry;
  let broadcast;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-watcher-test-'));
    registry = createMockRegistry();
    broadcast = vi.fn();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('scan detection', () => {
    it('should detect new directory with .git/', async () => {
      createFakeRepo(tempDir, 'my-new-repo');

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      const newRepos = await watcher.scan(tempDir);

      expect(newRepos).toHaveLength(1);
      expect(newRepos[0]).toHaveProperty('name', 'my-new-repo');
    });

    it('should ignore directories without .git/', async () => {
      createPlainDir(tempDir, 'not-a-repo');
      createPlainDir(tempDir, 'also-not-a-repo');
      createFakeRepo(tempDir, 'actual-repo');

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      const newRepos = await watcher.scan(tempDir);

      expect(newRepos).toHaveLength(1);
      expect(newRepos[0]).toHaveProperty('name', 'actual-repo');
    });

    it('should return list of newly detected repos from scan', async () => {
      createFakeRepo(tempDir, 'repo-alpha', 'git@github.com:user/alpha.git');
      createFakeRepo(tempDir, 'repo-beta', 'https://github.com/user/beta.git');

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      const newRepos = await watcher.scan(tempDir);

      expect(newRepos).toHaveLength(2);
      const names = newRepos.map((r) => r.name);
      expect(names).toContain('repo-alpha');
      expect(names).toContain('repo-beta');
    });
  });

  describe('registry integration', () => {
    it('should add detected repo to projects.json via registry.addProject', async () => {
      createFakeRepo(tempDir, 'new-project', 'git@github.com:org/new-project.git');

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      await watcher.scan(tempDir);

      expect(registry.addProject).toHaveBeenCalledTimes(1);
      expect(registry.addProject).toHaveBeenCalledWith(
        tempDir,
        expect.objectContaining({
          name: 'new-project',
        })
      );
    });

    it('should extract git remote URL from new repo', async () => {
      const remoteUrl = 'git@github.com:myorg/my-service.git';
      createFakeRepo(tempDir, 'my-service', remoteUrl);

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      const newRepos = await watcher.scan(tempDir);

      expect(newRepos[0]).toHaveProperty('gitUrl', remoteUrl);
      expect(registry.addProject).toHaveBeenCalledWith(
        tempDir,
        expect.objectContaining({
          gitUrl: remoteUrl,
        })
      );
    });
  });

  describe('WebSocket broadcast', () => {
    it('should broadcast event when new project detected', async () => {
      createFakeRepo(tempDir, 'detected-repo', 'git@github.com:org/detected.git');

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      await watcher.scan(tempDir);

      expect(broadcast).toHaveBeenCalledTimes(1);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'new-project',
          project: expect.objectContaining({
            name: 'detected-repo',
          }),
        })
      );
    });

    it('should work without broadcast function (optional)', async () => {
      createFakeRepo(tempDir, 'no-broadcast-repo');

      const watcher = createWorkspaceWatcher({ registry });
      const newRepos = await watcher.scan(tempDir);

      // Should not throw, should still detect
      expect(newRepos).toHaveLength(1);
      expect(registry.addProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('enable/disable configuration', () => {
    it('should return empty when disabled', async () => {
      createFakeRepo(tempDir, 'invisible-repo');

      const watcher = createWorkspaceWatcher({
        registry,
        broadcast,
        enabled: false,
      });
      const newRepos = await watcher.scan(tempDir);

      expect(newRepos).toHaveLength(0);
      expect(registry.addProject).not.toHaveBeenCalled();
      expect(broadcast).not.toHaveBeenCalled();
    });

    it('should detect repos when enabled (default)', async () => {
      createFakeRepo(tempDir, 'visible-repo');

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      const newRepos = await watcher.scan(tempDir);

      expect(newRepos).toHaveLength(1);
    });
  });

  describe('multiple repos', () => {
    it('should handle rapid successive additions (multiple new repos at once)', async () => {
      createFakeRepo(tempDir, 'repo-one', 'git@github.com:org/one.git');
      createFakeRepo(tempDir, 'repo-two', 'git@github.com:org/two.git');
      createFakeRepo(tempDir, 'repo-three', 'git@github.com:org/three.git');
      // Also add a non-repo directory to make sure it is skipped
      createPlainDir(tempDir, 'some-folder');

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      const newRepos = await watcher.scan(tempDir);

      expect(newRepos).toHaveLength(3);
      expect(registry.addProject).toHaveBeenCalledTimes(3);
      expect(broadcast).toHaveBeenCalledTimes(3);

      const names = newRepos.map((r) => r.name).sort();
      expect(names).toEqual(['repo-one', 'repo-three', 'repo-two']);
    });
  });

  describe('directory deletion', () => {
    it('should detect removed repos when directory is deleted', async () => {
      // Set up registry to report a project that no longer exists on disk
      const missingProject = {
        name: 'deleted-repo',
        localPath: 'deleted-repo',
        gitUrl: 'git@github.com:org/deleted.git',
      };
      registry.listProjects.mockReturnValue([missingProject]);

      // The directory does NOT exist on disk — it was deleted
      // (we do not create it in tempDir)

      const watcher = createWorkspaceWatcher({ registry, broadcast });
      const newRepos = await watcher.scan(tempDir);

      // No new repos detected (nothing on disk with .git/)
      expect(newRepos).toHaveLength(0);

      // The watcher should call removeProject for the missing repo
      expect(registry.removeProject).toHaveBeenCalledWith(tempDir, 'deleted-repo');
    });
  });
});
