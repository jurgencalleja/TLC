/**
 * Recall Command — semantic memory search for /tlc:recall.
 *
 * Queries the semantic memory store with a natural-language query and returns
 * ranked results with similarity scores, type labels, source file paths, and
 * permanence indicators.
 *
 * Factory function accepts a `semanticRecall` dependency (see semantic-recall.js)
 * and returns an object with an `execute` method.
 *
 * @module recall-command
 */

import path from 'path';

/** Maximum characters for an excerpt in formatted output */
const EXCERPT_MAX_LENGTH = 120;

/** Maximum characters for a title derived from result text */
const TITLE_MAX_LENGTH = 80;

/**
 * Extract a short title from the result text.
 * Uses the first line if it is short enough, otherwise truncates.
 *
 * @param {string} text - Full result text
 * @returns {string} A short title string
 */
function extractTitle(text) {
  if (!text) return '(untitled)';
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length <= TITLE_MAX_LENGTH) {
    return firstLine;
  }
  return firstLine.slice(0, TITLE_MAX_LENGTH - 3) + '...';
}

/**
 * Truncate text to produce an excerpt.
 *
 * @param {string} text - Full result text
 * @returns {string} Truncated excerpt
 */
function extractExcerpt(text) {
  if (!text) return '';
  const trimmed = text.replace(/\n/g, ' ').trim();
  if (trimmed.length <= EXCERPT_MAX_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, EXCERPT_MAX_LENGTH - 3) + '...';
}

/**
 * Format a score (0–1) as a percentage string.
 *
 * @param {number} score - Score between 0 and 1
 * @returns {string} e.g. "92%"
 */
function formatScore(score) {
  return `${Math.round(score * 100)}%`;
}

/**
 * Format a timestamp as a human-readable date string.
 *
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  if (!timestamp) return 'unknown';
  return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * Map a raw semantic recall result to the public result shape.
 *
 * @param {object} result - A result from semanticRecall.recall()
 * @returns {object} Mapped result with title, date, score, type, excerpt, sourceFile, permanent
 */
function mapResult(result) {
  const sourceFile = result.source?.sourceFile || result.sourceFile || null;
  return {
    title: extractTitle(result.text),
    date: result.date,
    score: result.score,
    type: result.type,
    excerpt: extractExcerpt(result.text),
    sourceFile,
    permanent: result.permanent || false,
  };
}

/**
 * Build the formatted markdown output from the query and mapped results.
 *
 * @param {string} query - Original search query
 * @param {Array} results - Array of mapped result objects
 * @returns {string} Markdown-formatted string
 */
function buildFormatted(query, results) {
  const lines = [];

  lines.push(`## Memory Recall: "${query}"`);
  lines.push('');

  if (results.length === 0) {
    lines.push('No memories found for this query.');
    lines.push('');
    lines.push('Try broadening your search terms or using `--scope global` to search across all projects.');
    return lines.join('\n');
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const num = i + 1;
    const permanentTag = r.permanent ? ' [PERMANENT]' : '';

    lines.push(`### ${num}. ${r.title}${permanentTag}`);
    lines.push('');
    lines.push(`- **Score:** ${formatScore(r.score)}`);
    lines.push(`- **Type:** ${r.type}`);
    lines.push(`- **Date:** ${formatDate(r.date)}`);
    if (r.sourceFile) {
      lines.push(`- **Source:** ${r.sourceFile}`);
    }
    lines.push('');
    lines.push(`> ${r.excerpt}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Create a recall command instance for semantic memory search.
 *
 * @param {object} deps - Dependencies
 * @param {object} deps.semanticRecall - Semantic recall service with a `recall` method
 * @returns {object} Object with an `execute` method
 */
export function createRecallCommand({ semanticRecall }) {
  /**
   * Execute the recall command.
   *
   * @param {string} projectRoot - Absolute path to the project root
   * @param {object} options - Command options
   * @param {string} options.query - Natural-language search query
   * @param {string} [options.scope] - Search scope: 'project', 'workspace', or 'global'
   * @param {Array<string>} [options.types] - Filter to specific memory types
   * @param {number} [options.limit] - Maximum number of results
   * @returns {Promise<object>} Result with success, results, and formatted fields
   */
  async function execute(projectRoot, options = {}) {
    const { query, scope, types, limit } = options;

    // Empty query — return usage help
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        message: 'Please provide a search query.',
        formatted: [
          '## Memory Recall',
          '',
          'Usage: `/tlc:recall <query>` — search semantic memory.',
          '',
          'Options:',
          '- `--scope <project|workspace|global>` — search scope (default: project)',
          '- `--types <type1,type2>` — filter by memory type (e.g. decision, gotcha)',
          '- `--limit <n>` — max results to return',
          '',
          'Example: `/tlc:recall database architecture --scope workspace`',
        ].join('\n'),
      };
    }

    // Build context from projectRoot
    const context = {
      projectId: path.basename(projectRoot),
      workspace: projectRoot,
      branch: 'main',
      touchedFiles: [],
    };

    // Build search options, only including defined values
    const searchOptions = {};
    if (scope !== undefined) searchOptions.scope = scope;
    if (types !== undefined) searchOptions.types = types;
    if (limit !== undefined) searchOptions.limit = limit;

    // Perform semantic recall
    const rawResults = await semanticRecall.recall(query, context, searchOptions);

    // Map results to public shape
    const results = rawResults.map(mapResult);

    // Build formatted markdown output
    const formatted = buildFormatted(query, results);

    return {
      success: true,
      results,
      formatted,
    };
  }

  return { execute };
}
