/**
 * Memory Hooks - Hook memory system into TLC command lifecycle
 */

const { buildSessionContext } = require('./context-builder.js');
const { observeAndRemember, processExchange } = require('./memory-observer.js');
const { generateSessionSummary, formatSummary } = require('./session-summary.js');
const { appendSessionLog } = require('./memory-writer.js');

/**
 * MemoryHooks class for stateful hook management
 */
class MemoryHooks {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.sessionStartTime = null;
    this.responseCount = 0;
  }

  /**
   * Called when session starts - returns context for injection
   * @returns {Promise<{context: string}>}
   */
  async onSessionStart() {
    this.sessionStartTime = Date.now();
    this.responseCount = 0;

    const context = await buildSessionContext(this.projectRoot);

    return { context };
  }

  /**
   * Called after each response - observes for patterns
   * @param {string} response - The response text
   * @returns {Promise<{detected: boolean}>}
   */
  async onResponse(response) {
    this.responseCount++;

    // Create exchange object from response
    const exchange = { assistant: response };

    // Process the exchange for patterns (synchronous detection)
    const classified = await processExchange(exchange);

    // Fire and forget the storage (non-blocking)
    observeAndRemember(this.projectRoot, exchange);

    const detected = classified.decisions.length > 0 ||
      classified.preferences.length > 0 ||
      classified.gotchas.length > 0 ||
      classified.reasoning.length > 0;

    return { detected };
  }

  /**
   * Called when session ends - returns summary
   * @returns {Promise<{summary: string}>}
   */
  async onSessionEnd() {
    const summaryData = await generateSessionSummary(this.projectRoot);
    const summary = formatSummary(summaryData);

    // Log session end
    await appendSessionLog(this.projectRoot, {
      type: 'session_end',
      responseCount: this.responseCount,
      duration: Date.now() - this.sessionStartTime,
    });

    return { summary };
  }

  /**
   * Called before a command runs
   * @param {string} command - Command name
   * @returns {Promise<{command: string}>}
   */
  async beforeCommand(command) {
    await appendSessionLog(this.projectRoot, {
      type: 'command_start',
      command,
    });

    return { command };
  }

  /**
   * Called after a command runs
   * @param {string} command - Command name
   * @param {Object} result - Command result
   * @returns {Promise<{logged: boolean}>}
   */
  async afterCommand(command, result) {
    await appendSessionLog(this.projectRoot, {
      type: 'command_end',
      command,
      success: result?.success,
    });

    return { logged: true };
  }
}

/**
 * Create memory hooks for a project
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Hook functions
 */
function createMemoryHooks(projectRoot) {
  const hooks = new MemoryHooks(projectRoot);

  return {
    onSessionStart: () => hooks.onSessionStart(),
    onResponse: (response) => hooks.onResponse(response),
    onSessionEnd: () => hooks.onSessionEnd(),
    beforeCommand: (command) => hooks.beforeCommand(command),
    afterCommand: (command, result) => hooks.afterCommand(command, result),
  };
}

module.exports = {
  createMemoryHooks,
  MemoryHooks,
};
