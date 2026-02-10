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

    // Format 1: ## Phase N: Name [x] (heading format)
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

    // Format 2: Table format | 01 | [Name](link) | status | description |
    if (!result.currentPhase) {
      const tableMatches = content.matchAll(/\|\s*(\d+)\s*\|\s*\[([^\]]+)\][^\|]*\|\s*(\w+)\s*\|/g);
      for (const match of tableMatches) {
        const phaseNum = match[1].replace(/^0+/, '') || '0'; // strip leading zeros
        const phaseName = match[2].trim();
        const status = match[3].trim().toLowerCase();
        const completed = status === 'complete' || status === 'done' || status === 'verified';

        if (!completed) {
          result.currentPhase = phaseNum;
          result.currentPhaseName = phaseName;
          break;
        }
      }
    }
  }

  // Load current phase PLAN.md
  if (result.currentPhase) {
    const phasesDir = path.join(projectDir, '.planning', 'phases');
    let planPath = path.join(phasesDir, `${result.currentPhase}-PLAN.md`);

    // Try exact match first, then glob for prefixed names like "06-name-PLAN.md"
    if (!fs.existsSync(planPath) && fs.existsSync(phasesDir)) {
      const padded = result.currentPhase.toString().padStart(2, '0');
      const files = fs.readdirSync(phasesDir);
      const match = files.find(f =>
        (f.startsWith(`${padded}-`) || f.startsWith(`${result.currentPhase}-`)) &&
        f.endsWith('-PLAN.md')
      );
      if (match) {
        planPath = path.join(phasesDir, match);
      }
    }

    if (fs.existsSync(planPath)) {
      const content = fs.readFileSync(planPath, 'utf-8');
      result.tasks = parseTasksFromPlan(content);
    }
  }

  return result;
}

/**
 * Parse task entries from PLAN.md content
 * Supports multiple formats:
 *   ### Task 1: Title [ ]
 *   ### Task 1: Title [>@user]
 *   ### Task 1: Title [x@user]
 *   - [ ] Task description
 *   - [x] Completed task
 *   - [>] In progress task
 *   ## Task 1: Title
 */
function parseTasksFromPlan(content) {
  const tasks = [];

  // Format 1: ### Task N: Title [status]
  const taskRegex1 = /###\s+Task\s+(\d+)[:\s]+(.+?)\s*\[([^\]]*)\]/g;
  let match;
  while ((match = taskRegex1.exec(content)) !== null) {
    const [, num, title, statusMarker] = match;
    tasks.push(parseTaskEntry(num, title, statusMarker));
  }

  // Format 2: Checkbox format - [ ] Task or - [x] Task
  if (tasks.length === 0) {
    const checkboxRegex = /^[-*]\s*\[([ x>])\]\s*(.+)$/gm;
    let num = 1;
    while ((match = checkboxRegex.exec(content)) !== null) {
      const [, marker, title] = match;
      // Skip if title looks like a sub-item or criterion
      if (title.match(/^(Has|Should|Must|Can|Is|Are|The)\s/i)) continue;
      const statusMarker = marker === 'x' ? 'x' : marker === '>' ? '>' : ' ';
      tasks.push(parseTaskEntry(num++, title, statusMarker));
    }
  }

  // Format 3: ## Task N: Title (without status marker)
  if (tasks.length === 0) {
    const taskRegex3 = /##\s+Task\s+(\d+)[:\s]+(.+?)$/gm;
    while ((match = taskRegex3.exec(content)) !== null) {
      const [, num, title] = match;
      tasks.push(parseTaskEntry(num, title, ' '));
    }
  }

  // Format 4: Numbered list - 1. Task title
  if (tasks.length === 0) {
    const numberedRegex = /^(\d+)\.\s+(.+)$/gm;
    while ((match = numberedRegex.exec(content)) !== null) {
      const [, num, title] = match;
      // Skip if looks like a sub-point
      if (title.length < 10) continue;
      tasks.push(parseTaskEntry(num, title, ' '));
    }
  }

  return tasks;
}

function parseTaskEntry(num, title, statusMarker) {
  let status = 'pending';
  let owner = null;

  if (typeof statusMarker === 'string') {
    if (statusMarker.startsWith('x') || statusMarker === 'x') {
      status = 'done';
      const ownerMatch = statusMarker.match(/@(\w+)/);
      if (ownerMatch) owner = ownerMatch[1];
    } else if (statusMarker.startsWith('>') || statusMarker === '>') {
      status = 'in_progress';
      const ownerMatch = statusMarker.match(/@(\w+)/);
      if (ownerMatch) owner = ownerMatch[1];
    }
  }

  return {
    num: parseInt(num),
    title: title.trim(),
    status,
    owner
  };
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
