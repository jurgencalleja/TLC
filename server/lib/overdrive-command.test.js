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
  estimateTaskComplexity,
  getModelForTask,
  selectAgentType,
  AGENT_TYPES,
  MODEL_TIERS,
  DEFAULT_MAX_TURNS,
} from './overdrive-command.js';

describe('overdrive-command', () => {
  describe('parseOverdriveArgs', () => {
    it('returns defaults for empty args', () => {
      const options = parseOverdriveArgs('');

      expect(options.phase).toBeNull();
      expect(options.agents).toBe('auto'); // Auto-parallelize by default
      expect(options.mode).toBe('build');
      expect(options.dryRun).toBe(false);
      expect(options.sequential).toBe(false);
      expect(options.model).toBeNull();
      expect(options.maxTurns).toBe(DEFAULT_MAX_TURNS);
    });

    it('parses phase number', () => {
      const options = parseOverdriveArgs('5');
      expect(options.phase).toBe(5);
    });

    it('parses --agents flag without cap', () => {
      const options = parseOverdriveArgs('--agents 4');
      expect(options.agents).toBe(4);
    });

    it('allows agent count beyond 10', () => {
      const options = parseOverdriveArgs('--agents 15');
      expect(options.agents).toBe(15);
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
      expect(options.agents).toBe(1); // Sequential forces single agent
    });

    it('parses -s shorthand for sequential', () => {
      const options = parseOverdriveArgs('-s');
      expect(options.sequential).toBe(true);
      expect(options.agents).toBe(1);
    });

    it('parses --model flag', () => {
      expect(parseOverdriveArgs('--model opus').model).toBe('opus');
      expect(parseOverdriveArgs('--model sonnet').model).toBe('sonnet');
      expect(parseOverdriveArgs('--model haiku').model).toBe('haiku');
    });

    it('ignores invalid model values', () => {
      expect(parseOverdriveArgs('--model gpt4').model).toBeNull();
    });

    it('parses --max-turns flag', () => {
      const options = parseOverdriveArgs('--max-turns 30');
      expect(options.maxTurns).toBe(30);
    });

    it('parses multiple flags including new ones', () => {
      const options = parseOverdriveArgs('5 --agents 2 --mode test --model sonnet --max-turns 25 --dry-run');

      expect(options.phase).toBe(5);
      expect(options.agents).toBe(2);
      expect(options.mode).toBe('test');
      expect(options.model).toBe('sonnet');
      expect(options.maxTurns).toBe(25);
      expect(options.dryRun).toBe(true);
    });
  });

  describe('generateAgentPrompts', () => {
    it('generates prompts for tasks with model and maxTurns', () => {
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
      expect(prompts[0].agentType).toBe('general-purpose');
      expect(prompts[0].model).toBeDefined();
      expect(prompts[0].maxTurns).toBe(DEFAULT_MAX_TURNS);
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

    it('assigns model based on task complexity', () => {
      const tasks = [
        { id: 1, title: 'Refactor authentication system' },
        { id: 2, title: 'Add helper function' },
        { id: 3, title: 'Create enum constants' },
      ];

      const prompts = generateAgentPrompts(tasks, {
        mode: 'build', projectDir: '/p', phase: 1,
      });

      expect(prompts[0].model).toBe('opus');    // refactor = heavy
      expect(prompts[1].model).toBe('sonnet');   // default = standard
      expect(prompts[2].model).toBe('haiku');    // enum = light
    });

    it('respects model override', () => {
      const tasks = [
        { id: 1, title: 'Refactor auth' },
        { id: 2, title: 'Create enum' },
      ];

      const prompts = generateAgentPrompts(tasks, {
        mode: 'build', projectDir: '/p', phase: 1,
        model: 'haiku',
      });

      expect(prompts[0].model).toBe('haiku');
      expect(prompts[1].model).toBe('haiku');
    });

    it('respects maxTurns override', () => {
      const prompts = generateAgentPrompts(
        [{ id: 1, title: 'Test' }],
        { mode: 'build', projectDir: '/p', phase: 1, maxTurns: 25 }
      );

      expect(prompts[0].maxTurns).toBe(25);
    });

    it('includes complexity estimate', () => {
      const prompts = generateAgentPrompts(
        [{ id: 1, title: 'Database migration' }],
        { mode: 'build', projectDir: '/p', phase: 1 }
      );

      expect(prompts[0].complexity).toBe('heavy');
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
    it('generates task tool calls with model and max_turns', () => {
      const prompts = [
        { taskId: 1, taskTitle: 'Test', prompt: 'Do task 1', agentType: 'general-purpose', model: 'sonnet', maxTurns: 50 },
        { taskId: 2, taskTitle: 'Test 2', prompt: 'Do task 2', agentType: 'general-purpose', model: 'haiku', maxTurns: 30 },
      ];

      const calls = generateTaskCalls(prompts);

      expect(calls.length).toBe(2);
      expect(calls[0].tool).toBe('Task');
      expect(calls[0].params.description).toContain('Agent 1');
      expect(calls[0].params.run_in_background).toBe(true);
      expect(calls[0].params.subagent_type).toBe('general-purpose');
      expect(calls[0].params.model).toBe('sonnet');
      expect(calls[0].params.max_turns).toBe(50);
      expect(calls[1].params.model).toBe('haiku');
      expect(calls[1].params.max_turns).toBe(30);
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

    it('returns true for independent tasks with one agent per task', () => {
      const result = canParallelize(
        [{ id: 1 }, { id: 2 }, { id: 3 }],
        { hasDependencies: false, dependencies: [] }
      );

      expect(result.canParallelize).toBe(true);
      expect(result.independentTasks.length).toBe(3);
      expect(result.recommendedAgents).toBe(3);
    });

    it('recommends agents beyond 10 when tasks warrant it', () => {
      const tasks = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));
      const result = canParallelize(tasks, { hasDependencies: false, dependencies: [] });

      expect(result.canParallelize).toBe(true);
      expect(result.recommendedAgents).toBe(15);
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

  describe('estimateTaskComplexity', () => {
    it('classifies heavy tasks', () => {
      expect(estimateTaskComplexity({ title: 'Refactor auth module' })).toBe('heavy');
      expect(estimateTaskComplexity({ title: 'Database migration scripts' })).toBe('heavy');
      expect(estimateTaskComplexity({ title: 'Redesign user schema' })).toBe('heavy');
      expect(estimateTaskComplexity({ title: 'Security audit implementation' })).toBe('heavy');
      expect(estimateTaskComplexity({ title: 'Integration with payment API' })).toBe('heavy');
    });

    it('classifies light tasks', () => {
      expect(estimateTaskComplexity({ title: 'Add config constants' })).toBe('light');
      expect(estimateTaskComplexity({ title: 'Create user enum' })).toBe('light');
      expect(estimateTaskComplexity({ title: 'Create DTO for response' })).toBe('light');
      expect(estimateTaskComplexity({ title: 'Add seed data' })).toBe('light');
      expect(estimateTaskComplexity({ title: 'Create interface for service' })).toBe('light');
    });

    it('classifies standard tasks by default', () => {
      expect(estimateTaskComplexity({ title: 'Add user listing endpoint' })).toBe('standard');
      expect(estimateTaskComplexity({ title: 'Create helper function' })).toBe('standard');
      expect(estimateTaskComplexity({ title: 'Add pagination support' })).toBe('standard');
    });

    it('handles empty or missing title', () => {
      expect(estimateTaskComplexity({ title: '' })).toBe('standard');
      expect(estimateTaskComplexity({})).toBe('standard');
    });
  });

  describe('getModelForTask', () => {
    it('returns opus for heavy tasks', () => {
      expect(getModelForTask({ title: 'Refactor auth' })).toBe('opus');
    });

    it('returns sonnet for standard tasks', () => {
      expect(getModelForTask({ title: 'Add endpoint' })).toBe('sonnet');
    });

    it('returns haiku for light tasks', () => {
      expect(getModelForTask({ title: 'Create enum' })).toBe('haiku');
    });

    it('respects model override', () => {
      expect(getModelForTask({ title: 'Refactor auth' }, 'haiku')).toBe('haiku');
      expect(getModelForTask({ title: 'Create enum' }, 'opus')).toBe('opus');
    });
  });

  describe('selectAgentType', () => {
    it('returns general-purpose for build mode', () => {
      expect(selectAgentType({ title: 'Test' }, 'build')).toBe('general-purpose');
    });

    it('returns general-purpose for test mode', () => {
      expect(selectAgentType({ title: 'Test' }, 'test')).toBe('general-purpose');
    });

    it('returns general-purpose for fix mode', () => {
      expect(selectAgentType({ title: 'Test' }, 'fix')).toBe('general-purpose');
    });
  });

  describe('constants', () => {
    it('exports valid agent types', () => {
      expect(AGENT_TYPES.BUILD).toBe('general-purpose');
      expect(AGENT_TYPES.SHELL).toBe('Bash');
      expect(AGENT_TYPES.EXPLORE).toBe('Explore');
      expect(AGENT_TYPES.PLAN).toBe('Plan');
    });

    it('exports valid model tiers', () => {
      expect(MODEL_TIERS.HEAVY).toBe('opus');
      expect(MODEL_TIERS.STANDARD).toBe('sonnet');
      expect(MODEL_TIERS.LIGHT).toBe('haiku');
    });

    it('exports default max turns', () => {
      expect(DEFAULT_MAX_TURNS).toBe(50);
    });
  });

  describe('formatOverdrivePlan', () => {
    it('includes Opus 4.6 branding and model info', () => {
      const plan = {
        phase: 3,
        mode: 'build',
        agentCount: 2,
        totalTasks: 2,
        modelOverride: null,
        agentAssignments: [
          { tasks: [{ id: 1, title: 'Refactor auth' }] },
          { tasks: [{ id: 2, title: 'Create enum' }] },
        ],
      };

      const output = formatOverdrivePlan(plan);

      expect(output).toContain('Opus 4.6');
      expect(output).toContain('[opus]');
      expect(output).toContain('[haiku]');
      expect(output).toContain('Model selection per task complexity');
      expect(output).toContain('Agent resumption');
      expect(output).toContain('TaskOutput');
      expect(output).toContain('TaskStop');
    });
  });
});
