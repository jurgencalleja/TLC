/**
 * Wall of Shame Registry
 *
 * Document bugs with root causes, creating a project-level learning registry.
 * Gate rules can be suggested from shame entries to prevent recurrence.
 *
 * @module shame/shame-registry
 */

const path = require('path');
const defaultFs = require('fs').promises;
const crypto = require('crypto');

/** Shame file path relative to project root */
const SHAME_FILE = '.tlc/shame.json';

/** Valid shame categories */
const SHAME_CATEGORIES = [
  'architecture',
  'type-safety',
  'duplication',
  'docker',
  'security',
  'data-loss',
];

/** Gate rule suggestions per category */
const RULE_SUGGESTIONS = {
  'architecture': [
    { rule: 'single-writer', description: 'Enforce single-writer pattern — one service per DB table' },
    { rule: 'no-raw-api', description: 'Use API helper instead of raw fetch/axios calls' },
    { rule: 'no-flat-folders', description: 'Organize code by entity, not by type' },
  ],
  'type-safety': [
    { rule: 'tsc-noEmit', description: 'Run tsc --noEmit before push to catch type errors' },
    { rule: 'zod-coerce-date', description: 'Use z.coerce.date() instead of z.date() for API schemas' },
    { rule: 'no-any', description: 'Disallow explicit any types' },
  ],
  'duplication': [
    { rule: 'no-duplicate-logic', description: 'Extract shared logic to common utility modules' },
    { rule: 'single-source-of-truth', description: 'Constants and config in one place' },
  ],
  'docker': [
    { rule: 'volume-names', description: 'All Docker volumes must have explicit name: property' },
    { rule: 'no-external-volumes', description: 'Do not use external: true in volumes' },
    { rule: 'no-dangerous-commands', description: 'Block docker system prune in scripts' },
  ],
  'security': [
    { rule: 'no-hardcoded-secrets', description: 'Never hardcode API keys, passwords, or tokens' },
    { rule: 'input-validation', description: 'Validate all external input at API boundaries' },
    { rule: 'no-eval', description: 'Never use eval() or Function() constructor' },
  ],
  'data-loss': [
    { rule: 'backup-before-migrate', description: 'Require backup before destructive migrations' },
    { rule: 'soft-delete', description: 'Prefer soft-delete over hard-delete for user data' },
    { rule: 'transaction-wrap', description: 'Wrap multi-step DB operations in transactions' },
  ],
};

/**
 * Add a new shame entry to the entries array
 * @param {Array} entries - Current entries
 * @param {Object} data - Entry data
 * @param {string} data.title - Bug title
 * @param {string} data.rootCause - Root cause description
 * @param {string} data.category - Category from SHAME_CATEGORIES
 * @param {string} data.fix - How it was fixed
 * @param {string} data.lesson - Lesson learned
 * @returns {Object} The new entry with id and timestamp
 */
function addEntry(entries, data) {
  const entry = {
    id: crypto.randomBytes(4).toString('hex'),
    title: data.title,
    rootCause: data.rootCause,
    category: data.category,
    fix: data.fix,
    lesson: data.lesson,
    timestamp: new Date().toISOString(),
  };

  entries.push(entry);
  return entry;
}

/**
 * Load entries from .tlc/shame.json
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Injectable dependencies
 * @param {Object} options.fs - File system module
 * @returns {Promise<Array>} Loaded entries
 */
async function loadEntries(projectPath, options = {}) {
  const fsModule = options.fs || defaultFs;
  const filePath = path.join(projectPath, SHAME_FILE);

  try {
    const content = await fsModule.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save entries to .tlc/shame.json
 * @param {string} projectPath - Path to project root
 * @param {Array} entries - Entries to save
 * @param {Object} options - Injectable dependencies
 * @param {Object} options.fs - File system module
 * @returns {Promise<void>}
 */
async function saveEntries(projectPath, entries, options = {}) {
  const fsModule = options.fs || defaultFs;
  const filePath = path.join(projectPath, SHAME_FILE);
  const dirPath = path.dirname(filePath);

  await fsModule.mkdir(dirPath, { recursive: true });
  await fsModule.writeFile(filePath, JSON.stringify(entries, null, 2));
}

/**
 * Validate a category
 * @param {string} category - Category to validate
 * @returns {Object} { valid: boolean, category: string }
 */
function categorizeEntry(category) {
  const valid = SHAME_CATEGORIES.includes(category);
  return { valid, category };
}

/**
 * Generate a markdown report grouped by category
 * @param {Array} entries - Shame entries
 * @returns {string} Markdown report
 */
function generateReport(entries) {
  if (entries.length === 0) {
    return '# Wall of Shame\n\nNo entries yet.\n';
  }

  // Group by category
  const groups = {};
  for (const entry of entries) {
    const cat = entry.category || 'uncategorized';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(entry);
  }

  let report = '# Wall of Shame\n\n';
  report += `Total entries: ${entries.length}\n\n`;

  for (const [category, categoryEntries] of Object.entries(groups)) {
    report += `## ${category}\n\n`;

    for (const entry of categoryEntries) {
      report += `### ${entry.title}\n\n`;
      report += `- **Root Cause:** ${entry.rootCause}\n`;
      report += `- **Fix:** ${entry.fix}\n`;
      report += `- **Lesson:** ${entry.lesson}\n`;
      report += `- **Date:** ${entry.timestamp}\n\n`;
    }
  }

  return report;
}

/**
 * Suggest gate rules based on shame category
 * @param {string} category - Shame category
 * @returns {Array<{rule: string, description: string}>} Suggested rules
 */
function suggestGateRules(category) {
  return RULE_SUGGESTIONS[category] || [];
}

/**
 * Track recurrence counts per category
 * @param {Array} entries - All shame entries
 * @returns {Object} Category → count mapping
 */
function trackRecurrence(entries) {
  const counts = {};
  for (const entry of entries) {
    const cat = entry.category || 'uncategorized';
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

/**
 * Create a shame registry instance with dependencies
 * @param {Object} deps - Injectable dependencies
 * @param {Object} deps.fs - File system module
 * @returns {Object} Registry instance
 */
function createShameRegistry(deps = {}) {
  let entries = [];

  return {
    add: (data) => addEntry(entries, data),
    load: async (projectPath) => {
      entries = await loadEntries(projectPath, deps);
      return entries;
    },
    save: (projectPath) => saveEntries(projectPath, entries, deps),
    report: () => generateReport(entries),
    suggest: (category) => suggestGateRules(category),
    recurrence: () => trackRecurrence(entries),
  };
}

module.exports = {
  createShameRegistry,
  addEntry,
  loadEntries,
  saveEntries,
  categorizeEntry,
  generateReport,
  suggestGateRules,
  trackRecurrence,
  SHAME_CATEGORIES,
};
