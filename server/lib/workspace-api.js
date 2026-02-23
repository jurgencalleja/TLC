/**
 * Workspace REST API - Express router for workspace configuration and project listing
 *
 * Provides endpoints for managing workspace root directories, scanning for projects,
 * and querying project details (status, tasks, bugs) across the workspace.
 *
 * Uses dependency injection for GlobalConfig and ProjectScanner to enable testability.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createProjectStatus } = require('./project-status');
const { createTestInventory } = require('./test-inventory');
const { createRoadmapApi } = require('./roadmap-api');
const { createPlanWriter } = require('./plan-writer');
const { createBugWriter } = require('./bug-writer');
const { createMemoryStoreAdapter } = require('./memory-store-adapter');
const { createCaptureGuard } = require('./capture-guard');

/**
 * Encode a project path to a URL-safe project ID
 * @param {string} absolutePath - Absolute filesystem path
 * @returns {string} base64url-encoded ID
 */
function encodeProjectId(absolutePath) {
  return Buffer.from(absolutePath).toString('base64url');
}

/**
 * Decode a project ID back to an absolute path
 * @param {string} projectId - base64url-encoded ID
 * @returns {string} Absolute filesystem path
 */
function decodeProjectId(projectId) {
  return Buffer.from(projectId, 'base64url').toString();
}

/**
 * Find a project by its encoded ID from the scanner's cached results
 * @param {object} scanner - ProjectScanner instance
 * @param {string[]} roots - Root paths to scan
 * @param {string} projectId - base64url-encoded project ID
 * @returns {object|null} Project metadata or null
 */
function findProjectById(scanner, roots, projectId) {
  const decodedPath = decodeProjectId(projectId);
  const projects = scanner.scan(roots);
  return projects.find((p) => p.path === decodedPath) || null;
}

/**
 * Read project status from its filesystem (ROADMAP.md, .tlc.json)
 * @param {string} projectPath - Absolute path to the project
 * @returns {object} Status information
 */
