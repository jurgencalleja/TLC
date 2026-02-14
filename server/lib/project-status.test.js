/**
 * @file project-status.test.js
 * @description Tests for the Project Status module (Phase 75, Task 1).
 *
 * Tests the factory function `createProjectStatus(deps)` which accepts injected
 * dependencies (fs, execSync) and returns `{ getFullStatus(projectPath) }`.
 *
 * The module parses a project's `.planning/ROADMAP.md` to extract a full roadmap
 * with milestones, phases (with goals, deliverables, status), reads per-phase
 * PLAN.md for task counts, TESTS.md for test counts, VERIFIED.md for verification
 * status, and extracts recent git commits and project info.
 *
 * All filesystem and git operations are injected as dependencies so tests can
 * run entirely against mock data with no real filesystem access.
 *
 * TDD: RED phase — these tests are written BEFORE the implementation.
 */
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { createProjectStatus } from './project-status.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/**
 * Creates a mock `fs` dependency backed by an in-memory file map.
 * Keys are absolute file paths, values are file contents (strings).
 * @param {Record<string, string>} files - Map of path -> content
 * @returns {{ existsSync: vi.fn, readFileSync: vi.fn, readdirSync: vi.fn }}
 */
function createMockFs(files = {}) {
  return {
    existsSync: vi.fn((p) => p in files),
    readFileSync: vi.fn((p) => {
      if (p in files) return files[p];
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }),
    readdirSync: vi.fn((p) => {
      // Return filenames that are direct children of the directory path
      return Object.keys(files)
        .filter((f) => f.startsWith(p + '/') && !f.slice(p.length + 1).includes('/'))
        .map((f) => f.slice(p.length + 1));
    }),
  };
}

/**
 * Creates a mock `execSync` that returns a configurable string for git log.
 * @param {string} output - The stdout to return
 * @returns {vi.fn}
 */
function createMockExecSync(output = '') {
  return vi.fn(() => output);
}

// ---------------------------------------------------------------------------
// Shared mock content
// ---------------------------------------------------------------------------

const MOCK_ROADMAP = `# TLC Roadmap - v1.0

## Milestone: v1.0 - Team Collaboration Release

### Phase 1: Core Infrastructure [x]

**Goal:** Establish TLC as source of truth for planning.

**Deliverables:**
- [x] CLAUDE.md enforcement
- [x] Multi-user task claiming

---

### Phase 2: Test Quality [x] ✓ COMPLETE

**Goal:** Improve test quality metrics.

**Deliverables:**
- [x] Test quality scoring
- [x] Auto-fix on failure

---

### Phase 3: Dev Server [>]

**Goal:** Unified development environment.

**Deliverables:**
- [x] Auto-detect project type
- [ ] Docker-compose generation

---

## Milestone: v2.0 - Standalone Release

### Phase 4: LLM Router [ ]

**Goal:** Multi-model support.

**Deliverables:**
- [ ] Model routing
- [ ] Provider config
`;

const MOCK_PLAN = `# Phase 1: Core Infrastructure - Plan

## Tasks

### Task 1: CLAUDE.md [x]

### Task 2: Multi-user [x]

### Task 3: Bug tracking [ ]
`;

const MOCK_TESTS = `# Phase 1 Tests

## Test Files

| File | Tests | Status |
|------|-------|--------|
| lib/core.test.js | 10 | Passing |
| lib/user.test.js | 5 | Passing |
| **Total** | **15** | **All Passing** |
`;

const MOCK_PACKAGE_JSON = JSON.stringify({
  name: 'test-project',
  version: '2.1.0',
  description: 'A test project for TLC',
});

const MOCK_PROJECT_MD = `# Test Project

This is the project description paragraph that should be extracted.

## Architecture

Some architecture notes.
`;

