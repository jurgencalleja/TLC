/**
 * Tasks API Module
 * REST API for task CRUD operations
 */
import { promises as defaultFs } from 'fs';
import path from 'path';
import { createTlcIntrospection } from './tlc-introspection.js';

/**
 * Parse tasks from PLAN.md content
 * @param {string} content - Plan file content
 * @returns {Array} Parsed tasks
 */
export function parseTasksFromPlan(content) {
  const tasks = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: ### Task N: Name [status@owner] or ### Task N: Name [status]
    const taskMatch = line.match(/^###\s+Task\s+(\d+):\s*(.+?)\s*\[(x|>|\s*)(?:@(\w+))?\]/);
    if (taskMatch) {
      const number = parseInt(taskMatch[1], 10);
      const subject = taskMatch[2].trim();
      const marker = taskMatch[3];
      const owner = taskMatch[4] || null;

      let status;
      if (marker === 'x') {
        status = 'completed';
      } else if (marker === '>') {
        status = 'in_progress';
      } else {
        status = 'pending';
      }

      // Look for goal in next lines
      let goal = null;
      for (let j = i + 1; j < lines.length && j < i + 5; j++) {
        const goalMatch = lines[j].match(/^\*\*Goal:\*\*\s*(.+)$/);
        if (goalMatch) {
          goal = goalMatch[1].trim();
          break;
        }
        // Stop if we hit another task
        if (lines[j].match(/^###\s+Task/)) break;
      }

      tasks.push({
        number,
        subject,
        status,
        owner,
        goal
      });
    }
  }

  return tasks;
}

/**
 * Format task for API response
 * @param {Object} task - Raw task object
 * @param {number} phase - Phase number
 * @returns {Object} Formatted task
 */
export function formatTaskForApi(task, phase) {
  return {
    id: `phase-${phase}-task-${task.number}`,
    phase,
    number: task.number,
    subject: task.subject,
    status: task.status,
    owner: task.owner,
    goal: task.goal
  };
}

/**
 * Get tasks from current phase
 * @param {Object} options - Options
 * @returns {Promise<Array>} Tasks array
 */
export async function getTasks(options = {}) {
  const { introspection, fs: fileSystem = defaultFs, basePath = process.cwd() } = options;

  const currentPhase = introspection.getCurrentPhase();
  const phaseNumber = currentPhase?.number || 1;

  // Try to read the phase plan file
  const planPath = path.join(basePath, '.planning', 'phases', `${phaseNumber}-PLAN.md`);

  let content = '';
  try {
    content = await fileSystem.readFile(planPath, 'utf-8');
  } catch {
    content = '';
  }

  const tasks = parseTasksFromPlan(content);
  return tasks.map(task => formatTaskForApi(task, phaseNumber));
}

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @param {Object} options - Options
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData, options = {}) {
  if (!taskData.subject) {
    throw new Error('Subject is required');
  }

  const { fs: fileSystem = defaultFs, basePath = process.cwd() } = options;
  const phase = taskData.phase || 1;

  const planPath = path.join(basePath, '.planning', 'phases', `${phase}-PLAN.md`);

  let content = '';
  try {
    content = await fileSystem.readFile(planPath, 'utf-8');
  } catch {
    content = '## Tasks\n';
  }

  // Find highest task number
  const existingTasks = parseTasksFromPlan(content);
  const maxNumber = existingTasks.reduce((max, t) => Math.max(max, t.number), 0);
  const newNumber = maxNumber + 1;

  // Create task markdown
  const taskMd = `\n### Task ${newNumber}: ${taskData.subject} [ ]\n**Goal:** ${taskData.description || 'TBD'}\n`;

  // Append to content
  const newContent = content + taskMd;
  await fileSystem.writeFile(planPath, newContent);

  return {
    id: `phase-${phase}-task-${newNumber}`,
    phase,
    number: newNumber,
    subject: taskData.subject,
    status: 'pending',
    owner: null,
    goal: taskData.description || 'TBD'
  };
}

/**
 * Update an existing task
 * @param {string} taskId - Task ID
 * @param {Object} updates - Updates to apply
 * @param {Object} options - Options
 * @returns {Promise<Object>} Updated task
 */
export async function updateTask(taskId, updates, options = {}) {
  const { fs: fileSystem = defaultFs, basePath = process.cwd() } = options;

  // Parse task ID
  const idMatch = taskId.match(/^(?:phase-(\d+)-)?task-(\d+)$/);
  const phase = idMatch?.[1] ? parseInt(idMatch[1], 10) : 1;
  const taskNumber = idMatch?.[2] ? parseInt(idMatch[2], 10) : parseInt(taskId.replace('task-', ''), 10);

  const planPath = path.join(basePath, '.planning', 'phases', `${phase}-PLAN.md`);

  let content = '';
  try {
    content = await fileSystem.readFile(planPath, 'utf-8');
  } catch {
    throw new Error(`Task ${taskId} not found`);
  }

  const tasks = parseTasksFromPlan(content);
  const task = tasks.find(t => t.number === taskNumber);

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  // Apply updates
  const updatedTask = { ...task };
  if (updates.subject !== undefined) {
    updatedTask.subject = updates.subject;
  }
  if (updates.status !== undefined) {
    updatedTask.status = updates.status;
  }
  if (updates.owner !== undefined) {
    updatedTask.owner = updates.owner;
  }

  // Build new marker
  let marker = ' ';
  if (updatedTask.status === 'completed') marker = 'x';
  else if (updatedTask.status === 'in_progress') marker = '>';

  const ownerPart = updatedTask.owner ? `@${updatedTask.owner}` : '';
  const newMarker = `[${marker}${ownerPart}]`;

  // Replace in content
  const oldPattern = new RegExp(
    `(###\\s+Task\\s+${taskNumber}:\\s*)${task.subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s*\\[)[^\\]]*\\]`,
    'g'
  );
  const newContent = content.replace(oldPattern, `$1${updatedTask.subject}$2${marker}${ownerPart}]`);

  await fileSystem.writeFile(planPath, newContent);

  return formatTaskForApi(updatedTask, phase);
}

/**
 * Delete a task
 * @param {string} taskId - Task ID
 * @param {Object} options - Options
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId, options = {}) {
  const { fs: fileSystem = defaultFs, basePath = process.cwd() } = options;

  // Parse task ID
  const idMatch = taskId.match(/^(?:phase-(\d+)-)?task-(\d+)$/);
  const phase = idMatch?.[1] ? parseInt(idMatch[1], 10) : 1;
  const taskNumber = idMatch?.[2] ? parseInt(idMatch[2], 10) : parseInt(taskId.replace('task-', ''), 10);

  const planPath = path.join(basePath, '.planning', 'phases', `${phase}-PLAN.md`);

  let content = '';
  try {
    content = await fileSystem.readFile(planPath, 'utf-8');
  } catch {
    throw new Error(`Task ${taskId} not found`);
  }

  // Remove the task section (from ### Task N to next ### or end)
  const lines = content.split('\n');
  const newLines = [];
  let skipping = false;

  for (const line of lines) {
    const taskMatch = line.match(/^###\s+Task\s+(\d+):/);
    if (taskMatch) {
      const num = parseInt(taskMatch[1], 10);
      if (num === taskNumber) {
        skipping = true;
        continue;
      } else {
        skipping = false;
      }
    }

    if (!skipping) {
      newLines.push(line);
    }
  }

  await fileSystem.writeFile(planPath, newLines.join('\n'));
}

/**
 * Create Tasks API handlers
 * @param {Object} options - Options
 * @returns {Object} API handlers
 */
export function createTasksApi(options = {}) {
  const { basePath = process.cwd(), fs: fileSystem = defaultFs } = options;
  const introspection = options.introspection || createTlcIntrospection({ basePath, fs: fileSystem });

  return {
    async get(query = {}) {
      return getTasks({ introspection, fs: fileSystem, basePath });
    },

    async post(taskData) {
      return createTask(taskData, { fs: fileSystem, basePath });
    },

    async patch(taskId, updates) {
      return updateTask(taskId, updates, { fs: fileSystem, basePath });
    },

    async delete(taskId) {
      return deleteTask(taskId, { fs: fileSystem, basePath });
    }
  };
}
