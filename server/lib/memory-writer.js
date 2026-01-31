/**
 * Memory Writer - Write decisions, gotchas, preferences, and session logs
 */

const fs = require('fs');
const path = require('path');
const { MEMORY_PATHS } = require('./memory-storage.js');

/**
 * Convert title to URL-friendly slug
 * @param {string} title - The title to slugify
 * @returns {string} - URL-friendly slug
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Get next decision/gotcha ID by counting existing files
 * @param {string} dir - Directory to count files in
 * @returns {string} - Zero-padded ID (e.g., "001")
 */
function getNextId(dir) {
  if (!fs.existsSync(dir)) {
    return '001';
  }
  const files = fs.readdirSync(dir).filter(f => f.match(/^\d{3}-/));
  const nextNum = files.length + 1;
  return String(nextNum).padStart(3, '0');
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string}
 */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Write a team decision to the decisions directory
 * @param {string} projectRoot - Project root directory
 * @param {Object} decision - Decision object
 * @param {string} decision.title - Decision title
 * @param {string} decision.reasoning - Why this decision was made
 * @param {string} [decision.context] - Context for the decision
 * @param {string[]} [decision.alternatives] - Alternatives considered
 * @returns {Promise<string>} - Path to created file
 */
async function writeTeamDecision(projectRoot, decision) {
  const decisionsDir = path.join(projectRoot, MEMORY_PATHS.DECISIONS);
  fs.mkdirSync(decisionsDir, { recursive: true });

  const id = getNextId(decisionsDir);
  const slug = slugify(decision.title);
  const filename = `${id}-${slug}.md`;
  const filepath = path.join(decisionsDir, filename);

  const content = `# Decision: ${decision.title}

**Date:** ${getToday()}
**Status:** Active
${decision.context ? `**Context:** ${decision.context}` : ''}

## Decision

${decision.title}

## Reasoning

${decision.reasoning}
${decision.alternatives && decision.alternatives.length > 0 ? `
## Alternatives Considered

${decision.alternatives.map(alt => `- ${alt}`).join('\n')}
` : ''}`;

  fs.writeFileSync(filepath, content, 'utf8');
  return filepath;
}

/**
 * Write a team gotcha to the gotchas directory
 * @param {string} projectRoot - Project root directory
 * @param {Object} gotcha - Gotcha object
 * @param {string} gotcha.title - Gotcha title
 * @param {string} gotcha.issue - The issue description
 * @param {string} [gotcha.workaround] - Workaround for the issue
 * @param {string} [gotcha.severity] - Severity level (low/medium/high)
 * @param {string[]} [gotcha.affected] - Affected files/directories
 * @returns {Promise<string>} - Path to created file
 */
async function writeTeamGotcha(projectRoot, gotcha) {
  const gotchasDir = path.join(projectRoot, MEMORY_PATHS.GOTCHAS);
  fs.mkdirSync(gotchasDir, { recursive: true });

  const slug = slugify(gotcha.title);
  const filename = `${slug}.md`;
  const filepath = path.join(gotchasDir, filename);

  const content = `# Gotcha: ${gotcha.title}

**Date:** ${getToday()}
**Severity:** ${gotcha.severity || 'medium'}
${gotcha.affected && gotcha.affected.length > 0 ? `**Affected:** ${gotcha.affected.join(', ')}` : ''}

## Issue

${gotcha.issue}
${gotcha.workaround ? `
## Workaround

${gotcha.workaround}
` : ''}`;

  fs.writeFileSync(filepath, content, 'utf8');
  return filepath;
}

/**
 * Write a personal preference to preferences.json
 * @param {string} projectRoot - Project root directory
 * @param {string} key - Preference key
 * @param {any} value - Preference value
 * @returns {Promise<void>}
 */
async function writePersonalPreference(projectRoot, key, value) {
  const prefsPath = path.join(projectRoot, MEMORY_PATHS.LOCAL, 'preferences.json');

  let prefs = {};
  if (fs.existsSync(prefsPath)) {
    try {
      prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    } catch (e) {
      prefs = {};
    }
  }

  prefs[key] = value;
  fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), 'utf8');
}

/**
 * Append an entry to today's session log
 * @param {string} projectRoot - Project root directory
 * @param {Object} entry - Log entry
 * @returns {Promise<void>}
 */
async function appendSessionLog(projectRoot, entry) {
  const sessionsDir = path.join(projectRoot, MEMORY_PATHS.SESSIONS);
  fs.mkdirSync(sessionsDir, { recursive: true });

  const today = getToday();
  const logPath = path.join(sessionsDir, `${today}.jsonl`);

  const logEntry = {
    ts: new Date().toISOString(),
    ...entry,
  };

  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf8');
}

module.exports = {
  writeTeamDecision,
  writeTeamGotcha,
  writePersonalPreference,
  appendSessionLog,
  slugify,
  getNextId,
};
