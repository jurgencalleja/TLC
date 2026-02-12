/**
 * Semantic Recall — searches and ranks memory results using vector similarity,
 * recency decay, and project relevance.
 *
 * Scoring formula:
 *   combinedScore = vectorSimilarity * 0.5 + recency * 0.25 + projectRelevance * 0.25
 *   Permanent memories receive a 1.2x boost on the combined score.
 *   Recency uses exponential decay with a 7-day half-life.
 *
 * @module semantic-recall
 */

/** Weight for vector similarity in the combined score */
const SIMILARITY_WEIGHT = 0.5;

/** Weight for recency in the combined score */
const RECENCY_WEIGHT = 0.25;

/** Weight for project relevance in the combined score */
const PROJECT_RELEVANCE_WEIGHT = 0.25;

/** Boost multiplier for permanent memories */
const PERMANENT_BOOST = 1.2;

/** Half-life for recency decay in days */
const RECENCY_HALF_LIFE_DAYS = 7;

/** Minimum results before auto-widening from project to workspace scope */
const AUTO_WIDEN_THRESHOLD = 3;

/** Default maximum number of results to return */
const DEFAULT_LIMIT = 10;

/** Default number of results for context injection */
const CONTEXT_INJECTION_LIMIT = 5;

/**
 * Calculate recency score using exponential decay with 7-day half-life.
 * Returns 1.0 for very recent timestamps, decaying toward 0 for older ones.
 *
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {number} Recency score between 0 and 1
 */
function calculateRecency(timestamp) {
  const now = Date.now();
  const ageMs = Math.max(0, now - timestamp);
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  return Math.exp(-ageDays * Math.LN2 / RECENCY_HALF_LIFE_DAYS);
}

/**
 * Calculate the combined score for a memory result.
 *
 * @param {object} result - Raw vector store result
 * @param {object} context - Current context with projectId
 * @returns {number} Combined score
 */
function calculateScore(result, context) {
  const vectorSimilarity = result.similarity || 0;
  const recency = calculateRecency(result.timestamp);
  const projectRelevance = result.project === context.projectId ? 1.0 : 0.0;

  let score = vectorSimilarity * SIMILARITY_WEIGHT
    + recency * RECENCY_WEIGHT
    + projectRelevance * PROJECT_RELEVANCE_WEIGHT;

  if (result.permanent) {
    score *= PERMANENT_BOOST;
  }

  return score;
}

/**
 * Apply scope-based filtering to raw results.
 *
 * @param {Array} results - Scored results
 * @param {string} scope - 'project', 'workspace', or 'global'
 * @param {object} context - Current context
 * @returns {Array} Filtered results
 */
function filterByScope(results, scope, context) {
  if (scope === 'global') {
    return results;
  }

  if (scope === 'workspace') {
    return results.filter((r) => r._raw.workspace === context.workspace);
  }

  // scope === 'project'
  const projectFiltered = results.filter((r) => r._raw.project === context.projectId);

  // Auto-widen to workspace if too few project-scoped results
  // Only widen if the workspace scope actually provides enough results
  if (projectFiltered.length < AUTO_WIDEN_THRESHOLD) {
    const workspaceFiltered = results.filter((r) => r._raw.workspace === context.workspace);
    if (workspaceFiltered.length >= AUTO_WIDEN_THRESHOLD) {
      return workspaceFiltered;
    }
  }

  return projectFiltered;
}

/**
 * Deduplicate results by id, keeping only the entry with the highest score.
 *
 * @param {Array} results - Scored results (may contain duplicate ids)
 * @returns {Array} Deduplicated results
 */
function deduplicateById(results) {
  const bestById = new Map();

  for (const result of results) {
    const existing = bestById.get(result.id);
    if (!existing || result.score > existing.score) {
      bestById.set(result.id, result);
    }
  }

  return [...bestById.values()];
}

/**
 * Transform a raw vector store result into the public result shape.
 *
 * @param {object} raw - Raw result from vector store
 * @param {number} score - Calculated combined score
 * @returns {object} Public result object
 */
function toPublicResult(raw, score) {
  return {
    id: raw.id,
    text: raw.text,
    score,
    type: raw.type,
    source: {
      project: raw.project,
      workspace: raw.workspace,
      branch: raw.branch,
      sourceFile: raw.sourceFile,
    },
    date: raw.timestamp,
    permanent: raw.permanent || false,
  };
}

/**
 * Create a semantic recall instance for searching and ranking memory results.
 *
 * @param {object} deps - Dependencies
 * @param {object} deps.vectorStore - Vector store for similarity search
 * @param {object} deps.embeddingClient - Client for generating embeddings
 * @returns {object} Object with recall and recallForContext methods
 */
export function createSemanticRecall({ vectorStore, embeddingClient }) {
  /**
   * Perform a semantic search with scoring, filtering, and deduplication.
   *
   * @param {string} query - Search query text
   * @param {object} context - Current context
   * @param {string} context.projectId - Current project identifier
   * @param {string} context.workspace - Current workspace path
   * @param {string} [context.branch] - Current branch name
   * @param {Array} [context.touchedFiles] - Recently touched files
   * @param {object} [options] - Search options
   * @param {string} [options.scope='project'] - Search scope: 'project', 'workspace', or 'global'
   * @param {number} [options.limit=10] - Maximum number of results
   * @param {number} [options.minScore] - Minimum vector similarity threshold
   * @param {Array<string>} [options.types] - Filter to specific memory types
   * @returns {Promise<Array>} Scored and ranked results
   */
  async function recall(query, context, options = {}) {
    if (!query || query.length === 0) {
      return [];
    }

    const embedding = await embeddingClient.embed(query);
    if (!embedding) {
      return [];
    }

    const {
      scope = 'project',
      limit = DEFAULT_LIMIT,
      minScore,
      types,
    } = options;

    const rawResults = vectorStore.search({ embedding, limit: limit * 3 });

    // Score all raw results and attach the raw data for filtering
    let scored = rawResults.map((raw) => {
      const score = calculateScore(raw, context);
      return { ...toPublicResult(raw, score), _raw: raw };
    });

    // Filter by type if specified
    if (types && types.length > 0) {
      scored = scored.filter((r) => types.includes(r.type));
    }

    // Apply scope filtering (including auto-widening)
    scored = filterByScope(scored, scope, context);

    // Deduplicate by id
    scored = deduplicateById(scored);

    // Filter by minimum vector similarity score
    if (minScore !== undefined) {
      scored = scored.filter((r) => r._raw.similarity >= minScore);
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Apply limit
    scored = scored.slice(0, limit);

    // Strip internal _raw property before returning
    return scored.map(({ _raw, ...rest }) => rest);
  }

  /**
   * Convenience method for context injection — returns top 5 memories
   * relevant to the given project root and context.
   *
   * @param {string} projectRoot - Project root path used as query basis
   * @param {object} context - Current context
   * @returns {Promise<Array>} Top 5 results sorted by score
   */
  async function recallForContext(projectRoot, context) {
    const query = context.projectId
      ? `${context.projectId} project context`
      : projectRoot;

    return recall(query, context, { limit: CONTEXT_INJECTION_LIMIT });
  }

  return { recall, recallForContext };
}
