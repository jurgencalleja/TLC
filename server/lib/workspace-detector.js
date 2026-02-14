/**
 * Workspace Detector
 *
 * Detects when the current project is inside a TLC workspace by walking up
 * the directory tree looking for workspace markers:
 *   - projects.json file
 *   - .tlc.json with "workspace": true
 *   - memory/ directory
 *
 * @module workspace-detector
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Check whether a directory contains any workspace marker.
 *
 * Markers (checked in order):
 *   1. projects.json file
 *   2. .tlc.json with { "workspace": true }
 *   3. memory/ directory
 *
 * @param {string} dir - Absolute path to check
 * @returns {boolean} true if the directory is a workspace root
 */
function hasWorkspaceMarker(dir) {
  // Marker 1: projects.json
  try {
    const pj = path.join(dir, 'projects.json');
    if (fs.statSync(pj).isFile()) return true;
  } catch { /* not found */ }

  // Marker 2: .tlc.json with workspace: true
  try {
    const tlcPath = path.join(dir, '.tlc.json');
    if (fs.statSync(tlcPath).isFile()) {
      const content = fs.readFileSync(tlcPath, 'utf8');
      const json = JSON.parse(content);
      if (json && json.workspace === true) return true;
    }
  } catch { /* not found or invalid json */ }

  // Marker 3: memory/ directory
  try {
    const memDir = path.join(dir, 'memory');
    if (fs.statSync(memDir).isDirectory()) return true;
  } catch { /* not found */ }

  return false;
}

/**
 * Create a workspace detector instance.
 *
 * @param {Object} [options]
 * @param {string} [options.boundary] - Stop walking at this directory (exclusive).
 *   Defaults to os.homedir()'s parent.  The detector will never walk above
 *   os.homedir() regardless of this setting.
 * @returns {{ detectWorkspace: (projectDir: string) => WorkspaceResult }}
 *
 * @typedef {Object} WorkspaceResult
 * @property {boolean} isInWorkspace
 * @property {string|null} workspaceRoot
 * @property {string} projectPath
 * @property {string|null} relativeProjectPath
 */
export function createWorkspaceDetector(options = {}) {
  const cache = new Map();
  const homeDir = os.homedir();
  const boundary = options.boundary || null;

  /**
   * Detect whether `projectDir` lives inside a workspace.
   *
   * Walks from `projectDir` upward, checking each directory for workspace
   * markers.  Stops at the first match (nearest parent wins), or when it
   * reaches the home directory, filesystem root, or the configured boundary.
   *
   * @param {string} projectDir - Absolute path to the project directory
   * @returns {WorkspaceResult}
   */
  function detectWorkspace(projectDir) {
    const resolved = path.resolve(projectDir);

    if (cache.has(resolved)) {
      return cache.get(resolved);
    }

    let result;

    // Check the project dir itself first
    if (hasWorkspaceMarker(resolved)) {
      result = {
        isInWorkspace: true,
        workspaceRoot: resolved,
        projectPath: resolved,
        relativeProjectPath: '.',
      };
      cache.set(resolved, result);
      return result;
    }

    // Walk upward
    let current = path.dirname(resolved);

    while (true) {
      // Stop conditions
      // 1. Hit boundary (the boundary dir itself is NOT scanned)
      if (boundary && current === path.resolve(boundary)) {
        break;
      }

      // 2. Walked above home directory
      if (homeDir && !current.startsWith(homeDir) && resolved.startsWith(homeDir)) {
        break;
      }

      // 3. Hit filesystem root (path.dirname returns itself)
      if (current === path.dirname(current)) {
        // Check the root itself before giving up
        if (hasWorkspaceMarker(current)) {
          result = {
            isInWorkspace: true,
            workspaceRoot: current,
            projectPath: resolved,
            relativeProjectPath: path.relative(current, resolved),
          };
          cache.set(resolved, result);
          return result;
        }
        break;
      }

      if (hasWorkspaceMarker(current)) {
        result = {
          isInWorkspace: true,
          workspaceRoot: current,
          projectPath: resolved,
          relativeProjectPath: path.relative(current, resolved),
        };
        cache.set(resolved, result);
        return result;
      }

      current = path.dirname(current);
    }

    // No workspace found
    result = {
      isInWorkspace: false,
      workspaceRoot: null,
      projectPath: resolved,
      relativeProjectPath: null,
    };
    cache.set(resolved, result);
    return result;
  }

  return { detectWorkspace };
}
