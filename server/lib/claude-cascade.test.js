/**
 * CLAUDE.md Cascade Tests
 *
 * Tests for injecting workspace-level CLAUDE.md content into child project context.
 * Uses temp directories with actual CLAUDE.md files and a mocked workspaceDetector.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createClaudeCascade } from './claude-cascade.js';

/** Create a unique temp directory for each test */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-cascade-'));
}

/** Recursively remove a directory */
function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('ClaudeCascade', () => {
  let tmpDir;
  let wsRoot;
  let projectDir;
  let mockDetector;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    wsRoot = path.join(tmpDir, 'workspace');
    projectDir = path.join(wsRoot, 'my-project');
    fs.mkdirSync(projectDir, { recursive: true });

    mockDetector = {
      detectWorkspace: vi.fn().mockReturnValue({
        isInWorkspace: true,
        workspaceRoot: wsRoot,
        projectPath: projectDir,
        relativeProjectPath: 'my-project',
      }),
    };
  });

  afterEach(() => {
    if (tmpDir) rmDir(tmpDir);
  });

  describe('getCascadedContext', () => {
    it('reads workspace CLAUDE.md content', async () => {
      const wsContent = '# Workspace Rules\n\n## Coding Standards\n\nUse semicolons.\n';
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), wsContent);
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\n');

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      const context = await cascade.getCascadedContext(projectDir);

      expect(context.workspaceContent).toContain('Workspace Rules');
      expect(context.workspaceContent).toContain('Use semicolons');
    });

    it('reads project CLAUDE.md content', async () => {
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), '# Workspace\n');
      const projContent = '# My Project\n\nProject-specific rules.\n';
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), projContent);

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      const context = await cascade.getCascadedContext(projectDir);

      expect(context.projectContent).toContain('My Project');
      expect(context.projectContent).toContain('Project-specific rules');
    });

    it('injects workspace content between TLC-WORKSPACE-START/END markers', async () => {
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), '# Workspace\n\n## Coding Standards\n\nFollow TDD.\n');
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\n');

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      const context = await cascade.getCascadedContext(projectDir);

      expect(context.merged).toContain('<!-- TLC-WORKSPACE-START -->');
      expect(context.merged).toContain('<!-- TLC-WORKSPACE-END -->');
      expect(context.merged).toContain('Follow TDD');
    });

    it('project rules take precedence (project content appears after workspace)', async () => {
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), '# Workspace\n\n## Conventions\n\nWorkspace convention.\n');
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\n\nProject rule.\n');

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      const context = await cascade.getCascadedContext(projectDir);

      const wsStartIdx = context.merged.indexOf('<!-- TLC-WORKSPACE-START -->');
      const wsEndIdx = context.merged.indexOf('<!-- TLC-WORKSPACE-END -->');
      const projectIdx = context.merged.indexOf('Project rule');

      // Project content must appear after the workspace section
      expect(projectIdx).toBeGreaterThan(wsEndIdx);
      // Workspace content is between markers
      expect(wsStartIdx).toBeLessThan(wsEndIdx);
    });

    it('only relevant sections injected (coding standards, conventions, architecture)', async () => {
      const wsContent = [
        '# Workspace',
        '',
        '## Coding Standards',
        '',
        'Use ESLint.',
        '',
        '## Architecture',
        '',
        'Microservices pattern.',
        '',
        '## Personal Notes',
        '',
        'Remember to buy milk.',
        '',
        '## Conventions',
        '',
        'Naming: camelCase.',
        '',
        '## Random Stuff',
        '',
        'Not relevant.',
        '',
      ].join('\n');
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), wsContent);
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\n');

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      const context = await cascade.getCascadedContext(projectDir);

      // Relevant sections should be present
      expect(context.merged).toContain('Use ESLint');
      expect(context.merged).toContain('Microservices pattern');
      expect(context.merged).toContain('Naming: camelCase');

      // Irrelevant sections should NOT be present in workspace injection
      const wsStart = context.merged.indexOf('<!-- TLC-WORKSPACE-START -->');
      const wsEnd = context.merged.indexOf('<!-- TLC-WORKSPACE-END -->');
      const wsSection = context.merged.slice(wsStart, wsEnd);
      expect(wsSection).not.toContain('Remember to buy milk');
      expect(wsSection).not.toContain('Not relevant');
    });

    it('token budget respected (truncates workspace content if > 2000 chars)', async () => {
      // Create a workspace CLAUDE.md with a relevant section longer than 2000 chars
      const longContent = '## Coding Standards\n\n' + 'A'.repeat(3000) + '\n';
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), longContent);
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\n');

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      const context = await cascade.getCascadedContext(projectDir);

      // Extract workspace section from merged
      const wsStart = context.merged.indexOf('<!-- TLC-WORKSPACE-START -->');
      const wsEnd = context.merged.indexOf('<!-- TLC-WORKSPACE-END -->');
      const wsSection = context.merged.slice(
        wsStart + '<!-- TLC-WORKSPACE-START -->'.length,
        wsEnd
      );

      // Workspace section content should be truncated to max 2000 chars
      expect(wsSection.trim().length).toBeLessThanOrEqual(2000);
    });

    it('no cascade when no workspace detected (standalone project)', async () => {
      const standaloneDetector = {
        detectWorkspace: vi.fn().mockReturnValue({
          isInWorkspace: false,
          workspaceRoot: null,
          projectPath: projectDir,
          relativeProjectPath: null,
        }),
      };

      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Standalone\n\nProject content.\n');

      const cascade = createClaudeCascade({ workspaceDetector: standaloneDetector });
      const context = await cascade.getCascadedContext(projectDir);

      expect(context.workspaceContent).toBeNull();
      expect(context.projectContent).toContain('Standalone');
      expect(context.merged).toContain('Project content');
      expect(context.merged).not.toContain('<!-- TLC-WORKSPACE-START -->');
    });

    it('handles missing workspace CLAUDE.md gracefully', async () => {
      // No CLAUDE.md in workspace root
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\n\nRules.\n');

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      const context = await cascade.getCascadedContext(projectDir);

      expect(context.workspaceContent).toBeNull();
      expect(context.projectContent).toContain('Project');
      expect(context.merged).toContain('Rules');
    });

    it('handles missing project CLAUDE.md gracefully', async () => {
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), '# Workspace\n\n## Coding Standards\n\nWs rules.\n');
      // No CLAUDE.md in project dir

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      const context = await cascade.getCascadedContext(projectDir);

      expect(context.projectContent).toBeNull();
      expect(context.workspaceContent).toContain('Workspace');
      expect(context.merged).toContain('Ws rules');
    });
  });

  describe('syncCascade', () => {
    it('syncCascade updates markers in project CLAUDE.md', async () => {
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), '# Workspace\n\n## Coding Standards\n\nUse Vitest.\n');
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\n\nMy rules.\n');

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });
      await cascade.syncCascade(projectDir);

      const updated = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8');
      expect(updated).toContain('<!-- TLC-WORKSPACE-START -->');
      expect(updated).toContain('<!-- TLC-WORKSPACE-END -->');
      expect(updated).toContain('Use Vitest');
      expect(updated).toContain('My rules');
    });

    it('marker-based replacement is idempotent (running syncCascade twice gives same result)', async () => {
      fs.writeFileSync(path.join(wsRoot, 'CLAUDE.md'), '# Workspace\n\n## Rules\n\nWorkspace rules.\n## Conventions\n\nBe consistent.\n');
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Project\n\nProject stuff.\n');

      const cascade = createClaudeCascade({ workspaceDetector: mockDetector });

      await cascade.syncCascade(projectDir);
      const afterFirst = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8');

      await cascade.syncCascade(projectDir);
      const afterSecond = fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8');

      expect(afterFirst).toBe(afterSecond);
    });
  });
});
