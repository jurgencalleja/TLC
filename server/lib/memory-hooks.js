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

/**
 * Default number of exchanges before auto-triggering capture processing
 * @type {number}
 */
const DEFAULT_CAPTURE_THRESHOLD = 5;

/**
 * Create capture hooks for rolling buffer conversation capture.
 *
 * Accumulates exchanges in a rolling buffer and processes them through
 * chunking, rich capture writing, and vector indexing when a threshold
 * is reached, a TLC command fires, or flush() is called explicitly.
 *
 * Processing is non-blocking (fire-and-forget via Promise microtask).
 *
 * @param {string} projectRoot - Project root directory
 * @param {Object} deps - Injected dependencies
 * @param {Object} deps.chunker - Chunker with chunkConversation(exchanges)
 * @param {Object} deps.richCapture - Writer with writeConversationChunk(projectRoot, chunk)
 * @param {Object} deps.vectorIndexer - Indexer with indexChunk(chunk)
 * @returns {{ onExchange: Function, getBufferSize: Function, onTlcCommand: Function, flush: Function, processBuffer: Function }}
 */
function createCaptureHooks(projectRoot, deps) {
  const { chunker, richCapture, vectorIndexer } = deps;
  let buffer = [];
  let processing = false;

  /**
   * Process the current buffer: chunk, write, index, then clear.
   * Runs asynchronously in a microtask so it never blocks the caller.
   * The buffer is cleared after processing completes, not before.
   */
  function processBuffer() {
    if (buffer.length === 0 || processing) return;

    processing = true;

    Promise.resolve().then(async () => {
      try {
        const exchanges = buffer.slice();
        const chunks = chunker.chunkConversation(exchanges);
        for (const chunk of chunks) {
          await richCapture.writeConversationChunk(projectRoot, chunk);
          await vectorIndexer.indexChunk(chunk);
        }
        buffer = [];
      } catch (_err) {
        // Error resilience: capture failures must not propagate.
        // Hooks remain functional after errors.
        buffer = [];
      } finally {
        processing = false;
      }
    });
  }

  /**
   * Add an exchange to the rolling buffer.
   * Automatically triggers processing when the buffer reaches the threshold.
   * @param {{ user: string, assistant: string, timestamp: number }} exchange
   */
  function onExchange(exchange) {
    buffer.push(exchange);

    if (buffer.length >= DEFAULT_CAPTURE_THRESHOLD) {
      processBuffer();
    }
  }

  /**
   * @returns {number} Current number of exchanges in the buffer
   */
  function getBufferSize() {
    return buffer.length;
  }

  /**
   * A TLC command was invoked -- trigger immediate capture of buffered exchanges.
   * @param {string} _command - The TLC command name (e.g. 'build', 'plan')
   */
  function onTlcCommand(_command) {
    processBuffer();
  }

  /**
   * Force-flush the buffer regardless of threshold.
   */
  function flush() {
    processBuffer();
  }

  return {
    onExchange,
    getBufferSize,
    onTlcCommand,
    flush,
    processBuffer,
  };
}

module.exports = {
  createMemoryHooks,
  MemoryHooks,
  createCaptureHooks,
};
