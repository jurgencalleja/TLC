/**
 * Overdrive Module
 * Automatic parallel execution when tasks are independent
 *
 * This is NOT a command - it's integrated into /tlc:build
 * When a plan has independent tasks, they run in parallel automatically.
 *
 * Default behavior: Auto-parallelize with one agent per independent task
 * Use --sequential to force one-at-a-time execution
 * Use --agents N to limit parallelism to specific number
 *
 * Opus 4.6 Multi-Agent Features:
 * - Model selection per agent (opus/sonnet/haiku) based on task complexity
 * - Agent resumption via `resume` parameter for retry/continuation
 * - TaskOutput for non-blocking progress checks on background agents
 * - TaskStop for cancelling stuck agents
 * - Specialized agent types: general-purpose, Bash, Explore, Plan
 * - max_turns to limit agent execution length
 */

const fs = require('fs');
const path = require('path');

/**
 * Valid subagent types for the Task tool (Opus 4.6)
 */
const AGENT_TYPES = {
  BUILD: 'general-purpose',
  SHELL: 'Bash',
  EXPLORE: 'Explore',
  PLAN: 'Plan',
};

/**
 * Model tiers for cost/capability optimization (Opus 4.6)
 * Agents are assigned models based on task complexity.
 */
const MODEL_TIERS = {
  HEAVY: 'opus',    // Complex multi-file features, architectural work
  STANDARD: 'sonnet', // Normal implementation tasks (default)
  LIGHT: 'haiku',   // Simple tasks: config, boilerplate, single-file changes
};

/**
 * Default max turns per agent to prevent runaway execution
 */
const DEFAULT_MAX_TURNS = 50;

/**
 * Estimate task complexity from its description/title
 * @param {Object} task - Task with id and title
 * @returns {'heavy'|'standard'|'light'} Complexity tier
 */
function estimateTaskComplexity(task) {
  const title = (task.title || '').toLowerCase();

  const heavyPatterns = [
    /architect/i, /refactor/i, /migration/i, /redesign/i,
    /integration/i, /multi.?file/i, /cross.?cutting/i,
    /security/i, /auth/i, /database/i, /schema/i,
  ];

  const lightPatterns = [
    /config/i, /boilerplate/i, /rename/i, /update.*readme/i,
    /add.*comment/i, /fix.*typo/i, /seed/i, /constant/i,
    /enum/i, /dto/i, /interface/i,
  ];

  if (heavyPatterns.some(p => p.test(title))) {
    return 'heavy';
  }
  if (lightPatterns.some(p => p.test(title))) {
    return 'light';
  }
  return 'standard';
}

/**
 * Get model for a task based on its complexity
 * @param {Object} task - Task object
 * @param {string} [modelOverride] - Force a specific model
 * @returns {string} Model name (opus, sonnet, haiku)
 */
function getModelForTask(task, modelOverride) {
  if (modelOverride) {
    return modelOverride;
  }

  const complexity = estimateTaskComplexity(task);

  switch (complexity) {
  case 'heavy':
    return MODEL_TIERS.HEAVY;
  case 'light':
    return MODEL_TIERS.LIGHT;
  default:
    return MODEL_TIERS.STANDARD;
  }
}

/**
 * Parse overdrive command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseOverdriveArgs(args = '') {
  const options = {
    phase: null,
    agents: 'auto', // One agent per independent task
    mode: 'build', // build, test, fix
    dryRun: false,
    sequential: false,
    model: null, // null = auto-select per task complexity
    maxTurns: DEFAULT_MAX_TURNS,
  };

  const parts = args.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (/^\d+$/.test(part)) {
      options.phase = parseInt(part, 10);
    } else if (part === '--agents' && parts[i + 1]) {
      options.agents = parseInt(parts[++i], 10);
    } else if (part === '--mode' && parts[i + 1]) {
      options.mode = parts[++i];
    } else if (part === '--model' && parts[i + 1]) {
      const model = parts[++i].toLowerCase();
      if (['opus', 'sonnet', 'haiku'].includes(model)) {
        options.model = model;
      }
    } else if (part === '--max-turns' && parts[i + 1]) {
      options.maxTurns = parseInt(parts[++i], 10);
    } else if (part === '--dry-run') {
      options.dryRun = true;
    } else if (part === '--sequential' || part === '-s') {
      options.sequential = true;
      options.agents = 1;
    } else if (['build', 'test', 'fix'].includes(part)) {
      options.mode = part;
    }
  }

  return options;
}

/**
 * Load phase plan and extract tasks
 * @param {string} projectDir - Project directory
 * @param {number} phase - Phase number
 * @returns {Object} Phase info with tasks
 */
