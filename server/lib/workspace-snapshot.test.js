/**
 * Workspace Snapshot & Restore Tests
 * Capture workspace state (branches, uncommitted changes, TLC phase) and restore it.
 * "Where was I?" across machines.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock child_process before importing the module under test
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

const { execSync } = await import('child_process');
const { createWorkspaceSnapshot } = await import('./workspace-snapshot.js');

describe('WorkspaceSnapshot', () => {
  let tempDir;
  let registry;
  let snap;

  /**
   * Helper: create a fake sub-repo directory structure
   */
  function createSubRepo(name, options = {}) {
    const repoPath = path.join(tempDir, name);
    fs.mkdirSync(repoPath, { recursive: true });
    fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });

    if (options.roadmap) {
      const planningDir = path.join(repoPath, '.planning');
      fs.mkdirSync(path.join(planningDir, 'phases'), { recursive: true });
      fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), options.roadmap);
    }

    if (options.planFile) {
      const planningDir = path.join(repoPath, '.planning', 'phases');
      fs.mkdirSync(planningDir, { recursive: true });
      fs.writeFileSync(
        path.join(planningDir, options.planFile.name),
        options.planFile.content
      );
    }

    return repoPath;
  }

  /**
   * Helper: configure execSync mock responses for a given repo
   * @param {string} repoPath - Absolute path to the repo
   * @param {Object} gitState - Git state to mock
   */
  function mockGitState(repoPath, gitState = {}) {
    const {
      branch = 'main',
      lastCommit = 'abc1234',
      hasUncommitted = false,
      detachedHead = false,
      noCommits = false,
    } = gitState;

    execSync.mockImplementation((cmd, opts) => {
      const cwd = opts?.cwd || '';

      if (!cwd.startsWith(repoPath) && cwd !== repoPath) {
        // Let other repos fall through to a default or throw
        throw new Error(`Unexpected cwd: ${cwd}`);
      }

      if (cmd.includes('rev-parse --abbrev-ref HEAD')) {
        if (noCommits) {
          throw new Error('fatal: ambiguous argument HEAD');
        }
        return detachedHead ? 'HEAD' : branch;
      }

      if (cmd.includes('rev-parse HEAD')) {
        if (noCommits) {
          throw new Error('fatal: ambiguous argument HEAD');
        }
        return lastCommit;
      }

      if (cmd.includes('status --porcelain')) {
        return hasUncommitted ? ' M src/index.js\n?? new-file.js\n' : '';
      }

      if (cmd.includes('checkout')) {
        return '';
      }

      throw new Error(`Unmocked git command: ${cmd}`);
    });
  }

  /**
   * Helper: configure execSync to handle multiple repos
   * @param {Object} repoStates - Map of repoPath -> gitState
   */
  function mockMultiRepoGitState(repoStates) {
    execSync.mockImplementation((cmd, opts) => {
      const cwd = opts?.cwd || '';

      for (const [repoPath, gitState] of Object.entries(repoStates)) {
        if (cwd === repoPath || cwd.startsWith(repoPath + path.sep)) {
          const {
            branch = 'main',
            lastCommit = 'abc1234',
            hasUncommitted = false,
            detachedHead = false,
            noCommits = false,
          } = gitState;

          if (cmd.includes('rev-parse --abbrev-ref HEAD')) {
            if (noCommits) throw new Error('fatal: ambiguous argument HEAD');
            return detachedHead ? 'HEAD' : branch;
          }

          if (cmd.includes('rev-parse HEAD')) {
            if (noCommits) throw new Error('fatal: ambiguous argument HEAD');
            return lastCommit;
          }

          if (cmd.includes('status --porcelain')) {
            return hasUncommitted ? ' M src/index.js\n' : '';
          }

          if (cmd.includes('checkout')) {
            return '';
          }

          throw new Error(`Unmocked git command: ${cmd}`);
        }
      }

      throw new Error(`No mock configured for cwd: ${cwd}, cmd: ${cmd}`);
    });
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-snapshot-test-'));
    vi.clearAllMocks();

    // Default registry mock returning two projects
    registry = {
      listProjects: vi.fn().mockResolvedValue([
        { name: 'api', localPath: 'api', defaultBranch: 'main' },
        { name: 'web', localPath: 'web', defaultBranch: 'main' },
      ]),
    };

    snap = createWorkspaceSnapshot({ registry });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('snapshot', () => {
    it('captures branch and last commit per repo', async () => {
      const apiPath = createSubRepo('api');
      const webPath = createSubRepo('web');

      mockMultiRepoGitState({
        [apiPath]: { branch: 'main', lastCommit: 'aaa1111' },
        [webPath]: { branch: 'develop', lastCommit: 'bbb2222' },
      });

      const state = await snap.snapshot(tempDir);

      expect(state.projects).toHaveLength(2);

      const api = state.projects.find(p => p.name === 'api');
      expect(api.branch).toBe('main');
      expect(api.lastCommit).toBe('aaa1111');

      const web = state.projects.find(p => p.name === 'web');
      expect(web.branch).toBe('develop');
      expect(web.lastCommit).toBe('bbb2222');
    });

    it('captures uncommitted changes indicator (hasUncommitted boolean)', async () => {
      const apiPath = createSubRepo('api');
      const webPath = createSubRepo('web');

      mockMultiRepoGitState({
        [apiPath]: { hasUncommitted: true },
        [webPath]: { hasUncommitted: false },
      });

      const state = await snap.snapshot(tempDir);

      const api = state.projects.find(p => p.name === 'api');
      expect(api.hasUncommitted).toBe(true);

      const web = state.projects.find(p => p.name === 'web');
      expect(web.hasUncommitted).toBe(false);
    });

    it('captures TLC phase per repo (reads ROADMAP.md for current phase marker)', async () => {
      const roadmapContent = [
        '# Roadmap',
        '',
        '## Phases',
        '',
        '- [x] Phase 1: Setup',
        '- [>] Phase 2: Core Features',
        '- [ ] Phase 3: Polish',
      ].join('\n');

      const apiPath = createSubRepo('api', { roadmap: roadmapContent });
      const webPath = createSubRepo('web');

      mockMultiRepoGitState({
        [apiPath]: {},
        [webPath]: {},
      });

      const state = await snap.snapshot(tempDir);

      const api = state.projects.find(p => p.name === 'api');
      expect(api.tlcPhase).toBe(2);
      expect(api.tlcPhaseName).toBe('Core Features');

      // web has no ROADMAP.md, so phase should be null/undefined or 0
      const web = state.projects.find(p => p.name === 'web');
      expect(web.tlcPhase).toBeNull();
    });

    it('includes timestamp', async () => {
      const apiPath = createSubRepo('api');
      const webPath = createSubRepo('web');

      mockMultiRepoGitState({
        [apiPath]: {},
        [webPath]: {},
      });

      const before = Date.now();
      const state = await snap.snapshot(tempDir);
      const after = Date.now();

      expect(state.timestamp).toBeDefined();
      expect(typeof state.timestamp).toBe('number');
      expect(state.timestamp).toBeGreaterThanOrEqual(before);
      expect(state.timestamp).toBeLessThanOrEqual(after);
    });

    it('handles repo with no commits (empty repo)', async () => {
      const apiPath = createSubRepo('api');
      const webPath = createSubRepo('web');

      // api has no commits, web is normal
      mockMultiRepoGitState({
        [apiPath]: { noCommits: true },
        [webPath]: { branch: 'main', lastCommit: 'ccc3333' },
      });

      const state = await snap.snapshot(tempDir);

      const api = state.projects.find(p => p.name === 'api');
      expect(api.branch).toBeNull();
      expect(api.lastCommit).toBeNull();

      // web should still work fine
      const web = state.projects.find(p => p.name === 'web');
      expect(web.branch).toBe('main');
      expect(web.lastCommit).toBe('ccc3333');
    });

    it('handles repo on detached HEAD', async () => {
      const apiPath = createSubRepo('api');
      const webPath = createSubRepo('web');

      mockMultiRepoGitState({
        [apiPath]: { detachedHead: true, lastCommit: 'ddd4444' },
        [webPath]: {},
      });

      const state = await snap.snapshot(tempDir);

      const api = state.projects.find(p => p.name === 'api');
      expect(api.branch).toBe('HEAD');
      expect(api.lastCommit).toBe('ddd4444');
    });

    it('captures active tasks per repo (reads current PLAN.md for [>@] markers)', async () => {
      const planContent = [
        '# Phase 2: Core Features - Plan',
        '',
        '## Tasks',
        '',
        '### Task 1: Auth [x@alice]',
        '',
        '### Task 2: API Routes [>@bob]',
        '',
        '### Task 3: Database [>@carol]',
        '',
        '### Task 4: Tests [ ]',
      ].join('\n');

      const apiPath = createSubRepo('api', {
        roadmap: '- [>] Phase 2: Core Features\n',
        planFile: { name: '2-PLAN.md', content: planContent },
      });
      const webPath = createSubRepo('web');

      mockMultiRepoGitState({
        [apiPath]: {},
        [webPath]: {},
      });

      const state = await snap.snapshot(tempDir);

      const api = state.projects.find(p => p.name === 'api');
      expect(api.activeTasks).toBeDefined();
      expect(api.activeTasks).toHaveLength(2);
      expect(api.activeTasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ task: 'API Routes', assignee: 'bob' }),
          expect.objectContaining({ task: 'Database', assignee: 'carol' }),
        ])
      );
    });
  });

  describe('save to file', () => {
    it('saves snapshot to workspace-state.json', async () => {
      const apiPath = createSubRepo('api');
      const webPath = createSubRepo('web');

      mockMultiRepoGitState({
        [apiPath]: { branch: 'main', lastCommit: 'aaa1111' },
        [webPath]: { branch: 'develop', lastCommit: 'bbb2222' },
      });

      await snap.snapshot(tempDir);

      const stateFile = path.join(tempDir, 'workspace-state.json');
      expect(fs.existsSync(stateFile)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      expect(saved.timestamp).toBeDefined();
      expect(saved.projects).toHaveLength(2);
      expect(saved.projects.find(p => p.name === 'api').branch).toBe('main');
    });
  });

  describe('restore', () => {
    it('checks out correct branches (mock exec for git checkout)', async () => {
      createSubRepo('api');
      createSubRepo('web');

      // Pre-create workspace-state.json with a previous snapshot
      const previousState = {
        timestamp: Date.now() - 60000,
        projects: [
          { name: 'api', branch: 'feature/auth', lastCommit: 'aaa1111', hasUncommitted: false },
          { name: 'web', branch: 'develop', lastCommit: 'bbb2222', hasUncommitted: false },
        ],
      };
      fs.writeFileSync(
        path.join(tempDir, 'workspace-state.json'),
        JSON.stringify(previousState, null, 2)
      );

      // Track checkout calls
      const checkoutCalls = [];
      execSync.mockImplementation((cmd, opts) => {
        if (cmd.includes('checkout')) {
          checkoutCalls.push({ cmd, cwd: opts?.cwd });
          return '';
        }
        return '';
      });

      await snap.restore(tempDir);

      // Should have checked out the correct branches
      expect(checkoutCalls).toHaveLength(2);

      const apiCheckout = checkoutCalls.find(c => c.cwd.includes('api'));
      expect(apiCheckout).toBeDefined();
      expect(apiCheckout.cmd).toContain('feature/auth');

      const webCheckout = checkoutCalls.find(c => c.cwd.includes('web'));
      expect(webCheckout).toBeDefined();
      expect(webCheckout.cmd).toContain('develop');
    });
  });

  describe('diff', () => {
    it('shows changes since last snapshot (branch change, new commits)', async () => {
      const apiPath = createSubRepo('api');
      const webPath = createSubRepo('web');

      // Pre-create workspace-state.json with a previous snapshot
      const previousState = {
        timestamp: Date.now() - 60000,
        projects: [
          { name: 'api', branch: 'main', lastCommit: 'aaa1111', hasUncommitted: false },
          { name: 'web', branch: 'main', lastCommit: 'bbb2222', hasUncommitted: false },
        ],
      };
      fs.writeFileSync(
        path.join(tempDir, 'workspace-state.json'),
        JSON.stringify(previousState, null, 2)
      );

      // Now the repos have changed
      mockMultiRepoGitState({
        [apiPath]: { branch: 'feature/auth', lastCommit: 'aaa9999' },
        [webPath]: { branch: 'main', lastCommit: 'bbb2222' }, // unchanged
      });

      const changes = await snap.diff(tempDir);

      // api changed branch and commit
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            project: 'api',
            field: 'branch',
            was: 'main',
            now: 'feature/auth',
          }),
          expect.objectContaining({
            project: 'api',
            field: 'lastCommit',
            was: 'aaa1111',
            now: 'aaa9999',
          }),
        ])
      );

      // web did not change - should NOT appear in changes
      const webChanges = changes.filter(c => c.project === 'web');
      expect(webChanges).toHaveLength(0);
    });
  });
});
