/**
 * Capture Bridge - Connects Claude Code Stop hooks to TLC memory capture.
 *
 * Called by the shell hook script (.claude/hooks/tlc-capture-exchange.sh).
 * Reads Stop hook stdin, extracts the exchange, POSTs to the TLC server
 * capture endpoint, and spools to a local JSONL file on failure.
 *
 * @module capture-bridge
 */

const fs = require('fs');
const path = require('path');

/** Spool filename for failed capture attempts */
const SPOOL_FILENAME = '.spool.jsonl';

/** Maximum message size before truncation (10KB) */
const MAX_MESSAGE_SIZE = 10240;

/** Default TLC server port */
const DEFAULT_PORT = 3147;

/**
 * Parse the JSON stdin from a Claude Code Stop hook.
 *
 * @param {string} input - Raw JSON string from stdin
 * @returns {{ sessionId: string, assistantMessage: string|null, transcriptPath: string|null, cwd: string|null } | null}
 */
function parseStopHookInput(input) {
  if (!input) return null;

  try {
    const data = JSON.parse(input);
    return {
      sessionId: data.session_id || null,
      assistantMessage: data.last_assistant_message || null,
      transcriptPath: data.transcript_path || null,
      cwd: data.cwd || null,
    };
  } catch {
    return null;
  }
}

/**
 * Extract the last user message from a Claude Code transcript JSONL file.
 *
 * @param {string} transcriptPath - Absolute path to the transcript .jsonl file
 * @returns {string|null} Last user message text, or null
 */
function extractLastUserMessage(transcriptPath) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8').trim();
    if (!content) return null;

    const lines = content.split('\n').filter(Boolean);
    let lastUserMessage = null;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.role === 'user' && entry.content) {
          lastUserMessage = entry.content;
        }
      } catch {
        // Skip malformed lines
      }
    }

    return lastUserMessage;
  } catch {
    return null;
  }
}

/**
 * Detect the project ID from the working directory.
 * Reads .tlc.json if present, otherwise uses the directory basename.
 *
 * @param {string} cwd - Working directory path
 * @returns {string} Project identifier
 */
function detectProjectId(cwd) {
  try {
    const tlcPath = path.join(cwd, '.tlc.json');
    if (fs.existsSync(tlcPath)) {
      const config = JSON.parse(fs.readFileSync(tlcPath, 'utf-8'));
      if (config.project) return config.project;
    }
  } catch {
    // Fall through to basename
  }
  return path.basename(cwd) || 'unknown';
}

/**
 * Truncate a string to MAX_MESSAGE_SIZE, appending a marker if truncated.
 *
 * @param {string} text - Input text
 * @returns {string} Possibly truncated text
 */
function truncate(text) {
  if (!text || text.length <= MAX_MESSAGE_SIZE) return text || '';
  return text.slice(0, MAX_MESSAGE_SIZE) + '... [truncated]';
}

/**
 * Append a failed capture to the local spool file for later retry.
 *
 * @param {string} spoolDir - Directory containing the spool file
 * @param {object} payload - The capture payload that failed to send
 */
function appendToSpool(spoolDir, payload) {
  try {
    if (!fs.existsSync(spoolDir)) {
      fs.mkdirSync(spoolDir, { recursive: true });
    }
    const spoolPath = path.join(spoolDir, SPOOL_FILENAME);
    fs.appendFileSync(spoolPath, JSON.stringify(payload) + '\n');
  } catch {
    // Spool write failure is non-fatal
  }
}

/**
 * Capture an exchange and POST it to the TLC server.
 * On failure, spools to a local JSONL file.
 * Never throws — all errors are swallowed.
 *
 * @param {object} opts
 * @param {string} opts.cwd - Working directory
 * @param {string} opts.assistantMessage - The assistant's response text
 * @param {string|null} opts.userMessage - The user's prompt text
 * @param {string} opts.sessionId - Session identifier
 * @param {object} [deps] - Injectable dependencies
 * @param {Function} [deps.fetch] - fetch implementation (default: globalThis.fetch)
 * @param {string} [deps.spoolDir] - Spool directory override
 * @param {number} [deps.port] - Server port override
 */
async function captureExchange(opts, deps = {}) {
  try {
    const { cwd, assistantMessage, userMessage, sessionId } = opts;
    const fetchFn = deps.fetch || globalThis.fetch;
    const port = deps.port || DEFAULT_PORT;

    // Skip empty messages
    if (!assistantMessage) return;

    const projectId = detectProjectId(cwd || '.');
    const spoolDir = deps.spoolDir || path.join(cwd, '.tlc', 'memory');

    const payload = {
      projectId,
      exchanges: [{
        user: truncate(userMessage || ''),
        assistant: truncate(assistantMessage),
        timestamp: Date.now(),
      }],
    };

    try {
      const url = `http://localhost:${port}/api/projects/${encodeURIComponent(projectId)}/memory/capture`;
      const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        appendToSpool(spoolDir, payload);
      }
    } catch {
      // Server unreachable — spool for later
      appendToSpool(spoolDir, payload);
    }
  } catch {
    // Total failure — silently ignore
  }
}

/**
 * Drain the local spool file by POSTing each entry to the capture endpoint.
 * Successfully sent entries are removed; failed entries remain for next drain.
 * Never throws.
 *
 * @param {string} spoolDir - Directory containing the spool file
 * @param {object} [deps] - Injectable dependencies
 * @param {Function} [deps.fetch] - fetch implementation
 * @param {number} [deps.port] - Server port override
 */
async function drainSpool(spoolDir, deps = {}) {
  try {
    const fetchFn = deps.fetch || globalThis.fetch;
    const port = deps.port || DEFAULT_PORT;
    const spoolPath = path.join(spoolDir, SPOOL_FILENAME);

    if (!fs.existsSync(spoolPath)) return;

    const content = fs.readFileSync(spoolPath, 'utf-8').trim();
    if (!content) return;

    const lines = content.split('\n').filter(Boolean);
    const failed = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const projectId = entry.projectId || 'unknown';
        const url = `http://localhost:${port}/api/projects/${encodeURIComponent(projectId)}/memory/capture`;

        const response = await fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exchanges: entry.exchanges }),
        });

        if (!response.ok) {
          failed.push(line);
        }
      } catch {
        failed.push(line);
      }
    }

    // Rewrite spool with only failed entries
    fs.writeFileSync(spoolPath, failed.length > 0 ? failed.join('\n') + '\n' : '');
  } catch {
    // Drain failure is non-fatal
  }
}

module.exports = {
  parseStopHookInput,
  extractLastUserMessage,
  captureExchange,
  drainSpool,
  detectProjectId,
  truncate,
  SPOOL_FILENAME,
  MAX_MESSAGE_SIZE,
  DEFAULT_PORT,
};
