/**
 * Memory Inheritance Engine Tests
 *
 * Tests for loading and merging memory from both project-level and
 * workspace-level sources with correct priority.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createMemoryInheritance } from './memory-inheritance.js';

/** Create a unique temp directory for each test */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mem-inherit-'));
}

/** Recursively remove a directory */
function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Helper: create a memory directory structure with .md files.
 * @param {string} root - Root directory to create memory in
 * @param {Object} contents - { decisions: [{filename, text}], gotchas: [...], preferences: [...], conversations: [...] }
 */
function createMemoryDir(root, contents = {}) {
  const memoryDir = path.join(root, 'memory');
  const categories = ['decisions', 'gotchas', 'preferences', 'conversations'];

  for (const cat of categories) {
    const catDir = path.join(memoryDir, cat);
    fs.mkdirSync(catDir, { recursive: true });

    if (contents[cat]) {
      for (const item of contents[cat]) {
        fs.writeFileSync(
          path.join(catDir, item.filename),
          item.text,
          'utf8'
        );
      }
    }
  }

  return memoryDir;
}

describe('memory-inheritance', () => {
  let tmpDir;
  let workspaceDir;
  let projectDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    workspaceDir = path.join(tmpDir, 'workspace');
    projectDir = path.join(workspaceDir, 'my-project');
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    if (tmpDir) rmDir(tmpDir);
  });

  /**
   * Create a mock workspaceDetector that returns configured workspace info.
   */
  function mockDetector(wsRoot) {
    return {
      detectWorkspace: vi.fn((dir) => {
        if (wsRoot) {
          return {
            isInWorkspace: true,
            workspaceRoot: wsRoot,
            projectPath: dir,
            relativeProjectPath: path.relative(wsRoot, dir),
          };
        }
        return {
          isInWorkspace: false,
          workspaceRoot: null,
          projectPath: dir,
          relativeProjectPath: null,
        };
      }),
    };
  }

  describe('loadInheritedMemory', () => {
    it('loads project-level decisions from memory/decisions/', async () => {
      createMemoryDir(projectDir, {
        decisions: [
          { filename: 'use-postgres.md', text: '# Use Postgres\n\nWe chose Postgres for JSONB support.' },
          { filename: 'use-rest.md', text: '# Use REST\n\nREST is simpler for our use case.' },
        ],
      });

      const detector = mockDetector(null); // standalone
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      expect(merged.decisions).toHaveLength(2);
      expect(merged.decisions[0].text).toContain('Postgres');
      expect(merged.decisions[1].text).toContain('REST');
    });

    it('loads workspace-level decisions from workspace memory/decisions/', async () => {
      createMemoryDir(workspaceDir, {
        decisions: [
          { filename: 'shared-auth.md', text: '# Shared Auth\n\nAll projects use OAuth2.' },
        ],
      });
      createMemoryDir(projectDir, { decisions: [] });

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      expect(merged.decisions).toHaveLength(1);
      expect(merged.decisions[0].text).toContain('OAuth2');
      expect(merged.decisions[0].source).toBe('workspace');
    });

    it('merges decisions from both sources (union)', async () => {
      createMemoryDir(workspaceDir, {
        decisions: [
          { filename: 'shared-auth.md', text: '# Shared Auth\n\nOAuth2 everywhere.' },
        ],
      });
      createMemoryDir(projectDir, {
        decisions: [
          { filename: 'use-postgres.md', text: '# Use Postgres\n\nJSONB support.' },
        ],
      });

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      expect(merged.decisions).toHaveLength(2);
      const sources = merged.decisions.map((d) => d.source);
      expect(sources).toContain('project');
      expect(sources).toContain('workspace');
    });

    it('project decisions override workspace for same topic (matching filename slug)', async () => {
      createMemoryDir(workspaceDir, {
        decisions: [
          { filename: 'database-choice.md', text: '# Database\n\nWorkspace says MySQL.' },
        ],
      });
      createMemoryDir(projectDir, {
        decisions: [
          { filename: 'database-choice.md', text: '# Database\n\nProject says Postgres.' },
        ],
      });

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      // Same filename slug = same topic; project wins
      expect(merged.decisions).toHaveLength(1);
      expect(merged.decisions[0].text).toContain('Postgres');
      expect(merged.decisions[0].source).toBe('project');
    });

    it('loads and merges gotchas (union of both)', async () => {
      createMemoryDir(workspaceDir, {
        gotchas: [
          { filename: 'auth-warmup.md', text: '# Auth Warmup\n\nNeeds 2s delay.' },
        ],
      });
      createMemoryDir(projectDir, {
        gotchas: [
          { filename: 'db-timeout.md', text: '# DB Timeout\n\nIncrease pool size.' },
        ],
      });

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      expect(merged.gotchas).toHaveLength(2);
      const texts = merged.gotchas.map((g) => g.text);
      expect(texts.some((t) => t.includes('Auth Warmup'))).toBe(true);
      expect(texts.some((t) => t.includes('DB Timeout'))).toBe(true);
    });

    it('project preferences override workspace preferences (same filename slug)', async () => {
      createMemoryDir(workspaceDir, {
        preferences: [
          { filename: 'code-style.md', text: '# Code Style\n\nWorkspace: use tabs.' },
        ],
      });
      createMemoryDir(projectDir, {
        preferences: [
          { filename: 'code-style.md', text: '# Code Style\n\nProject: use spaces.' },
        ],
      });

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      // Same slug = same topic; project wins
      expect(merged.preferences).toHaveLength(1);
      expect(merged.preferences[0].text).toContain('spaces');
      expect(merged.preferences[0].source).toBe('project');
    });

    it('conversations from both sources are included', async () => {
      createMemoryDir(workspaceDir, {
        conversations: [
          { filename: 'ws-session-1.md', text: '# Session 1\n\nDiscussed architecture.' },
        ],
      });
      createMemoryDir(projectDir, {
        conversations: [
          { filename: 'proj-session-1.md', text: '# Session 1\n\nDiscussed database.' },
        ],
      });

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      expect(merged.conversations).toHaveLength(2);
      const sources = merged.conversations.map((c) => c.source);
      expect(sources).toContain('project');
      expect(sources).toContain('workspace');
    });

    it('each item is tagged with source: project or workspace', async () => {
      createMemoryDir(workspaceDir, {
        decisions: [
          { filename: 'ws-decision.md', text: '# WS Decision\n\nShared policy.' },
        ],
        gotchas: [
          { filename: 'ws-gotcha.md', text: '# WS Gotcha\n\nWatch out.' },
        ],
      });
      createMemoryDir(projectDir, {
        decisions: [
          { filename: 'proj-decision.md', text: '# Proj Decision\n\nLocal policy.' },
        ],
        gotchas: [
          { filename: 'proj-gotcha.md', text: '# Proj Gotcha\n\nBe careful.' },
        ],
      });

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      for (const item of [...merged.decisions, ...merged.gotchas]) {
        expect(item).toHaveProperty('source');
        expect(['project', 'workspace']).toContain(item.source);
      }

      const projectItems = merged.decisions.filter((d) => d.source === 'project');
      const workspaceItems = merged.decisions.filter((d) => d.source === 'workspace');
      expect(projectItems).toHaveLength(1);
      expect(workspaceItems).toHaveLength(1);
    });

    it('workspace items have lower relevance than project items', async () => {
      createMemoryDir(workspaceDir, {
        decisions: [
          { filename: 'ws-decision.md', text: '# WS Decision\n\nShared.' },
        ],
      });
      createMemoryDir(projectDir, {
        decisions: [
          { filename: 'proj-decision.md', text: '# Proj Decision\n\nLocal.' },
        ],
      });

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      const projectItem = merged.decisions.find((d) => d.source === 'project');
      const workspaceItem = merged.decisions.find((d) => d.source === 'workspace');

      expect(projectItem).toHaveProperty('relevance');
      expect(workspaceItem).toHaveProperty('relevance');
      expect(workspaceItem.relevance).toBeLessThan(projectItem.relevance);
    });

    it('standalone project returns only own memory (no workspace)', async () => {
      createMemoryDir(projectDir, {
        decisions: [
          { filename: 'local-only.md', text: '# Local Only\n\nNo workspace.' },
        ],
        gotchas: [],
        preferences: [],
        conversations: [],
      });

      const detector = mockDetector(null); // standalone
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      expect(merged.decisions).toHaveLength(1);
      expect(merged.decisions[0].source).toBe('project');
      expect(merged.gotchas).toHaveLength(0);
      expect(merged.preferences).toHaveLength(0);
      expect(merged.conversations).toHaveLength(0);
    });
  });

  describe('getInheritedRoots', () => {
    it('returns both memory paths when in a workspace', () => {
      createMemoryDir(workspaceDir);
      createMemoryDir(projectDir);

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const roots = inheritance.getInheritedRoots(projectDir);

      expect(roots).toHaveLength(2);
      expect(roots).toContain(path.join(projectDir, 'memory'));
      expect(roots).toContain(path.join(workspaceDir, 'memory'));
    });

    it('returns only project memory path for standalone project', () => {
      createMemoryDir(projectDir);

      const detector = mockDetector(null); // standalone
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const roots = inheritance.getInheritedRoots(projectDir);

      expect(roots).toHaveLength(1);
      expect(roots[0]).toBe(path.join(projectDir, 'memory'));
    });
  });

  describe('error handling', () => {
    it('handles missing workspace memory directory gracefully', async () => {
      // Workspace exists but has no memory/ dir
      createMemoryDir(projectDir, {
        decisions: [
          { filename: 'local.md', text: '# Local\n\nOnly local memory.' },
        ],
      });
      // No createMemoryDir for workspace -- so workspace/memory/ does not exist

      const detector = mockDetector(workspaceDir);
      const inheritance = createMemoryInheritance({ workspaceDetector: detector });
      const merged = await inheritance.loadInheritedMemory(projectDir);

      // Should not throw; just return project-only memory
      expect(merged.decisions).toHaveLength(1);
      expect(merged.decisions[0].source).toBe('project');
    });
  });
});
