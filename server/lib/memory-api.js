/**
 * Memory API — HTTP handler factory for memory-related endpoints.
 *
 * Factory function `createMemoryApi` accepts injected dependencies and returns
 * handler methods that accept Express-compatible (req, res) objects.
 *
 * Endpoints provided:
 *   - handleSearch        — semantic search across memory
 *   - handleListConversations — paginated conversation list
 *   - handleGetConversation   — single conversation detail
 *   - handleListDecisions — list all decisions
 *   - handleListGotchas   — list all gotchas
 *   - handleGetStats      — vector DB statistics
 *   - handleRebuild       — trigger vector index rebuild
 *   - handleRemember      — store permanent memory
 *
 * @module memory-api
 */

/**
 * Create a memory API handler instance.
 *
 * @param {object} deps
 * @param {object} deps.semanticRecall - Semantic recall with recall(query, context, options)
 * @param {object} deps.vectorIndexer - Vector indexer with indexAll(projectRoot)
 * @param {object} deps.richCapture - Rich capture with processChunk(text, metadata)
 * @param {object} deps.embeddingClient - Embedding client with embed(text)
 * @param {object} deps.memoryStore - Memory store with list/get methods
 * @returns {object} Handler methods for each memory endpoint
 */
function createMemoryApi({ semanticRecall, vectorIndexer, richCapture, embeddingClient, memoryStore }) {

  /**
   * Search memory semantically.
   *
   * Query params: q (search query), scope (project|workspace|global)
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleSearch(req, res) {
    const { q = '', scope } = req.query;

    if (!q) {
      return res.json({ results: [] });
    }

    const context = {};
    const options = {};
    if (scope) {
      options.scope = scope;
    }

    const results = await semanticRecall.recall(q, context, options);
    res.json({ results });
  }

  /**
   * List conversations with pagination.
   *
   * Query params: page, limit, project
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleListConversations(req, res) {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { project } = req.query;

    const options = { page, limit };
    if (project) {
      options.project = project;
    }

    const result = await memoryStore.listConversations(options);
    res.json({ items: result.items, total: result.total });
  }

  /**
   * Get a single conversation by ID.
   *
   * @param {object} req - Express request with params.id
   * @param {object} res - Express response
   */
  async function handleGetConversation(req, res) {
    const { id } = req.params;
    const conversation = await memoryStore.getConversation(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  }

  /**
   * List all decisions, optionally filtered by project.
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleListDecisions(req, res) {
    const { project } = req.query;
    const options = {};
    if (project) {
      options.project = project;
    }

    const decisions = await memoryStore.listDecisions(options);
    res.json({ decisions });
  }

  /**
   * List all gotchas, optionally filtered by project.
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleListGotchas(req, res) {
    const { project } = req.query;
    const options = {};
    if (project) {
      options.project = project;
    }

    const gotchas = await memoryStore.listGotchas(options);
    res.json({ gotchas });
  }

  /**
   * Get vector DB statistics.
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleGetStats(req, res) {
    const stats = await memoryStore.getStats();
    res.json(stats);
  }

  /**
   * Trigger a full vector index rebuild.
   *
   * Body: { projectRoot }
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleRebuild(req, res) {
    const { projectRoot } = req.body;
    const result = await vectorIndexer.indexAll(projectRoot);
    res.json(result);
  }

  /**
   * Store a permanent memory entry.
   *
   * Body: { text, metadata }
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async function handleRemember(req, res) {
    const { text, metadata = {} } = req.body;
    const result = await richCapture.processChunk(text, { ...metadata, permanent: true });
    res.json(result);
  }

  return {
    handleSearch,
    handleListConversations,
    handleGetConversation,
    handleListDecisions,
    handleListGotchas,
    handleGetStats,
    handleRebuild,
    handleRemember,
  };
}

module.exports = { createMemoryApi };
