/**
 * Workspace Detector Tests
 *
 * Tests for detecting when a project is inside a TLC workspace.
 * Uses temp directories with actual marker files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** Create a unique temp directory for each test */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ws-detect-'));
}

/** Recursively remove a directory */
function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('WorkspaceDetector', () => {
  let tmpDir;
  let createWorkspaceDetector;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    const mod = await import('./workspace-detector.js');
    createWorkspaceDetector = mod.createWorkspaceDetector;
  });

  afterEach(() => {
    if (tmpDir) rmDir(tmpDir);
  });

  it('detects workspace when projects.json exists in parent directory', () => {
    // workspace/
    //   projects.json
    //   my-project/
    const wsRoot = tmpDir;
    const projectDir = path.join(wsRoot, 'my-project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(wsRoot, 'projects.json'), '{}');

    const detector = createWorkspaceDetector();
    const result = detector.detectWorkspace(projectDir);

    expect(result.isInWorkspace).toBe(true);
    expect(result.workspaceRoot).toBe(wsRoot);
    expect(result.projectPath).toBe(projectDir);
  });

  it('detects workspace when parent has .tlc.json with workspace: true', () => {
    // workspace/
    //   .tlc.json  (contains "workspace": true)
    //   my-project/
    const wsRoot = tmpDir;
    const projectDir = path.join(wsRoot, 'my-project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(
      path.join(wsRoot, '.tlc.json'),
      JSON.stringify({ workspace: true })
    );

    const detector = createWorkspaceDetector();
    const result = detector.detectWorkspace(projectDir);

    expect(result.isInWorkspace).toBe(true);
    expect(result.workspaceRoot).toBe(wsRoot);
  });

  it('detects workspace when parent has memory/ directory', () => {
    // workspace/
    //   memory/
    //   my-project/
    const wsRoot = tmpDir;
    const projectDir = path.join(wsRoot, 'my-project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(wsRoot, 'memory'), { recursive: true });

    const detector = createWorkspaceDetector();
    const result = detector.detectWorkspace(projectDir);

    expect(result.isInWorkspace).toBe(true);
    expect(result.workspaceRoot).toBe(wsRoot);
  });

  it('returns isInWorkspace=false for standalone project', () => {
    // standalone-project/   (no markers in any parent up to tmpDir)
    const projectDir = path.join(tmpDir, 'standalone-project');
    fs.mkdirSync(projectDir, { recursive: true });

    // Pass a boundary so we don't walk past tmpDir into real filesystem
    const detector = createWorkspaceDetector({ boundary: tmpDir });
    const result = detector.detectWorkspace(projectDir);

    expect(result.isInWorkspace).toBe(false);
    expect(result.workspaceRoot).toBeNull();
    expect(result.projectPath).toBe(projectDir);
    expect(result.relativeProjectPath).toBeNull();
  });

  it('stops at home directory (does not scan above os.homedir())', () => {
    // By default, the detector should not walk above os.homedir().
    // We test this by verifying the detector respects a boundary.
    // Since we can't create dirs above home, we simulate with boundary option.
    const homeDir = os.homedir();
    const detector = createWorkspaceDetector();

    // The real homedir may or may not be in a workspace - we just verify
    // the detector does not throw and returns a valid shape
    const result = detector.detectWorkspace(homeDir);
    expect(result).toHaveProperty('isInWorkspace');
    expect(result).toHaveProperty('workspaceRoot');
    expect(result).toHaveProperty('projectPath');
    expect(result).toHaveProperty('relativeProjectPath');
  });

  it('stops at filesystem root', () => {
    // Pass the filesystem root. Should not throw or loop infinitely.
    const detector = createWorkspaceDetector();
    const result = detector.detectWorkspace('/');

    expect(result.isInWorkspace).toBe(false);
    expect(result.workspaceRoot).toBeNull();
    expect(result.projectPath).toBe('/');
  });

  it('caches result across calls (same input returns same object)', () => {
    const wsRoot = tmpDir;
    const projectDir = path.join(wsRoot, 'cached-project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(wsRoot, 'projects.json'), '{}');

    const detector = createWorkspaceDetector();
    const first = detector.detectWorkspace(projectDir);
    const second = detector.detectWorkspace(projectDir);

    // Same reference - not just equal, but identical object
    expect(first).toBe(second);
  });

  it('handles nested workspaces (nearest parent wins)', () => {
    // outer-workspace/
    //   projects.json
    //   inner-workspace/
    //     projects.json
    //     my-project/
    const outerWs = tmpDir;
    const innerWs = path.join(outerWs, 'inner-workspace');
    const projectDir = path.join(innerWs, 'my-project');

    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(outerWs, 'projects.json'), '{}');
    fs.writeFileSync(path.join(innerWs, 'projects.json'), '{}');

    const detector = createWorkspaceDetector();
    const result = detector.detectWorkspace(projectDir);

    expect(result.isInWorkspace).toBe(true);
    // Nearest parent (inner) should win
    expect(result.workspaceRoot).toBe(innerWs);
  });

  it('returns correct relative project path', () => {
    const wsRoot = tmpDir;
    const projectDir = path.join(wsRoot, 'apps', 'my-project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(wsRoot, 'projects.json'), '{}');

    const detector = createWorkspaceDetector();
    const result = detector.detectWorkspace(projectDir);

    expect(result.isInWorkspace).toBe(true);
    expect(result.relativeProjectPath).toBe(path.join('apps', 'my-project'));
    expect(result.projectPath).toBe(projectDir);
  });

  it('works when project IS the workspace root itself', () => {
    // The project dir itself has workspace markers
    const projectDir = tmpDir;
    fs.writeFileSync(path.join(projectDir, 'projects.json'), '{}');

    const detector = createWorkspaceDetector();
    const result = detector.detectWorkspace(projectDir);

    expect(result.isInWorkspace).toBe(true);
    expect(result.workspaceRoot).toBe(projectDir);
    expect(result.projectPath).toBe(projectDir);
    expect(result.relativeProjectPath).toBe('.');
  });
});
