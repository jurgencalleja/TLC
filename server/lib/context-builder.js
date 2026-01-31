/**
 * Context Builder - Build session context from memory
 */

const { loadTeamDecisions, loadTeamGotchas, loadPersonalPreferences, loadRecentSessions } = require('./memory-reader.js');

/**
 * Estimate token count from text (rough: ~4 chars per token)
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Build session context from all memory sources
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Options
 * @param {number} options.maxTokens - Maximum tokens for context
 * @returns {Promise<string>} Formatted context for CLAUDE.md
 */
async function buildSessionContext(projectRoot, options = {}) {
  const { maxTokens = 2000 } = options;

  const sections = [];

  // Load all memory
  const [decisions, gotchas, preferences, sessions] = await Promise.all([
    loadTeamDecisions(projectRoot),
    loadTeamGotchas(projectRoot),
    loadPersonalPreferences(projectRoot),
    loadRecentSessions(projectRoot, 10),
  ]);

  // Check if any memory exists
  const hasMemory = decisions.length > 0 ||
    gotchas.length > 0 ||
    Object.keys(preferences).length > 0 ||
    sessions.length > 0;

  if (!hasMemory) {
    return '';
  }

  // Build preferences section
  if (Object.keys(preferences).length > 0) {
    const prefsLines = ['## Preferences', ''];
    for (const [key, value] of Object.entries(preferences)) {
      if (typeof value === 'object') {
        prefsLines.push(`- **${key}:** ${JSON.stringify(value)}`);
      } else {
        prefsLines.push(`- **${key}:** ${value}`);
      }
    }
    sections.push({ content: prefsLines.join('\n'), priority: 1 });
  }

  // Build decisions section (most recent first)
  if (decisions.length > 0) {
    const sortedDecisions = [...decisions].reverse();
    const decisionLines = ['## Recent Decisions', ''];
    for (const d of sortedDecisions.slice(0, 5)) {
      decisionLines.push(`- **${d.title}**: ${d.reasoning?.substring(0, 100) || ''}`);
    }
    sections.push({ content: decisionLines.join('\n'), priority: 2 });
  }

  // Build gotchas section
  if (gotchas.length > 0) {
    const gotchaLines = ['## Gotchas', ''];
    for (const g of gotchas.slice(0, 5)) {
      gotchaLines.push(`- **${g.title}**: ${g.issue?.substring(0, 100) || ''}`);
    }
    sections.push({ content: gotchaLines.join('\n'), priority: 3 });
  }

  // Build recent activity section
  if (sessions.length > 0) {
    const activityLines = ['## Recent Activity', ''];
    for (const s of sessions.slice(-5)) {
      if (s.content) {
        activityLines.push(`- ${s.type}: ${s.content}`);
      }
    }
    if (activityLines.length > 2) {
      sections.push({ content: activityLines.join('\n'), priority: 4 });
    }
  }

  // Sort by priority and build final context
  sections.sort((a, b) => a.priority - b.priority);

  let context = '';
  let currentTokens = 0;

  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content);
    if (currentTokens + sectionTokens <= maxTokens) {
      context += section.content + '\n\n';
      currentTokens += sectionTokens;
    }
  }

  return context.trim();
}

module.exports = {
  buildSessionContext,
  estimateTokens,
};
