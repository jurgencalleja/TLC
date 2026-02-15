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
  const { globalConfig, projectScanner } = options;

  if (!globalConfig) {
    throw new Error('globalConfig is required');
  }
  if (!projectScanner) {
    throw new Error('projectScanner is required');
  }

  const router = express.Router();

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

  return router;
}

module.exports = { createWorkspaceRouter, encodeProjectId, decodeProjectId };
