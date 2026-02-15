/**
 * @file project-status.js
 * @description Project Status module (Phase 75, Task 1).
 *
 * Factory function `createProjectStatus(deps)` accepts injected dependencies
 * (fs, execSync) and returns `{ getFullStatus(projectPath) }`.
 *
 * Parses `.planning/ROADMAP.md` for milestones and phases, reads per-phase
 * PLAN.md, TESTS.md, and VERIFIED.md files, extracts git log and project info.
 */

/**
 * Parse phase status marker from heading text.
 * @param {string} text - Heading text like "Phase 1: Core Infrastructure [x]"
 * @returns {'done'|'in_progress'|'pending'} Phase status
 */
function parseStatus(text) {
  if (/\[x\]/.test(text)) return 'done';
  if (/\[>\]/.test(text)) return 'in_progress';
  return 'pending';
}

/**
 * Parse ROADMAP.md content into milestones with phases.
 * @param {string} content - Raw ROADMAP.md content
 * @returns {{ milestones: Array, totalPhases: number, completedPhases: number }}
 */
function parseRoadmap(content) {
  const lines = content.replace(/\r/g, '').split('\n');
  const milestones = [];
  let currentMilestone = null;
  let currentPhase = null;
  let inDeliverables = false;

  for (const line of lines) {
    // Milestone heading: ## Milestone: Name
    const milestoneMatch = line.match(/^## Milestone:\s*(.+)$/);
    if (milestoneMatch) {
      currentMilestone = { name: milestoneMatch[1].trim(), phases: [] };
      milestones.push(currentMilestone);
      currentPhase = null;
      inDeliverables = false;
      continue;
    }

    // Phase heading: ### Phase N: Name [status] optional suffix
    const phaseMatch = line.match(/^### Phase (\d+):\s*(.+)$/);
    if (phaseMatch) {
      const number = parseInt(phaseMatch[1], 10);
      const rest = phaseMatch[2];
      // Extract name: everything before the status marker
      const nameMatch = rest.match(/^(.+?)\s*\[/);
      const name = nameMatch ? nameMatch[1].trim() : rest.trim();
      const status = parseStatus(rest);

      currentPhase = {
        number,
        name,
        status,
        goal: '',
        deliverables: [],
        taskCount: 0,
        completedTaskCount: 0,
        hasTests: false,
        testFileCount: 0,
        testCount: 0,
        verified: false,
      };

      if (currentMilestone) {
        currentMilestone.phases.push(currentPhase);
      }
      inDeliverables = false;
      continue;
    }

    if (!currentPhase) continue;

    // Goal line: **Goal:** text
    const goalMatch = line.match(/^\*\*Goal:\*\*\s*(.+)$/);
    if (goalMatch) {
      currentPhase.goal = goalMatch[1].trim();
      continue;
    }

    // Deliverables header
    if (line.match(/^\*\*Deliverables:\*\*/)) {
      inDeliverables = true;
      continue;
    }

    // Deliverable/checklist item: - [x] text or - [ ] text
    // Match both inside **Deliverables:** sections and standalone checklist items
    const deliverableMatch = line.match(/^- \[(x| )\]\s*(.+)$/);
    if (deliverableMatch) {
      currentPhase.deliverables.push({
        text: deliverableMatch[2].trim(),
        done: deliverableMatch[1] === 'x',
      });
      continue;
    }
    // End deliverables section on non-deliverable, non-empty, non-blank line
    if (inDeliverables && line.trim() !== '' && !line.match(/^- \[/)) {
      inDeliverables = false;
    }
  }

  const allPhases = milestones.flatMap((m) => m.phases);
  const totalPhases = allPhases.length;
  const completedPhases = allPhases.filter((p) => p.status === 'done').length;

  return { milestones, totalPhases, completedPhases };
}

/**
 * Parse PLAN.md to count tasks and completed tasks.
 * @param {string} content - Raw PLAN.md content
 * @returns {{ taskCount: number, completedTaskCount: number }}
 */
function parsePlan(content) {
  const lines = content.replace(/\r/g, '').split('\n');
  let taskCount = 0;
  let completedTaskCount = 0;

  for (const line of lines) {
    const taskMatch = line.match(/^### Task \d+:.+\[(x| )\]/);
    if (taskMatch) {
      taskCount++;
      if (taskMatch[1] === 'x') completedTaskCount++;
    }
  }

  return { taskCount, completedTaskCount };
}

/**
 * Parse TESTS.md to count test files and total tests.
 * @param {string} content - Raw TESTS.md content
 * @returns {{ testFileCount: number, testCount: number }}
 */
function parseTests(content) {
  const lines = content.replace(/\r/g, '').split('\n');
  let testFileCount = 0;
  let testCount = 0;

  for (const line of lines) {
    // Match table rows like: | lib/core.test.js | 10 | Passing |
    // Skip header row, separator row, and total row
    const rowMatch = line.match(/^\|\s*([^|]+)\s*\|\s*(\d+)\s*\|\s*([^|]+)\s*\|$/);
    if (rowMatch) {
      const file = rowMatch[1].trim();
      const count = parseInt(rowMatch[2].trim(), 10);
      // Skip header, separator, and total rows
      if (file === 'File' || file.startsWith('--') || file.startsWith('**')) continue;
      testFileCount++;
      testCount += count;
    }
  }

  return { testFileCount, testCount };
}

/**
 * Parse git log output into structured commit objects.
 * @param {string} output - Raw git log output (pipe-delimited)
 * @returns {Array<{hash: string, message: string, date: string, author: string}>}
 */
function parseGitLog(output) {
  if (!output || !output.trim()) return [];
  return output.trim().split('\n').map((line) => {
    const [hash, message, date, author] = line.split('|');
    return { hash, message, date, author };
  });
}

/**
 * Creates a project status reader with injected dependencies.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.fs - File system module (existsSync, readFileSync, readdirSync)
 * @param {Function} deps.execSync - Child process execSync function
 * @returns {{ getFullStatus: (projectPath: string) => Object }}
 */
function createProjectStatus({ fs, execSync }) {
  /**
   * Read a file safely, returning null if it doesn't exist.
   * @param {string} filePath - Absolute path
   * @returns {string|null}
   */
  function readFile(filePath) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  }

  /**
   * Get full project status for a given project path.
   * @param {string} projectPath - Absolute path to the project root
   * @returns {Object} Full status object
   */
  function getFullStatus(projectPath) {
    // Parse project info
    const projectInfo = {};
    const pkgContent = readFile(`${projectPath}/package.json`);
    if (pkgContent) {
      const pkg = JSON.parse(pkgContent);
      projectInfo.name = pkg.name;
      projectInfo.version = pkg.version;
    }

    const projectMd = readFile(`${projectPath}/PROJECT.md`);
    if (projectMd) {
      // Extract first non-heading, non-empty paragraph
      const mdLines = projectMd.split('\n');
      for (const mdLine of mdLines) {
        if (mdLine.trim() && !mdLine.startsWith('#')) {
          projectInfo.description = mdLine.trim();
          break;
        }
      }
    }

    // Parse roadmap
    const roadmapContent = readFile(`${projectPath}/.planning/ROADMAP.md`);
    let milestones = [];
    let totalPhases = 0;
    let completedPhases = 0;

    if (roadmapContent) {
      const roadmap = parseRoadmap(roadmapContent);
      milestones = roadmap.milestones;
      totalPhases = roadmap.totalPhases;
      completedPhases = roadmap.completedPhases;
    }

    // Enrich phases with per-phase file data
    let totalTestFiles = 0;
    let totalTests = 0;

    for (const milestone of milestones) {
      for (const phase of milestone.phases) {
        const n = phase.number;

        // PLAN.md
        const planContent = readFile(`${projectPath}/.planning/phases/${n}-PLAN.md`);
        if (planContent) {
          const plan = parsePlan(planContent);
          phase.taskCount = plan.taskCount;
          phase.completedTaskCount = plan.completedTaskCount;
        }

        // TESTS.md
        const testsContent = readFile(`${projectPath}/.planning/phases/${n}-TESTS.md`);
        if (testsContent) {
          const tests = parseTests(testsContent);
          phase.hasTests = true;
          phase.testFileCount = tests.testFileCount;
          phase.testCount = tests.testCount;
          totalTestFiles += tests.testFileCount;
          totalTests += tests.testCount;
        }

        // Fall back to deliverable counts when no PLAN.md exists
        if (phase.taskCount === 0 && phase.deliverables.length > 0) {
          phase.taskCount = phase.deliverables.length;
          phase.completedTaskCount = phase.deliverables.filter((d) => d.done).length;
        }

        // VERIFIED.md
        phase.verified = fs.existsSync(`${projectPath}/.planning/phases/${n}-VERIFIED.md`);
      }
    }

    // Git log
    let recentCommits = [];
    try {
      const gitOutput = execSync(
        `git log --format="%h|%s|%ad|%an" --date=short -10`,
        { cwd: projectPath, encoding: 'utf8' }
      );
      recentCommits = parseGitLog(gitOutput);
    } catch {
      // Git not available or not a git repo
    }

    return {
      milestones,
      totalPhases,
      completedPhases,
      testSummary: {
        totalFiles: totalTestFiles,
        totalTests: totalTests,
      },
      recentCommits,
      projectInfo,
    };
  }

  return { getFullStatus };
}

module.exports = { createProjectStatus };
