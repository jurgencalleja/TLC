/**
 * Refactor Stepper - Step-by-step refactoring workflow
 */

/**
 * Step type priority order for execution
 */
const STEP_PRIORITY = [
  'extract-config',    // Config extraction first (least disruptive)
  'migrate-folder',    // Folder migration second
  'extract-interface', // Interface extraction third
  'replace-constants', // Magic strings fourth
  'add-jsdoc'          // JSDoc last (most files affected)
];

/**
 * Generate a unique session ID
 * @returns {string} Unique ID
 */
function generateSessionId() {
  return `refactor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert audit issue to refactor step
 * @param {Object} issue - Audit issue
 * @param {string} type - Step type
 * @param {number} index - Step index
 * @returns {Object} Refactor step
 */
function issueToStep(issue, type, index) {
  return {
    id: `step-${index}`,
    type,
    status: 'pending',
    ...issue
  };
}

/**
 * Create a refactor session from audit results
 * @param {string} projectPath - Project path
 * @param {Object} auditResults - Results from audit-checker
 * @returns {Promise<Object>} Session object
 */
async function createRefactorSession(projectPath, auditResults) {
  const steps = [];
  let stepIndex = 0;

  // Map audit categories to step types
  const categoryMapping = {
    hardcodedUrls: 'extract-config',
    flatFolders: 'migrate-folder',
    inlineInterfaces: 'extract-interface',
    magicStrings: 'replace-constants',
    jsDocCoverage: 'add-jsdoc'
  };

  // Collect all steps from audit results
  for (const [category, stepType] of Object.entries(categoryMapping)) {
    const result = auditResults[category];
    if (result?.issues?.length > 0) {
      for (const issue of result.issues) {
        steps.push(issueToStep(issue, stepType, stepIndex++));
      }
    }
  }

  // Sort steps by priority
  steps.sort((a, b) => {
    const priorityA = STEP_PRIORITY.indexOf(a.type);
    const priorityB = STEP_PRIORITY.indexOf(b.type);
    return priorityA - priorityB;
  });

  // Re-index steps after sorting
  steps.forEach((step, idx) => {
    step.id = `step-${idx}`;
  });

  return {
    id: generateSessionId(),
    projectPath,
    steps,
    currentStep: 0,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

/**
 * Get the next pending step in the session
 * @param {Object} session - Refactor session
 * @returns {Object|null} Next step or null if all complete
 */
function getNextStep(session) {
  const { steps, currentStep } = session;

  // Find next pending step starting from currentStep
  for (let i = currentStep; i < steps.length; i++) {
    if (steps[i].status === 'pending') {
      return steps[i];
    }
  }

  return null;
}

/**
 * Generate a simple unified diff
 * @param {string} before - Original content
 * @param {string} after - Modified content
 * @returns {string} Diff string
 */
function generateDiff(before, after) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  const diff = [];

  // Simple line-by-line comparison
  const maxLines = Math.max(beforeLines.length, afterLines.length);

  for (let i = 0; i < maxLines; i++) {
    const beforeLine = beforeLines[i];
    const afterLine = afterLines[i];

    if (beforeLine !== afterLine) {
      if (beforeLine !== undefined) {
        diff.push(`- ${beforeLine}`);
      }
      if (afterLine !== undefined) {
        diff.push(`+ ${afterLine}`);
      }
    }
  }

  return diff.join('\n');
}

/**
 * Preview what a step will do without executing
 * @param {Object} step - Step to preview
 * @param {Object} options - Options with dependencies
 * @returns {Promise<Object>} Preview information
 */
async function previewStep(step, options = {}) {
  const { fs } = options;

  const preview = {
    before: '',
    after: '',
    changes: [],
    diff: ''
  };

  switch (step.type) {
    case 'migrate-folder': {
      const sourcePath = step.sourcePath;
      const entity = step.entity;
      const fileName = sourcePath.split('/').pop();
      const newPath = `src/${entity}/${fileName}`;

      preview.before = sourcePath;
      preview.after = newPath;
      preview.changes = [
        { type: 'move', from: sourcePath, to: newPath },
        { type: 'update-imports', pattern: `imports referencing ${sourcePath}` }
      ];
      preview.diff = `- ${sourcePath}\n+ ${newPath}`;
      break;
    }

    case 'extract-config': {
      const file = step.file;
      const value = step.value;

      if (fs) {
        try {
          const content = await fs.readFile(file);
          const afterContent = content.replace(
            new RegExp(`['"]${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
            'process.env.CONFIG_VAR'
          );

          preview.before = content;
          preview.after = afterContent;
          preview.changes = [
            { type: 'replace', value, replacement: 'process.env.CONFIG_VAR' }
          ];
          preview.diff = generateDiff(content, afterContent);
        } catch (err) {
          preview.changes = [{ type: 'error', message: err.message }];
        }
      } else {
        preview.before = `Code with hardcoded: ${value}`;
        preview.after = `Code with env var: process.env.CONFIG_VAR`;
        preview.changes = [{ type: 'replace', value }];
        preview.diff = `- '${value}'\n+ process.env.CONFIG_VAR`;
      }
      break;
    }

    default: {
      preview.before = `Step type: ${step.type}`;
      preview.after = `Modified: ${step.type}`;
      preview.changes = [{ type: step.type }];
      preview.diff = `- original\n+ modified`;
    }
  }

  return preview;
}