function loadPhaseTasks(projectDir, phase) {
  const planDir = path.join(projectDir, '.planning', 'phases');
  const pattern = new RegExp(`^${phase}-.*PLAN\\.md$`);

  let planFile = null;
  try {
    const files = fs.readdirSync(planDir);
    planFile = files.find(f => pattern.test(f));
  } catch {
    return null;
  }

  if (!planFile) {
    return null;
  }

  const planPath = path.join(planDir, planFile);
  const content = fs.readFileSync(planPath, 'utf-8');

  // Extract tasks from plan
  const tasks = [];
  const taskRegex = /###\s+Task\s+(\d+):\s*(.+?)(?:\s*\[([ x>@\w-]*)\])?$/gm;
  let match;

  while ((match = taskRegex.exec(content)) !== null) {
    const [, id, title, status] = match;
    const isAvailable = !status || status.trim() === '';
    const isInProgress = status && status.includes('>');
    const isComplete = status && status.includes('x');

    tasks.push({
      id: parseInt(id, 10),
      title: title.trim(),
      status: isComplete ? 'complete' : isInProgress ? 'in_progress' : 'available',
      marker: status || '',
    });
  }

  return {
    phase,
    planFile,
    planPath,
    tasks,
    availableTasks: tasks.filter(t => t.status === 'available'),
  };
}

/**
 * Determine the best agent type for a task
 * @param {Object} task - Task object
 * @param {string} mode - Execution mode (build, test, fix)
 * @returns {string} Agent type for Task tool subagent_type
 */
function selectAgentType(task, mode) {
  // Build/test/fix all require full general-purpose agent
  // (reads files, writes code, runs tests, commits)
  return AGENT_TYPES.BUILD;
}

/**
 * Generate agent prompts for parallel execution
 * @param {Array} tasks - Tasks to distribute
 * @param {Object} options - Generation options
 * @returns {Array} Agent prompts
 */
function generateAgentPrompts(tasks, options = {}) {
  const { mode = 'build', projectDir, phase, model, maxTurns } = options;

  return tasks.map((task, index) => {
    const basePrompt = `You are Agent ${index + 1} working on Phase ${phase}.

YOUR TASK: Task ${task.id} - ${task.title}

INSTRUCTIONS:
1. Read the full task details from the PLAN.md
2. ${mode === 'build' ? 'Write tests first, then implement' : mode === 'test' ? 'Write comprehensive tests' : 'Fix any failing tests'}
3. Commit your work when done
4. Do NOT ask questions - make reasonable decisions
5. Do NOT stop to confirm - just execute

CRITICAL RULES:
- Work autonomously until done
- No "shall I continue?" - YES, ALWAYS CONTINUE
- No "would you like me to?" - YES, DO IT
- Commit after each meaningful change
- If blocked, skip and note why

PROJECT: ${projectDir}
PHASE: ${phase}
TASK: ${task.id} - ${task.title}

GO. Execute now. No questions.`;

    return {
      taskId: task.id,
      taskTitle: task.title,
      prompt: basePrompt,
      agentType: selectAgentType(task, mode),
      model: getModelForTask(task, model),
      maxTurns: maxTurns || DEFAULT_MAX_TURNS,
      complexity: estimateTaskComplexity(task),
    };
  });
}

/**
 * Distribute tasks among agents
 * @param {Array} tasks - All available tasks
 * @param {number} agentCount - Number of agents
 * @returns {Array} Task groups for each agent
 */
function distributeTasks(tasks, agentCount) {
  const groups = Array.from({ length: agentCount }, () => []);

  tasks.forEach((task, index) => {
    groups[index % agentCount].push(task);
  });

  return groups.filter(g => g.length > 0);
}

/**
 * Format overdrive plan for display
 * @param {Object} plan - Execution plan
 * @returns {string} Formatted plan
 */
