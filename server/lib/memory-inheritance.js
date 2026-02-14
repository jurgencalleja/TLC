/**
 * Memory Inheritance Engine
 *
 * When loading memory for a project, also loads workspace-level memory
 * and merges with correct priority. Project-level items override
 * workspace-level items that share the same filename slug (topic).
 *
 * @module memory-inheritance
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Default relevance score for project-level memory items.
 * @type {number}
 */
const PROJECT_RELEVANCE = 1.0;

/**
 * Default relevance score for workspace-level memory items.
 * @type {number}
 */
const WORKSPACE_RELEVANCE = 0.5;

/**
 * Memory categories that the inheritance engine reads.
 * @type {string[]}
 */
const CATEGORIES = ['decisions', 'gotchas', 'preferences', 'conversations'];

/**
 * Read all .md files from a directory, returning an array of memory items.
 *
 * @param {string} dir - Absolute path to a memory category directory
 * @param {string} source - 'project' or 'workspace'
 * @returns {Object[]} Array of { filename, text, source, topic, relevance }
 */
function readMemoryFiles(dir, source) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  const items = [];
  const relevance = source === 'project' ? PROJECT_RELEVANCE : WORKSPACE_RELEVANCE;

  for (const filename of entries.sort()) {
    if (!filename.endsWith('.md')) continue;

    const filepath = path.join(dir, filename);
    try {
      const stat = fs.statSync(filepath);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }

    const text = fs.readFileSync(filepath, 'utf8');
    const topic = filename.replace(/\.md$/, '');

    items.push({
      filename,
      text,
      source,
      topic,
      relevance,
    });
  }

  return items;
}

/**
 * Merge two arrays of memory items. Project items override workspace items
 * when they share the same topic (filename slug). For categories where
 * override semantics apply (decisions, preferences), matching topics cause
 * the workspace item to be dropped. For union categories (gotchas,
 * conversations), all items are included.
 *
 * @param {Object[]} projectItems - Items from the project memory
 * @param {Object[]} workspaceItems - Items from the workspace memory
 * @param {string} category - The category name
 * @returns {Object[]} Merged items with project taking priority
 */
function mergeItems(projectItems, workspaceItems, category) {
  const overrideCategories = ['decisions', 'preferences'];

  if (!overrideCategories.includes(category)) {
    // Union: include all items from both sources
    return [...projectItems, ...workspaceItems];
  }

  // Override: project items replace workspace items with the same topic
  const projectTopics = new Set(projectItems.map((item) => item.topic));
  const filtered = workspaceItems.filter(
    (item) => !projectTopics.has(item.topic)
  );

  return [...projectItems, ...filtered];
}

/**
 * Create a memory inheritance engine instance.
 *
 * @param {Object} options
 * @param {Object} options.workspaceDetector - A workspace detector instance
 *   with a detectWorkspace(projectDir) method.
 * @returns {{ loadInheritedMemory: Function, getInheritedRoots: Function }}
 */
export function createMemoryInheritance({ workspaceDetector }) {
  /**
   * Load memory from a project directory, inheriting workspace-level memory
   * when the project is inside a workspace.
   *
   * @param {string} projectDir - Absolute path to the project directory
   * @returns {Promise<Object>} Merged memory with decisions, gotchas,
   *   preferences, and conversations arrays
   */
  async function loadInheritedMemory(projectDir) {
    const resolved = path.resolve(projectDir);
    const wsResult = workspaceDetector.detectWorkspace(resolved);

    const projectMemoryRoot = path.join(resolved, 'memory');
    const workspaceMemoryRoot = wsResult.isInWorkspace
      ? path.join(wsResult.workspaceRoot, 'memory')
      : null;

    const result = {
      decisions: [],
      gotchas: [],
      preferences: [],
      conversations: [],
    };

    for (const category of CATEGORIES) {
      const projectDir_ = path.join(projectMemoryRoot, category);
      const projectItems = readMemoryFiles(projectDir_, 'project');

      let workspaceItems = [];
      if (workspaceMemoryRoot) {
        const wsDir = path.join(workspaceMemoryRoot, category);
        workspaceItems = readMemoryFiles(wsDir, 'workspace');
      }

      result[category] = mergeItems(projectItems, workspaceItems, category);
    }

    return result;
  }

  /**
   * Get the list of memory root directories that would be consulted
   * for the given project.
   *
   * @param {string} projectDir - Absolute path to the project directory
   * @returns {string[]} Array of memory root paths (project first, then workspace)
   */
  function getInheritedRoots(projectDir) {
    const resolved = path.resolve(projectDir);
    const wsResult = workspaceDetector.detectWorkspace(resolved);

    const roots = [path.join(resolved, 'memory')];

    if (wsResult.isInWorkspace) {
      roots.push(path.join(wsResult.workspaceRoot, 'memory'));
    }

    return roots;
  }

  return { loadInheritedMemory, getInheritedRoots };
}