const MOCK_GIT_LOG = `abc1234|feat: add roadmap parser|2026-02-09|Jurgen
def5678|fix: correct milestone grouping|2026-02-08|Alice
ghi9012|test: add project-status tests|2026-02-07|Bob`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('project-status', () => {
  let mockFs;
  let mockExecSync;
  let projectStatus;

  /**
   * Builds a full file map for a project at the given path.
   * Includes ROADMAP.md, a Phase 1 PLAN, TESTS, and VERIFIED file,
   * plus package.json and PROJECT.md.
   * @param {string} projectPath - Absolute path to the project root
   * @returns {Record<string, string>} File map
   */
  function buildFullFileMap(projectPath) {
    return {
      [`${projectPath}/package.json`]: MOCK_PACKAGE_JSON,
      [`${projectPath}/PROJECT.md`]: MOCK_PROJECT_MD,
      [`${projectPath}/.planning/ROADMAP.md`]: MOCK_ROADMAP,
      [`${projectPath}/.planning/phases`]: '', // directory marker
      [`${projectPath}/.planning/phases/1-PLAN.md`]: MOCK_PLAN,
      [`${projectPath}/.planning/phases/1-TESTS.md`]: MOCK_TESTS,
      [`${projectPath}/.planning/phases/1-VERIFIED.md`]: '# Verified\nPhase 1 verified.',
    };
  }

  beforeEach(() => {
    const files = buildFullFileMap('/project');
    mockFs = createMockFs(files);
    mockExecSync = createMockExecSync(MOCK_GIT_LOG);
    projectStatus = createProjectStatus({ fs: mockFs, execSync: mockExecSync });
  });

  it('parses full roadmap with milestones grouping phases', () => {
    const result = projectStatus.getFullStatus('/project');

    expect(result.milestones).toBeDefined();
    expect(Array.isArray(result.milestones)).toBe(true);
    expect(result.milestones).toHaveLength(2);

    // First milestone has 3 phases
    expect(result.milestones[0].name).toBe('v1.0 - Team Collaboration Release');
    expect(result.milestones[0].phases).toHaveLength(3);

    // Second milestone has 1 phase
    expect(result.milestones[1].name).toBe('v2.0 - Standalone Release');
    expect(result.milestones[1].phases).toHaveLength(1);

    // Total phases
    expect(result.totalPhases).toBe(4);
  });

  it('extracts phase goals from ROADMAP.md', () => {
    const result = projectStatus.getFullStatus('/project');

    const phase1 = result.milestones[0].phases[0];
    expect(phase1.goal).toBe('Establish TLC as source of truth for planning.');

    const phase2 = result.milestones[0].phases[1];
    expect(phase2.goal).toBe('Improve test quality metrics.');

    const phase3 = result.milestones[0].phases[2];
    expect(phase3.goal).toBe('Unified development environment.');

    const phase4 = result.milestones[1].phases[0];
    expect(phase4.goal).toBe('Multi-model support.');
  });

  it('extracts phase deliverables as arrays', () => {
    const result = projectStatus.getFullStatus('/project');

    const phase1 = result.milestones[0].phases[0];
    expect(phase1.deliverables).toHaveLength(2);
    expect(phase1.deliverables[0]).toEqual({ text: 'CLAUDE.md enforcement', done: true });
    expect(phase1.deliverables[1]).toEqual({ text: 'Multi-user task claiming', done: true });

    const phase3 = result.milestones[0].phases[2];
    expect(phase3.deliverables).toHaveLength(2);
    expect(phase3.deliverables[0]).toEqual({ text: 'Auto-detect project type', done: true });
    expect(phase3.deliverables[1]).toEqual({ text: 'Docker-compose generation', done: false });

    const phase4 = result.milestones[1].phases[0];
    expect(phase4.deliverables).toHaveLength(2);
    expect(phase4.deliverables[0]).toEqual({ text: 'Model routing', done: false });
    expect(phase4.deliverables[1]).toEqual({ text: 'Provider config', done: false });
  });

  it('counts tasks from PLAN.md files', () => {
    const result = projectStatus.getFullStatus('/project');

    // Phase 1 has a PLAN.md with 3 tasks, 2 completed
    const phase1 = result.milestones[0].phases[0];
    expect(phase1.taskCount).toBe(3);
    expect(phase1.completedTaskCount).toBe(2);
  });

  it('parses test counts from TESTS.md', () => {
    const result = projectStatus.getFullStatus('/project');

    // Phase 1 has a TESTS.md with 2 test files, 15 total tests
    const phase1 = result.milestones[0].phases[0];
    expect(phase1.hasTests).toBe(true);
    expect(phase1.testFileCount).toBe(2);
    expect(phase1.testCount).toBe(15);

    // Test summary should aggregate
    expect(result.testSummary).toBeDefined();
    expect(result.testSummary.totalFiles).toBe(2);
    expect(result.testSummary.totalTests).toBe(15);
  });

  it('detects verified phases from VERIFIED.md', () => {
    const result = projectStatus.getFullStatus('/project');

    // Phase 1 has a VERIFIED.md
    const phase1 = result.milestones[0].phases[0];
    expect(phase1.verified).toBe(true);

    // Phase 2 does NOT have a VERIFIED.md
    const phase2 = result.milestones[0].phases[1];
    expect(phase2.verified).toBe(false);
  });

  it('extracts recent commits via git log', () => {
    const result = projectStatus.getFullStatus('/project');

    expect(result.recentCommits).toBeDefined();
    expect(Array.isArray(result.recentCommits)).toBe(true);
    expect(result.recentCommits).toHaveLength(3);

    expect(result.recentCommits[0]).toEqual({
      hash: 'abc1234',
      message: 'feat: add roadmap parser',
      date: '2026-02-09',
      author: 'Jurgen',
    });
    expect(result.recentCommits[1]).toEqual({
      hash: 'def5678',
      message: 'fix: correct milestone grouping',
      date: '2026-02-08',
      author: 'Alice',
    });
    expect(result.recentCommits[2]).toEqual({
      hash: 'ghi9012',
      message: 'test: add project-status tests',
      date: '2026-02-07',
      author: 'Bob',
    });

    // Verify execSync was called with a git log command
    expect(mockExecSync).toHaveBeenCalled();
    const gitCall = mockExecSync.mock.calls[0][0];
    expect(gitCall).toContain('git log');
  });

  it('reads project info from package.json and PROJECT.md', () => {
    const result = projectStatus.getFullStatus('/project');

    expect(result.projectInfo).toBeDefined();
    expect(result.projectInfo.name).toBe('test-project');
    expect(result.projectInfo.version).toBe('2.1.0');
    expect(result.projectInfo.description).toContain('project description paragraph');
  });

  it('graceful fallback for missing .planning directory', () => {
    // Build a project with no .planning directory at all
    const files = {
      '/empty-project/package.json': JSON.stringify({ name: 'empty', version: '0.1.0' }),
    };
    const fs = createMockFs(files);
    const exec = createMockExecSync('');
    const status = createProjectStatus({ fs, execSync: exec });

    const result = status.getFullStatus('/empty-project');

    expect(result).toBeDefined();
    expect(result.milestones).toEqual([]);
    expect(result.totalPhases).toBe(0);
    expect(result.completedPhases).toBe(0);
    expect(result.testSummary).toEqual(expect.objectContaining({
      totalFiles: 0,
      totalTests: 0,
    }));
    expect(result.projectInfo.name).toBe('empty');
  });

  it('handles heading format with status suffixes', () => {
    const result = projectStatus.getFullStatus('/project');

    // Phase 1: [x] -> done
    const phase1 = result.milestones[0].phases[0];
    expect(phase1.number).toBe(1);
    expect(phase1.name).toBe('Core Infrastructure');
    expect(phase1.status).toBe('done');

    // Phase 2: [x] ✓ COMPLETE -> done
    const phase2 = result.milestones[0].phases[1];
    expect(phase2.number).toBe(2);
    expect(phase2.name).toBe('Test Quality');
    expect(phase2.status).toBe('done');

    // Phase 3: [>] -> in_progress
    const phase3 = result.milestones[0].phases[2];
    expect(phase3.number).toBe(3);
    expect(phase3.name).toBe('Dev Server');
    expect(phase3.status).toBe('in_progress');

    // Phase 4: [ ] -> pending
    const phase4 = result.milestones[1].phases[0];
    expect(phase4.number).toBe(4);
    expect(phase4.name).toBe('LLM Router');
    expect(phase4.status).toBe('pending');
  });

  it('returns zero phases for empty roadmap', () => {
    const files = {
      '/minimal/package.json': JSON.stringify({ name: 'minimal', version: '1.0.0' }),
      '/minimal/.planning/ROADMAP.md': '# Roadmap\n\nNothing planned yet.\n',
      '/minimal/.planning/phases': '',
    };
    const fs = createMockFs(files);
    const exec = createMockExecSync('');
    const status = createProjectStatus({ fs, execSync: exec });

    const result = status.getFullStatus('/minimal');

    expect(result.totalPhases).toBe(0);
    expect(result.completedPhases).toBe(0);
    expect(result.milestones).toEqual([]);
  });

  it('milestone boundary correctly separates phases', () => {
    const result = projectStatus.getFullStatus('/project');

    // v1.0 milestone should have phases 1, 2, 3
    const v1Phases = result.milestones[0].phases;
    expect(v1Phases.map((p) => p.number)).toEqual([1, 2, 3]);

    // v2.0 milestone should have phase 4 only
    const v2Phases = result.milestones[1].phases;
    expect(v2Phases.map((p) => p.number)).toEqual([4]);

    // Phases should not leak across milestone boundaries
    const allPhaseNumbers = result.milestones.flatMap((m) => m.phases.map((p) => p.number));
    expect(allPhaseNumbers).toEqual([1, 2, 3, 4]);

    // completedPhases should count all [x] phases across milestones
    expect(result.completedPhases).toBe(2);
  });
});