function formatOverdrivePlan(plan) {
  const lines = [];

  lines.push('# Overdrive Mode (Opus 4.6)');
  lines.push('');
  lines.push(`**Phase:** ${plan.phase}`);
  lines.push(`**Mode:** ${plan.mode}`);
  lines.push(`**Agents:** ${plan.agentCount}`);
  lines.push(`**Tasks:** ${plan.totalTasks}`);
  lines.push('');
  lines.push('## Task Distribution');
  lines.push('');

  plan.agentAssignments.forEach((assignment, idx) => {
    lines.push(`### Agent ${idx + 1}`);
    assignment.tasks.forEach(task => {
      const complexity = estimateTaskComplexity(task);
      const model = getModelForTask(task, plan.modelOverride);
      lines.push(`- Task ${task.id}: ${task.title} [${model}] (${complexity})`);
    });
    lines.push('');
  });

  lines.push('## Execution');
  lines.push('');
  lines.push('All agents spawned simultaneously via Task tool (Opus 4.6 multi-agent).');
  lines.push('Each agent works independently until completion.');
  lines.push('');
  lines.push('**Capabilities:**');
  lines.push('- Model selection per task complexity (opus/sonnet/haiku)');
  lines.push('- Agent resumption for failed tasks (resume parameter)');
  lines.push('- Non-blocking progress checks (TaskOutput block=false)');
  lines.push('- Agent cancellation (TaskStop) for stuck agents');
  lines.push('');
  lines.push('**Rules enforced:**');
  lines.push('- No confirmation prompts');
  lines.push('- No "shall I continue" questions');
  lines.push('- Autonomous execution until done');
  lines.push('- Commits after each change');

  return lines.join('\n');
}

/**
 * Generate Task tool calls for parallel execution (Opus 4.6)
 * Includes model selection, max_turns, and correct subagent_type.
 * @param {Array} prompts - Agent prompts
 * @returns {Array} Task tool call specifications
 */
function generateTaskCalls(prompts) {
  return prompts.map((p, idx) => ({
    tool: 'Task',
    params: {
      description: `Agent ${idx + 1}: Task ${p.taskId}`,
      prompt: p.prompt,
      subagent_type: p.agentType,
      run_in_background: true,
      model: p.model,
      max_turns: p.maxTurns,
    },
  }));
}

/**
 * Execute overdrive command
 * @param {string} args - Command arguments
 * @param {Object} context - Execution context
 * @returns {Object} Command result
 */
