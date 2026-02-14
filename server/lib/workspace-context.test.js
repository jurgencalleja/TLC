/**
 * Workspace Context Tests
 *
 * Tests for building workspace context that TLC commands can consume.
 * Combines workspace detection, memory inheritance, and CLAUDE.md cascade
 * into a unified context object.
 *
 * Dependencies are injected (workspaceDetector, memoryInheritance, claudeCascade)
 * and fully mocked with vi.fn().
 *
 * These tests are written BEFORE the implementation (Red phase).
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { createWorkspaceContext } from './workspace-context.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/**
 * Creates a mock workspaceDetector that reports being in a workspace.
 * @param {boolean} isInWorkspace - Whether to simulate being in a workspace
 * @returns {object} Mock detector with detectWorkspace stub
 */
function createMockDetector(isInWorkspace = true) {
  return {
    detectWorkspace: vi.fn().mockReturnValue({
      isInWorkspace,
      workspaceRoot: isInWorkspace ? '/workspace' : null,
      projectPath: '/workspace/my-project',
      relativeProjectPath: isInWorkspace ? 'my-project' : null,
    }),
  };
}

/**
 * Creates a mock memoryInheritance engine.
 * @param {object} memory - Memory to return from loadInheritedMemory
 * @returns {object} Mock engine with loadInheritedMemory stub
 */
function createMockMemoryInheritance(memory = null) {
  const defaultMemory = {
    decisions: [
      { topic: 'use-postgres', text: 'Use Postgres for JSONB support', source: 'workspace' },
      { topic: 'rest-api', text: 'Use REST over GraphQL', source: 'workspace' },
    ],
    gotchas: [
      { topic: 'auth-warmup', text: 'Auth service needs 2s warmup', source: 'workspace' },
    ],
    preferences: [],
    conversations: [],
  };

  return {
    loadInheritedMemory: vi.fn().mockResolvedValue(memory || defaultMemory),
  };
}

/**
 * Creates a mock claudeCascade.
 * @param {object} context - Context to return from getCascadedContext
 * @returns {object} Mock cascade with getCascadedContext stub
 */
function createMockCascade(context = null) {
  const defaultContext = {
    workspaceContent: '# Workspace\n\n## Coding Standards\n\nUse ESLint.\n',
    projectContent: '# Project\n\nProject rules.\n',
    merged: '<!-- TLC-WORKSPACE-START -->\n## Coding Standards\n\nUse ESLint.\n<!-- TLC-WORKSPACE-END -->\n\n# Project\n\nProject rules.\n',
  };

  return {
    getCascadedContext: vi.fn().mockResolvedValue(context || defaultContext),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('workspace-context', () => {
  let mockDetector;
  let mockMemoryInheritance;
  let mockCascade;
  let wsContext;

  beforeEach(() => {
    mockDetector = createMockDetector(true);
    mockMemoryInheritance = createMockMemoryInheritance();
    mockCascade = createMockCascade();

    wsContext = createWorkspaceContext({
      workspaceDetector: mockDetector,
      memoryInheritance: mockMemoryInheritance,
      claudeCascade: mockCascade,
    });
  });

  // -------------------------------------------------------------------------
  // 1. Session start loads inherited memory
  // -------------------------------------------------------------------------
  it('session start loads inherited memory (calls memoryInheritance.loadInheritedMemory)', async () => {
    await wsContext.buildContext('/workspace/my-project');

    expect(mockMemoryInheritance.loadInheritedMemory).toHaveBeenCalledWith(
      '/workspace/my-project'
    );
  });

  // -------------------------------------------------------------------------
  // 2. Context includes "Workspace Context" section heading
  // -------------------------------------------------------------------------
  it('context includes "Workspace Context" section heading in workspaceSection', async () => {
    const context = await wsContext.buildContext('/workspace/my-project');

    expect(context.workspaceSection).toContain('## Workspace Context');
  });

  // -------------------------------------------------------------------------
  // 3. Workspace decisions included in inheritedDecisions
  // -------------------------------------------------------------------------
  it('workspace decisions included in inheritedDecisions', async () => {
    const context = await wsContext.buildContext('/workspace/my-project');

    expect(context.inheritedDecisions).toHaveLength(2);
    expect(context.inheritedDecisions[0]).toHaveProperty('topic', 'use-postgres');
    expect(context.inheritedDecisions[1]).toHaveProperty('topic', 'rest-api');
  });

  // -------------------------------------------------------------------------
  // 4. Workspace gotchas surfaced in inheritedGotchas
  // -------------------------------------------------------------------------
  it('workspace gotchas surfaced in inheritedGotchas', async () => {
    const context = await wsContext.buildContext('/workspace/my-project');

    expect(context.inheritedGotchas).toHaveLength(1);
    expect(context.inheritedGotchas[0]).toHaveProperty('topic', 'auth-warmup');
  });

  // -------------------------------------------------------------------------
  // 5. Token budget split: project=0.6, workspace=0.4
  // -------------------------------------------------------------------------
  it('token budget split: project=0.6, workspace=0.4', async () => {
    const context = await wsContext.buildContext('/workspace/my-project');

    expect(context.tokenBudget).toEqual({ project: 0.6, workspace: 0.4 });
  });

  // -------------------------------------------------------------------------
  // 6. No workspace section for standalone projects
  // -------------------------------------------------------------------------
  it('no workspace section for standalone projects (workspaceSection is empty/null)', async () => {
    const standaloneDetector = createMockDetector(false);
    const standaloneMemory = createMockMemoryInheritance({
      decisions: [],
      gotchas: [],
      preferences: [],
      conversations: [],
    });
    const standaloneCascade = createMockCascade({
      workspaceContent: null,
      projectContent: '# Project\n',
      merged: '# Project\n',
    });

    const standalone = createWorkspaceContext({
      workspaceDetector: standaloneDetector,
      memoryInheritance: standaloneMemory,
      claudeCascade: standaloneCascade,
    });

    const context = await standalone.buildContext('/standalone-project');

    expect(context.isInWorkspace).toBe(false);
    expect(context.workspaceSection).toBeFalsy();
  });

  // -------------------------------------------------------------------------
  // 7. Handles missing workspace memory gracefully (empty arrays)
  // -------------------------------------------------------------------------
  it('handles missing workspace memory gracefully (empty arrays)', async () => {
    const emptyMemory = createMockMemoryInheritance({
      decisions: [],
      gotchas: [],
      preferences: [],
      conversations: [],
    });

    const ctx = createWorkspaceContext({
      workspaceDetector: mockDetector,
      memoryInheritance: emptyMemory,
      claudeCascade: mockCascade,
    });

    const context = await ctx.buildContext('/workspace/my-project');

    expect(context.inheritedDecisions).toEqual([]);
    expect(context.inheritedGotchas).toEqual([]);
    expect(context.isInWorkspace).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 8. Workspace context includes cascaded CLAUDE.md content
  // -------------------------------------------------------------------------
  it('workspace context includes cascaded CLAUDE.md content', async () => {
    const context = await wsContext.buildContext('/workspace/my-project');

    expect(mockCascade.getCascadedContext).toHaveBeenCalledWith(
      '/workspace/my-project'
    );
    // The workspaceSection should include content from the cascade
    expect(context.workspaceSection).toContain('Use ESLint');
  });
});