function readProjectStatus(projectPath) {
  const status = {
    exists: fs.existsSync(projectPath),
    hasTlc: false,
    hasPlanning: false,
    currentPhase: null,
    phaseName: null,
    totalPhases: 0,
    completedPhases: 0,
    coverage: null,
  };

  if (!status.exists) {
    return status;
  }

  status.hasTlc = fs.existsSync(path.join(projectPath, '.tlc.json'));
  status.hasPlanning = fs.existsSync(path.join(projectPath, '.planning'));

  // Parse ROADMAP.md for phase info
  const roadmapPath = path.join(projectPath, '.planning', 'ROADMAP.md');
  if (fs.existsSync(roadmapPath)) {
    try {
      const content = fs.readFileSync(roadmapPath, 'utf-8');

      // Heading format: ### Phase N: Name [x] / [>] / [ ]
      const headingRegex = /###\s+Phase\s+(\d+)(?:\.\d+)?[:\s]+(.+?)\s*\[([x >])\]\s*$/gm;
      let match;
      let firstIncomplete = null;

      while ((match = headingRegex.exec(content)) !== null) {
        status.totalPhases++;
        const phaseNum = parseInt(match[1], 10);
        const phaseName = match[2].trim();
        const marker = match[3];

        if (marker === 'x') {
          status.completedPhases++;
        } else if (!firstIncomplete) {
          firstIncomplete = { phase: phaseNum, phaseName };
        }
      }

      if (firstIncomplete) {
        status.currentPhase = firstIncomplete.phase;
        status.phaseName = firstIncomplete.phaseName;
      }

      // Fallback: table format | N | [Name](link) | status |
      if (status.totalPhases === 0) {
        const tableRegex = /\|\s*(\d+)\s*\|\s*\[([^\]]+)\][^|]*\|\s*(\w+)\s*\|/g;
        while ((match = tableRegex.exec(content)) !== null) {
          status.totalPhases++;
          const phaseNum = parseInt(match[1], 10);
          const phaseName = match[2].trim();
          const phaseStatus = match[3].trim().toLowerCase();
          const completed =
            phaseStatus === 'complete' || phaseStatus === 'done' || phaseStatus === 'verified';

          if (completed) {
            status.completedPhases++;
          } else if (!firstIncomplete) {
            firstIncomplete = { phase: phaseNum, phaseName };
          }
        }

        if (firstIncomplete) {
          status.currentPhase = firstIncomplete.phase;
          status.phaseName = firstIncomplete.phaseName;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Read coverage from Istanbul coverage-summary.json
  const coveragePath = path.join(projectPath, 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    try {
      const covData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      if (covData.total && covData.total.lines && typeof covData.total.lines.pct === 'number') {
        status.coverage = covData.total.lines.pct;
      }
    } catch {
      // Malformed coverage file — leave as null
    }
  }

  return status;
}

/**
 * Read tasks from a project's current phase PLAN.md
 * @param {string} projectPath - Absolute path to the project
 * @param {number|null} phase - Phase number to read tasks from
 * @returns {object[]} Array of task objects
 */
function readProjectTasks(projectPath, phase) {
  const tasks = [];
  const phasesDir = path.join(projectPath, '.planning', 'phases');

  if (!phase || !fs.existsSync(phasesDir)) {
    return tasks;
  }

  // Try exact match first
  let planPath = path.join(phasesDir, `${phase}-PLAN.md`);

  // Try padded/prefixed match
  if (!fs.existsSync(planPath)) {
    try {
      const padded = phase.toString().padStart(2, '0');
      const files = fs.readdirSync(phasesDir);
      const match = files.find(
        (f) =>
          (f.startsWith(`${padded}-`) || f.startsWith(`${phase}-`)) && f.endsWith('-PLAN.md')
      );
      if (match) {
        planPath = path.join(phasesDir, match);
      }
    } catch {
      return tasks;
    }
  }

  if (!fs.existsSync(planPath)) {
    return tasks;
  }

  try {
    const content = fs.readFileSync(planPath, 'utf-8');
    let match;

    // Primary: ### Task N: Title [status] format (TLC plan headings)
    const taskRegex = /###\s+Task\s+(\d+)[:\s]+(.+?)\s*\[([^\]]*)\]/g;
    while ((match = taskRegex.exec(content)) !== null) {
      const taskNum = parseInt(match[1], 10);
      const title = match[2].trim();
      const statusMarker = match[3];

      let status = 'pending';
      let owner = null;

      if (statusMarker.startsWith('x')) {
        status = 'done';
        const ownerMatch = statusMarker.match(/@(\w+)/);
        if (ownerMatch) owner = ownerMatch[1];
      } else if (statusMarker.startsWith('>')) {
        status = 'in_progress';
        const ownerMatch = statusMarker.match(/@(\w+)/);
        if (ownerMatch) owner = ownerMatch[1];
      }

      tasks.push({ num: taskNum, title, status, owner });
    }

    // Fallback: checkbox-style tasks under ## Tasks heading only
    if (tasks.length === 0) {
      // Extract only the ## Tasks section to avoid matching acceptance criteria
      const tasksSectionMatch = content.match(/^## Tasks\s*\n([\s\S]*?)(?=\n## [^#]|\n---|\Z)/m);
      const tasksSection = tasksSectionMatch ? tasksSectionMatch[1] : content;

      const checkboxRegex = /^[-*]\s*\[([^\]]*)\]\s*(.+)$/gm;
      let num = 1;

      while ((match = checkboxRegex.exec(tasksSection)) !== null) {
        const statusMarker = match[1];
        const title = match[2].trim();

        let status = 'pending';
        let owner = null;

        if (statusMarker.startsWith('x')) {
          status = 'done';
          const ownerMatch = statusMarker.match(/@(\w+)/);
          if (ownerMatch) owner = ownerMatch[1];
        } else if (statusMarker.startsWith('>')) {
          status = 'in_progress';
          const ownerMatch = statusMarker.match(/@(\w+)/);
          if (ownerMatch) owner = ownerMatch[1];
        }

        tasks.push({ num: num++, title, status, owner });
      }
    }
  } catch {
    // Ignore read errors
  }

  return tasks;
}

/**
 * Read bugs from a project's BUGS.md
 * @param {string} projectPath - Absolute path to the project
 * @returns {object[]} Array of bug objects
 */
function readProjectBugs(projectPath) {
  const bugs = [];
  const bugsPath = path.join(projectPath, '.planning', 'BUGS.md');

  if (!fs.existsSync(bugsPath)) {
    return bugs;
  }

  try {
    const content = fs.readFileSync(bugsPath, 'utf-8');

    // Match bug entries: ### BUG-001: Title [status]
    const bugRegex = /###\s+(BUG-\d+)[:\s]+(.+?)\s*\[(\w+)\]/g;
    let match;

    while ((match = bugRegex.exec(content)) !== null) {
      const [fullMatch, id, title, status] = match;

      // Extract section after this bug header
      const afterBug = content.slice(match.index + fullMatch.length);
      const nextBugIndex = afterBug.search(/###\s+BUG-/);
      const bugSection = nextBugIndex > 0 ? afterBug.slice(0, nextBugIndex) : afterBug;

      // Extract severity
      const severityMatch = bugSection.match(/\*\*Severity:\*\*\s*(\w+)/);
      const severity = severityMatch ? severityMatch[1].toLowerCase() : 'medium';

      // Extract date
      const dateMatch = bugSection.match(/\*\*Reported:\*\*\s*(\S+)/);
      const date = dateMatch ? dateMatch[1] : null;

      bugs.push({
        id,
        title: title.trim(),
        status: status.toLowerCase(),
        severity,
        date,
      });
    }
  } catch {
    // Ignore read errors
  }

  return bugs;
}

/**
 * Create a workspace API Express router
 *
 * @param {object} [options]
 * @param {object} [options.globalConfig] - GlobalConfig instance (for DI/testing)
 * @param {object} [options.projectScanner] - ProjectScanner instance (for DI/testing)
 * @returns {express.Router} Express router with workspace endpoints
 */
function createWorkspaceRouter(options = {}) {
  const { globalConfig, projectScanner, memoryApi, memoryDeps = {} } = options;

  if (!globalConfig) {
    throw new Error('globalConfig is required');
  }
  if (!projectScanner) {
    throw new Error('projectScanner is required');
  }

  const router = express.Router();
  const captureGuard = createCaptureGuard();

  // =========================================================================
  // GET /config - Returns workspace configuration
  // =========================================================================
  router.get('/config', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const config = {
        roots,
        scanDepth: globalConfig.load ? globalConfig.load().scanDepth : 5,
        lastScans: {},
      };

      // Populate lastScan per root
      for (const root of roots) {
        config.lastScans[root] = globalConfig.getLastScan(root);
      }

      res.json(config);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // POST/PUT /config - Sets root paths, validates each path first
  // =========================================================================
  function handleSetConfig(req, res) {
    try {
      const { roots } = req.body;

      if (!Array.isArray(roots)) {
        return res.status(400).json({ error: 'roots must be an array of directory paths' });
      }

      // Validate ALL paths before adding any (atomic operation)
      const resolvedPaths = [];
      for (const rootPath of roots) {
        const resolved = path.resolve(rootPath);
        if (!fs.existsSync(resolved)) {
          return res.status(400).json({
            error: `Path does not exist: ${resolved}`,
            invalidPath: resolved,
          });
        }
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
          return res.status(400).json({
            error: `Path is not a directory: ${resolved}`,
            invalidPath: resolved,
          });
        }
        resolvedPaths.push(resolved);
      }

      // Clear existing roots and add new ones
      const currentRoots = globalConfig.getRoots();
      for (const existing of currentRoots) {
        globalConfig.removeRoot(existing);
      }

      for (const newRoot of resolvedPaths) {
        try {
          globalConfig.addRoot(newRoot);
        } catch (err) {
          // Skip duplicates within the same request
          if (!err.message.includes('already configured')) {
            throw err;
          }
        }
      }

      const updatedRoots = globalConfig.getRoots();
      res.json({ roots: updatedRoots });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  router.post('/config', handleSetConfig);
  router.put('/config', handleSetConfig);

  // =========================================================================
  // DELETE /roots/:index - Removes a root by index
  // =========================================================================
  router.delete('/roots/:index', (req, res) => {
    try {
      const index = parseInt(req.params.index, 10);
      const roots = globalConfig.getRoots();

      if (isNaN(index) || index < 0 || index >= roots.length) {
        return res.status(400).json({
          error: `Invalid index: ${req.params.index}. Valid range: 0-${roots.length - 1}`,
        });
      }

      const rootToRemove = roots[index];
      globalConfig.removeRoot(rootToRemove);

      res.json({ removed: rootToRemove, roots: globalConfig.getRoots() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // POST /scan - Triggers re-scan, returns project list
  // =========================================================================
  router.post('/scan', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const force = req.body && req.body.force === true;

      const projects = projectScanner.scan(roots, { force });

      // Update lastScan timestamps
      const now = Date.now();
      for (const root of roots) {
        globalConfig.setLastScan(root, now);
      }

      // Attach project IDs
      const projectsWithIds = projects.map((p) => ({
        ...p,
        id: encodeProjectId(p.path),
      }));

      res.json({ projects: projectsWithIds, scannedAt: now });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // GET /groups - Returns projects grouped by parent directory (workspace)
  // =========================================================================
  router.get('/groups', (req, res) => {
    try {
      const roots = globalConfig.getRoots();

      if (roots.length === 0) {
        return res.json({ groups: [] });
      }

      const projects = projectScanner.scan(roots);
      const projectsWithIds = projects.map((p) => ({
        ...p,
        id: encodeProjectId(p.path),
      }));

      // Group by parent directory name
      const groupMap = new Map();
      for (const project of projectsWithIds) {
        const parentDir = path.dirname(project.path);
        const groupName = path.basename(parentDir);

        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, {
            name: groupName,
            path: parentDir,
            repos: [],
            repoCount: 0,
            hasTlc: false,
          });
        }

        const group = groupMap.get(groupName);
        group.repos.push(project);
        group.repoCount = group.repos.length;
        if (project.hasTlc) {
          group.hasTlc = true;
        }
      }

      // Sort groups by repo count descending
      const groups = Array.from(groupMap.values()).sort(
        (a, b) => b.repoCount - a.repoCount
      );

      res.json({ groups });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // GET /projects - Returns all discovered projects
  // =========================================================================
  router.get('/projects', (req, res) => {
    try {
      const roots = globalConfig.getRoots();

      if (roots.length === 0) {
        return res.json({ projects: [] });
      }

      const projects = projectScanner.scan(roots);
      const projectsWithIds = projects.map((p) => ({
        ...p,
        id: encodeProjectId(p.path),
      }));

      res.json({ projects: projectsWithIds });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // GET /projects/:projectId - Returns single project detail
  // =========================================================================
  router.get('/projects/:projectId', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({
        project: {
          ...project,
          id: encodeProjectId(project.path),
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // GET /projects/:projectId/status - Returns project status
  // =========================================================================
  router.get('/projects/:projectId/status', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const status = readProjectStatus(project.path);
      res.json({ status });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // GET /projects/:projectId/tasks - Returns project tasks
  // =========================================================================
  router.get('/projects/:projectId/tasks', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Determine the current phase from the project metadata or from reading status
      let phase = project.phase;
      if (!phase) {
        const status = readProjectStatus(project.path);
        phase = status.currentPhase;
      }

      const tasks = readProjectTasks(project.path, phase);
      res.json({ tasks, phase });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // GET /projects/:projectId/bugs - Returns project bugs
  // =========================================================================
  router.get('/projects/:projectId/bugs', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const bugs = readProjectBugs(project.path);
      res.json({ bugs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // Roadmap & Test Suite endpoints (Phase 75)
  // =========================================================================
  const projectStatusService = createProjectStatus({ fs, execSync });
  const testInventoryService = createTestInventory({
    globSync: (patterns, opts) => {
      const results = fs.globSync(patterns, {
        cwd: opts.cwd,
        exclude: (p) =>
          p.includes('node_modules') || p.includes('/dist/') || p.includes('.git/'),
      });
      // fs.globSync returns relative paths; convert to absolute if requested
      if (opts.absolute) {
        return results.map((f) => path.join(opts.cwd, f));
      }
      return results;
    },
    fs,
  });

  const roadmapApi = createRoadmapApi({
    projectStatus: projectStatusService,
    testInventory: testInventoryService,
    findProject: (projectId) => {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, projectId);
      return project || null;
    },
  });

  router.get('/projects/:projectId/roadmap', async (req, res) => {
    try { await roadmapApi.handleGetRoadmap(req, res); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });
  router.get('/projects/:projectId/tests', async (req, res) => {
    try { await roadmapApi.handleGetTestInventory(req, res); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });
  router.get('/projects/:projectId/tasks/all', async (req, res) => {
    try { await roadmapApi.handleGetAllTasks(req, res); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });
  router.post('/projects/:projectId/tests/run', async (req, res) => {
    try { await roadmapApi.handleRunTests(req, res); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // =========================================================================
  // Task & Bug Write endpoints (Phase 76)
  // =========================================================================
  const planWriter = createPlanWriter({ fs });
  const bugWriter = createBugWriter({ fs });

  /**
   * Helper: find the PLAN.md path for a project's current phase
   */
  function findPlanPath(projectPath) {
    const status = readProjectStatus(projectPath);
    if (!status.currentPhase) return null;
    const phasesDir = path.join(projectPath, '.planning', 'phases');
    let planPath = path.join(phasesDir, `${status.currentPhase}-PLAN.md`);
    if (!fs.existsSync(planPath)) {
      try {
        const padded = status.currentPhase.toString().padStart(2, '0');
        const files = fs.readdirSync(phasesDir);
        const match = files.find(
          (f) =>
            (f.startsWith(`${padded}-`) || f.startsWith(`${status.currentPhase}-`)) &&
            f.endsWith('-PLAN.md')
        );
        if (match) planPath = path.join(phasesDir, match);
      } catch {
        return null;
      }
    }
    return fs.existsSync(planPath) ? planPath : null;
  }

  // PUT /projects/:projectId/tasks/:taskNum/status - Update task status
  router.put('/projects/:projectId/tasks/:taskNum/status', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const planPath = findPlanPath(project.path);
      if (!planPath) return res.status(404).json({ error: 'No PLAN.md found for current phase' });

      const taskNum = parseInt(req.params.taskNum, 10);
      const { status, owner } = req.body;

      planWriter.updateTaskStatus(planPath, taskNum, status, owner || null);

      const tasks = readProjectTasks(project.path, readProjectStatus(project.path).currentPhase);
      const updated = tasks.find((t) => t.num === taskNum);
      res.json({ task: updated });
    } catch (err) {
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /projects/:projectId/tasks/:taskNum - Update task content
  router.put('/projects/:projectId/tasks/:taskNum', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const planPath = findPlanPath(project.path);
      if (!planPath) return res.status(404).json({ error: 'No PLAN.md found for current phase' });

      const taskNum = parseInt(req.params.taskNum, 10);
      const updates = req.body;

      planWriter.updateTaskContent(planPath, taskNum, updates);

      const tasks = readProjectTasks(project.path, readProjectStatus(project.path).currentPhase);
      const updated = tasks.find((t) => t.num === taskNum);
      res.json({ task: updated });
    } catch (err) {
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // POST /projects/:projectId/tasks - Create new task
  router.post('/projects/:projectId/tasks', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const planPath = findPlanPath(project.path);
      if (!planPath) return res.status(404).json({ error: 'No PLAN.md found for current phase' });

      const created = planWriter.createTask(planPath, req.body);
      res.status(201).json({ task: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /projects/:projectId/bugs/:bugId/status - Update bug status
  router.put('/projects/:projectId/bugs/:bugId/status', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const bugsPath = path.join(project.path, '.planning', 'BUGS.md');
      if (!fs.existsSync(bugsPath)) return res.status(404).json({ error: 'No BUGS.md found' });

      const { status } = req.body;
      bugWriter.updateBugStatus(bugsPath, req.params.bugId, status);

      const bugs = readProjectBugs(project.path);
      const updated = bugs.find((b) => b.id === req.params.bugId);
      res.json({ bug: updated });
    } catch (err) {
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /projects/:projectId/bugs/:bugId - Update bug content
  router.put('/projects/:projectId/bugs/:bugId', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const bugsPath = path.join(project.path, '.planning', 'BUGS.md');
      if (!fs.existsSync(bugsPath)) return res.status(404).json({ error: 'No BUGS.md found' });

      bugWriter.updateBugContent(bugsPath, req.params.bugId, req.body);

      const bugs = readProjectBugs(project.path);
      const updated = bugs.find((b) => b.id === req.params.bugId);
      res.json({ bug: updated });
    } catch (err) {
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // POST /projects/:projectId/bugs - Create new bug
  router.post('/projects/:projectId/bugs', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const bugsPath = path.join(project.path, '.planning', 'BUGS.md');
      const created = bugWriter.createBug(bugsPath, req.body);
      res.status(201).json({ bug: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // Memory API routes (Phase 77, fixed per-project in Phase 78)
  // =========================================================================
  if (memoryApi) {
    router.get('/projects/:projectId/memory/decisions', async (req, res) => {
      try {
        const roots = globalConfig.getRoots();
        const project = findProjectById(projectScanner, roots, req.params.projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const adapter = createMemoryStoreAdapter(project.path);
        const decisions = await adapter.listDecisions();
        res.json({ decisions });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    router.get('/projects/:projectId/memory/gotchas', async (req, res) => {
      try {
        const roots = globalConfig.getRoots();
        const project = findProjectById(projectScanner, roots, req.params.projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const adapter = createMemoryStoreAdapter(project.path);
        const gotchas = await adapter.listGotchas();
        res.json({ gotchas });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    router.get('/projects/:projectId/memory/stats', async (req, res) => {
      try {
        const roots = globalConfig.getRoots();
        const project = findProjectById(projectScanner, roots, req.params.projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const adapter = createMemoryStoreAdapter(project.path);
        const stats = await adapter.getStats();
        res.json(stats);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  // =========================================================================
  // Memory capture endpoint (Phase 79 Task 5)
  // =========================================================================
  router.post('/projects/:projectId/memory/capture', async (req, res) => {
    try {
      const projectId = req.params.projectId;

      // Rate limit check
      const rateCheck = captureGuard.checkRateLimit(projectId);
      if (!rateCheck.ok) {
        return res.status(rateCheck.status).json({ error: rateCheck.error });
      }

      // Payload validation (size + structure)
      const validation = captureGuard.validate(req.body, projectId);
      if (!validation.ok) {
        return res.status(validation.status).json({ error: validation.error });
      }

      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      // Deduplicate exchanges
      const exchanges = captureGuard.deduplicate(req.body.exchanges, projectId);

      if (exchanges.length === 0) {
        return res.json({ captured: 0, deduplicated: true });
      }

      // Process in background — respond immediately
      let captured = 0;
      const { observeAndRemember, vectorIndexer } = memoryDeps;

      for (const exchange of exchanges) {
        try {
          if (typeof observeAndRemember === 'function') {
            await observeAndRemember(project.path, exchange);
          }
          if (vectorIndexer && typeof vectorIndexer.indexChunk === 'function') {
            await vectorIndexer.indexChunk(exchange);
          }
          captured++;
        } catch {
          // Individual exchange failures don't stop the batch
        }
      }

      res.json({ captured });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // Memory search endpoint (Phase 79 Task 6)
  // =========================================================================
  router.get('/projects/:projectId/memory/search', async (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const query = req.query.q;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }

      const { semanticRecall } = memoryDeps;

      // Try vector-based semantic recall first
      if (semanticRecall && typeof semanticRecall.recall === 'function') {
        try {
          const results = await semanticRecall.recall(query, { projectRoot: project.path });
          return res.json({ results: results || [], source: 'vector' });
        } catch {
          // Fall through to file-based search
        }
      }

      // Fallback: file-based text search
      try {
        const { searchMemory } = require('./memory-reader');
        const results = await searchMemory(project.path, query);
        return res.json({ results: results || [], source: 'file' });
      } catch {
        return res.json({ results: [], source: 'file' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========================================================================
  // Project file endpoint (Phase 77)
  // =========================================================================
  router.get('/projects/:projectId/files/:filename', (req, res) => {
    try {
      const roots = globalConfig.getRoots();
      const project = findProjectById(projectScanner, roots, req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const filename = req.params.filename;
      // Reject path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }

      const filePath = path.join(project.path, '.planning', filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ filename, content });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createWorkspaceRouter, encodeProjectId, decodeProjectId };
