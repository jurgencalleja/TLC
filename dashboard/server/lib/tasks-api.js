import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Creates a new task in the current phase's PLAN.md
 * @param {Object} taskData - The task data
 * @param {string} taskData.title - Task title (required, max 200 chars)
 * @param {string} taskData.description - Task description (optional)
 * @param {string} taskData.priority - Task priority (optional)
 * @param {string} projectDir - The project directory path
 * @returns {Promise<Object>} The created task object
 */
export async function createTask(taskData, projectDir) {
  // Validate title
  if (!taskData.title || taskData.title.trim() === '') {
    throw new Error('Title is required');
  }

  if (taskData.title.length > 200) {
    throw new Error('Title must be 200 characters or less');
  }

  // Get current phase from ROADMAP.md
  const roadmapPath = path.join(projectDir, '.planning', 'ROADMAP.md');
  const phase = await getCurrentPhase(roadmapPath);

  // Find or create PLAN.md for the phase
  const phasesDir = path.join(projectDir, '.planning', 'phases');
  const phaseDir = await findPhaseDir(phasesDir, phase.number);
  const planPath = path.join(phaseDir, `${String(phase.number).padStart(2, '0')}-PLAN.md`);

  // Read existing PLAN.md or create new content
  let planContent;
  try {
    planContent = await fs.readFile(planPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Create new PLAN.md
      planContent = `# Phase ${phase.number} Plan

## Tasks
`;
    } else {
      throw err;
    }
  }

  // Find the next task number
  const taskNumber = getNextTaskNumber(planContent);

  // Add Tasks section if missing
  if (!planContent.includes('## Tasks')) {
    planContent = planContent.trimEnd() + '\n\n## Tasks\n';
  }

  // Create task markdown
  const description = taskData.description || 'To be defined';
  const taskMarkdown = `
### Task ${taskNumber}: ${taskData.title}

**Goal:** ${description}

**Acceptance Criteria:**
- [ ] To be defined
`;

  // Append task to PLAN.md
  planContent = planContent.trimEnd() + '\n' + taskMarkdown;

  // Write updated PLAN.md
  await fs.mkdir(path.dirname(planPath), { recursive: true });
  await fs.writeFile(planPath, planContent, 'utf8');

  // Return created task object
  return {
    id: `${phase.number}-${taskNumber}`,
    title: taskData.title,
    status: 'pending',
    owner: null,
    phase: phase.number,
  };
}

/**
 * Gets the current active phase from ROADMAP.md
 * @param {string} roadmapPath - Path to ROADMAP.md
 * @returns {Promise<{number: number, name: string}>}
 */
async function getCurrentPhase(roadmapPath) {
  const content = await fs.readFile(roadmapPath, 'utf8');
  const lines = content.split('\n');

  // Look for [>] marker (active phase) or first [ ] (uncompleted phase)
  let activePhase = null;
  let firstUncompletedPhase = null;

  for (const line of lines) {
    // Match phase lines like "- [>] Phase 1: Setup" or "- [ ] Phase 2: Features"
    const match = line.match(/^-\s*\[([>x\s])\]\s*Phase\s*(\d+):\s*(.+)$/i);
    if (match) {
      const marker = match[1];
      const phaseNumber = parseInt(match[2], 10);
      const phaseName = match[3].trim();

      if (marker === '>') {
        activePhase = { number: phaseNumber, name: phaseName };
        break;
      }

      if (marker === ' ' && !firstUncompletedPhase) {
        firstUncompletedPhase = { number: phaseNumber, name: phaseName };
      }
    }
  }

  if (activePhase) {
    return activePhase;
  }

  if (firstUncompletedPhase) {
    return firstUncompletedPhase;
  }

  throw new Error('No active or uncompleted phase found in ROADMAP.md');
}

/**
 * Finds the phase directory for a given phase number
 * @param {string} phasesDir - Path to phases directory
 * @param {number} phaseNumber - Phase number
 * @returns {Promise<string>} Path to phase directory
 */
async function findPhaseDir(phasesDir, phaseNumber) {
  const paddedNum = String(phaseNumber).padStart(2, '0');

  try {
    const entries = await fs.readdir(phasesDir);
    for (const entry of entries) {
      if (entry.startsWith(paddedNum + '-')) {
        return path.join(phasesDir, entry);
      }
    }
  } catch (err) {
    // Directory doesn't exist, will create it
  }

  // Create default directory name
  return path.join(phasesDir, `${paddedNum}-phase${phaseNumber}`);
}

/**
 * Gets the next task number from PLAN.md content
 * @param {string} content - PLAN.md content
 * @returns {number} Next task number
 */
function getNextTaskNumber(content) {
  const taskMatches = content.match(/### Task (\d+):/g);
  if (!taskMatches || taskMatches.length === 0) {
    return 1;
  }

  const numbers = taskMatches.map((match) => {
    const num = match.match(/### Task (\d+):/);
    return parseInt(num[1], 10);
  });

  return Math.max(...numbers) + 1;
}
