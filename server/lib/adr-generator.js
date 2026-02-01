/**
 * ADR Generator - Architecture Decision Records management
 *
 * Create, update, and manage ADR documents following the standard ADR format.
 * ADRs are stored in .planning/adr/ directory.
 */

const fs = require('fs');
const path = require('path');

/**
 * Directory path for ADRs relative to project root
 */
const ADR_DIR = '.planning/adr';

/**
 * Valid ADR statuses
 */
const ADR_STATUSES = ['proposed', 'accepted', 'deprecated', 'superseded'];

/**
 * ADR template with placeholders
 */
const ADR_TEMPLATE = `# ADR {{NUMBER}}: {{TITLE}}

**Date:** {{DATE}}
**Status:** {{STATUS}}

## Context

{{CONTEXT}}

## Decision

{{DECISION}}

## Consequences

{{CONSEQUENCES}}
`;

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
 * Get today's date in YYYY-MM-DD format
 * @returns {string}
 */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get next ADR number
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<string>} - Zero-padded 4-digit number (e.g., "0001")
 */
async function getNextAdrNumber(projectRoot) {
  const adrPath = path.join(projectRoot, ADR_DIR);

  if (!fs.existsSync(adrPath)) {
    return '0001';
  }

  const files = fs.readdirSync(adrPath)
    .filter(f => f.match(/^\d{4}-.*\.md$/));

  if (files.length === 0) {
    return '0001';
  }

  // Find highest number
  const numbers = files.map(f => parseInt(f.substring(0, 4), 10));
  const maxNum = Math.max(...numbers);
  return String(maxNum + 1).padStart(4, '0');
}

/**
 * Create a new ADR
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - ADR options
 * @param {string} options.title - ADR title
 * @param {string} options.context - Context section content
 * @param {string} options.decision - Decision section content
 * @param {string} options.consequences - Consequences section content
 * @param {string} [options.status='proposed'] - ADR status
 * @returns {Promise<Object>} - Created ADR metadata
 */
async function createAdr(projectRoot, options) {
  const { title, context, decision, consequences, status = 'proposed' } = options;

  const adrPath = path.join(projectRoot, ADR_DIR);
  fs.mkdirSync(adrPath, { recursive: true });

  const number = await getNextAdrNumber(projectRoot);
  const date = getToday();
  const slug = slugify(title);
  const filename = `${number}-${slug}.md`;
  const filepath = path.join(adrPath, filename);

  const content = ADR_TEMPLATE
    .replace('{{NUMBER}}', number)
    .replace('{{TITLE}}', title)
    .replace('{{DATE}}', date)
    .replace('{{STATUS}}', status)
    .replace('{{CONTEXT}}', context)
    .replace('{{DECISION}}', decision)
    .replace('{{CONSEQUENCES}}', consequences);

  fs.writeFileSync(filepath, content, 'utf8');

  return {
    number,
    title,
    status,
    date,
    path: filepath,
  };
}

/**
 * Update ADR status
 * @param {string} projectRoot - Project root directory
 * @param {string} number - ADR number (e.g., "0001")
 * @param {string} newStatus - New status
 * @param {Object} [options] - Additional options
 * @param {string} [options.supersededBy] - ADR number that supersedes this one
 * @returns {Promise<void>}
 */
