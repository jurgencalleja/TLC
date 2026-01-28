const fs = require('fs');
const path = require('path');

/**
 * Parse tasks from PLAN.md files
 */
function parsePlan(projectDir) {
  const result = {
    currentPhase: null,
    currentPhaseName: '',
    tasks: [],
    testsPass: 0,
    testsFail: 0
  };

  // Find current phase from ROADMAP.md
  const roadmapPath = path.join(projectDir, '.planning', 'ROADMAP.md');
  if (fs.existsSync(roadmapPath)) {
    const content = fs.readFileSync(roadmapPath, 'utf-8');

    // Find first incomplete phase
    const phaseMatches = content.matchAll(/##\s+Phase\s+(\d+)(?:\.(\d+))?[:\s]+(.+?)(?:\s*\[([x ])\])?$/gm);
    for (const match of phaseMatches) {
      const phaseNum = match[2] ? `${match[1]}.${match[2]}` : match[1];
      const phaseName = match[3].trim();
      const completed = match[4] === 'x';

      if (!completed) {
        result.currentPhase = phaseNum;
        result.currentPhaseName = phaseName;
        break;
      }
    }
  }

  // Load current phase PLAN.md
  if (result.currentPhase) {
    const planPath = path.join(
      projectDir,
      '.planning',
      'phases',
      `${result.currentPhase}-PLAN.md`
    );

    if (fs.existsSync(planPath)) {
      const content = fs.readFileSync(planPath, 'utf-8');
      result.tasks = parseTasksFromPlan(content);
    }
  }

  return result;
}

/**
 * Parse task entries from PLAN.md content
 * Supports formats:
 *   ### Task 1: Title [ ]
 *   ### Task 1: Title [>@user]
 *   ### Task 1: Title [x@user]
 */
function parseTasksFromPlan(content) {
  const tasks = [];
  const taskRegex = /###\s+Task\s+(\d+)[:\s]+(.+?)\s*\[([^\]]*)\]/g;

  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    const [, num, title, statusMarker] = match;

    let status = 'available';
    let owner = null;

    if (statusMarker.startsWith('x')) {
      status = 'done';
      const ownerMatch = statusMarker.match(/@(\w+)/);
      if (ownerMatch) owner = ownerMatch[1];
    } else if (statusMarker.startsWith('>')) {
      status = 'working';
      const ownerMatch = statusMarker.match(/@(\w+)/);
      if (ownerMatch) owner = ownerMatch[1];
    }

    tasks.push({
      num: parseInt(num),
      title: title.trim(),
      status,
      owner
    });
  }

  return tasks;
}

/**
 * Parse bugs from BUGS.md
 */
function parseBugs(projectDir) {
  const bugs = [];
  const bugsPath = path.join(projectDir, '.planning', 'BUGS.md');

  if (!fs.existsSync(bugsPath)) {
    return bugs;
  }

  const content = fs.readFileSync(bugsPath, 'utf-8');

  // Match bug entries: ### BUG-001: Title [status]
  const bugRegex = /###\s+(BUG-\d+)[:\s]+(.+?)\s*\[(\w+)\]/g;

  let match;
  while ((match = bugRegex.exec(content)) !== null) {
    const [fullMatch, id, title, status] = match;

    // Try to extract date and description from following lines
    const afterBug = content.slice(match.index + fullMatch.length);
    const nextBugIndex = afterBug.search(/###\s+BUG-/);
    const bugSection = nextBugIndex > 0 ? afterBug.slice(0, nextBugIndex) : afterBug;

    // Extract date
    const dateMatch = bugSection.match(/\*\*Reported:\*\*\s*(\S+)/);
    const date = dateMatch ? dateMatch[1] : null;

    // Extract severity
    const severityMatch = bugSection.match(/\*\*Severity:\*\*\s*(\w+)/);
    const severity = severityMatch ? severityMatch[1].toLowerCase() : 'medium';

    // Extract description (text after metadata, before ---)
    const lines = bugSection.split('\n').filter(l => l.trim() && !l.startsWith('-') && !l.startsWith('*'));
    const description = lines.slice(0, 2).join(' ').trim().slice(0, 200);

    bugs.push({
      id,
      title: title.trim(),
      status: status.toLowerCase(),
      date,
      severity,
      description: description || title.trim()
    });
  }

  return bugs;
}

/**
 * Get username for task claiming
 */
function getUsername() {
  // Check TLC_USER env var first
  if (process.env.TLC_USER) {
    return process.env.TLC_USER.toLowerCase().replace(/\s+/g, '-');
  }

  // Try git config
  try {
    const { execSync } = require('child_process');
    const gitUser = execSync('git config user.name', { encoding: 'utf-8' }).trim();
    if (gitUser) {
      return gitUser.toLowerCase().split(' ')[0]; // First name only
    }
  } catch (e) {
    // Ignore
  }

  // Fall back to system user
  return require('os').userInfo().username || 'unknown';
}

module.exports = { parsePlan, parseBugs, getUsername };
