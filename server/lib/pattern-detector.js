/**
 * Pattern Detector - Detect memorable patterns from conversation exchanges
 */

const PATTERN_TYPES = {
  DECISION: 'decision',
  PREFERENCE: 'preference',
  GOTCHA: 'gotcha',
  REASONING: 'reasoning',
};

/**
 * Decision pattern matchers
 */
const DECISION_PATTERNS = [
  {
    // "let's use X instead of Y"
    regex: /let'?s\s+use\s+(.+?)\s+instead\s+of\s+(.+?)(?:\s+because\s+(.+?))?(?:\.|,|$)/i,
    extract: (match) => ({
      choice: match[1].trim(),
      over: match[2].trim(),
      reasoning: match[3]?.trim() || null,
    }),
  },
  {
    // "we decided to use X"
    regex: /we\s+decided\s+to\s+(?:use\s+)?(.+?)(?:\s+because\s+(.+?))?(?:\.|,|$)/i,
    extract: (match) => ({
      choice: match[1].trim(),
      reasoning: match[2]?.trim() || null,
    }),
  },
  {
    // "going with X instead of Y"
    regex: /going\s+with\s+(.+?)\s+instead\s+of\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      choice: match[1].trim(),
      over: match[2].trim(),
    }),
  },
  {
    // "let's use X because Y"
    regex: /let'?s\s+use\s+(.+?)\s+because\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      choice: match[1].trim(),
      reasoning: match[2].trim(),
    }),
  },
];

/**
 * Preference pattern matchers
 */
const PREFERENCE_PATTERNS = [
  {
    // "I prefer X"
    regex: /i\s+prefer\s+(.+?)(?:\s+over\s+(.+?))?(?:\.|,|$)/i,
    extract: (match) => ({
      preference: match[1].trim(),
      antiPreference: match[2]?.trim() || null,
    }),
  },
  {
    // "no, use X not Y" or "use X not Y"
    regex: /(?:no,?\s+)?use\s+(.+?)\s+not\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      preference: match[1].trim(),
      antiPreference: match[2].trim(),
    }),
  },
  {
    // "always use X"
    regex: /always\s+use\s+(.+?)(?:\s+for\s+(.+?))?(?:\.|,|$)/i,
    extract: (match) => ({
      preference: match[1].trim(),
      context: match[2]?.trim() || null,
    }),
  },
  {
    // "don't use X, use Y"
    regex: /don'?t\s+use\s+(.+?),?\s+use\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      antiPreference: match[1].trim(),
      preference: match[2].trim(),
    }),
  },
  {
    // "don't use X"
    regex: /don'?t\s+use\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      antiPreference: match[1].trim(),
    }),
  },
];

/**
 * Gotcha pattern matchers
 */
const GOTCHA_PATTERNS = [
  {
    // "X needs to warm up" or "X needs time to Y"
    regex: /(?:ah\s+)?(?:the\s+)?(.+?)\s+needs\s+(?:time\s+to\s+)?(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      subject: match[1].trim(),
      issue: `needs ${match[2].trim()}`,
    }),
  },
  {
    // "watch out for X"
    regex: /watch\s+out\s+for\s+(.+?)(?:\s+in\s+(.+?))?(?:\.|,|$)/i,
    extract: (match) => ({
      subject: match[2]?.trim() || 'general',
      issue: match[1].trim(),
    }),
  },
  {
    // "X doesn't work because Y"
    regex: /(.+?)\s+doesn'?t\s+work\s+because\s+(?:of\s+)?(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      subject: match[1].trim(),
      issue: match[2].trim(),
    }),
  },
  {
    // "remember that X"
    regex: /remember\s+that\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      subject: 'reminder',
      issue: match[1].trim(),
    }),
  },
];

/**
 * Reasoning pattern matchers
 */
const REASONING_PATTERNS = [
  {
    // "because X"
    regex: /^because\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      content: match[1].trim(),
    }),
  },
  {
    // "the reason is X"
    regex: /the\s+reason\s+is\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      content: match[1].trim(),
    }),
  },
  {
    // "since we need X"
    regex: /since\s+we\s+need\s+(.+?)(?:\.|,|$)/i,
    extract: (match) => ({
      content: `need ${match[1].trim()}`,
    }),
  },
];

/**
 * Apply pattern matchers to text
 * @param {string} text - Text to search
 * @param {Array} patterns - Array of pattern objects
 * @param {string} type - Pattern type
 * @returns {Array} Matched patterns
 */
function applyPatterns(text, patterns, type) {
  if (!text) return [];

  const results = [];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      results.push({
        type,
        ...pattern.extract(match),
        raw: match[0],
      });
    }
  }

  return results;
}

/**
 * Detect memorable patterns from a conversation exchange
 * @param {Object} exchange - The conversation exchange
 * @param {string} exchange.user - User message
 * @param {string} exchange.assistant - Assistant response
 * @returns {Object} Detected patterns by type
 */
function detectPatterns(exchange) {
  const userMessage = exchange?.user || '';
  const assistantMessage = exchange?.assistant || '';

  // Combine for context but primarily analyze user message
  const text = userMessage;

  return {
    decisions: applyPatterns(text, DECISION_PATTERNS, PATTERN_TYPES.DECISION),
    preferences: applyPatterns(text, PREFERENCE_PATTERNS, PATTERN_TYPES.PREFERENCE),
    gotchas: applyPatterns(text, GOTCHA_PATTERNS, PATTERN_TYPES.GOTCHA),
    reasoning: applyPatterns(text, REASONING_PATTERNS, PATTERN_TYPES.REASONING),
  };
}

module.exports = {
  detectPatterns,
  PATTERN_TYPES,
  DECISION_PATTERNS,
  PREFERENCE_PATTERNS,
  GOTCHA_PATTERNS,
  REASONING_PATTERNS,
};
