/**
 * @file roadmap-api.test.js
 * @description Tests for the Roadmap & Test Suite API endpoint handlers (Phase 75, Task 3).
 *
 * Tests the factory function `createRoadmapApi(deps)` which accepts injected
 * dependencies (projectStatus, testInventory, findProject) and returns handler
 * functions for roadmap and test-suite HTTP endpoints.
 *
 * All handlers accept Express-compatible (req, res) objects and are async.
 * Tests mock the dependencies and req/res objects directly — no Express
 * routing is tested here.
 */
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { createRoadmapApi } from './roadmap-api.js';

/**
 * Creates a mock Express request object.
 * @param {object} overrides - Properties to merge into the base request
 * @returns {{ query: object, params: object, body: object }}
 */
function createMockReq(overrides = {}) {
  return { query: {}, params: {}, body: {}, ...overrides };
}

/**
 * Creates a mock Express response object with spy methods.
 * Provides helper accessors `_getJson()` and `_getStatus()` to inspect
 * the first call to `res.json()` and `res.status()` respectively.
 * @returns {object} Mock response with status/json spies
 */
function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    _getJson() { return res.json.mock.calls[0]?.[0]; },
    _getStatus() { return res.status.mock.calls[0]?.[0]; },
  };
  return res;
}

/**
 * Creates a full set of mock dependencies for createRoadmapApi.
 * Each dependency method is a vi.fn() returning sensible defaults.
 * @returns {object} Mock deps: projectStatus, testInventory, findProject
 */
function createMockDeps() {
  return {
    projectStatus: {
      getFullStatus: vi.fn().mockReturnValue({
        milestones: [],
        totalPhases: 0,
        completedPhases: 0,
        testSummary: { totalFiles: 0, totalTests: 0 },
        recentCommits: [],
        projectInfo: {},
      }),
    },
    testInventory: {
      getTestInventory: vi.fn().mockReturnValue({
        totalFiles: 0,
        totalTests: 0,
        groups: [],
      }),
      getLastTestRun: vi.fn().mockReturnValue(null),
    },
    findProject: vi.fn().mockReturnValue({
      path: '/projects/my-app',
      name: 'my-app',
    }),
  };
}

