import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { createWorkspaceRouter } = await import('./workspace-api.js');

/**
 * Helper: create mock GlobalConfig with controllable state
 */
function createMockGlobalConfig(initialRoots = []) {
  const roots = [...initialRoots];
  const lastScans = {};

  return {
    _roots: roots,
    _lastScans: lastScans,

    getRoots() {
      return [...roots];
    },

    addRoot(rootPath) {
      const resolved = path.resolve(rootPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`Path does not exist: ${resolved}`);
      }
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${resolved}`);
      }
      if (roots.includes(resolved)) {
        throw new Error(`Root already configured: ${resolved}`);
      }
      roots.push(resolved);
    },

    removeRoot(rootPath) {
      const resolved = path.resolve(rootPath);
      const idx = roots.indexOf(resolved);
      if (idx !== -1) {
        roots.splice(idx, 1);
      }
      delete lastScans[resolved];
    },

    isConfigured() {
      return roots.length > 0;
    },

    load() {
      return { version: 1, roots, scanDepth: 5, lastScans };
    },

    getLastScan(rootPath) {
      const resolved = path.resolve(rootPath);
      return lastScans[resolved] || null;
    },

    setLastScan(rootPath, timestamp) {
      const resolved = path.resolve(rootPath);
      lastScans[resolved] = timestamp;
    },

    setScanDepth() {},
  };
}

/**
 * Helper: create mock ProjectScanner with controllable results
 */
function createMockProjectScanner(projects = []) {
  let _projects = [...projects];
  let _scanCallCount = 0;

  return {
    _projects,
    _scanCallCount: () => _scanCallCount,

    setProjects(newProjects) {
      _projects = [...newProjects];
    },

    scan(roots, options = {}) {
      _scanCallCount++;
      return [..._projects];
    },
  };
}

/**
 * Helper: create mock Express req/res for testing route handlers
 */
function createMockReqRes(method, url, body = {}, params = {}, query = {}) {
  const req = { method, url, body, params, query };
  const res = {
    statusCode: 200,
    _json: null,
    _sent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this._json = data;
      this._sent = true;
      return this;
    },
  };
  return { req, res };
}

/**
 * Helper: extract a route handler from an Express router
 * Walks the router stack to find a handler matching method + path pattern
 */
function getHandler(router, method, routePath) {
  for (const layer of router.stack) {
    if (layer.route) {
      const routeMethod = Object.keys(layer.route.methods)[0];
      if (routeMethod === method.toLowerCase() && layer.route.path === routePath) {
        // Return the last handler in the chain (skip any middleware)
        const handlers = layer.route.stack.map((s) => s.handle);
        return handlers[handlers.length - 1];
      }
    }
  }
  return null;
}

describe('Workspace API', () => {
  let tempDir;
  let tempDir2;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-api-test-'));
    tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-api-test2-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(tempDir2, { recursive: true, force: true });
  });

  // =========================================================================
  // Test 1: GET /config returns empty roots when not configured
  // =========================================================================
  it('GET /config returns empty roots when not configured', async () => {
    const mockConfig = createMockGlobalConfig();
    const mockScanner = createMockProjectScanner();
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'GET', '/config');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes('GET', '/config');
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json).toBeDefined();
    expect(res._json.roots).toEqual([]);
  });

  // =========================================================================
  // Test 2: POST /config with valid root persists config
  // =========================================================================
  it('POST /config with valid root persists config', async () => {
    const mockConfig = createMockGlobalConfig();
    const mockScanner = createMockProjectScanner();
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'POST', '/config');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes('POST', '/config', {
      roots: [tempDir],
    });
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.roots).toContain(tempDir);
    expect(mockConfig.getRoots()).toContain(tempDir);
  });

  // =========================================================================
  // Test 3: POST /config with invalid path returns 400
  // =========================================================================
  it('POST /config with invalid path returns 400', async () => {
    const mockConfig = createMockGlobalConfig();
    const mockScanner = createMockProjectScanner();
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'POST', '/config');
    const { req, res } = createMockReqRes('POST', '/config', {
      roots: ['/tmp/nonexistent-path-xyz-999'],
    });
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res._json.error).toBeDefined();
  });

  // =========================================================================
  // Test 4: DELETE /roots/:index removes first root
  // =========================================================================
  it('DELETE /roots/:index removes first root', async () => {
    const mockConfig = createMockGlobalConfig([tempDir, tempDir2]);
    const mockScanner = createMockProjectScanner();
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'DELETE', '/roots/:index');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes('DELETE', '/roots/0', {}, { index: '0' });
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockConfig.getRoots()).not.toContain(tempDir);
    expect(mockConfig.getRoots()).toContain(tempDir2);
  });

  // =========================================================================
  // Test 5: POST /scan triggers scan and returns projects
  // =========================================================================
  it('POST /scan triggers scan and returns projects', async () => {
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockProjects = [
      { name: 'project-a', path: path.join(tempDir, 'project-a'), hasTlc: true },
      { name: 'project-b', path: path.join(tempDir, 'project-b'), hasTlc: false },
    ];
    const mockScanner = createMockProjectScanner(mockProjects);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'POST', '/scan');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes('POST', '/scan');
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.projects).toHaveLength(2);
    expect(res._json.projects[0].name).toBe('project-a');
  });

  // =========================================================================
  // Test 6: GET /projects returns all discovered projects
  // =========================================================================
  it('GET /projects returns all discovered projects', async () => {
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockProjects = [
      { name: 'alpha', path: path.join(tempDir, 'alpha'), hasTlc: true },
      { name: 'bravo', path: path.join(tempDir, 'bravo'), hasTlc: true },
    ];
    const mockScanner = createMockProjectScanner(mockProjects);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'GET', '/projects');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes('GET', '/projects');
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.projects).toHaveLength(2);
  });

  // =========================================================================
  // Test 7: GET /projects returns empty array when no roots configured
  // =========================================================================
  it('GET /projects returns empty array when no roots configured', async () => {
    const mockConfig = createMockGlobalConfig();
    const mockScanner = createMockProjectScanner();
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'GET', '/projects');
    const { req, res } = createMockReqRes('GET', '/projects');
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.projects).toEqual([]);
  });

  // =========================================================================
  // Test 8: GET /projects/:id returns project detail
  // =========================================================================
  it('GET /projects/:id returns project detail', async () => {
    const projectPath = path.join(tempDir, 'my-project');
    const projectId = Buffer.from(projectPath).toString('base64url');
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockProjects = [
      {
        name: 'my-project',
        path: projectPath,
        hasTlc: true,
        hasPlanning: true,
        version: '2.0.0',
        phase: 3,
        phaseName: 'API',
        totalPhases: 5,
        completedPhases: 2,
      },
    ];
    const mockScanner = createMockProjectScanner(mockProjects);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'GET', '/projects/:projectId');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes(
      'GET',
      `/projects/${projectId}`,
      {},
      { projectId }
    );
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.project).toBeDefined();
    expect(res._json.project.name).toBe('my-project');
    expect(res._json.project.path).toBe(projectPath);
  });

  // =========================================================================
  // Test 9: GET /projects/:id returns 404 for unknown project
  // =========================================================================
  it('GET /projects/:id returns 404 for unknown project', async () => {
    const unknownPath = '/tmp/nonexistent-project-xyz';
    const projectId = Buffer.from(unknownPath).toString('base64url');
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockScanner = createMockProjectScanner([]);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'GET', '/projects/:projectId');
    const { req, res } = createMockReqRes(
      'GET',
      `/projects/${projectId}`,
      {},
      { projectId }
    );
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res._json.error).toBeDefined();
  });

  // =========================================================================
  // Test 10: GET /projects/:id/status returns project status
  // =========================================================================
  it('GET /projects/:id/status returns project status', async () => {
    // Create a real project directory with .planning and ROADMAP.md
    const projectPath = path.join(tempDir, 'status-project');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, '.planning', 'phases'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, '.planning', 'ROADMAP.md'),
      '### Phase 1: Core [x]\n### Phase 2: API [>]\n### Phase 3: UI [ ]\n'
    );
    fs.writeFileSync(
      path.join(projectPath, '.tlc.json'),
      JSON.stringify({ name: 'status-project' })
    );

    const projectId = Buffer.from(projectPath).toString('base64url');
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockProjects = [
      { name: 'status-project', path: projectPath, hasTlc: true, hasPlanning: true },
    ];
    const mockScanner = createMockProjectScanner(mockProjects);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'GET', '/projects/:projectId/status');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes(
      'GET',
      `/projects/${projectId}/status`,
      {},
      { projectId }
    );
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.status).toBeDefined();
  });

  // =========================================================================
  // Test 11: GET /projects/:id/tasks returns project tasks
  // =========================================================================
  it('GET /projects/:id/tasks returns project tasks', async () => {
    // Create a project with a plan file containing tasks
    const projectPath = path.join(tempDir, 'tasks-project');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, '.planning', 'phases'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, '.planning', 'ROADMAP.md'),
      '### Phase 1: Core [>]\n'
    );
    fs.writeFileSync(
      path.join(projectPath, '.planning', 'phases', '1-PLAN.md'),
      '# Phase 1\n\n- [x] Task one\n- [ ] Task two\n- [>@dev] Task three\n'
    );

    const projectId = Buffer.from(projectPath).toString('base64url');
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockProjects = [
      { name: 'tasks-project', path: projectPath, hasTlc: true, hasPlanning: true, phase: 1 },
    ];
    const mockScanner = createMockProjectScanner(mockProjects);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'GET', '/projects/:projectId/tasks');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes(
      'GET',
      `/projects/${projectId}/tasks`,
      {},
      { projectId }
    );
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.tasks).toBeDefined();
    expect(Array.isArray(res._json.tasks)).toBe(true);
  });

  // =========================================================================
  // Test 12: GET /projects/:id/bugs returns project bugs
  // =========================================================================
  it('GET /projects/:id/bugs returns project bugs', async () => {
    // Create a project with a BUGS.md file
    const projectPath = path.join(tempDir, 'bugs-project');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, '.planning', 'BUGS.md'),
      '# Bug Tracker\n\n## Open Bugs\n\n### BUG-001: Something broken [open]\n\n- **Reported:** 2025-01-01\n- **Severity:** high\n\nBug description here\n\n---\n'
    );

    const projectId = Buffer.from(projectPath).toString('base64url');
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockProjects = [
      { name: 'bugs-project', path: projectPath, hasTlc: true, hasPlanning: true },
    ];
    const mockScanner = createMockProjectScanner(mockProjects);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'GET', '/projects/:projectId/bugs');
    expect(handler).not.toBeNull();

    const { req, res } = createMockReqRes(
      'GET',
      `/projects/${projectId}/bugs`,
      {},
      { projectId }
    );
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._json.bugs).toBeDefined();
    expect(Array.isArray(res._json.bugs)).toBe(true);
  });

  // =========================================================================
  // Test 13: Project ID encoding/decoding is URL-safe (base64url)
  // =========================================================================
  it('Project ID encoding/decoding is URL-safe (base64url)', () => {
    // Paths with special characters that would break standard base64
    const testPaths = [
      '/Users/dev/Documents/my project/src',
      '/home/user/repos/project+plus',
      '/opt/data/path with spaces/and=equals',
      '/var/www/project/build/output',
    ];

    for (const testPath of testPaths) {
      const encoded = Buffer.from(testPath).toString('base64url');
      const decoded = Buffer.from(encoded, 'base64url').toString();

      // Verify round-trip
      expect(decoded).toBe(testPath);

      // Verify URL-safe: no +, /, or = characters
      expect(encoded).not.toMatch(/[+/=]/);
    }
  });

  // =========================================================================
  // Test 14: POST /config validates all paths before adding
  // =========================================================================
  it('POST /config validates all paths before adding', async () => {
    const mockConfig = createMockGlobalConfig();
    const mockScanner = createMockProjectScanner();
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'POST', '/config');

    // One valid path and one invalid — should reject all (atomic)
    const { req, res } = createMockReqRes('POST', '/config', {
      roots: [tempDir, '/tmp/nonexistent-path-xyz-999'],
    });
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    // No roots should have been added (atomic validation)
    expect(mockConfig.getRoots()).toEqual([]);
  });

  // =========================================================================
  // Test 15: POST /scan with force option bypasses cache
  // =========================================================================
  it('POST /scan with force option bypasses cache', async () => {
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockProjects = [{ name: 'cached-project', path: tempDir, hasTlc: true }];
    const mockScanner = createMockProjectScanner(mockProjects);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const handler = getHandler(router, 'POST', '/scan');

    // First scan (normal)
    const { req: req1, res: res1 } = createMockReqRes('POST', '/scan');
    await handler(req1, res1);
    const firstCallCount = mockScanner._scanCallCount();

    // Second scan with force
    const { req: req2, res: res2 } = createMockReqRes('POST', '/scan', { force: true });
    await handler(req2, res2);
    const secondCallCount = mockScanner._scanCallCount();

    // Scanner should have been called both times
    expect(secondCallCount).toBe(firstCallCount + 1);
    expect(res2.statusCode).toBe(200);
    expect(res2._json.projects).toHaveLength(1);
  });

  // =========================================================================
  // Test 16: Concurrent requests don't cause race conditions
  // =========================================================================
  it('concurrent requests do not cause race conditions', async () => {
    const mockConfig = createMockGlobalConfig([tempDir]);
    const mockProjects = [{ name: 'project-a', path: tempDir, hasTlc: true }];
    const mockScanner = createMockProjectScanner(mockProjects);
    const router = createWorkspaceRouter({
      globalConfig: mockConfig,
      projectScanner: mockScanner,
    });

    const getProjectsHandler = getHandler(router, 'GET', '/projects');
    const getConfigHandler = getHandler(router, 'GET', '/config');
    const postScanHandler = getHandler(router, 'POST', '/scan');

    // Fire all three concurrently
    const results = await Promise.all([
      (async () => {
        const { req, res } = createMockReqRes('GET', '/projects');
        await getProjectsHandler(req, res);
        return res;
      })(),
      (async () => {
        const { req, res } = createMockReqRes('GET', '/config');
        await getConfigHandler(req, res);
        return res;
      })(),
      (async () => {
        const { req, res } = createMockReqRes('POST', '/scan');
        await postScanHandler(req, res);
        return res;
      })(),
    ]);

    // All should succeed without errors
    for (const res of results) {
      expect(res.statusCode).toBe(200);
      expect(res._json).toBeDefined();
    }
  });

  // =========================================================================
  // GET /groups - Workspace grouping endpoint
  // =========================================================================

  describe('GET /groups', () => {
    it('groups projects by parent directory', async () => {
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'alpha', path: `${tempDir}/workspace-a/alpha`, hasTlc: true, hasPlanning: true },
        { name: 'beta', path: `${tempDir}/workspace-a/beta`, hasTlc: false, hasPlanning: false },
        { name: 'gamma', path: `${tempDir}/workspace-b/gamma`, hasTlc: true, hasPlanning: true },
      ]);

      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });
      const handler = getHandler(router, 'GET', '/groups');
      expect(handler).not.toBeNull();

      const { req, res } = createMockReqRes('GET', '/groups');
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.groups).toHaveLength(2);

      const groupA = res._json.groups.find((g) => g.name === 'workspace-a');
      const groupB = res._json.groups.find((g) => g.name === 'workspace-b');

      expect(groupA).toBeDefined();
      expect(groupA.repos).toHaveLength(2);
      expect(groupA.repoCount).toBe(2);

      expect(groupB).toBeDefined();
      expect(groupB.repos).toHaveLength(1);
      expect(groupB.repoCount).toBe(1);
    });

    it('includes hasTlc flag and repo count per group', async () => {
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'svc-a', path: `${tempDir}/platform/svc-a`, hasTlc: true, hasPlanning: true },
        { name: 'svc-b', path: `${tempDir}/platform/svc-b`, hasTlc: false, hasPlanning: false },
      ]);

      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });
      const handler = getHandler(router, 'GET', '/groups');
      const { req, res } = createMockReqRes('GET', '/groups');
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const group = res._json.groups[0];
      expect(group.name).toBe('platform');
      expect(group.hasTlc).toBe(true); // at least one repo has TLC
      expect(group.repoCount).toBe(2);
    });

    it('treats standalone projects as their own group using parent dir name', async () => {
      const mockConfig = createMockGlobalConfig([tempDir]);
      // Single project directly under root - groups by parent directory name
      const mockScanner = createMockProjectScanner([
        { name: 'standalone', path: `${tempDir}/standalone`, hasTlc: true, hasPlanning: true },
      ]);

      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });
      const handler = getHandler(router, 'GET', '/groups');
      const { req, res } = createMockReqRes('GET', '/groups');
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.groups).toHaveLength(1);
      // Parent dir is tempDir itself, so group name is tempDir's basename
      expect(res._json.groups[0].repoCount).toBe(1);
      expect(res._json.groups[0].repos[0].name).toBe('standalone');
    });

    it('returns empty groups when no projects', async () => {
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([]);

      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });
      const handler = getHandler(router, 'GET', '/groups');
      const { req, res } = createMockReqRes('GET', '/groups');
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.groups).toHaveLength(0);
    });

    it('sorts groups by repo count descending', async () => {
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'a', path: `${tempDir}/small/a`, hasTlc: false },
        { name: 'x', path: `${tempDir}/large/x`, hasTlc: true },
        { name: 'y', path: `${tempDir}/large/y`, hasTlc: true },
        { name: 'z', path: `${tempDir}/large/z`, hasTlc: false },
      ]);

      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });
      const handler = getHandler(router, 'GET', '/groups');
      const { req, res } = createMockReqRes('GET', '/groups');
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.groups[0].name).toBe('large');
      expect(res._json.groups[1].name).toBe('small');
    });

    it('includes current phase info in repos', async () => {
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'myapp', path: `${tempDir}/ws/myapp`, hasTlc: true, hasPlanning: true, phase: 5, phaseName: 'Auth', totalPhases: 10, completedPhases: 4 },
      ]);

      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });
      const handler = getHandler(router, 'GET', '/groups');
      const { req, res } = createMockReqRes('GET', '/groups');
      await handler(req, res);

      const repo = res._json.groups[0].repos[0];
      expect(repo.id).toBeDefined();
      expect(repo.name).toBe('myapp');
      expect(repo.phase).toBe(5);
      expect(repo.phaseName).toBe('Auth');
    });
  });

  // =========================================================================
  // Memory API routes (Task 1 - Phase 77)
  // =========================================================================

  describe('Memory API routes', () => {
    function createRouterWithMemory(projectPath, memoryApi) {
      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([path.dirname(projectPath)]);
      const mockScanner = createMockProjectScanner([
        { name: 'mem-project', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi,
      });
      return { router, projectId };
    }

    it('GET /projects/:id/memory/decisions returns decisions from file adapter', async () => {
      const projectPath = path.join(tempDir, 'mem-proj');
      fs.mkdirSync(projectPath, { recursive: true });
      const mockMemoryApi = {};
      const { router, projectId } = createRouterWithMemory(projectPath, mockMemoryApi);

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/decisions');
      expect(handler).not.toBeNull();

      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/memory/decisions`, {}, { projectId });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.decisions).toBeDefined();
      expect(Array.isArray(res._json.decisions)).toBe(true);
    });

    it('GET /projects/:id/memory/gotchas returns gotchas from file adapter', async () => {
      const projectPath = path.join(tempDir, 'mem-proj2');
      fs.mkdirSync(projectPath, { recursive: true });
      const mockMemoryApi = {};
      const { router, projectId } = createRouterWithMemory(projectPath, mockMemoryApi);

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/gotchas');
      expect(handler).not.toBeNull();

      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/memory/gotchas`, {}, { projectId });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.gotchas).toBeDefined();
      expect(Array.isArray(res._json.gotchas)).toBe(true);
    });

    it('GET /projects/:id/memory/stats returns per-project stats', async () => {
      const projectPath = path.join(tempDir, 'mem-proj3');
      fs.mkdirSync(projectPath, { recursive: true });
      const mockMemoryApi = {};
      const { router, projectId } = createRouterWithMemory(projectPath, mockMemoryApi);

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/stats');
      expect(handler).not.toBeNull();

      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/memory/stats`, {}, { projectId });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json).toHaveProperty('decisions');
      expect(res._json).toHaveProperty('gotchas');
      expect(res._json).toHaveProperty('total');
    });

    it('memory routes return 404 for unknown project', async () => {
      const mockMemoryApi = {};
      const unknownId = Buffer.from('/tmp/nonexistent').toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([]);
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: mockMemoryApi,
      });

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/decisions');
      const { req, res } = createMockReqRes('GET', `/projects/${unknownId}/memory/decisions`, {}, { projectId: unknownId });
      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // Project file endpoint (Task 1 - Phase 77)
  // =========================================================================

  describe('Project file endpoint', () => {
    it('GET /projects/:id/files/:filename returns .planning file content', async () => {
      const projectPath = path.join(tempDir, 'file-proj');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.planning', 'ROADMAP.md'), '# Roadmap\n\nPhase 1');

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'file-proj', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });

      const handler = getHandler(router, 'GET', '/projects/:projectId/files/:filename');
      expect(handler).not.toBeNull();

      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/files/ROADMAP.md`, {}, { projectId, filename: 'ROADMAP.md' });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.content).toBe('# Roadmap\n\nPhase 1');
      expect(res._json.filename).toBe('ROADMAP.md');
    });

    it('file endpoint returns 404 for missing file', async () => {
      const projectPath = path.join(tempDir, 'file-proj2');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'file-proj2', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });

      const handler = getHandler(router, 'GET', '/projects/:projectId/files/:filename');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/files/NONEXISTENT.md`, {}, { projectId, filename: 'NONEXISTENT.md' });
      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('file endpoint rejects path traversal', async () => {
      const projectPath = path.join(tempDir, 'file-proj3');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'file-proj3', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });

      const handler = getHandler(router, 'GET', '/projects/:projectId/files/:filename');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/files/../../../etc/passwd`, {}, { projectId, filename: '../../../etc/passwd' });
      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // Coverage in project status (Task 9 - Phase 77)
  // =========================================================================

  describe('readProjectStatus coverage', () => {
    it('returns coverage from coverage-summary.json when present', async () => {
      const projectPath = path.join(tempDir, 'cov-project');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');
      fs.mkdirSync(path.join(projectPath, 'coverage'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'coverage', 'coverage-summary.json'),
        JSON.stringify({
          total: {
            lines: { pct: 85.5 },
            statements: { pct: 82.3 },
            functions: { pct: 90.1 },
            branches: { pct: 70.2 },
          },
        })
      );

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'cov-project', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });

      const handler = getHandler(router, 'GET', '/projects/:projectId/status');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/status`, {}, { projectId });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.status.coverage).toBe(85.5);
    });

    it('returns null coverage when no coverage-summary.json exists', async () => {
      const projectPath = path.join(tempDir, 'no-cov-project');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'no-cov-project', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });

      const handler = getHandler(router, 'GET', '/projects/:projectId/status');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/status`, {}, { projectId });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.status.coverage).toBeNull();
    });

    it('returns null coverage when coverage-summary.json is malformed', async () => {
      const projectPath = path.join(tempDir, 'bad-cov-project');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');
      fs.mkdirSync(path.join(projectPath, 'coverage'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'coverage', 'coverage-summary.json'),
        'not json'
      );

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'bad-cov-project', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({ globalConfig: mockConfig, projectScanner: mockScanner });

      const handler = getHandler(router, 'GET', '/projects/:projectId/status');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/status`, {}, { projectId });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.status.coverage).toBeNull();
    });
  });

  // =========================================================================
  // Phase 79 — Task 5: Memory capture endpoint
  // =========================================================================
  describe('POST /projects/:projectId/memory/capture', () => {
    it('returns 404 for unknown project', async () => {
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([]);
      const mockMemoryApi = {};
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: mockMemoryApi,
        memoryDeps: {},
      });

      const handler = getHandler(router, 'POST', '/projects/:projectId/memory/capture');
      expect(handler).not.toBeNull();

      const fakeId = Buffer.from('/nonexistent').toString('base64url');
      const { req, res } = createMockReqRes('POST', `/projects/${fakeId}/memory/capture`, { exchanges: [{ role: 'user', content: 'hello' }] }, { projectId: fakeId });
      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 for missing exchanges body', async () => {
      const projectPath = path.join(tempDir, 'capture-project');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'capture-project', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: {},
        memoryDeps: {},
      });

      const handler = getHandler(router, 'POST', '/projects/:projectId/memory/capture');
      const { req, res } = createMockReqRes('POST', `/projects/${projectId}/memory/capture`, {}, { projectId });
      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('accepts exchanges and returns captured count', async () => {
      const projectPath = path.join(tempDir, 'capture-ok');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'capture-ok', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);

      const observerCalls = [];
      const mockMemoryDeps = {
        observeAndRemember: async (root, exchange) => { observerCalls.push({ root, exchange }); },
        vectorIndexer: null,
      };
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: {},
        memoryDeps: mockMemoryDeps,
      });

      const handler = getHandler(router, 'POST', '/projects/:projectId/memory/capture');
      const exchanges = [
        { role: 'user', content: 'what is TLC?' },
        { role: 'assistant', content: 'TLC is...' },
      ];
      const { req, res } = createMockReqRes('POST', `/projects/${projectId}/memory/capture`, { exchanges }, { projectId });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.captured).toBe(2);
    });
  });

  // =========================================================================
  // Phase 79 — Task 6: Memory search endpoint
  // =========================================================================
  describe('GET /projects/:projectId/memory/search', () => {
    it('returns 404 for unknown project', async () => {
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([]);
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: {},
        memoryDeps: {},
      });

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/search');
      expect(handler).not.toBeNull();

      const fakeId = Buffer.from('/nonexistent').toString('base64url');
      const { req, res } = createMockReqRes('GET', `/projects/${fakeId}/memory/search`, {}, { projectId: fakeId }, { q: 'test' });
      await handler(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 for missing query parameter', async () => {
      const projectPath = path.join(tempDir, 'search-project');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'search-project', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: {},
        memoryDeps: {},
      });

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/search');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/memory/search`, {}, { projectId }, {});
      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('returns search results with source indicator using semantic recall', async () => {
      const projectPath = path.join(tempDir, 'search-ok');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'search-ok', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);

      const mockMemoryDeps = {
        semanticRecall: {
          recall: async (query) => [{ text: 'remembered item', score: 0.92, type: 'decision' }],
        },
      };
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: {},
        memoryDeps: mockMemoryDeps,
      });

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/search');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/memory/search`, {}, { projectId }, { q: 'remembered' });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.results).toBeInstanceOf(Array);
      expect(res._json.source).toBe('vector');
    });

    it('falls back to file-based search when semantic recall unavailable', async () => {
      const projectPath = path.join(tempDir, 'search-fallback');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });
      // Create a memory file for file-based search to find
      fs.mkdirSync(path.join(projectPath, '.planning', 'memory'), { recursive: true });

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'search-fallback', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);

      // No semanticRecall provided — should fall back to file-based
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: {},
        memoryDeps: {},
      });

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/search');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/memory/search`, {}, { projectId }, { q: 'something' });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.results).toBeInstanceOf(Array);
      expect(res._json.source).toBe('file');
    });

    it('returns empty results when no matches found', async () => {
      const projectPath = path.join(tempDir, 'search-empty');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.tlc.json'), '{}');
      fs.mkdirSync(path.join(projectPath, '.planning'), { recursive: true });

      const projectId = Buffer.from(projectPath).toString('base64url');
      const mockConfig = createMockGlobalConfig([tempDir]);
      const mockScanner = createMockProjectScanner([
        { name: 'search-empty', path: projectPath, hasTlc: true, hasPlanning: true },
      ]);

      const mockMemoryDeps = {
        semanticRecall: {
          recall: async () => [],
        },
      };
      const router = createWorkspaceRouter({
        globalConfig: mockConfig,
        projectScanner: mockScanner,
        memoryApi: {},
        memoryDeps: mockMemoryDeps,
      });

      const handler = getHandler(router, 'GET', '/projects/:projectId/memory/search');
      const { req, res } = createMockReqRes('GET', `/projects/${projectId}/memory/search`, {}, { projectId }, { q: 'nonexistent' });
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.results).toEqual([]);
    });
  });
});
