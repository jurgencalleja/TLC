import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface Task {
  id: string;
  title: string;
  description: string;
  phase: number;
}

// Parse tasks from a PLAN.md file
export async function parseTasksFromPlan(planPath: string): Promise<Task[]> {
  if (!existsSync(planPath)) return [];

  const content = await readFile(planPath, 'utf-8');
  const tasks: Task[] = [];

  // Match task blocks like:
  // ## Task 1: Setup auth
  // or <task id="01-01">
  const taskRegex = /(?:##\s*Task\s*(\d+)[:\s]+(.+)|<task\s+id="([^"]+)"[^>]*>)/gi;
  let match;

  while ((match = taskRegex.exec(content)) !== null) {
    const id = match[3] || `task-${match[1]}`;
    const title = match[2] || id;

    // Get description (text until next heading or task tag)
    const startIdx = match.index + match[0].length;
    const nextMatch = content.slice(startIdx).match(/(?:##\s*Task|<task\s|<\/task>)/);
    const endIdx = nextMatch ? startIdx + nextMatch.index! : startIdx + 500;
    const description = content.slice(startIdx, endIdx).trim().slice(0, 500);

    tasks.push({ id, title, description, phase: 0 });
  }

  return tasks;
}

// Push approved plan tasks to GitHub Issues
export async function syncPlanToGitHub(
  tasks: Task[],
  phaseNumber: number,
  phaseName: string
): Promise<Map<string, number>> {
  const taskToIssue = new Map<string, number>();

  for (const task of tasks) {
    try {
      const body = `## Phase ${phaseNumber}: ${phaseName}

### Task: ${task.title}

${task.description}

---
*Created by TDD Dashboard*
*Task ID: ${task.id}*`;

      const { stdout } = await execAsync(
        `gh issue create --title "[Phase ${phaseNumber}] ${task.title}" --body "${body.replace(/"/g, '\\"')}" --label "tdd,phase-${phaseNumber}"`,
        { cwd: process.cwd() }
      );

      // Extract issue number from output
      const issueMatch = stdout.match(/issues\/(\d+)/);
      if (issueMatch) {
        taskToIssue.set(task.id, parseInt(issueMatch[1], 10));
      }
    } catch (e) {
      console.error(`Failed to create issue for task ${task.id}:`, e);
    }
  }

  return taskToIssue;
}

// Mark issue as in-progress when agent starts
export async function markIssueInProgress(issueNumber: number): Promise<void> {
  try {
    await execAsync(
      `gh issue edit ${issueNumber} --add-label "in-progress" --remove-label "tdd"`,
      { cwd: process.cwd() }
    );
  } catch (e) {
    // Ignore - label might not exist
  }
}

// Mark issue as complete when agent finishes
export async function markIssueComplete(issueNumber: number): Promise<void> {
  try {
    await execAsync(
      `gh issue close ${issueNumber} --comment "Completed by TDD agent"`,
      { cwd: process.cwd() }
    );
  } catch (e) {
    // Ignore errors
  }
}

// Check if plan is approved (has APPROVED marker or user confirmed)
export async function isPlanApproved(planPath: string): Promise<boolean> {
  if (!existsSync(planPath)) return false;

  const content = await readFile(planPath, 'utf-8');
  return content.includes('[APPROVED]') || content.includes('Status: Approved');
}

// Mark plan as approved
export async function approvePlan(planPath: string): Promise<void> {
  if (!existsSync(planPath)) return;

  const content = await readFile(planPath, 'utf-8');
  const updatedContent = content.replace(
    /^(#.+)$/m,
    '$1\n\n> **Status: Approved** - Tasks synced to GitHub'
  );

  const { writeFile } = await import('fs/promises');
  await writeFile(planPath, updatedContent);
}