async function updateAdrStatus(projectRoot, number, newStatus, options = {}) {
  if (!ADR_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Valid statuses: ${ADR_STATUSES.join(', ')}`);
  }

  const adrPath = path.join(projectRoot, ADR_DIR);

  if (!fs.existsSync(adrPath)) {
    throw new Error(`ADR ${number} not found`);
  }

  const files = fs.readdirSync(adrPath);
  const adrFile = files.find(f => f.startsWith(number) && f.endsWith('.md'));

  if (!adrFile) {
    throw new Error(`ADR ${number} not found`);
  }

  const filepath = path.join(adrPath, adrFile);
  let content = fs.readFileSync(filepath, 'utf8');

  // Replace status
  content = content.replace(
    /\*\*Status:\*\*\s*\w+/,
    `**Status:** ${newStatus}`
  );

  // Add superseded by reference if applicable
  if (newStatus === 'superseded' && options.supersededBy) {
    // Check if superseded reference already exists
    if (!content.includes('Superseded by ADR')) {
      content = content.replace(
        /\*\*Status:\*\*\s*superseded/,
        `**Status:** superseded\n**Superseded by ADR ${options.supersededBy}**`
      );
    }
  }

  fs.writeFileSync(filepath, content, 'utf8');
}

/**
 * Load an ADR by number
 * @param {string} projectRoot - Project root directory
 * @param {string} number - ADR number (e.g., "0001")
 * @returns {Promise<Object|null>} - Parsed ADR or null if not found
 */
async function loadAdr(projectRoot, number) {
  const adrPath = path.join(projectRoot, ADR_DIR);

  if (!fs.existsSync(adrPath)) {
    return null;
  }

  const files = fs.readdirSync(adrPath);
  const adrFile = files.find(f => f.startsWith(number) && f.endsWith('.md'));

  if (!adrFile) {
    return null;
  }

  const filepath = path.join(adrPath, adrFile);
  const content = fs.readFileSync(filepath, 'utf8');

  return parseAdrContent(content, number);
}

/**
 * Parse ADR content
 * @param {string} content - ADR file content
 * @param {string} number - ADR number
 * @returns {Object} - Parsed ADR
 */
function parseAdrContent(content, number) {
  const titleMatch = content.match(/^# ADR \d{4}:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

  const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)$/m);
  const date = dateMatch ? dateMatch[1].trim() : null;

  const statusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/);
  const status = statusMatch ? statusMatch[1].trim() : 'proposed';

  const contextMatch = content.match(/## Context\s*\n\n([\s\S]*?)(?=\n## )/);
  const context = contextMatch ? contextMatch[1].trim() : '';

  const decisionMatch = content.match(/## Decision\s*\n\n([\s\S]*?)(?=\n## )/);
  const decision = decisionMatch ? decisionMatch[1].trim() : '';

  const consequencesMatch = content.match(/## Consequences\s*\n\n([\s\S]*?)$/);
  const consequences = consequencesMatch ? consequencesMatch[1].trim() : '';

  return {
    number,
    title,
    date,
    status,
    context,
    decision,
    consequences,
    raw: content,
  };
}

/**
 * List all ADRs
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object[]>} - Array of ADR metadata
 */
async function listAdrs(projectRoot) {
  const adrPath = path.join(projectRoot, ADR_DIR);

  if (!fs.existsSync(adrPath)) {
    return [];
  }

  const files = fs.readdirSync(adrPath)
    .filter(f => f.match(/^\d{4}-.*\.md$/))
    .sort();

  const adrs = [];
  for (const filename of files) {
    const number = filename.substring(0, 4);
    const filepath = path.join(adrPath, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const adr = parseAdrContent(content, number);
    adr.filename = filename;
    adrs.push(adr);
  }

  return adrs;
}

/**
 * Generate ADR index document
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<string>} - Markdown index content
 */
async function generateAdrIndex(projectRoot) {
  const adrs = await listAdrs(projectRoot);

  let content = '# Architecture Decision Records\n\n';

  if (adrs.length === 0) {
    content += 'No ADRs found.\n';
    return content;
  }

  content += '| Number | Title | Status | Date |\n';
  content += '|--------|-------|--------|------|\n';

  for (const adr of adrs) {
    const link = `[${adr.number}](${adr.filename})`;
    content += `| ${link} | ${adr.title} | ${adr.status} | ${adr.date || 'N/A'} |\n`;
  }

  return content;
}

/**
 * Extract architectural decisions from workspace memory
 * @param {string} projectRoot - Project root directory
 * @param {Object} [options] - Options
 * @param {boolean} [options.architecturalOnly=false] - Filter to architectural decisions only
 * @returns {Promise<Object[]>} - Array of decisions converted to ADR format
 */
async function extractDecisionsFromMemory(projectRoot, options = {}) {
  const { architecturalOnly = false } = options;
  const decisionsDir = path.join(projectRoot, '.tlc', 'memory', 'team', 'decisions');

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

    const decision = parseMemoryDecision(content);

    // Filter architectural decisions if requested
    if (architecturalOnly) {
      const isArchitectural = isArchitecturalDecision(decision);
      if (!isArchitectural) {
        continue;
      }
    }

    decisions.push(decision);
  }

  return decisions;
}

/**
 * Parse a memory decision file into ADR-compatible format
 * @param {string} content - File content
 * @returns {Object} - Parsed decision
 */
function parseMemoryDecision(content) {
  const titleMatch = content.match(/^# Decision:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

  const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)$/m);
  const date = dateMatch ? dateMatch[1].trim() : null;

  const contextMatch = content.match(/\*\*Context:\*\*\s*(.+)$/m);
  const context = contextMatch ? contextMatch[1].trim() : '';

  const decisionMatch = content.match(/## Decision\s*\n\n([\s\S]*?)(?=\n## |$)/);
  const decision = decisionMatch ? decisionMatch[1].trim() : '';

  const reasoningMatch = content.match(/## Reasoning\s*\n\n([\s\S]*?)(?=\n## |$)/);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';

  const alternativesMatch = content.match(/## Alternatives Considered\s*\n\n([\s\S]*?)(?=\n## |$)/);
  const alternatives = alternativesMatch ? alternativesMatch[1].trim() : '';

  return {
    title,
    date,
    context,
    decision: decision || title,
    reasoning,
    alternatives,
    raw: content,
  };
}

/**
 * Check if a decision is architectural in nature
 * @param {Object} decision - Parsed decision
 * @returns {boolean}
 */
function isArchitecturalDecision(decision) {
  const architecturalKeywords = [
    'architecture',
    'system',
    'database',
    'microservice',
    'monolith',
    'api',
    'service',
    'infrastructure',
    'deployment',
    'scaling',
    'caching',
    'messaging',
    'queue',
    'event',
    'storage',
    'framework',
    'language',
    'platform',
  ];

  const lowerTitle = decision.title.toLowerCase();
  const lowerContext = (decision.context || '').toLowerCase();
  const lowerDecision = (decision.decision || '').toLowerCase();

  const textToCheck = `${lowerTitle} ${lowerContext} ${lowerDecision}`;

  return architecturalKeywords.some(keyword => textToCheck.includes(keyword));
}

module.exports = {
  ADR_DIR,
  ADR_STATUSES,
  ADR_TEMPLATE,
  getNextAdrNumber,
  createAdr,
  updateAdrStatus,
  loadAdr,
  listAdrs,
  generateAdrIndex,
  extractDecisionsFromMemory,
  slugify,
};