async function executeOverdriveCommand(args = '', context = {}) {
  const { projectDir = process.cwd() } = context;
  const options = parseOverdriveArgs(args);

  // Auto-detect phase if not specified
  if (!options.phase) {
    try {
      const roadmapPath = path.join(projectDir, '.planning', 'ROADMAP.md');
      const content = fs.readFileSync(roadmapPath, 'utf-8');
      const match = /###\s+Phase\s+(\d+).*\[>\]/.exec(content);
      if (match) {
        options.phase = parseInt(match[1], 10);
      }
    } catch {
      // Ignore
    }
  }

  if (!options.phase) {
    return {
      success: false,
      error: 'No phase specified and could not auto-detect. Use: /tlc:overdrive <phase>',
    };
  }

  // Load phase tasks
  const phaseInfo = loadPhaseTasks(projectDir, options.phase);

  if (!phaseInfo) {
    return {
      success: false,
      error: `Could not find plan for phase ${options.phase}`,
    };
  }

  const availableTasks = phaseInfo.availableTasks;

  if (availableTasks.length === 0) {
    return {
      success: false,
      error: 'No available tasks found. All tasks may be complete or in progress.',
    };
  }

  // Determine agent count: auto = one agent per independent task (no cap)
  let agentCount;
  if (options.sequential) {
    agentCount = 1;
  } else if (options.agents === 'auto') {
    // Auto-detect: one agent per independent task, no arbitrary cap
    let planContent = '';
    try {
      planContent = fs.readFileSync(phaseInfo.planPath, 'utf-8');
    } catch {
      // Fall back to task count
    }
    const depAnalysis = analyzeDependencies(planContent);
    const parallelAnalysis = canParallelize(availableTasks, depAnalysis);
    agentCount = parallelAnalysis.canParallelize
      ? parallelAnalysis.independentTasks.length
      : 1;
  } else {
    agentCount = Math.min(options.agents, availableTasks.length);
  }

  const taskGroups = distributeTasks(availableTasks, agentCount);

  // Generate prompts with model selection and max turns
  const agentAssignments = taskGroups.map((tasks, idx) => ({
    agentId: idx + 1,
    tasks,
    prompts: generateAgentPrompts(tasks, {
      mode: options.mode,
      projectDir,
      phase: options.phase,
      model: options.model,
      maxTurns: options.maxTurns,
    }),
  }));

  const plan = {
    phase: options.phase,
    mode: options.mode,
    agentCount,
    totalTasks: availableTasks.length,
    agentAssignments,
    modelOverride: options.model,
  };

  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      plan,
      output: formatOverdrivePlan(plan),
    };
  }

  // Generate task calls for the orchestrator to execute
  const allPrompts = agentAssignments.flatMap(a => a.prompts);
  const taskCalls = generateTaskCalls(allPrompts);

  return {
    success: true,
    plan,
    taskCalls,
    output: formatOverdrivePlan(plan),
    instructions: `
EXECUTE NOW: Spawn ${agentCount} agents in parallel using the Task tool (Opus 4.6).

${taskCalls.map((tc, i) => `
Agent ${i + 1}:
Task(
  description="${tc.params.description}",
  prompt="${tc.params.prompt.slice(0, 100)}...",
  subagent_type="${tc.params.subagent_type}",
  model="${tc.params.model}",
  max_turns=${tc.params.max_turns},
  run_in_background=true
)
`).join('\n')}

CRITICAL: Call ALL Task tools in a SINGLE message to run them in parallel.
Do NOT wait between spawns. Fire them all at once.

MONITORING: Use TaskOutput(task_id, block=false) to check progress.
STUCK AGENT: Use TaskStop(task_id) to cancel, then resume with Task(resume=agent_id).
FAILED AGENT: Use Task(resume=agent_id) to continue from where it left off.
`,
  };
}

/**
 * Create overdrive command handler
 * @param {Object} options - Handler options
 * @returns {Object} Command handler
 */
function createOverdriveCommand(options = {}) {
  return {
    execute: (args, ctx) => executeOverdriveCommand(args, { ...options, ...ctx }),
    parseArgs: parseOverdriveArgs,
    loadPhaseTasks,
    generateAgentPrompts,
    distributeTasks,
    formatOverdrivePlan,
    generateTaskCalls,
  };
}

/**
 * Analyze task dependencies from plan content
 * @param {string} planContent - Plan markdown content
 * @returns {Object} Dependency analysis
 */
function analyzeDependencies(planContent) {
  const dependencies = [];

  // Look for dependency markers
  const depPatterns = [
    /depends\s+on\s+task\s+(\d+)/gi,
    /after\s+task\s+(\d+)/gi,
    /requires\s+task\s+(\d+)/gi,
    /blocked\s+by\s+task\s+(\d+)/gi,
  ];

  // Find where Dependencies section starts (to exclude from inline search)
  const depSectionStart = /##\s*Dependencies/i.exec(planContent);
  const contentForInlineSearch = depSectionStart
    ? planContent.slice(0, depSectionStart.index)
    : planContent;

  // Look for "## Dependencies" section
  const depSection = /##\s*Dependencies\s*\n([\s\S]*?)(?=\n##|$)/i.exec(planContent);
  if (depSection) {
    const depText = depSection[1];
    const taskDepRegex = /task\s+(\d+)\s*(?:->|requires|depends on|after)\s*task\s+(\d+)/gi;
    let match;
    while ((match = taskDepRegex.exec(depText)) !== null) {
      dependencies.push({
        task: parseInt(match[1], 10),
        dependsOn: parseInt(match[2], 10),
      });
    }
  }

  // Look for inline dependencies in task descriptions (excluding Dependencies section)
  for (const pattern of depPatterns) {
    let match;
    while ((match = pattern.exec(contentForInlineSearch)) !== null) {
      // Try to find which task this belongs to
      const beforeMatch = contentForInlineSearch.slice(0, match.index);
      const taskMatch = /###\s+Task\s+(\d+)/g;
      let lastTask = null;
      let m;
      while ((m = taskMatch.exec(beforeMatch)) !== null) {
        lastTask = parseInt(m[1], 10);
      }
      if (lastTask) {
        dependencies.push({
          task: lastTask,
          dependsOn: parseInt(match[1], 10),
        });
      }
    }
  }

  return {
    hasDependencies: dependencies.length > 0,
    dependencies,
    isWaterfall: dependencies.length > 0 &&
      new Set(dependencies.map(d => d.task)).size === dependencies.length,
  };
}

