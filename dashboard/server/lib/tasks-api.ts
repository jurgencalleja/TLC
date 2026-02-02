/**
 * Tasks API - Returns tasks from PLAN.md files in flat array format
 */

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner: string | null;
  phase: number;
}

/**
 * Get all tasks from all PLAN.md files in the planning directory
 * @param projectPath - Root path of the project
 * @returns Array of tasks in flat format
 */
export async function getTasks(projectPath: string): Promise<Task[]> {
  // TODO: Implement
  return [];
}
