/**
 * Session Summary - Generate end-of-session summary from captured memory
 */

const { loadTeamDecisions, loadTeamGotchas, loadPersonalPreferences, loadRecentSessions } = require('./memory-reader.js');

/**
 * Generate session summary from all memory sources
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Options
 * @param {number} options.limit - Maximum items per category
 * @returns {Promise<Object>} Session summary
 */
async function generateSessionSummary(projectRoot, options = {}) {
  const { limit = 10 } = options;

  const [decisions, gotchas, preferences, sessions] = await Promise.all([
    loadTeamDecisions(projectRoot),
    loadTeamGotchas(projectRoot),
    loadPersonalPreferences(projectRoot),
    loadRecentSessions(projectRoot, 50),
  ]);

  return {
    decisions: decisions.slice(-limit),
    gotchas: gotchas.slice(-limit),
    preferences,
    activityCount: sessions.length,
  };
}

/**
 * Format summary as markdown
 * @param {Object} summary - Session summary
 * @returns {string} Formatted markdown
 */
function formatSummary(summary) {
  const lines = ['# Session Summary', ''];

  const hasContent = summary.decisions.length > 0 ||
    Object.keys(summary.preferences).length > 0 ||
    summary.gotchas.length > 0;

  if (!hasContent) {
    lines.push('No new decisions, preferences, or gotchas this session.');
    lines.push('');
    lines.push(`Activity: ${summary.activityCount} events logged.`);
    return lines.join('\n');
  }

  // Decisions
  if (summary.decisions.length > 0) {
    lines.push('## Decisions Made');
    lines.push('');
    for (const d of summary.decisions) {
      lines.push(`- **${d.title}**: ${d.reasoning || ''}`);
    }
    lines.push('');
  }

  // Preferences
  if (Object.keys(summary.preferences).length > 0) {
    lines.push('## Preferences Discovered');
    lines.push('');
    for (const [key, value] of Object.entries(summary.preferences)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
      lines.push(`- **${key}**: ${displayValue}`);
    }
    lines.push('');
  }

  // Gotchas
  if (summary.gotchas.length > 0) {
    lines.push('## Gotchas Identified');
    lines.push('');
    for (const g of summary.gotchas) {
      lines.push(`- **${g.title}**: ${g.issue || ''}`);
    }
    lines.push('');
  }

  lines.push(`Activity: ${summary.activityCount} events logged.`);

  return lines.join('\n');
}

module.exports = {
  generateSessionSummary,
  formatSummary,
};
