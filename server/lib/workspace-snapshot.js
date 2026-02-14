/**
 * Workspace Snapshot & Restore
 * Capture workspace state (branches, uncommitted changes, TLC phase) and restore it.
 * "Where was I?" across machines.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Get git state for a single repo
 * @param {string} repoPath - Absolute path to the repository
 * @returns {Object} Git state with branch, lastCommit, hasUncommitted
 */
function getGitState(repoPath) {
  let branch = null;
  let lastCommit = null;
  let hasUncommitted = false;

  try {
    branch = String(execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf-8',
    })).trim();
  } catch {
    branch = null;
  }

  try {
    lastCommit = String(execSync('git rev-parse HEAD', {
      cwd: repoPath,
      encoding: 'utf-8',
    })).trim();
  } catch {
    lastCommit = null;
  }

  try {
    const status = String(execSync('git status --porcelain', {
      cwd: repoPath,
      encoding: 'utf-8',
    })).trim();
    hasUncommitted = status.length > 0;
  } catch {
    hasUncommitted = false;
  }

  return { branch, lastCommit, hasUncommitted };
}

/**
 * Detect current TLC phase from ROADMAP.md
 * Looks for a line with [>] marker indicating the active phase.
 * @param {string} repoPath - Absolute path to the repository
 * @returns {{ phase: number|null, phaseName: string|null }}
 */
function detectTlcPhase(repoPath) {
  const roadmapPath = path.join(repoPath, '.planning', 'ROADMAP.md');

  try {
    if (!fs.existsSync(roadmapPath)) {
      return { phase: null, phaseName: null };
    }

    const content = fs.readFileSync(roadmapPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Match lines like: - [>] Phase 2: Core Features
      const match = line.match(/\[>\]\s*Phase\s+(\d+):\s*(.+)/i);
      if (match) {
        return {
          phase: parseInt(match[1], 10),
          phaseName: match[2].trim(),
        };
      }
    }

    return { phase: null, phaseName: null };
  } catch {
    return { phase: null, phaseName: null };
  }
}

/**
 * Detect active tasks from the current phase PLAN.md
 * Looks for lines with [>@assignee] markers.
 * @param {string} repoPath - Absolute path to the repository
 * @param {number|null} phaseNumber - Current phase number
 * @returns {Array<{ task: string, assignee: string }>}
 */
function detectActiveTasks(repoPath, phaseNumber) {
  if (!phaseNumber) return [];

  const planPath = path.join(repoPath, '.planning', 'phases', `${phaseNumber}-PLAN.md`);

  try {
    if (!fs.existsSync(planPath)) {
      return [];
    }

    const content = fs.readFileSync(planPath, 'utf-8');
    const lines = content.split('\n');
    const activeTasks = [];

    for (const line of lines) {
      // Match lines like: ### Task 2: API Routes [>@bob]
      const match = line.match(/###\s*Task\s+\d+:\s*(.+?)\s*\[>@(\w+)\]/i);
      if (match) {
        activeTasks.push({
          task: match[1].trim(),
          assignee: match[2].trim(),
        });
      }
    }

    return activeTasks;
  } catch {
    return [];
  }
}

/**
 * Factory function to create a workspace snapshot manager
 * @param {Object} options - Options
 * @param {Object} options.registry - Registry with listProjects() method
 * @returns {Object} Snapshot manager with snapshot, restore, diff methods
 */
export function createWorkspaceSnapshot({ registry }) {
  /**
   * Capture current workspace state for all registered projects
   * @param {string} workspaceRoot - Absolute path to the workspace root
   * @returns {Object} State object with timestamp and per-project state
   */
  async function snapshot(workspaceRoot) {
    const projects = await registry.listProjects();
    const projectStates = [];

    for (const project of projects) {
      const repoPath = path.join(workspaceRoot, project.localPath);
      const gitState = getGitState(repoPath);
      const { phase, phaseName } = detectTlcPhase(repoPath);
      const activeTasks = detectActiveTasks(repoPath, phase);

      projectStates.push({
        name: project.name,
        branch: gitState.branch,
        lastCommit: gitState.lastCommit,
        hasUncommitted: gitState.hasUncommitted,
        tlcPhase: phase,
        tlcPhaseName: phaseName,
        activeTasks,
      });
    }

    const state = {
      timestamp: Date.now(),
      projects: projectStates,
    };

    // Save to workspace-state.json
    const stateFile = path.join(workspaceRoot, 'workspace-state.json');
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');

    return state;
  }

  /**
   * Restore workspace state from workspace-state.json
   * Checks out the saved branch for each project.
   * @param {string} workspaceRoot - Absolute path to the workspace root
   * @returns {Object} The restored state
   */
  async function restore(workspaceRoot) {
    const stateFile = path.join(workspaceRoot, 'workspace-state.json');
    const content = fs.readFileSync(stateFile, 'utf-8');
    const state = JSON.parse(content);

    for (const project of state.projects) {
      if (!project.branch) continue;

      const repoPath = path.join(workspaceRoot, project.name);
      execSync(`git checkout ${project.branch}`, {
        cwd: repoPath,
        encoding: 'utf-8',
      });
    }

    return state;
  }

  /**
   * Compare current workspace state to saved snapshot
   * @param {string} workspaceRoot - Absolute path to the workspace root
   * @returns {Array<{ project: string, field: string, was: any, now: any }>} Changes
   */
  async function diff(workspaceRoot) {
    // Read saved state
    const stateFile = path.join(workspaceRoot, 'workspace-state.json');
    const content = fs.readFileSync(stateFile, 'utf-8');
    const savedState = JSON.parse(content);

    // Get current state for each project
    const projects = await registry.listProjects();
    const changes = [];

    for (const project of projects) {
      const repoPath = path.join(workspaceRoot, project.localPath);
      const currentGit = getGitState(repoPath);

      const savedProject = savedState.projects.find(p => p.name === project.name);
      if (!savedProject) continue;

      // Compare fields
      const fieldsToCompare = ['branch', 'lastCommit', 'hasUncommitted'];
      for (const field of fieldsToCompare) {
        const savedValue = savedProject[field];
        const currentValue = currentGit[field];

        if (savedValue !== currentValue) {
          changes.push({
            project: project.name,
            field,
            was: savedValue,
            now: currentValue,
          });
        }
      }
    }

    return changes;
  }

  return { snapshot, restore, diff };
}
