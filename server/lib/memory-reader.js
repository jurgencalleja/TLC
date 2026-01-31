/**
 * Memory Reader - Load and search memory from storage
 */

const fs = require('fs');
const path = require('path');
const { MEMORY_PATHS } = require('./memory-storage.js');

/**
 * Parse a decision markdown file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @returns {Object} Parsed decision
 */
function parseDecisionFile(content, filename) {
  const idMatch = filename.match(/^(\d{3})-/);
  const id = idMatch ? idMatch[1] : '000';

  const titleMatch = content.match(/^# Decision:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

  const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)$/m);
  const date = dateMatch ? dateMatch[1].trim() : null;

  const reasoningMatch = content.match(/## Reasoning\s*\n\n([\s\S]*?)(?=\n##|$)/);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';

  const contextMatch = content.match(/\*\*Context:\*\*\s*(.+)$/m);
  const context = contextMatch ? contextMatch[1].trim() : null;

  return {
    id,
    filename,
    title,
    date,
    reasoning,
    context,
    raw: content,
  };
}

/**
 * Parse a gotcha markdown file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @returns {Object} Parsed gotcha
 */
function parseGotchaFile(content, filename) {
  const titleMatch = content.match(/^# Gotcha:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

  const severityMatch = content.match(/\*\*Severity:\*\*\s*(.+)$/m);
  const severity = severityMatch ? severityMatch[1].trim() : 'medium';

  const issueMatch = content.match(/## Issue\s*\n\n([\s\S]*?)(?=\n##|$)/);
  const issue = issueMatch ? issueMatch[1].trim() : '';

  const workaroundMatch = content.match(/## Workaround\s*\n\n([\s\S]*?)(?=\n##|$)/);
  const workaround = workaroundMatch ? workaroundMatch[1].trim() : null;

  return {
    filename,
    title,
    severity,
    issue,
    workaround,
    raw: content,
  };
}

/**
 * Load all team decisions
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object[]>} Array of parsed decisions
 */
async function loadTeamDecisions(projectRoot) {
  const decisionsDir = path.join(projectRoot, MEMORY_PATHS.DECISIONS);

  if (!fs.existsSync(decisionsDir)) {
    return [];
  }

  const files = fs.readdirSync(decisionsDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  const decisions = [];
  for (const filename of files) {
    const filepath = path.join(decisionsDir, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    decisions.push(parseDecisionFile(content, filename));
  }

  return decisions;
}

/**
 * Load all team gotchas
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object[]>} Array of parsed gotchas
 */
async function loadTeamGotchas(projectRoot) {
  const gotchasDir = path.join(projectRoot, MEMORY_PATHS.GOTCHAS);

  if (!fs.existsSync(gotchasDir)) {
    return [];
  }

  const files = fs.readdirSync(gotchasDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  const gotchas = [];
  for (const filename of files) {
    const filepath = path.join(gotchasDir, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    gotchas.push(parseGotchaFile(content, filename));
  }

  return gotchas;
}

/**
 * Load personal preferences
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Preferences object
 */
async function loadPersonalPreferences(projectRoot) {
  const prefsPath = path.join(projectRoot, MEMORY_PATHS.LOCAL, 'preferences.json');

  if (!fs.existsSync(prefsPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

/**
 * Load recent session log entries
 * @param {string} projectRoot - Project root directory
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<Object[]>} Array of log entries
 */
async function loadRecentSessions(projectRoot, limit) {
  const sessionsDir = path.join(projectRoot, MEMORY_PATHS.SESSIONS);

  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  // Get session files sorted by date (most recent first)
  const files = fs.readdirSync(sessionsDir)
    .filter(f => f.endsWith('.jsonl'))
    .sort()
    .reverse();

  const entries = [];
  for (const filename of files) {
    if (entries.length >= limit) break;

    const filepath = path.join(sessionsDir, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.trim().split('\n').filter(l => l);

    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch (e) {
        // Skip malformed lines
      }
    }
  }

  // Return last N entries (most recent)
  return entries.slice(-limit);
}

/**
 * Search across all memory types
 * @param {string} projectRoot - Project root directory
 * @param {string} query - Search query
 * @returns {Promise<Object[]>} Array of search results
 */
async function searchMemory(projectRoot, query) {
  const lowerQuery = query.toLowerCase();
  const results = [];

  // Search decisions
  const decisions = await loadTeamDecisions(projectRoot);
  for (const decision of decisions) {
    if (decision.raw.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: 'decision',
        title: decision.title,
        content: decision.raw.substring(0, 200),
        source: decision.filename,
      });
    }
  }

  // Search gotchas
  const gotchas = await loadTeamGotchas(projectRoot);
  for (const gotcha of gotchas) {
    if (gotcha.raw.toLowerCase().includes(lowerQuery)) {
      results.push({
        type: 'gotcha',
        title: gotcha.title,
        content: gotcha.raw.substring(0, 200),
        source: gotcha.filename,
      });
    }
  }

  // Search session logs
  const sessions = await loadRecentSessions(projectRoot, 100);
  for (const entry of sessions) {
    const entryStr = JSON.stringify(entry).toLowerCase();
    if (entryStr.includes(lowerQuery)) {
      results.push({
        type: 'session',
        title: entry.type,
        content: entry.content || JSON.stringify(entry),
        source: 'session log',
      });
    }
  }

  return results;
}

module.exports = {
  loadTeamDecisions,
  loadTeamGotchas,
  loadPersonalPreferences,
  loadRecentSessions,
  searchMemory,
  parseDecisionFile,
  parseGotchaFile,
};
