/**
 * Codex CLI Adapter
 *
 * Format prompts for Codex CLI and parse its output.
 *
 * @module llm/adapters/codex-adapter
 */

const DEFAULT_TIMEOUT = 60000;

/**
 * Build Codex CLI command
 * @param {string} prompt - Prompt text
 * @param {Object} options - Adapter options
 * @returns {Object} Command specification
 */
function buildCommand(prompt, options = {}) {
  const args = ['--quiet'];

  if (options.model) {
    args.push('--model', options.model);
  }

  return {
    command: 'codex',
    args,
    prompt,
    timeout: options.timeout || DEFAULT_TIMEOUT,
  };
}

/**
 * Parse Codex response
 * @param {string} output - Raw CLI output
 * @returns {Object} Parsed response
 */
function parseResponse(output) {
  const trimmed = output.trim();

  // Try JSON parse first
  try {
    const parsed = JSON.parse(trimmed);
    return {
      findings: parsed.findings || [],
      summary: parsed.summary || '',
      raw: trimmed,
    };
  } catch {
    // Not JSON — return raw
    return {
      raw: trimmed,
      findings: [],
      summary: trimmed,
    };
  }
}

/**
 * Create a Codex adapter instance
 * @param {Object} config - Adapter config
 * @returns {Object} Adapter with execute interface
 */
function createAdapter(config = {}) {
  return {
    name: 'codex',
    execute: async (prompt, deps = {}) => {
      const cmd = buildCommand(prompt, config);
      const { executeCliProvider } = deps;
      if (!executeCliProvider) {
        throw new Error('executeCliProvider dependency required');
      }
      const result = await executeCliProvider(prompt, {
        ...cmd,
        spawn: deps.spawn,
      });
      return parseResponse(result.response);
    },
  };
}

module.exports = {
  buildCommand,
  parseResponse,
  createAdapter,
};
