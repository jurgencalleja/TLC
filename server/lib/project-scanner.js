/**
 * Project Scanner - Recursively discovers TLC projects within configured root paths
 *
 * Scans directory trees looking for:
 * - TLC projects (.tlc.json present)
 * - Planning-only projects (.planning/ directory present)
 * - Candidate projects (package.json + .git/ present, not yet initialized with TLC)
 *
 * Returns structured project metadata including phase info from ROADMAP.md.
 */

const fs = require('fs');
const path = require('path');

/**
 * Directories to skip during recursive scanning
 */
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'vendor',
  '.next',
  '.nuxt',
]);

/**
 * Parse phase information from a ROADMAP.md file
 * @param {string} roadmapPath - Absolute path to ROADMAP.md
 * @returns {{ phase: number|null, phaseName: string|null, totalPhases: number, completedPhases: number }}
 */
function parseRoadmap(roadmapPath) {
  const result = {
    phase: null,
    phaseName: null,
    totalPhases: 0,
    completedPhases: 0,
  };

  let content;
  try {
    content = fs.readFileSync(roadmapPath, 'utf-8');
  } catch {
    return result;
  }

  // Format 1: Heading format — ### Phase N: Name [x] / [ ] / [>]
  const headingRegex = /###\s+Phase\s+(\d+)(?:\.\d+)?[:\s]+(.+?)\s*\[([x >])\]\s*$/gm;
  let headingMatch;
  let foundHeadings = false;
  let firstIncomplete = null;

  while ((headingMatch = headingRegex.exec(content)) !== null) {
    foundHeadings = true;
    result.totalPhases++;
    const phaseNum = parseInt(headingMatch[1], 10);
    const phaseName = headingMatch[2].trim();
    const marker = headingMatch[3];

    if (marker === 'x') {
      result.completedPhases++;
    } else if (!firstIncomplete) {
      firstIncomplete = { phase: phaseNum, phaseName };
    }
  }

  if (foundHeadings) {
    if (firstIncomplete) {
      result.phase = firstIncomplete.phase;
      result.phaseName = firstIncomplete.phaseName;
    }
    return result;
  }

  // Format 2: Table format — | N | [Name](link) | status |
  const tableRegex = /\|\s*(\d+)\s*\|\s*\[([^\]]+)\][^|]*\|\s*(\w+)\s*\|/g;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(content)) !== null) {
    result.totalPhases++;
    const phaseNum = parseInt(tableMatch[1], 10);
    const phaseName = tableMatch[2].trim();
    const status = tableMatch[3].trim().toLowerCase();
    const completed = status === 'complete' || status === 'done' || status === 'verified';

    if (completed) {
      result.completedPhases++;
    } else if (!firstIncomplete) {
      firstIncomplete = { phase: phaseNum, phaseName };
    }
  }

  if (firstIncomplete) {
    result.phase = firstIncomplete.phase;
    result.phaseName = firstIncomplete.phaseName;
  }

  return result;
}

/**
 * Read project metadata from a project directory
 * @param {string} projectDir - Absolute path to the project directory
 * @returns {object} Project metadata
 */
function readProjectMetadata(projectDir) {
  const hasTlc = fs.existsSync(path.join(projectDir, '.tlc.json'));
  const hasPlanning = fs.existsSync(path.join(projectDir, '.planning'));

  // Read name and version from package.json if present
  let name = path.basename(projectDir);
  let version = null;

  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) {
        name = pkg.name;
      }
      if (pkg.version) {
        version = pkg.version;
      }
    } catch {
      // Ignore malformed package.json
    }
  }

  // Parse phase info from ROADMAP.md if .planning exists
  let phaseInfo = { phase: null, phaseName: null, totalPhases: 0, completedPhases: 0 };
  if (hasPlanning) {
    const roadmapPath = path.join(projectDir, '.planning', 'ROADMAP.md');
    if (fs.existsSync(roadmapPath)) {
      phaseInfo = parseRoadmap(roadmapPath);
    }
  }

  return {
    name,
    path: projectDir,
    hasTlc,
    hasPlanning,
    version,
    phase: phaseInfo.phase,
    phaseName: phaseInfo.phaseName,
    totalPhases: phaseInfo.totalPhases,
    completedPhases: phaseInfo.completedPhases,
  };
}

/**
 * ProjectScanner - Recursively discovers TLC projects within configured root paths
 */
class ProjectScanner {
  /**
   * @param {object} [options]
   * @param {number} [options.scanDepth=5] - Maximum recursion depth
   * @param {number} [options.cacheTTL=60000] - Cache time-to-live in milliseconds
   */
  constructor(options = {}) {
    this.scanDepth = options.scanDepth || 5;
    this.cacheTTL = options.cacheTTL || 60000;
    this._cache = null;
    this._cacheTime = 0;
  }

  /**
   * Scan root directories for TLC projects
   * @param {string[]} roots - Array of root directory paths to scan
   * @param {object} [options]
   * @param {boolean} [options.force=false] - Force re-scan bypassing cache
   * @param {function} [options.onProgress] - Progress callback receiving discovered count
   * @returns {object[]} Array of project metadata objects, sorted by name
   */
  scan(roots, options = {}) {
    const { force = false, onProgress } = options;

    // Check cache
    if (!force && this._cache !== null) {
      const age = Date.now() - this._cacheTime;
      if (age < this.cacheTTL) {
        return this._cache;
      }
    }

    const projectsByPath = new Map();

    for (const root of roots) {
      // Check that root exists
      if (!fs.existsSync(root)) {
        console.warn(`ProjectScanner: root path does not exist: ${root}`);
        continue;
      }

      this._scanDir(root, 0, projectsByPath, onProgress);
    }

    const projects = Array.from(projectsByPath.values());
    projects.sort((a, b) => a.name.localeCompare(b.name));

    // Update cache
    this._cache = projects;
    this._cacheTime = Date.now();

    return projects;
  }

  /**
   * Recursively scan a directory for projects
   * @param {string} dir - Directory to scan
   * @param {number} depth - Current recursion depth
   * @param {Map} projectsByPath - Accumulated projects (keyed by absolute path for dedup)
   * @param {function} [onProgress] - Progress callback
   * @private
   */
  _scanDir(dir, depth, projectsByPath, onProgress) {
    if (depth > this.scanDepth) {
      return;
    }

    // Check if this directory IS a project
    const hasTlc = fs.existsSync(path.join(dir, '.tlc.json'));
    const hasPlanning = fs.existsSync(path.join(dir, '.planning'));
    const hasPackageJson = fs.existsSync(path.join(dir, 'package.json'));
    const hasGit = fs.existsSync(path.join(dir, '.git'));

    const isProject = hasTlc || hasPlanning || (hasPackageJson && hasGit);

    if (isProject && !projectsByPath.has(dir)) {
      const metadata = readProjectMetadata(dir);
      projectsByPath.set(dir, metadata);

      if (typeof onProgress === 'function') {
        onProgress(projectsByPath.size);
      }
    }

    // Recurse into subdirectories
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        console.warn(`ProjectScanner: permission denied reading directory: ${dir}`);
        return;
      }
      throw err;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      const childPath = path.join(dir, entry.name);
      this._scanDir(childPath, depth + 1, projectsByPath, onProgress);
    }
  }
}

module.exports = { ProjectScanner };
