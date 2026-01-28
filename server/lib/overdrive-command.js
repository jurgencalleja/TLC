/**
 * Overdrive Module
 * Automatic parallel execution when tasks are independent
 *
 * This is NOT a command - it's integrated into /tlc:build
 * When a plan has independent tasks, they run in parallel automatically
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse overdrive command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseOverdriveArgs(args = '') {
  const options = {
    phase: null,
    agents: 3, // Default parallel agents
    mode: 'build', // build, test, fix
    dryRun: false,
    sequential: false,
  };

  const parts = args.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (/^\d+$/.test(part)) {
      options.phase = parseInt(part, 10);
    } else if (part === '--agents' && parts[i + 1]) {
      options.agents = Math.min(parseInt(parts[++i], 10), 5); // Max 5 agents
    } else if (part === '--mode' && parts[i + 1]) {
      options.mode = parts[++i];
    } else if (part === '--dry-run') {
      options.dryRun = true;
    } else if (part === '--sequential') {
      options.sequential = true;
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
 * Generate agent prompts for parallel execution
 * @param {Array} tasks - Tasks to distribute
 * @param {Object} options - Generation options
 * @returns {Array} Agent prompts
 */
function generateAgentPrompts(tasks, options = {}) {
  const { mode = 'build', projectDir, phase } = options;

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
      agentType: 'gsd-executor',
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

  lines.push('# Overdrive Mode');
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
      lines.push(`- Task ${task.id}: ${task.title}`);
    });
    lines.push('');
  });

  lines.push('## Execution');
  lines.push('');
  lines.push('All agents will be spawned simultaneously using Task tool.');
  lines.push('Each agent works independently until completion.');
  lines.push('');
  lines.push('**Rules enforced:**');
  lines.push('- No confirmation prompts');
  lines.push('- No "shall I continue" questions');
  lines.push('- Autonomous execution until done');
  lines.push('- Commits after each change');

  return lines.join('\n');
}

/**
 * Generate Task tool calls for parallel execution
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

  // Distribute tasks
  const agentCount = Math.min(options.agents, availableTasks.length);
  const taskGroups = distributeTasks(availableTasks, agentCount);

  // Generate prompts
  const agentAssignments = taskGroups.map((tasks, idx) => ({
    agentId: idx + 1,
    tasks,
    prompts: generateAgentPrompts(tasks, {
      mode: options.mode,
      projectDir,
      phase: options.phase,
    }),
  }));

  const plan = {
    phase: options.phase,
    mode: options.mode,
    agentCount,
    totalTasks: availableTasks.length,
    agentAssignments,
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
EXECUTE NOW: Spawn ${agentCount} agents in parallel using the Task tool.

${taskCalls.map((tc, i) => `
Agent ${i + 1}:
Task(
  description="${tc.params.description}",
  prompt="${tc.params.prompt.slice(0, 100)}...",
  subagent_type="${tc.params.subagent_type}",
  run_in_background=true
)
`).join('\n')}

CRITICAL: Call ALL Task tools in a SINGLE message to run them in parallel.
Do NOT wait between spawns. Fire them all at once.
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
    recommendedAgents: Math.min(independentTasks.length, 3),
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
};
