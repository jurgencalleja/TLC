/**
 * Inherited Search — wraps semantic-recall with inheritance-aware search
 * that walks from project scope up through workspace scope, adjusting
 * scores and deduplicating results.
 *
 * Workspace results receive a 0.8x score multiplier to prefer local
 * project memories while still surfacing relevant workspace knowledge.
 *
 * Auto-widening: when project scope returns fewer than 3 results,
 * the search automatically widens to include workspace results.
 *
 * @module inherited-search
 */

/** Minimum results before auto-widening from project to workspace */
const AUTO_WIDEN_THRESHOLD = 3;

/** Score multiplier for workspace-level results */
const WORKSPACE_SCORE_MULTIPLIER = 0.8;

/**
 * Deduplicate results by id, keeping the entry with the highest score.
 *
 * @param {Array} results - Scored results that may contain duplicates
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
 * Apply a score multiplier to an array of results, returning new objects.
 *
 * @param {Array} results - Search results
 * @param {number} multiplier - Score multiplier to apply
 * @returns {Array} Results with adjusted scores
 */
function applyScoreMultiplier(results, multiplier) {
  return results.map((r) => ({ ...r, score: r.score * multiplier }));
}

/**
 * Create an inherited search instance that wraps semantic-recall with
 * inheritance-aware scope walking.
 *
 * @param {object} deps - Dependencies
 * @param {object} deps.semanticRecall - Semantic recall instance (from Phase 71)
 * @param {object} deps.workspaceDetector - Workspace detector instance (from Task 1)
 * @param {object} deps.vectorIndexer - Vector indexer instance (from Phase 71)
 * @returns {object} Object with search and indexAll methods
 */
export function createInheritedSearch({ semanticRecall, workspaceDetector, vectorIndexer }) {
  /**
   * Fetch workspace-scope results using the workspace root as the context
   * workspace, applying the 0.8x score multiplier.
   *
   * @param {string} query - Search query
   * @param {object} context - Original context
   * @param {object} options - Search options (without scope)
   * @param {string} workspaceRoot - Workspace root path
   * @returns {Promise<Array>} Workspace results with adjusted scores
   */
  async function fetchWorkspaceResults(query, context, options, workspaceRoot) {
    const wsContext = { ...context, workspace: workspaceRoot };
    const wsOptions = { ...options, scope: 'workspace' };
    const wsResults = await semanticRecall.recall(query, wsContext, wsOptions);
    return applyScoreMultiplier(wsResults, WORKSPACE_SCORE_MULTIPLIER);
  }

  /**
   * Search with inheritance-aware scope walking.
   *
   * Scope behavior:
   * - 'project': search project only; auto-widen to workspace if < 3 results
   * - 'workspace': search workspace only (delegates directly to semanticRecall)
   * - 'inherited': always search both project and workspace, merge results
   * - 'global': delegates directly to semanticRecall with global scope
   *
   * @param {string} query - Search query text
   * @param {object} context - Current context
   * @param {object} [options] - Search options
   * @param {string} [options.scope='project'] - Search scope
   * @returns {Promise<Array>} Scored and ranked results
   */
  async function search(query, context, options = {}) {
    const { scope = 'project', ...restOptions } = options;

    // For global or workspace scope, pass through directly
    if (scope === 'global' || scope === 'workspace') {
      return semanticRecall.recall(query, context, { ...restOptions, scope });
    }

    // Detect workspace info for the current project
    const wsInfo = workspaceDetector.detectWorkspace(context.workspace);

    // For inherited scope: always search both project and workspace
    if (scope === 'inherited') {
      const projectResults = await semanticRecall.recall(
        query,
        context,
        { ...restOptions, scope: 'project' },
      );

      // If not in a workspace, return project results only
      if (!wsInfo.isInWorkspace || !wsInfo.workspaceRoot) {
        return projectResults;
      }

      const wsResults = await fetchWorkspaceResults(
        query,
        context,
        restOptions,
        wsInfo.workspaceRoot,
      );

      // Merge, deduplicate, and sort
      const merged = deduplicateById([...projectResults, ...wsResults]);
      merged.sort((a, b) => b.score - a.score);
      return merged;
    }

    // scope === 'project': search project first, auto-widen if needed
    const projectResults = await semanticRecall.recall(
      query,
      context,
      { ...restOptions, scope: 'project' },
    );

    // If enough project results or not in a workspace, return as-is
    if (
      projectResults.length >= AUTO_WIDEN_THRESHOLD
      || !wsInfo.isInWorkspace
      || !wsInfo.workspaceRoot
    ) {
      return projectResults;
    }

    // Auto-widen: fetch workspace results and merge
    const wsResults = await fetchWorkspaceResults(
      query,
      context,
      restOptions,
      wsInfo.workspaceRoot,
    );

    const merged = deduplicateById([...projectResults, ...wsResults]);
    merged.sort((a, b) => b.score - a.score);
    return merged;
  }

  /**
   * Index all memory for a project, including workspace memory if applicable.
   *
   * @param {string} projectRoot - Absolute path to the project root
   * @returns {Promise<object>} Combined indexing results
   */
  async function indexAll(projectRoot) {
    const projectResult = await vectorIndexer.indexAll(projectRoot);

    const wsInfo = workspaceDetector.detectWorkspace(projectRoot);

    if (wsInfo.isInWorkspace && wsInfo.workspaceRoot) {
      const wsResult = await vectorIndexer.indexAll(wsInfo.workspaceRoot);
      return {
        indexed: projectResult.indexed + wsResult.indexed,
        skipped: projectResult.skipped + wsResult.skipped,
        errors: projectResult.errors + wsResult.errors,
      };
    }

    return projectResult;
  }

  return { search, indexAll };
}
