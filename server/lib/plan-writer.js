/**
 * Plan Writer - CRUD operations for tasks in PLAN.md files
 *
 * Provides functions to update task status, content, and create new tasks.
 * All writes are atomic (write to temp file, then rename).
 *
 * Uses dependency injection for fs to enable testability.
 */

/**
 * Create a plan writer with injected dependencies
 * @param {object} deps
 * @param {object} deps.fs - Node.js fs module (or mock)
 * @returns {{ updateTaskStatus, updateTaskContent, createTask }}
 */
function createPlanWriter({ fs }) {
  /**
   * Write content atomically: write to .tmp, then rename
   */
  function atomicWrite(filePath, content) {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  /**
   * Find all task headings in PLAN.md content
   * Returns array of { num, match, index, fullMatch, title, statusMarker }
   */
  function findTasks(content) {
    const tasks = [];
    const regex = /###\s+Task\s+(\d+):\s+(.+?)\s*\[([^\]]*)\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tasks.push({
        num: parseInt(match[1]),
        title: match[2].trim(),
        statusMarker: match[3],
        fullMatch: match[0],
        index: match.index,
      });
    }
    return tasks;
  }

  /**
   * Build a status marker string from status and owner
   */
  function buildStatusMarker(status, owner) {
    if (status === 'done') {
      return owner ? `x@${owner}` : 'x';
    } else if (status === 'in_progress') {
      return owner ? `>@${owner}` : '>';
    }
    return ' ';
  }

  /**
   * Update a task's status marker in PLAN.md
   * @param {string} planPath - Path to PLAN.md file
   * @param {number} taskNum - Task number to update
   * @param {string} newStatus - 'pending' | 'in_progress' | 'done'
   * @param {string|null} owner - Username for claim/complete
   */
  function updateTaskStatus(planPath, taskNum, newStatus, owner) {
    const content = fs.readFileSync(planPath, 'utf-8');
    const tasks = findTasks(content);
    const task = tasks.find((t) => t.num === taskNum);

    if (!task) {
      throw new Error(`Task ${taskNum} not found in ${planPath}`);
    }

    const newMarker = buildStatusMarker(newStatus, owner);
    const newHeading = `### Task ${taskNum}: ${task.title} [${newMarker}]`;
    const updated = content.replace(task.fullMatch, newHeading);

    atomicWrite(planPath, updated);
  }

  /**
   * Update a task's content (title, acceptance criteria)
   * @param {string} planPath - Path to PLAN.md file
   * @param {number} taskNum - Task number to update
   * @param {object} updates - { title?, acceptanceCriteria? }
   */
  function updateTaskContent(planPath, taskNum, updates) {
    let content = fs.readFileSync(planPath, 'utf-8');
    const tasks = findTasks(content);
    const task = tasks.find((t) => t.num === taskNum);

    if (!task) {
      throw new Error(`Task ${taskNum} not found in ${planPath}`);
    }

    // Update title if provided
    if (updates.title) {
      const newHeading = `### Task ${taskNum}: ${updates.title} [${task.statusMarker}]`;
      content = content.replace(task.fullMatch, newHeading);
    }

    // Update acceptance criteria if provided
    if (updates.acceptanceCriteria && Array.isArray(updates.acceptanceCriteria)) {
      // Find the acceptance criteria section for this task
      const taskStart = content.indexOf(`### Task ${taskNum}:`);
      const nextTaskMatch = content.slice(taskStart + 1).match(/\n###\s+Task\s+\d+:/);
      const nextSectionMatch = content.slice(taskStart + 1).match(/\n---/);
      let taskEnd = content.length;
      if (nextTaskMatch) taskEnd = taskStart + 1 + nextTaskMatch.index;
      if (nextSectionMatch && taskStart + 1 + nextSectionMatch.index < taskEnd) {
        taskEnd = taskStart + 1 + nextSectionMatch.index;
      }

      const taskSection = content.slice(taskStart, taskEnd);

      // Find and replace acceptance criteria block
      const acMatch = taskSection.match(
        /(\*\*Acceptance Criteria:\*\*\n)((?:- \[[ x]\] .+\n?)*)/
      );
      if (acMatch) {
        const newCriteria = updates.acceptanceCriteria
          .map((c) => `- [ ] ${c}`)
          .join('\n');
        const newSection = taskSection.replace(
          acMatch[0],
          `**Acceptance Criteria:**\n${newCriteria}\n`
        );
        content = content.slice(0, taskStart) + newSection + content.slice(taskEnd);
      }
    }

    atomicWrite(planPath, content);
  }

  /**
   * Create a new task in PLAN.md
   * @param {string} planPath - Path to PLAN.md file
   * @param {object} taskData - { title, goal, acceptanceCriteria?, testCases? }
   * @returns {{ num: number, title: string, status: string }}
   */
  function createTask(planPath, taskData) {
    let content;
    try {
      content = fs.readFileSync(planPath, 'utf-8');
    } catch {
      content = '# Plan\n\n## Tasks\n';
    }

    const tasks = findTasks(content);
    const nextNum = tasks.length > 0 ? Math.max(...tasks.map((t) => t.num)) + 1 : 1;

    // Build task section
    const lines = [];
    lines.push(`\n### Task ${nextNum}: ${taskData.title} [ ]`);
    lines.push('');
    if (taskData.goal) {
      lines.push(`**Goal:** ${taskData.goal}`);
      lines.push('');
    }
    if (taskData.acceptanceCriteria && taskData.acceptanceCriteria.length > 0) {
      lines.push('**Acceptance Criteria:**');
      for (const criterion of taskData.acceptanceCriteria) {
        lines.push(`- [ ] ${criterion}`);
      }
      lines.push('');
    }
    if (taskData.testCases && taskData.testCases.length > 0) {
      lines.push('**Test Cases:**');
      for (const testCase of taskData.testCases) {
        lines.push(`- ${testCase}`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('');

    const taskBlock = lines.join('\n');

    // Find insertion point: before ## Dependencies or at end of ## Tasks section
    const depsIndex = content.indexOf('\n## Dependencies');
    if (depsIndex > -1) {
      content = content.slice(0, depsIndex) + taskBlock + content.slice(depsIndex);
    } else {
      // Just append
      content = content.trimEnd() + '\n' + taskBlock;
    }

    atomicWrite(planPath, content);

    return { num: nextNum, title: taskData.title, status: 'pending' };
  }

  return { updateTaskStatus, updateTaskContent, createTask };
}

module.exports = { createPlanWriter };
