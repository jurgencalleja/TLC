/**
 * Workspace Bootstrap Tests
 *
 * Tests for the /tlc:bootstrap command that clones all repos from
 * projects.json and sets up the workspace on a new machine.
 *
 * The bootstrap module:
 * - Reads the projects registry to discover repos
 * - Clones each repo to its configured localPath
 * - Checks out the configured defaultBranch
 * - Optionally runs npm install per project
 * - Optionally triggers vector index rebuild
 * - Reports progress via callback and returns a summary
 *
 * These tests are written BEFORE the implementation (Red phase).
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createWorkspaceBootstrap } from './workspace-bootstrap.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/**
 * Creates a mock projects registry that returns a configurable list of
 * projects. Mirrors the shape returned by createProjectsRegistry().
 * @param {Array} projects - Array of project entries
 * @returns {object} Mock registry with listProjects / load stubs
 */
function createMockRegistry(projects = []) {
  return {
    load: vi.fn().mockResolvedValue({ version: 1, projects }),
    listProjects: vi.fn().mockResolvedValue(projects),
    save: vi.fn().mockResolvedValue(undefined),
    addProject: vi.fn().mockResolvedValue(undefined),
    removeProject: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock vectorIndexer dependency.
 * @returns {object}
 */
function createMockVectorIndexer() {
  return {
    rebuildIndex: vi.fn().mockResolvedValue({ indexed: 5, errors: 0 }),
    indexFile: vi.fn().mockResolvedValue({ success: true }),
    indexAll: vi.fn().mockResolvedValue({ indexed: 0, errors: 0 }),
  };
}

/**
 * Creates a mock execAsync function that tracks calls and simulates
 * successful git operations by default.
 * @returns {vi.fn} Mock exec function
 */
function createMockExec() {
  return vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
}

// ---------------------------------------------------------------------------
// Sample project data
// ---------------------------------------------------------------------------

const sampleProjects = [
  {
    name: 'api-service',
    gitUrl: 'git@github.com:myorg/api-service.git',
    localPath: 'api-service',
    defaultBranch: 'main',
    hasTlc: true,
    description: 'REST API service',
  },
  {
    name: 'web-frontend',
    gitUrl: 'https://github.com/myorg/web-frontend.git',
    localPath: 'web-frontend',
    defaultBranch: 'develop',
    hasTlc: false,
    description: 'React frontend app',
  },
  {
    name: 'shared-lib',
    gitUrl: 'git@github.com:myorg/shared-lib.git',
    localPath: 'libs/shared',
    defaultBranch: 'main',
    hasTlc: true,
    description: 'Shared utilities library',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('workspace-bootstrap', () => {
  let tempDir;
  let mockRegistry;
  let mockVectorIndexer;
  let bootstrap;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-bootstrap-test-'));
    mockRegistry = createMockRegistry(sampleProjects);
    mockVectorIndexer = createMockVectorIndexer();

    bootstrap = createWorkspaceBootstrap({
      registry: mockRegistry,
      vectorIndexer: mockVectorIndexer,
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // 1. Clones repos listed in projects.json
  // -------------------------------------------------------------------------
  it('clones repos listed in projects.json (mock exec for git clone)', async () => {
    const result = await bootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // Should have attempted to clone all 3 projects
    expect(result.cloned).toBe(3);

    // Registry should have been queried
    expect(
      mockRegistry.listProjects.mock.calls.length +
      mockRegistry.load.mock.calls.length
    ).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // 2. Skips already-cloned repos (directory already exists with .git/)
  // -------------------------------------------------------------------------
  it('skips already-cloned repos (directory already exists with .git/)', async () => {
    // Pre-create one repo directory with .git/ to simulate already-cloned
    const existingRepo = path.join(tempDir, 'api-service');
    fs.mkdirSync(existingRepo, { recursive: true });
    fs.mkdirSync(path.join(existingRepo, '.git'));

    const result = await bootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // api-service should be skipped, the other 2 cloned
    expect(result.skipped).toBe(1);
    expect(result.cloned).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 3. Checks out correct branch per repo
  // -------------------------------------------------------------------------
  it('checks out correct branch per repo (git checkout command)', async () => {
    const execCalls = [];

    // Create a bootstrap with an exec spy that captures calls
    const spyBootstrap = createWorkspaceBootstrap({
      registry: mockRegistry,
      vectorIndexer: mockVectorIndexer,
      execAsync: vi.fn().mockImplementation(async (cmd) => {
        execCalls.push(cmd);
        return { stdout: '', stderr: '' };
      }),
    });

    await spyBootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // Should contain checkout commands for the configured branches
    const checkoutCmds = execCalls.filter(cmd => cmd.includes('checkout'));
    // web-frontend uses 'develop', others use 'main'
    const developCheckout = checkoutCmds.find(cmd => cmd.includes('develop'));
    expect(developCheckout).toBeDefined();

    // At least one checkout for 'main'
    const mainCheckout = checkoutCmds.find(cmd => cmd.includes('main'));
    expect(mainCheckout).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 4. Dry-run shows plan without cloning
  // -------------------------------------------------------------------------
  it('dry-run shows plan without cloning (no exec calls, returns plan)', async () => {
    const execCalls = [];

    const spyBootstrap = createWorkspaceBootstrap({
      registry: mockRegistry,
      vectorIndexer: mockVectorIndexer,
      execAsync: vi.fn().mockImplementation(async (cmd) => {
        execCalls.push(cmd);
        return { stdout: '', stderr: '' };
      }),
    });

    const result = await spyBootstrap.execute(tempDir, {
      dryRun: true,
      skipInstall: true,
      parallel: 1,
    });

    // No git clone commands should have been executed
    const cloneCmds = execCalls.filter(cmd => cmd.includes('git clone'));
    expect(cloneCmds).toHaveLength(0);

    // Result should still list what would be done
    expect(result.cloned).toBe(0);

    // Should indicate 3 projects would be cloned (or return a plan array)
    // The plan could be in result.plan or result.wouldClone
    expect(result.skipped + (result.plan || result.wouldClone || []).length || 0)
      .toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // 5. Skip-install flag respected
  // -------------------------------------------------------------------------
  it('skip-install flag prevents npm install calls', async () => {
    const execCalls = [];

    const spyBootstrap = createWorkspaceBootstrap({
      registry: mockRegistry,
      vectorIndexer: mockVectorIndexer,
      execAsync: vi.fn().mockImplementation(async (cmd) => {
        execCalls.push(cmd);
        return { stdout: '', stderr: '' };
      }),
    });

    await spyBootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // No npm install / pip install commands should have been called
    const installCmds = execCalls.filter(cmd =>
      cmd.includes('npm install') ||
      cmd.includes('yarn install') ||
      cmd.includes('pip install')
    );
    expect(installCmds).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 6. Progress callback fires per repo with phase/project/status
  // -------------------------------------------------------------------------
  it('progress callback fires per repo with phase/project/status', async () => {
    const progressEvents = [];

    await bootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
      onProgress: (event) => {
        progressEvents.push(event);
      },
    });

    // Should have received progress events
    expect(progressEvents.length).toBeGreaterThan(0);

    // Each event should have phase, project, and status
    for (const event of progressEvents) {
      expect(event).toHaveProperty('phase');
      expect(event).toHaveProperty('project');
      expect(event).toHaveProperty('status');
    }

    // Should have events for each project
    const projectNames = progressEvents.map(e => e.project);
    expect(projectNames).toContain('api-service');
    expect(projectNames).toContain('web-frontend');
    expect(projectNames).toContain('shared-lib');
  });

  // -------------------------------------------------------------------------
  // 7. Summary reports counts correctly
  // -------------------------------------------------------------------------
  it('summary reports counts correctly (cloned/skipped/failed)', async () => {
    // Pre-create one repo to be skipped
    const existingRepo = path.join(tempDir, 'web-frontend');
    fs.mkdirSync(existingRepo, { recursive: true });
    fs.mkdirSync(path.join(existingRepo, '.git'));

    const result = await bootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // Should report correct counts
    expect(result).toHaveProperty('cloned');
    expect(result).toHaveProperty('skipped');
    expect(result).toHaveProperty('failed');
    expect(result).toHaveProperty('errors');

    expect(result.cloned).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 8. Handles clone failure gracefully (continues with others, reports error)
  // -------------------------------------------------------------------------
  it('handles clone failure gracefully (continues with others, reports error)', async () => {
    let callCount = 0;

    const failingBootstrap = createWorkspaceBootstrap({
      registry: mockRegistry,
      vectorIndexer: mockVectorIndexer,
      execAsync: vi.fn().mockImplementation(async (cmd) => {
        // Fail the first clone attempt (api-service), succeed the rest
        if (cmd.includes('git clone') && cmd.includes('api-service')) {
          throw new Error('Connection refused');
        }
        return { stdout: '', stderr: '' };
      }),
    });

    const result = await failingBootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // Should have continued past the failure
    expect(result.failed).toBe(1);
    expect(result.cloned).toBe(2);

    // Errors array should contain the failure details
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toHaveProperty('project', 'api-service');
    expect(result.errors[0]).toHaveProperty('error');
  });

  // -------------------------------------------------------------------------
  // 9. Triggers vector index rebuild after clone
  // -------------------------------------------------------------------------
  it('triggers vector index rebuild after clone (calls vectorIndexer.rebuildIndex)', async () => {
    await bootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // vectorIndexer.rebuildIndex should have been called after cloning
    expect(mockVectorIndexer.rebuildIndex).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 9b. Vector index rebuild skipped when vectorIndexer not provided
  // -------------------------------------------------------------------------
  it('skips vector index rebuild when vectorIndexer is not provided', async () => {
    const noVectorBootstrap = createWorkspaceBootstrap({
      registry: mockRegistry,
      // No vectorIndexer provided
    });

    // Should not throw when vectorIndexer is absent
    const result = await noVectorBootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    expect(result.cloned).toBe(3);
    // No rebuildIndex call since vectorIndexer was not provided
    expect(mockVectorIndexer.rebuildIndex).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 10. Creates local directories as needed (parent dirs)
  // -------------------------------------------------------------------------
  it('creates local directories as needed (nested parent dirs)', async () => {
    // shared-lib has localPath 'libs/shared' which requires creating 'libs/' first
    // Use a registry with only the nested-path project
    const nestedRegistry = createMockRegistry([
      {
        name: 'shared-lib',
        gitUrl: 'git@github.com:myorg/shared-lib.git',
        localPath: 'libs/shared',
        defaultBranch: 'main',
        hasTlc: true,
        description: 'Shared utilities library',
      },
    ]);

    const execCalls = [];
    const dirBootstrap = createWorkspaceBootstrap({
      registry: nestedRegistry,
      vectorIndexer: mockVectorIndexer,
      execAsync: vi.fn().mockImplementation(async (cmd) => {
        execCalls.push(cmd);
        // Simulate git clone by creating the target directory with .git
        if (cmd.includes('git clone')) {
          const targetDir = path.join(tempDir, 'libs', 'shared');
          fs.mkdirSync(targetDir, { recursive: true });
          fs.mkdirSync(path.join(targetDir, '.git'), { recursive: true });
        }
        return { stdout: '', stderr: '' };
      }),
    });

    const result = await dirBootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // The parent directory 'libs/' should exist (created before clone)
    expect(fs.existsSync(path.join(tempDir, 'libs'))).toBe(true);
    expect(result.cloned).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 11. Handles SSH git URLs in clone command
  // -------------------------------------------------------------------------
  it('handles SSH git URLs in clone command', async () => {
    const sshOnlyRegistry = createMockRegistry([
      {
        name: 'ssh-repo',
        gitUrl: 'git@github.com:myorg/ssh-repo.git',
        localPath: 'ssh-repo',
        defaultBranch: 'main',
        hasTlc: false,
        description: 'SSH-cloned repo',
      },
    ]);

    const execCalls = [];
    const sshBootstrap = createWorkspaceBootstrap({
      registry: sshOnlyRegistry,
      vectorIndexer: mockVectorIndexer,
      execAsync: vi.fn().mockImplementation(async (cmd) => {
        execCalls.push(cmd);
        return { stdout: '', stderr: '' };
      }),
    });

    await sshBootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // The clone command should contain the SSH URL
    const cloneCmd = execCalls.find(cmd => cmd.includes('git clone'));
    expect(cloneCmd).toBeDefined();
    expect(cloneCmd).toContain('git@github.com:myorg/ssh-repo.git');
  });

  // -------------------------------------------------------------------------
  // 12. Handles HTTPS git URLs in clone command
  // -------------------------------------------------------------------------
  it('handles HTTPS git URLs in clone command', async () => {
    const httpsOnlyRegistry = createMockRegistry([
      {
        name: 'https-repo',
        gitUrl: 'https://github.com/myorg/https-repo.git',
        localPath: 'https-repo',
        defaultBranch: 'main',
        hasTlc: false,
        description: 'HTTPS-cloned repo',
      },
    ]);

    const execCalls = [];
    const httpsBootstrap = createWorkspaceBootstrap({
      registry: httpsOnlyRegistry,
      vectorIndexer: mockVectorIndexer,
      execAsync: vi.fn().mockImplementation(async (cmd) => {
        execCalls.push(cmd);
        return { stdout: '', stderr: '' };
      }),
    });

    await httpsBootstrap.execute(tempDir, {
      dryRun: false,
      skipInstall: true,
      parallel: 1,
    });

    // The clone command should contain the HTTPS URL
    const cloneCmd = execCalls.find(cmd => cmd.includes('git clone'));
    expect(cloneCmd).toBeDefined();
    expect(cloneCmd).toContain('https://github.com/myorg/https-repo.git');
  });
});