/**
 * Execute a single step
 * @param {Object} session - Refactor session
 * @param {Object} options - Options with executor dependency
 * @returns {Promise<Object>} Result with updated session and potential error
 */
async function executeStep(session, options = {}) {
  const { executor } = options;
  const step = session.steps[session.currentStep];

  if (!step) {
    return {
      session,
      error: 'No step to execute'
    };
  }

  try {
    // Execute the step using provided executor
    if (executor) {
      await executor(step);
    }

    // Mark step as completed
    step.status = 'completed';
    step.completedAt = new Date().toISOString();

    // Advance to next step
    const updatedSession = {
      ...session,
      currentStep: session.currentStep + 1,
      steps: [...session.steps]
    };
    updatedSession.steps[session.currentStep] = step;

    return { session: updatedSession };
  } catch (err) {
    // Mark step as failed
    step.status = 'failed';
    step.error = err.message;

    const updatedSession = {
      ...session,
      steps: [...session.steps]
    };
    updatedSession.steps[session.currentStep] = step;

    return {
      session: updatedSession,
      error: err.message
    };
  }
}

/**
 * Skip the current step
 * @param {Object} session - Refactor session
 * @param {string} [reason] - Optional skip reason
 * @returns {Object} Updated session
 */
function skipStep(session, reason) {
  const step = session.steps[session.currentStep];

  if (!step) {
    return session;
  }

  // Mark step as skipped
  const updatedStep = {
    ...step,
    status: 'skipped',
    skippedAt: new Date().toISOString()
  };

  if (reason) {
    updatedStep.skipReason = reason;
  }

  const updatedSteps = [...session.steps];
  updatedSteps[session.currentStep] = updatedStep;

  return {
    ...session,
    steps: updatedSteps,
    currentStep: session.currentStep + 1
  };
}

/**
 * Abort the entire session
 * @param {Object} session - Refactor session
 * @param {string} [reason] - Optional abort reason
 * @returns {Object} Updated session with aborted status
 */
function abortSession(session, reason) {
  const updatedSteps = session.steps.map((step, index) => {
    // Keep completed steps as-is
    if (step.status === 'completed') {
      return step;
    }

    // Mark pending/in-progress steps as aborted
    return {
      ...step,
      status: 'aborted',
      abortedAt: new Date().toISOString()
    };
  });

  const result = {
    ...session,
    steps: updatedSteps,
    status: 'aborted',
    abortedAt: new Date().toISOString()
  };

  if (reason) {
    result.abortReason = reason;
  }

  return result;
}

/**
 * Save session checkpoint to file
 * @param {Object} session - Refactor session
 * @param {string} projectPath - Project path
 * @param {Object} options - Options with fs dependency
 * @returns {Promise<void>}
 */
async function saveCheckpoint(session, projectPath, options = {}) {
  const { fs } = options;

  const checkpointPath = `${projectPath}/.planning/refactor-checkpoint.json`;

  // Ensure .planning directory exists
  await fs.mkdir(`${projectPath}/.planning`, { recursive: true });

  const checkpoint = {
    ...session,
    savedAt: new Date().toISOString()
  };

  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

/**
 * Load checkpoint from file
 * @param {string} projectPath - Project path
 * @param {Object} options - Options with fs dependency
 * @returns {Promise<Object|null>} Loaded session or null
 */
async function loadCheckpoint(projectPath, options = {}) {
  const { fs } = options;

  const checkpointPath = `${projectPath}/.planning/refactor-checkpoint.json`;

  try {
    const content = await fs.readFile(checkpointPath);
    return JSON.parse(content);
  } catch (err) {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Resume session from checkpoint
 * @param {string} projectPath - Project path
 * @param {Object} options - Options with fs dependency
 * @returns {Promise<Object>} Resumed session
 */
async function resumeFromCheckpoint(projectPath, options = {}) {
  const { fs } = options;

  const checkpointPath = `${projectPath}/.planning/refactor-checkpoint.json`;

  const content = await fs.readFile(checkpointPath);

  // Parse and validate
  let checkpoint;
  try {
    checkpoint = JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid checkpoint file: ${err.message}`);
  }

  // Validate required fields
  if (!checkpoint.id || !checkpoint.steps || checkpoint.currentStep === undefined) {
    throw new Error('Checkpoint missing required fields');
  }

  // Mark as resumed
  return {
    ...checkpoint,
    status: 'resumed',
    resumedAt: new Date().toISOString()
  };
}

module.exports = {
  createRefactorSession,
  getNextStep,
  previewStep,
  executeStep,
  skipStep,
  abortSession,
  saveCheckpoint,
  loadCheckpoint,
  resumeFromCheckpoint
};