/**
 * Determine if tasks can be parallelized
 * @param {Array} tasks - List of tasks
 * @param {Object} depAnalysis - Dependency analysis
 * @returns {Object} Parallelization analysis
 */
function canParallelize(tasks, depAnalysis) {
  if (tasks.length <= 1) {
    return { canParallelize: false, reason: 'Single task' };
  }

  if (depAnalysis.isWaterfall) {
    return { canParallelize: false, reason: 'Waterfall dependencies' };
  }

  // Find independent tasks (no dependencies)
  const dependentTasks = new Set(depAnalysis.dependencies.map(d => d.task));
  const independentTasks = tasks.filter(t => !dependentTasks.has(t.id));

  if (independentTasks.length <= 1) {
    return { canParallelize: false, reason: 'Most tasks have dependencies' };
  }

  return {
    canParallelize: true,
    independentTasks,
    dependentTasks: tasks.filter(t => dependentTasks.has(t.id)),
    recommendedAgents: independentTasks.length, // One agent per independent task
  };
}

/**
 * Auto-detect if overdrive should be used
 * Called automatically by /tlc:build
 * @param {string} projectDir - Project directory
 * @param {number} phase - Phase number
 * @returns {Object} Overdrive decision
 */
function shouldUseOverdrive(projectDir, phase) {
  const phaseInfo = loadPhaseTasks(projectDir, phase);

  if (!phaseInfo || phaseInfo.availableTasks.length <= 1) {
    return { use: false, reason: 'Not enough tasks' };
  }

  // Read plan content for dependency analysis
  let planContent = '';
  try {
    planContent = fs.readFileSync(phaseInfo.planPath, 'utf-8');
  } catch {
    return { use: false, reason: 'Cannot read plan' };
  }

  const depAnalysis = analyzeDependencies(planContent);
  const parallelAnalysis = canParallelize(phaseInfo.availableTasks, depAnalysis);

  if (!parallelAnalysis.canParallelize) {
    return { use: false, reason: parallelAnalysis.reason };
  }

  return {
    use: true,
    reason: `${parallelAnalysis.independentTasks.length} independent tasks found`,
    recommendedAgents: parallelAnalysis.recommendedAgents,
    tasks: parallelAnalysis.independentTasks,
  };
}

/**
 * Auto-parallelize execution
 * Returns task calls for parallel execution if appropriate
 * @param {string} projectDir - Project directory
 * @param {number} phase - Phase number
 * @param {Object} options - Options
 * @returns {Object|null} Parallel execution plan or null
 */
function autoParallelize(projectDir, phase, options = {}) {
  const decision = shouldUseOverdrive(projectDir, phase);

  if (!decision.use) {
    return null;
  }

  const prompts = generateAgentPrompts(decision.tasks, {
    mode: options.mode || 'build',
    projectDir,
    phase,
  });

  return {
    parallel: true,
    agentCount: decision.recommendedAgents,
    tasks: decision.tasks,
    taskCalls: generateTaskCalls(prompts),
    reason: decision.reason,
  };
}

module.exports = {
  parseOverdriveArgs,
  loadPhaseTasks,
  generateAgentPrompts,
  distributeTasks,
  formatOverdrivePlan,
  generateTaskCalls,
  executeOverdriveCommand,
  createOverdriveCommand,
  // Auto-parallel functions
  analyzeDependencies,
  canParallelize,
  shouldUseOverdrive,
  autoParallelize,
  // Opus 4.6 multi-agent functions
  estimateTaskComplexity,
  getModelForTask,
  selectAgentType,
  AGENT_TYPES,
  MODEL_TIERS,
  DEFAULT_MAX_TURNS,
};
