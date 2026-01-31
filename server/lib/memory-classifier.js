/**
 * Memory Classifier - Classify memory items as team or personal
 */

const CLASSIFICATION = {
  TEAM: 'team',
  PERSONAL: 'personal',
};

/**
 * Keywords that indicate team-level memory
 */
const TEAM_KEYWORDS = [
  'database',
  'api',
  'infrastructure',
  'deployment',
  'architecture',
  'server',
  'backend',
  'frontend',
  'service',
  'microservice',
  'queue',
  'cache',
  'redis',
  'postgres',
  'mysql',
  'mongodb',
  'docker',
  'kubernetes',
  'aws',
  'gcp',
  'azure',
  'ci/cd',
  'pipeline',
  'authentication',
  'authorization',
  'security',
  'scaling',
  'performance',
  'migration',
];

/**
 * Keywords that indicate personal preference memory
 */
const PERSONAL_KEYWORDS = [
  'prefer',
  'style',
  'formatting',
  'indentation',
  'tabs',
  'spaces',
  'semicolons',
  'quotes',
  'naming',
  'convention',
  'readable',
  'cleaner',
  'shorter',
  'longer',
  'comment',
  'documentation',
  'verbose',
  'concise',
];

/**
 * Check if text contains any of the keywords
 * @param {string} text - Text to search
 * @param {string[]} keywords - Keywords to look for
 * @returns {boolean}
 */
function containsKeyword(text, keywords) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Get all text content from a memory item
 * @param {Object} item - Memory item
 * @returns {string}
 */
function getItemText(item) {
  if (!item) return '';

  const parts = [
    item.raw,
    item.choice,
    item.preference,
    item.antiPreference,
    item.content,
    item.subject,
    item.issue,
    item.reasoning,
    item.context,
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Classify a memory item as team or personal
 * @param {Object} item - Memory item from pattern detector
 * @returns {string} 'team' or 'personal'
 */
function classifyMemory(item) {
  if (!item) return CLASSIFICATION.PERSONAL;

  const text = getItemText(item);
  const type = item.type;

  // Gotchas are almost always team-level
  if (type === 'gotcha') {
    return CLASSIFICATION.TEAM;
  }

  // Check for "we" language (team indicator)
  if (item.raw && /\bwe\b/i.test(item.raw)) {
    return CLASSIFICATION.TEAM;
  }

  // Check for "I" language (personal indicator)
  if (item.raw && /\bI\b/.test(item.raw)) {
    return CLASSIFICATION.PERSONAL;
  }

  // Decisions are usually team-level unless about personal style
  if (type === 'decision') {
    if (containsKeyword(text, PERSONAL_KEYWORDS)) {
      return CLASSIFICATION.PERSONAL;
    }
    return CLASSIFICATION.TEAM;
  }

  // Preferences are usually personal unless about infrastructure
  if (type === 'preference') {
    if (containsKeyword(text, TEAM_KEYWORDS)) {
      return CLASSIFICATION.TEAM;
    }
    return CLASSIFICATION.PERSONAL;
  }

  // Reasoning depends on content
  if (type === 'reasoning') {
    if (containsKeyword(text, TEAM_KEYWORDS)) {
      return CLASSIFICATION.TEAM;
    }
    if (containsKeyword(text, PERSONAL_KEYWORDS)) {
      return CLASSIFICATION.PERSONAL;
    }
    // Check for "I" in reasoning
    if (/\bI\b/.test(text)) {
      return CLASSIFICATION.PERSONAL;
    }
    return CLASSIFICATION.TEAM;
  }

  // Check keywords as fallback
  if (containsKeyword(text, TEAM_KEYWORDS)) {
    return CLASSIFICATION.TEAM;
  }

  // Default to personal when ambiguous
  return CLASSIFICATION.PERSONAL;
}

module.exports = {
  classifyMemory,
  CLASSIFICATION,
  TEAM_KEYWORDS,
  PERSONAL_KEYWORDS,
};
