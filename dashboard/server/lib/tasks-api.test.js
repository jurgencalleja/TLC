import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol, fs as memfsFs } from 'memfs';

// Mock fs modules with memfs
vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  return {
    ...memfs.fs,
    default: memfs.fs,
  };
});

vi.mock('node:fs/promises', async () => {
  const memfs = await import('memfs');
  return {
    ...memfs.fs.promises,
    default: memfs.fs.promises,
  };
});

import { createTask } from './tasks-api.js';

describe('tasks-api', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTask()', () => {
    const baseProjectDir = '/project';

    beforeEach(() => {
      // Setup base project structure
      vol.fromJSON({
        '/project/.planning/ROADMAP.md': `# Roadmap

## Phases

- [>] Phase 1: Setup
- [ ] Phase 2: Features
`,
        '/project/.planning/phases/01-setup/01-PLAN.md': `# Phase 1 Plan

## Tasks

### Task 1: Initial setup

**Goal:** Set up the project

**Acceptance Criteria:**
- [x] Project initialized
`,
      });
    });

    it('adds task to existing PLAN.md', async () => {
      const task = await createTask(
        { title: 'New task', description: 'Test description' },
        baseProjectDir
      );

      // Read the PLAN.md to verify task was added
      const planContent = vol.readFileSync('/project/.planning/phases/01-setup/01-PLAN.md', 'utf8');
      expect(planContent).toContain('### Task 2: New task');
      expect(planContent).toContain('**Goal:** Test description');
    });

    it('creates Tasks section if missing', async () => {
      // Setup PLAN.md without Tasks section
      vol.fromJSON({
        '/project/.planning/ROADMAP.md': `# Roadmap

## Phases

- [>] Phase 1: Setup
`,
        '/project/.planning/phases/01-setup/01-PLAN.md': `# Phase 1 Plan

Just some content without a Tasks section.
`,
      });

      const task = await createTask(
        { title: 'First task' },
        baseProjectDir
      );

      const planContent = vol.readFileSync('/project/.planning/phases/01-setup/01-PLAN.md', 'utf8');
      expect(planContent).toContain('## Tasks');
      expect(planContent).toContain('### Task 1: First task');
    });

    it('generates sequential task ID', async () => {
      // Add two tasks and verify IDs
      const task1 = await createTask({ title: 'Task A' }, baseProjectDir);
      const task2 = await createTask({ title: 'Task B' }, baseProjectDir);

      expect(task1.id).toBe('1-2'); // Phase 1, Task 2 (Task 1 already exists)
      expect(task2.id).toBe('1-3'); // Phase 1, Task 3
    });

    it('validates title is required', async () => {
      await expect(createTask({}, baseProjectDir))
        .rejects.toThrow('Title is required');

      await expect(createTask({ title: '' }, baseProjectDir))
        .rejects.toThrow('Title is required');
    });

    it('validates title max 200 chars', async () => {
      const longTitle = 'x'.repeat(201);

      await expect(createTask({ title: longTitle }, baseProjectDir))
        .rejects.toThrow('Title must be 200 characters or less');
    });

    it('returns created task object', async () => {
      const task = await createTask(
        { title: 'My new task', description: 'A description', priority: 'high' },
        baseProjectDir
      );

      expect(task).toMatchObject({
        id: '1-2',
        title: 'My new task',
        status: 'pending',
        owner: null,
        phase: 1,
      });
    });

    it('handles missing PLAN.md by creating it', async () => {
      // Setup without PLAN.md
      vol.fromJSON({
        '/project/.planning/ROADMAP.md': `# Roadmap

## Phases

- [>] Phase 2: Features
`,
      });

      // Create phases directory
      vol.mkdirSync('/project/.planning/phases/02-features', { recursive: true });

      const task = await createTask(
        { title: 'First task in new phase' },
        baseProjectDir
      );

      // Verify PLAN.md was created
      expect(vol.existsSync('/project/.planning/phases/02-features/02-PLAN.md')).toBe(true);

      const planContent = vol.readFileSync('/project/.planning/phases/02-features/02-PLAN.md', 'utf8');
      expect(planContent).toContain('### Task 1: First task in new phase');
    });

    it('uses first uncompleted phase when no active phase', async () => {
      // Setup with no [>] marker, just [ ] phases
      vol.fromJSON({
        '/project/.planning/ROADMAP.md': `# Roadmap

## Phases

- [x] Phase 1: Setup
- [ ] Phase 2: Features
- [ ] Phase 3: Polish
`,
      });

      vol.mkdirSync('/project/.planning/phases/02-features', { recursive: true });

      const task = await createTask(
        { title: 'Start features' },
        baseProjectDir
      );

      expect(task.phase).toBe(2);
      expect(vol.existsSync('/project/.planning/phases/02-features/02-PLAN.md')).toBe(true);
    });
  });
});
