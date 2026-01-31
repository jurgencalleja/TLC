/**
 * Relevance Scorer - Score memory items by relevance to current context
 */

/**
 * Weights for different relevance factors
 */
const WEIGHTS = {
  FILE_MATCH: 0.3,
  BRANCH_MATCH: 0.25,
  RECENCY: 0.25,
  KEYWORD_MATCH: 0.2,
};

/**
 * Calculate file overlap score
 * @param {Object} memory - Memory item
 * @param {Object} context - Current context
 * @returns {number} Score 0-1
 */
function scoreFileMatch(memory, context) {
  if (!memory?.files || !context?.touchedFiles) return 0;

  const memoryFiles = Array.isArray(memory.files) ? memory.files : [memory.files];
  const contextFiles = Array.isArray(context.touchedFiles) ? context.touchedFiles : [context.touchedFiles];

  for (const mf of memoryFiles) {
    for (const cf of contextFiles) {
      // Check if paths overlap
      if (cf.includes(mf) || mf.includes(cf)) {
        return 1.0;
      }
      // Check directory match
      const mfDir = mf.split('/').slice(0, -1).join('/');
      const cfDir = cf.split('/').slice(0, -1).join('/');
      if (mfDir && cfDir && (mfDir.includes(cfDir) || cfDir.includes(mfDir))) {
        return 0.7;
      }
    }
  }

  return 0;
}

/**
 * Calculate branch match score
 * @param {Object} memory - Memory item
 * @param {Object} context - Current context
 * @returns {number} Score 0-1
 */
function scoreBranchMatch(memory, context) {
  if (!memory?.branch || !context?.currentBranch) return 0;

  if (memory.branch === context.currentBranch) {
    return 1.0;
  }

  // Partial match (same feature prefix)
  const memoryPrefix = memory.branch.split('/')[0];
  const contextPrefix = context.currentBranch.split('/')[0];
  if (memoryPrefix === contextPrefix) {
    return 0.5;
  }

  return 0;
}

/**
 * Calculate recency score (exponential decay)
 * @param {Object} memory - Memory item
 * @returns {number} Score 0-1
 */
function scoreRecency(memory) {
  if (!memory?.timestamp) return 0.5; // Default for no timestamp

  const now = Date.now();
  const age = now - memory.timestamp;
  const dayInMs = 86400000;

  // Exponential decay: score = e^(-age/halfLife)
  // Half-life of 7 days
  const halfLife = 7 * dayInMs;
  const score = Math.exp(-age / halfLife);

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate keyword match score
 * @param {Object} memory - Memory item
 * @param {Object} context - Current context
 * @returns {number} Score 0-1
 */
function scoreKeywordMatch(memory, context) {
  const memoryText = [
    memory?.content,
    memory?.title,
    memory?.subject,
    memory?.issue,
    memory?.reasoning,
  ].filter(Boolean).join(' ').toLowerCase();

  const contextText = [
    context?.currentTask,
    context?.query,
  ].filter(Boolean).join(' ').toLowerCase();

  if (!memoryText || !contextText) return 0;

  // Extract words
  const memoryWords = new Set(memoryText.split(/\s+/).filter(w => w.length > 3));
  const contextWords = new Set(contextText.split(/\s+/).filter(w => w.length > 3));

  if (memoryWords.size === 0 || contextWords.size === 0) return 0;

  // Count matching words
  let matches = 0;
  for (const word of contextWords) {
    if (memoryWords.has(word)) {
      matches++;
    }
  }

  return Math.min(1, matches / Math.max(1, contextWords.size));
}

/**
 * Combine weighted scores
 * @param {Array} scores - Array of {value, weight} objects
 * @returns {number} Combined score 0-1
 */
function combineScores(scores) {
  if (!scores || scores.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const { value, weight } of scores) {
    weightedSum += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  return Math.min(1, weightedSum / totalWeight);
}

/**
 * Score relevance of a memory item to current context
 * @param {Object} memory - Memory item
 * @param {Object} context - Current context
 * @returns {number} Relevance score 0-1
 */
function scoreRelevance(memory, context) {
  if (!memory) return 0;

  const scores = [
    { value: scoreFileMatch(memory, context || {}), weight: WEIGHTS.FILE_MATCH },
    { value: scoreBranchMatch(memory, context || {}), weight: WEIGHTS.BRANCH_MATCH },
    { value: scoreRecency(memory), weight: WEIGHTS.RECENCY },
    { value: scoreKeywordMatch(memory, context || {}), weight: WEIGHTS.KEYWORD_MATCH },
  ];

  return combineScores(scores);
}

module.exports = {
  scoreRelevance,
  combineScores,
  scoreFileMatch,
  scoreBranchMatch,
  scoreRecency,
  scoreKeywordMatch,
  WEIGHTS,
};
