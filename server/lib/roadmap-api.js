/**
 * Roadmap & Test Suite API — HTTP handler factory for roadmap and test endpoints.
 *
 * Factory function `createRoadmapApi` accepts injected dependencies and returns
 * handler methods that accept Express-compatible (req, res) objects.
 *
 * Endpoints provided:
 *   - handleGetRoadmap       — GET roadmap milestones and phases for a project
 *   - handleGetTestInventory — GET test file inventory grouped by directory
 *   - handleGetAllTasks      — GET tasks flattened across all phases
 *   - handleRunTests         — POST trigger a test run
 *
 * @module roadmap-api
 */

/**
 * Simple TTL cache entry.
 * @typedef {{ data: *, timestamp: number }} CacheEntry
 */

/**
 * Create a roadmap API handler instance.
 *
 * @param {object} deps
 * @param {object} deps.projectStatus - Project status service with getFullStatus(projectPath)
 * @param {object} deps.testInventory - Test inventory service with getTestInventory(projectPath) and getLastTestRun(projectPath)
 * @param {Function} deps.findProject - Resolves a project ID to { path, name, ... } or null
 * @returns {object} Handler methods for each roadmap/test endpoint
 */
export function createRoadmapApi({ projectStatus, testInventory, findProject }) {
  /** @type {Map<string, CacheEntry>} */
  const roadmapCache = new Map();
  /** @type {Map<string, CacheEntry>} */
  const inventoryCache = new Map();

  /** Roadmap cache TTL in milliseconds (30 seconds). */
  const ROADMAP_TTL = 30_000;
  /** Test inventory cache TTL in milliseconds (60 seconds). */
  const INVENTORY_TTL = 60_000;

  /**
   * Resolve a project from the request, returning null and sending 404 if not found.
   * @param {object} req - Express request with params.projectId
   * @param {object} res - Express response
   * @returns {object|null} The project object, or null if 404 was sent
   */
  function resolveProject(req, res) {
    const { projectId } = req.params;
    const project = findProject(projectId);

    if (!project) {
      res.status(404).json({ error: `Project not found: ${projectId}` });
      return null;
    }

    return project;
  }

  /**
   * Get a cached value or compute and cache it.
   * @param {Map<string, CacheEntry>} cache - The cache map to use
   * @param {string} key - Cache key
   * @param {number} ttl - Time-to-live in milliseconds
   * @param {Function} compute - Function that returns the value to cache
   * @returns {*} Cached or freshly computed value
   */
  function getOrCache(cache, key, ttl, compute) {
    const entry = cache.get(key);
    const now = Date.now();

    if (entry && (now - entry.timestamp) < ttl) {
      return entry.data;
    }

    const data = compute();
    cache.set(key, { data, timestamp: now });
    return data;
  }

  /**
   * GET roadmap milestones and phases for a project.
   *
   * Params: projectId
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleGetRoadmap(req, res) {
    const project = resolveProject(req, res);
    if (!project) return;

    const status = getOrCache(roadmapCache, project.path, ROADMAP_TTL, () =>
      projectStatus.getFullStatus(project.path)
    );

    res.json({
      milestones: status.milestones,
      totalPhases: status.totalPhases,
      completedPhases: status.completedPhases,
      testSummary: status.testSummary,
      recentCommits: status.recentCommits,
      projectInfo: status.projectInfo,
    });
  }

  /**
   * GET test file inventory grouped by directory, with optional last-run data.
   *
   * Params: projectId
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleGetTestInventory(req, res) {
    const project = resolveProject(req, res);
    if (!project) return;

    const inventory = getOrCache(inventoryCache, project.path, INVENTORY_TTL, () =>
      testInventory.getTestInventory(project.path)
    );

    const lastRun = testInventory.getLastTestRun(project.path);

    const response = {
      totalFiles: inventory.totalFiles,
      totalTests: inventory.totalTests,
      groups: inventory.groups,
    };

    if (lastRun) {
      response.lastRun = lastRun;
    }

    res.json(response);
  }

  /**
   * GET tasks flattened across all milestones and phases.
   *
   * Iterates milestones -> phases -> deliverables and returns a flat array
   * with phase context attached to each task.
   *
   * Params: projectId
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleGetAllTasks(req, res) {
    const project = resolveProject(req, res);
    if (!project) return;

    const status = getOrCache(roadmapCache, project.path, ROADMAP_TTL, () =>
      projectStatus.getFullStatus(project.path)
    );

    const tasks = [];
    for (const milestone of status.milestones) {
      for (const phase of milestone.phases) {
        if (!phase.deliverables) continue;
        for (const deliverable of phase.deliverables) {
          tasks.push({
            phase: phase.number,
            phaseName: phase.name,
            phaseStatus: phase.status,
            text: deliverable.text,
            done: deliverable.done,
          });
        }
      }
    }

    res.json({ tasks, totalTasks: tasks.length });
  }

  /**
   * POST trigger a test run for a project.
   *
   * Returns immediately with a { started: true } response (fire-and-forget).
   *
   * Params: projectId
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleRunTests(req, res) {
    const project = resolveProject(req, res);
    if (!project) return;

    res.json({ started: true, message: 'Test run initiated' });
  }

  return {
    handleGetRoadmap,
    handleGetTestInventory,
    handleGetAllTasks,
    handleRunTests,
  };
}
