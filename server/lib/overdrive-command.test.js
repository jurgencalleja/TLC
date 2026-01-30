import { describe, it, expect } from 'vitest';
import {
  parseOverdriveArgs,
  generateAgentPrompts,
  distributeTasks,
  formatOverdrivePlan,
  generateTaskCalls,
  analyzeDependencies,
  canParallelize,
  shouldUseOverdrive,
  createOverdriveCommand,
} from './overdrive-command.js';

describe('overdrive-command', () => {
  describe('parseOverdriveArgs', () => {
    it('returns defaults for empty args', () => {
      const options = parseOverdriveArgs('');

      expect(options.phase).toBeNull();
      expect(options.agents).toBe(3);
      expect(options.mode).toBe('build');
      expect(options.dryRun).toBe(false);
      expect(options.sequential).toBe(false);
    });

    it('parses phase number', () => {
      const options = parseOverdriveArgs('5');
      expect(options.phase).toBe(5);
    });

    it('parses --agents flag', () => {
      const options = parseOverdriveArgs('--agents 4');
      expect(options.agents).toBe(4);
    });

    it('caps agents at 10', () => {
      const options = parseOverdriveArgs('--agents 15');
      expect(options.agents).toBe(10);
    });

    it('parses --mode flag', () => {
      expect(parseOverdriveArgs('--mode test').mode).toBe('test');
      expect(parseOverdriveArgs('--mode fix').mode).toBe('fix');
    });

    it('parses mode as positional', () => {
      expect(parseOverdriveArgs('test').mode).toBe('test');
      expect(parseOverdriveArgs('build').mode).toBe('build');
    });

    it('parses --dry-run flag', () => {
      const options = parseOverdriveArgs('--dry-run');
      expect(options.dryRun).toBe(true);
    });

    it('parses --sequential flag', () => {
      const options = parseOverdriveArgs('--sequential');
      expect(options.sequential).toBe(true);
    });

    it('parses multiple flags', () => {
      const options = parseOverdriveArgs('5 --agents 2 --mode test --dry-run');

      expect(options.phase).toBe(5);
      expect(options.agents).toBe(2);
      expect(options.mode).toBe('test');
      expect(options.dryRun).toBe(true);
    });
  });

  describe('generateAgentPrompts', () => {
    it('generates prompts for tasks', () => {
      const tasks = [
        { id: 1, title: 'Create schema' },
        { id: 2, title: 'Add validation' },
      ];

      const prompts = generateAgentPrompts(tasks, {
        mode: 'build',
        projectDir: '/project',
        phase: 1,
      });

      expect(prompts.length).toBe(2);
      expect(prompts[0].taskId).toBe(1);
      expect(prompts[0].taskTitle).toBe('Create schema');
      expect(prompts[0].prompt).toContain('Task 1');
      expect(prompts[0].prompt).toContain('Write tests first');
    });

    it('includes no-question rules', () => {
      const prompts = generateAgentPrompts(
        [{ id: 1, title: 'Test' }],
        { mode: 'build', projectDir: '/p', phase: 1 }
      );

      expect(prompts[0].prompt).toContain('Do NOT ask questions');
      expect(prompts[0].prompt).toContain('shall I continue');
      expect(prompts[0].prompt).toContain('ALWAYS CONTINUE');
    });

    it('adjusts for test mode', () => {
      const prompts = generateAgentPrompts(
        [{ id: 1, title: 'Test' }],
        { mode: 'test', projectDir: '/p', phase: 1 }
      );

      expect(prompts[0].prompt).toContain('Write comprehensive tests');
    });

    it('adjusts for fix mode', () => {
      const prompts = generateAgentPrompts(
        [{ id: 1, title: 'Test' }],
        { mode: 'fix', projectDir: '/p', phase: 1 }
      );

      expect(prompts[0].prompt).toContain('Fix any failing tests');
    });
  });

  describe('distributeTasks', () => {
    it('distributes tasks evenly', () => {
      const tasks = [
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
      ];

      const groups = distributeTasks(tasks, 2);

      expect(groups.length).toBe(2);
      expect(groups[0].length).toBe(2);
      expect(groups[1].length).toBe(2);
    });

    it('handles uneven distribution', () => {
      const tasks = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const groups = distributeTasks(tasks, 2);

      expect(groups.length).toBe(2);
      expect(groups[0].length).toBe(2);
      expect(groups[1].length).toBe(1);
    });

    it('handles more agents than tasks', () => {
      const tasks = [{ id: 1 }, { id: 2 }];
      const groups = distributeTasks(tasks, 5);

      expect(groups.length).toBe(2);
      expect(groups[0].length).toBe(1);
      expect(groups[1].length).toBe(1);
    });

    it('handles single task', () => {
      const tasks = [{ id: 1 }];
      const groups = distributeTasks(tasks, 3);

      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(1);
    });
  });

  describe('formatOverdrivePlan', () => {
    it('formats plan with all sections', () => {
      const plan = {
        phase: 5,
        mode: 'build',
        agentCount: 2,
        totalTasks: 4,
        agentAssignments: [
          { tasks: [{ id: 1, title: 'Task A' }, { id: 2, title: 'Task B' }] },
          { tasks: [{ id: 3, title: 'Task C' }, { id: 4, title: 'Task D' }] },
        ],
      };

      const output = formatOverdrivePlan(plan);

      expect(output).toContain('# Overdrive Mode');
      expect(output).toContain('**Phase:** 5');
      expect(output).toContain('**Agents:** 2');
      expect(output).toContain('**Tasks:** 4');
      expect(output).toContain('### Agent 1');
      expect(output).toContain('### Agent 2');
      expect(output).toContain('Task A');
      expect(output).toContain('Task D');
    });

    it('includes execution rules', () => {
      const plan = {
        phase: 1,
        mode: 'build',
        agentCount: 1,
        totalTasks: 1,
        agentAssignments: [{ tasks: [{ id: 1, title: 'Test' }] }],
      };

      const output = formatOverdrivePlan(plan);

      expect(output).toContain('No confirmation prompts');
      expect(output).toContain('Autonomous execution');
    });
  });

  describe('generateTaskCalls', () => {
    it('generates task tool calls', () => {
      const prompts = [
        { taskId: 1, taskTitle: 'Test', prompt: 'Do task 1', agentType: 'tlc-executor' },
        { taskId: 2, taskTitle: 'Test 2', prompt: 'Do task 2', agentType: 'tlc-executor' },
      ];

      const calls = generateTaskCalls(prompts);

      expect(calls.length).toBe(2);
      expect(calls[0].tool).toBe('Task');
      expect(calls[0].params.description).toContain('Agent 1');
      expect(calls[0].params.run_in_background).toBe(true);
    });
  });

  describe('analyzeDependencies', () => {
    it('detects no dependencies', () => {
      const content = `
## Tasks

### Task 1: Create schema

### Task 2: Add validation
`;

      const analysis = analyzeDependencies(content);

      expect(analysis.hasDependencies).toBe(false);
      expect(analysis.dependencies.length).toBe(0);
    });

    it('detects inline dependencies', () => {
      const content = `
### Task 1: Create schema

### Task 2: Add validation
Depends on Task 1
`;

      const analysis = analyzeDependencies(content);

      expect(analysis.hasDependencies).toBe(true);
      expect(analysis.dependencies.length).toBe(1);
      expect(analysis.dependencies[0].task).toBe(2);
      expect(analysis.dependencies[0].dependsOn).toBe(1);
    });

    it('detects dependencies section', () => {
      const content = `
## Tasks

### Task 1: A
### Task 2: B
### Task 3: C

## Dependencies

Task 2 requires Task 1
Task 3 depends on Task 2
`;

      const analysis = analyzeDependencies(content);

      expect(analysis.hasDependencies).toBe(true);
      expect(analysis.isWaterfall).toBe(true);
    });

    it('detects "after" keyword', () => {
      const content = `
### Task 1: Setup

### Task 2: Implementation
After Task 1
`;

      const analysis = analyzeDependencies(content);

      expect(analysis.hasDependencies).toBe(true);
    });

    it('detects "blocked by" keyword', () => {
      const content = `
### Task 1: Schema

### Task 2: Migration
Blocked by Task 1
`;

      const analysis = analyzeDependencies(content);

      expect(analysis.hasDependencies).toBe(true);
    });
  });

  describe('canParallelize', () => {
    it('returns false for single task', () => {
      const result = canParallelize([{ id: 1 }], { hasDependencies: false, dependencies: [] });

      expect(result.canParallelize).toBe(false);
      expect(result.reason).toContain('Single task');
    });

    it('returns false for waterfall', () => {
      const result = canParallelize(
        [{ id: 1 }, { id: 2 }, { id: 3 }],
        {
          hasDependencies: true,
          isWaterfall: true,
          dependencies: [
            { task: 2, dependsOn: 1 },
            { task: 3, dependsOn: 2 },
          ],
        }
      );

      expect(result.canParallelize).toBe(false);
      expect(result.reason).toContain('Waterfall');
    });

    it('returns true for independent tasks', () => {
      const result = canParallelize(
        [{ id: 1 }, { id: 2 }, { id: 3 }],
        { hasDependencies: false, dependencies: [] }
      );

      expect(result.canParallelize).toBe(true);
      expect(result.independentTasks.length).toBe(3);
      expect(result.recommendedAgents).toBe(3);
    });

    it('identifies mixed independent/dependent tasks', () => {
      const result = canParallelize(
        [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        {
          hasDependencies: true,
          isWaterfall: false,
          dependencies: [{ task: 4, dependsOn: 1 }],
        }
      );

      expect(result.canParallelize).toBe(true);
      expect(result.independentTasks.length).toBe(3);
      expect(result.dependentTasks.length).toBe(1);
    });
  });

  describe('shouldUseOverdrive', () => {
    it('returns false for non-existent project', () => {
      const result = shouldUseOverdrive('/nonexistent', 1);

      expect(result.use).toBe(false);
    });
  });

  describe('createOverdriveCommand', () => {
    it('creates command handler', () => {
      const handler = createOverdriveCommand();

      expect(handler.execute).toBeDefined();
      expect(handler.parseArgs).toBeDefined();
      expect(handler.loadPhaseTasks).toBeDefined();
      expect(handler.generateAgentPrompts).toBeDefined();
      expect(handler.distributeTasks).toBeDefined();
    });
  });
});
