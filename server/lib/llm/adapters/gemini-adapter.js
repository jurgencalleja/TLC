/**
 * Gemini CLI Adapter
 *
 * Format prompts for Gemini CLI and parse its output.
 *
 * @module llm/adapters/gemini-adapter
 */

const DEFAULT_TIMEOUT = 60000;

/**
 * Build Gemini CLI command
 * @param {string} prompt - Prompt text
 * @param {Object} options - Adapter options
 * @returns {Object} Command specification
 */
function buildCommand(prompt, options = {}) {
  const args = [];

  if (options.model) {
    args.push('--model', options.model);
  }

  return {
    command: 'gemini',
    args,
    prompt,
    timeout: options.timeout || DEFAULT_TIMEOUT,
  };
}

/**
 * Parse Gemini response (may be markdown or JSON in code block)
 * @param {string} output - Raw CLI output
 * @returns {Object} Parsed response
 */
function parseResponse(output) {
  const trimmed = output.trim();

  // Try to extract JSON from markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      return {
        findings: parsed.findings || [],
        summary: parsed.summary || '',
        raw: trimmed,
      };
    } catch {
      // JSON in code block but invalid — fall through
    }
  }

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(trimmed);
    return {
      findings: parsed.findings || [],
      summary: parsed.summary || '',
      raw: trimmed,
    };
  } catch {
    // Markdown/text response
    return {
      raw: trimmed,
      findings: [],
      summary: trimmed,
    };
  }
}

/**
 * Create a Gemini adapter instance
 * @param {Object} config - Adapter config
 * @returns {Object} Adapter with execute interface
 */
function createAdapter(config = {}) {
  return {
    name: 'gemini',
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
