import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { PlanView, parseMilestones, parsePhases, parseTasks, type Milestone, type Phase, type Task } from './PlanView.js';
import { vol } from 'memfs';

// Mock fs modules
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('PlanView', () => {
  beforeEach(() => {
    vol.reset();
  });

  describe('parseMilestones', () => {
    it('extracts milestones from roadmap', () => {
      const content = `# Roadmap

## Milestone: v1.0 - Initial Release

### Phase 1: Setup [x]
### Phase 2: Core [>]

## Milestone: v1.1 - Improvements

### Phase 3: Polish
### Phase 4: Docs`;

      const milestones = parseMilestones(content);

      expect(milestones).toHaveLength(2);
      expect(milestones[0].name).toBe('v1.0 - Initial Release');
      expect(milestones[0].phaseNumbers).toEqual([1, 2]);
      expect(milestones[1].name).toBe('v1.1 - Improvements');
      expect(milestones[1].phaseNumbers).toEqual([3, 4]);
    });

    it('handles roadmap with no explicit milestones', () => {
      const content = `# Roadmap

### Phase 1: Setup [x]
### Phase 2: Core`;

      const milestones = parseMilestones(content);

      expect(milestones).toHaveLength(1);
      expect(milestones[0].name).toBe('Current');
      expect(milestones[0].phaseNumbers).toEqual([1, 2]);
    });

    it('detects milestone status from phase statuses', () => {
      const content = `## Milestone: v1.0

### Phase 1: Setup [x]
### Phase 2: Core [x]

## Milestone: v1.1

### Phase 3: Polish [>]
### Phase 4: Docs`;

      const milestones = parseMilestones(content);

      expect(milestones[0].status).toBe('completed');
      expect(milestones[1].status).toBe('in_progress');
    });

    it('marks milestone as pending if no phases started', () => {
      const content = `## Milestone: v1.0

### Phase 1: Setup [x]

## Milestone: v1.1

### Phase 2: Core
### Phase 3: Docs`;

      const milestones = parseMilestones(content);

      expect(milestones[0].status).toBe('completed');
      expect(milestones[1].status).toBe('pending');
    });
  });

  describe('parsePhases', () => {
    it('parses phases with task counts from PLAN files', () => {
      const roadmapContent = `### Phase 1: Setup [x]
### Phase 2: Core [>]`;

      const planContents: Record<number, string> = {
        1: `# Phase 1
### Task 1: Init [x@alice]
### Task 2: Config [x@bob]`,
        2: `# Phase 2
### Task 1: API [>@alice]
### Task 2: DB [ ]
### Task 3: Auth [ ]`
      };

      const phases = parsePhases(roadmapContent, planContents);

      expect(phases).toHaveLength(2);
      expect(phases[0].tasksDone).toBe(2);
      expect(phases[0].tasksTotal).toBe(2);
      expect(phases[1].tasksDone).toBe(0);
      expect(phases[1].tasksTotal).toBe(3);
      expect(phases[1].tasksInProgress).toBe(1);
    });

    it('calculates progress percentage', () => {
      const roadmapContent = `### Phase 1: Core`;

      const planContents: Record<number, string> = {
        1: `### Task 1: A [x@u]
### Task 2: B [x@u]
### Task 3: C [ ]
### Task 4: D [ ]`
      };

      const phases = parsePhases(roadmapContent, planContents);

      expect(phases[0].progress).toBe(50);
    });

    it('handles phases with no PLAN file', () => {
      const roadmapContent = `### Phase 1: Setup [x]
### Phase 2: Planned`;

      const planContents: Record<number, string> = {
        1: `### Task 1: Done [x@u]`
      };

      const phases = parsePhases(roadmapContent, planContents);

      expect(phases).toHaveLength(2);
      expect(phases[1].tasksTotal).toBe(0);
      expect(phases[1].progress).toBe(0);
    });
  });

  describe('parseTasks', () => {
    it('extracts tasks from PLAN content', () => {
      const content = `# Phase 1

### Task 1: Setup Project [x@alice]
Some description

### Task 2: Add Config [>@bob]
Working on it

### Task 3: Write Tests [ ]
Not started`;

      const tasks = parseTasks(content);

      expect(tasks).toHaveLength(3);
      expect(tasks[0]).toMatchObject({
        number: 1,
        name: 'Setup Project',
        status: 'completed',
        owner: 'alice'
      });
      expect(tasks[1]).toMatchObject({
        number: 2,
        name: 'Add Config',
        status: 'in_progress',
        owner: 'bob'
      });
      expect(tasks[2]).toMatchObject({
        number: 3,
        name: 'Write Tests',
        status: 'pending',
        owner: undefined
      });
    });

    it('parses acceptance criteria counts', () => {
      const content = `### Task 1: Feature [>@dev]

**Acceptance Criteria:**
- [x] First item done
- [x] Second item done
- [ ] Third item pending
- [ ] Fourth item pending`;

      const tasks = parseTasks(content);

      expect(tasks[0].criteriaDone).toBe(2);
      expect(tasks[0].criteriaTotal).toBe(4);
    });

    it('handles tasks without acceptance criteria', () => {
      const content = `### Task 1: Simple [x@dev]
Just a simple task`;

      const tasks = parseTasks(content);

      expect(tasks[0].criteriaDone).toBe(0);
      expect(tasks[0].criteriaTotal).toBe(0);
    });
  });

  describe('component rendering', () => {
    it('shows loading state initially', () => {
      const { lastFrame } = render(<PlanView />);
      expect(lastFrame()).toContain('Loading');
    });

    it('shows empty state when no roadmap', async () => {
      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(lastFrame()).toContain('No roadmap found');
    });

    it('renders milestones with phases', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `# Roadmap

## Milestone: v1.0 - Release

### Phase 1: Setup [x]
### Phase 2: Core [>]
### Phase 3: Polish`
      });

      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('v1.0');
      expect(output).toContain('Setup');
      expect(output).toContain('Core');
      expect(output).toContain('Polish');
    });

    it('shows progress bar for phases', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `### Phase 1: Core [>]`,
        [process.cwd() + '/.planning/phases/01-core/01-PLAN.md']: `
### Task 1: A [x@u]
### Task 2: B [x@u]
### Task 3: C [ ]
### Task 4: D [ ]`
      });

      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      // Should show 2/4 or 50% progress indicator
      expect(output).toMatch(/2\/4|50%|████/);
    });

    it('shows task counts per phase', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `### Phase 1: Auth [x]`,
        [process.cwd() + '/.planning/phases/01-auth/01-PLAN.md']: `
### Task 1: Login [x@a]
### Task 2: Logout [x@b]
### Task 3: Session [x@a]`
      });

      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('3/3');
    });

    it('collapses completed milestones by default', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `
## Milestone: v0.9 [x]

### Phase 1: Old [x]

## Milestone: v1.0

### Phase 2: Current [>]`
      });

      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      // v0.9 should be collapsed (not showing "Old")
      expect(output).toContain('v0.9');
      expect(output).toContain('Current');
      // Old phase should not be visible (collapsed)
      expect(output).not.toMatch(/Old\s+\[/);
    });

    it('expands phase to show tasks when selected', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `### Phase 1: Core [>]`,
        [process.cwd() + '/.planning/phases/01-core/01-PLAN.md']: `
### Task 1: API [x@alice]
### Task 2: DB [>@bob]`
      });

      const { lastFrame } = render(<PlanView expandedPhase={1} />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('API');
      expect(output).toContain('alice');
      expect(output).toContain('DB');
      expect(output).toContain('bob');
    });

    it('shows filter options', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `
### Phase 1: Done [x]
### Phase 2: Active [>]
### Phase 3: Pending`
      });

      const { lastFrame } = render(<PlanView filter="in_progress" />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('Active');
      expect(output).not.toContain('Done');
      expect(output).not.toContain('Pending');
    });

    it('shows overall milestone progress', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `
## Milestone: v1.0

### Phase 1: A [x]
### Phase 2: B [x]
### Phase 3: C [>]
### Phase 4: D`
      });

      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      // Should show 2/4 phases or 50% for milestone
      expect(output).toMatch(/2\/4|50%/);
    });
  });

  describe('edge cases', () => {
    it('handles malformed PLAN files gracefully', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `### Phase 1: Test`,
        [process.cwd() + '/.planning/phases/01-test/01-PLAN.md']: `
This is not a proper plan file
No tasks here
Just random text`
      });

      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('Test');
      expect(output).toContain('0/0');
    });

    it('handles very long phase names', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `### Phase 1: This Is A Very Long Phase Name That Should Be Truncated [>]`
      });

      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not crash, should render something
      expect(lastFrame()).toBeTruthy();
    });

    it('handles phases numbered non-sequentially', async () => {
      vol.fromJSON({
        [process.cwd() + '/.planning/ROADMAP.md']: `
### Phase 1: First [x]
### Phase 3: Third [>]
### Phase 5: Fifth`
      });

      const { lastFrame } = render(<PlanView />);

      await new Promise(resolve => setTimeout(resolve, 100));

      const output = lastFrame();
      expect(output).toContain('First');
      expect(output).toContain('Third');
      expect(output).toContain('Fifth');
    });
  });
});
