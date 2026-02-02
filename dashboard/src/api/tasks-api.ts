/**
 * Tasks API - Returns tasks from PLAN.md files in flat array format
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Dirent } from 'fs';

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner: string | null;
  phase: number;
}

export interface FileSystem {
  existsSync: (path: string) => boolean;
  readdir: (path: string, options: { withFileTypes: true }) => Promise<Dirent[]>;
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
}

// Default file system implementation
const defaultFs: FileSystem = {
  existsSync,
  readdir: (path, options) => readdir(path, options),
  readFile: (path, encoding) => readFile(path, encoding),
};

/**
 * Get all tasks from all PLAN.md files in the planning directory
 * @param projectPath - Root path of the project
 * @param fs - File system implementation (for testing)
 * @returns Array of tasks in flat format, sorted by phase then task number
 */
export async function getTasks(
  projectPath: string,
  fs: FileSystem = defaultFs
): Promise<Task[]> {
  const phasesDir = join(projectPath, '.planning', 'phases');

  if (!fs.existsSync(phasesDir)) {
    return [];
  }

  const tasks: Task[] = [];

  try {
    const entries = await fs.readdir(phasesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Extract phase number from directory name (e.g., "39-fix-api" -> 39)
        const dirMatch = entry.name.match(/^(\d+)/);
        if (dirMatch) {
          const phaseNum = parseInt(dirMatch[1], 10);
          const planPath = join(phasesDir, entry.name, `${dirMatch[1]}-PLAN.md`);

          if (fs.existsSync(planPath)) {
            try {
              const content = await fs.readFile(planPath, 'utf-8');
              const phaseTasks = parseTasksFromPlan(content, phaseNum);
              tasks.push(...phaseTasks);
            } catch {
              // Skip unreadable files
            }
          }
        }
      }
    }
  } catch {
    // Return empty if can't read directory
    return [];
  }

  // Sort by phase number, then by task number
  tasks.sort((a, b) => {
    if (a.phase !== b.phase) {
      return a.phase - b.phase;
    }
    // Extract task number from id (e.g., "39-1" -> 1)
    const aTaskNum = parseInt(a.id.split('-')[1], 10);
    const bTaskNum = parseInt(b.id.split('-')[1], 10);
    return aTaskNum - bTaskNum;
  });

  return tasks;
}

/**
 * Parse tasks from PLAN.md content
 * @param content - Content of the PLAN.md file
 * @param phaseNum - Phase number for task ID generation
 * @returns Array of tasks parsed from the content
 */
export function parseTasksFromPlan(content: string, phaseNum: number): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match task headers like:
    // "### Task 1: Setup Project [x@alice]"
    // "### Task 1: Setup Project [>]"
    // "### Task 1: Setup Project [ ]"
    // "### Task 1: Name [x]"
    // Requires colon after task number
    const taskMatch = line.match(
      /^###\s*Task\s+(\d+):\s*(.+?)\s*\[([x> ]?)(?:@(\w+))?\]\s*$/i
    );

    if (taskMatch) {
      const taskNum = parseInt(taskMatch[1], 10);
      const title = taskMatch[2].trim();
      const statusChar = taskMatch[3].trim();
      const owner = taskMatch[4] || null;

      const status: Task['status'] =
        statusChar === 'x' ? 'completed' :
        statusChar === '>' ? 'in_progress' : 'pending';

      tasks.push({
        id: `${phaseNum}-${taskNum}`,
        title,
        status,
        owner,
        phase: phaseNum,
      });
    }
  }

  return tasks;
}