describe('roadmap-api', () => {
  let api;
  let deps;

  beforeEach(() => {
    deps = createMockDeps();
    api = createRoadmapApi(deps);
  });

  describe('handleGetRoadmap', () => {
    it('roadmap endpoint returns milestones with phases', async () => {
      const mockStatus = {
        milestones: [
          {
            name: 'Foundation',
            phases: [
              { number: 1, name: 'Core Infrastructure', status: 'done', taskCount: 5, completedTaskCount: 5 },
              { number: 2, name: 'API Design', status: 'in_progress', taskCount: 4, completedTaskCount: 2 },
            ],
          },
        ],
        totalPhases: 2,
        completedPhases: 1,
        testSummary: { totalFiles: 3, totalTests: 42 },
        recentCommits: [],
        projectInfo: { name: 'my-app', version: '1.0.0' },
      };
      deps.projectStatus.getFullStatus.mockReturnValue(mockStatus);

      const req = createMockReq({ params: { projectId: 'proj-1' } });
      const res = createMockRes();

      await api.handleGetRoadmap(req, res);

      expect(deps.findProject).toHaveBeenCalledWith('proj-1');
      expect(deps.projectStatus.getFullStatus).toHaveBeenCalledWith('/projects/my-app');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          milestones: mockStatus.milestones,
          totalPhases: 2,
          completedPhases: 1,
        })
      );
    });

    it('roadmap response uses cache within TTL', async () => {
      const mockStatus = {
        milestones: [{ name: 'M1', phases: [] }],
        totalPhases: 1,
        completedPhases: 0,
        testSummary: { totalFiles: 0, totalTests: 0 },
        recentCommits: [],
        projectInfo: {},
      };
      deps.projectStatus.getFullStatus.mockReturnValue(mockStatus);

      const req1 = createMockReq({ params: { projectId: 'proj-1' } });
      const res1 = createMockRes();
      await api.handleGetRoadmap(req1, res1);

      const req2 = createMockReq({ params: { projectId: 'proj-1' } });
      const res2 = createMockRes();
      await api.handleGetRoadmap(req2, res2);

      // getFullStatus should only be called once due to caching
      expect(deps.projectStatus.getFullStatus).toHaveBeenCalledTimes(1);
      // Both responses should return the same data
      expect(res1._getJson()).toEqual(res2._getJson());
    });

    it('project without roadmap returns empty phases', async () => {
      deps.projectStatus.getFullStatus.mockReturnValue({
        milestones: [],
        totalPhases: 0,
        completedPhases: 0,
        testSummary: { totalFiles: 0, totalTests: 0 },
        recentCommits: [],
        projectInfo: { name: 'empty-project' },
      });

      const req = createMockReq({ params: { projectId: 'proj-empty' } });
      const res = createMockRes();

      await api.handleGetRoadmap(req, res);

      const body = res._getJson();
      expect(body.milestones).toEqual([]);
      expect(body.totalPhases).toBe(0);
      expect(body.completedPhases).toBe(0);
    });
  });

  describe('handleGetTestInventory', () => {
    it('test inventory endpoint returns grouped files', async () => {
      const mockInventory = {
        totalFiles: 5,
        totalTests: 47,
        groups: [
          { name: 'server/lib', fileCount: 3, testCount: 30, files: [] },
          { name: 'utils', fileCount: 2, testCount: 17, files: [] },
        ],
      };
      deps.testInventory.getTestInventory.mockReturnValue(mockInventory);

      const req = createMockReq({ params: { projectId: 'proj-1' } });
      const res = createMockRes();

      await api.handleGetTestInventory(req, res);

      expect(deps.findProject).toHaveBeenCalledWith('proj-1');
      expect(deps.testInventory.getTestInventory).toHaveBeenCalledWith('/projects/my-app');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalFiles: 5,
          totalTests: 47,
          groups: mockInventory.groups,
        })
      );
    });

    it('test inventory includes last run data', async () => {
      const mockInventory = {
        totalFiles: 3,
        totalTests: 20,
        groups: [{ name: 'server/lib', fileCount: 3, testCount: 20, files: [] }],
      };
      const mockLastRun = {
        timestamp: '2026-02-14T10:30:00Z',
        passed: 18,
        failed: 2,
        duration: 4500,
      };
      deps.testInventory.getTestInventory.mockReturnValue(mockInventory);
      deps.testInventory.getLastTestRun.mockReturnValue(mockLastRun);

      const req = createMockReq({ params: { projectId: 'proj-1' } });
      const res = createMockRes();

      await api.handleGetTestInventory(req, res);

      expect(deps.testInventory.getTestInventory).toHaveBeenCalledWith('/projects/my-app');
      expect(deps.testInventory.getLastTestRun).toHaveBeenCalledWith('/projects/my-app');
      const body = res._getJson();
      expect(body.lastRun).toEqual(mockLastRun);
      expect(body.totalFiles).toBe(3);
      expect(body.totalTests).toBe(20);
    });
  });

  describe('handleGetAllTasks', () => {
    it('all-phases task query returns tasks from multiple phases', async () => {
      deps.projectStatus.getFullStatus.mockReturnValue({
        milestones: [
          {
            name: 'Foundation',
            phases: [
              {
                number: 1,
                name: 'Core',
                status: 'done',
                taskCount: 2,
                completedTaskCount: 2,
                deliverables: [
                  { text: 'Setup project', done: true },
                  { text: 'Add CI', done: true },
                ],
              },
              {
                number: 2,
                name: 'API',
                status: 'in_progress',
                taskCount: 3,
                completedTaskCount: 1,
                deliverables: [
                  { text: 'Design endpoints', done: true },
                  { text: 'Implement handlers', done: false },
                  { text: 'Add auth', done: false },
                ],
              },
            ],
          },
        ],
        totalPhases: 2,
        completedPhases: 1,
        testSummary: { totalFiles: 0, totalTests: 0 },
        recentCommits: [],
        projectInfo: {},
      });

      const req = createMockReq({ params: { projectId: 'proj-1' } });
      const res = createMockRes();

      await api.handleGetAllTasks(req, res);

      const body = res._getJson();
      expect(body.tasks).toHaveLength(5);
      // Tasks should include phase context
      expect(body.tasks[0]).toEqual(
        expect.objectContaining({
          phase: 1,
          phaseName: 'Core',
          text: 'Setup project',
          done: true,
        })
      );
      expect(body.tasks[3]).toEqual(
        expect.objectContaining({
          phase: 2,
          phaseName: 'API',
          text: 'Implement handlers',
          done: false,
        })
      );
    });
  });

  describe('handleRunTests', () => {
    it('test run endpoint triggers execution', async () => {
      const req = createMockReq({ params: { projectId: 'proj-1' } });
      const res = createMockRes();

      await api.handleRunTests(req, res);

      expect(deps.findProject).toHaveBeenCalledWith('proj-1');
      const body = res._getJson();
      expect(body.started).toBe(true);
      expect(body.message).toEqual(expect.any(String));
    });
  });

  describe('error handling', () => {
    it('unknown project ID returns 404', async () => {
      deps.findProject.mockReturnValue(null);

      const req = createMockReq({ params: { projectId: 'nonexistent' } });
      const res = createMockRes();

      await api.handleGetRoadmap(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});
