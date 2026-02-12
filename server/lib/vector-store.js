/**
 * Vector Store — SQLite + sqlite-vec for semantic memory storage.
 *
 * Stores text with vector embeddings for KNN similarity search.
 * Single file database at configurable path (default ~/.tlc/memory/vectors.db).
 *
 * @module vector-store
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import fs from 'fs';
import path from 'path';

/**
 * Create a vector store backed by SQLite + sqlite-vec.
 *
 * @param {object} options
 * @param {string} options.dbPath - Path to the SQLite database file
 * @param {number} [options.dimensions=1024] - Embedding dimensions
 * @returns {Promise<object>} Store object with insert/search/delete/count/rebuild/close/getAll
 */
export async function createVectorStore({ dbPath, dimensions = 1024 }) {
  // Ensure parent directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  sqliteVec.load(db);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');

  // Create metadata table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      type TEXT,
      project TEXT,
      workspace TEXT,
      branch TEXT,
      timestamp INTEGER,
      source_file TEXT,
      permanent INTEGER DEFAULT 0
    )
  `);

  // Create virtual table for vector search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
      id TEXT PRIMARY KEY,
      embedding float[${dimensions}]
    )
  `);

  // Prepared statements
  const stmts = {
    upsertMeta: db.prepare(`
      INSERT INTO memories (id, text, type, project, workspace, branch, timestamp, source_file, permanent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        text = excluded.text,
        type = excluded.type,
        project = excluded.project,
        workspace = excluded.workspace,
        branch = excluded.branch,
        timestamp = excluded.timestamp,
        source_file = excluded.source_file,
        permanent = excluded.permanent
    `),
    deleteVec: db.prepare('DELETE FROM vec_memories WHERE id = ?'),
    insertVec: db.prepare('INSERT INTO vec_memories (id, embedding) VALUES (?, ?)'),
    deleteMeta: db.prepare('DELETE FROM memories WHERE id = ?'),
    getAll: db.prepare('SELECT * FROM memories'),
  };

  /**
   * Insert or update a memory entry with its embedding.
   */
  function insert(entry) {
    const { id, text, embedding, type, project, workspace, branch, timestamp, sourceFile, permanent } = entry;

    const permanentInt = permanent ? 1 : 0;

    const tx = db.transaction(() => {
      // Upsert metadata
      stmts.upsertMeta.run(id, text, type, project, workspace, branch, timestamp, sourceFile, permanentInt);

      // For vec table: delete then insert (no upsert support in vec0)
      stmts.deleteVec.run(id);
      stmts.insertVec.run(id, embedding.buffer.byteLength === embedding.length * 4
        ? new Uint8Array(embedding.buffer, embedding.byteOffset, embedding.byteLength)
        : new Uint8Array(new Float32Array(embedding).buffer));
    });

    tx();
  }

  /**
   * KNN search for similar vectors with optional metadata filters.
   */
  function search(queryEmbedding, options = {}) {
    const { project, workspace, type, limit = 10, minSimilarity } = options;

    // Build the raw bytes for the query embedding
    const queryBytes = queryEmbedding.buffer.byteLength === queryEmbedding.length * 4
      ? new Uint8Array(queryEmbedding.buffer, queryEmbedding.byteOffset, queryEmbedding.byteLength)
      : new Uint8Array(new Float32Array(queryEmbedding).buffer);

    // We query more from vec to allow for metadata filtering
    const fetchLimit = limit * 10;

    // KNN search via vec0
    const vecResults = db.prepare(`
      SELECT id, distance
      FROM vec_memories
      WHERE embedding MATCH ?
      ORDER BY distance
      LIMIT ?
    `).all(queryBytes, fetchLimit);

    if (vecResults.length === 0) return [];

    // Fetch metadata for matched IDs
    const ids = vecResults.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const metaRows = db.prepare(`SELECT * FROM memories WHERE id IN (${placeholders})`).all(...ids);

    // Build lookup
    const metaMap = new Map();
    for (const row of metaRows) {
      metaMap.set(row.id, row);
    }

    // Combine and filter
    let results = vecResults
      .map((vr) => {
        const meta = metaMap.get(vr.id);
        if (!meta) return null;
        // Convert distance to similarity (cosine distance → similarity)
        const similarity = 1 - vr.distance;
        return {
          id: meta.id,
          text: meta.text,
          type: meta.type,
          project: meta.project,
          workspace: meta.workspace,
          branch: meta.branch,
          timestamp: meta.timestamp,
          sourceFile: meta.source_file,
          permanent: meta.permanent === 1,
          similarity,
        };
      })
      .filter(Boolean);

    // Apply metadata filters
    if (project) {
      results = results.filter((r) => r.project === project);
    }
    if (workspace) {
      results = results.filter((r) => r.workspace === workspace);
    }
    if (type) {
      results = results.filter((r) => r.type === type);
    }
    if (minSimilarity !== undefined) {
      results = results.filter((r) => r.similarity >= minSimilarity);
    }

    // Sort by similarity descending and apply limit
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Delete a memory by ID.
   */
  function del(id) {
    const tx = db.transaction(() => {
      stmts.deleteMeta.run(id);
      stmts.deleteVec.run(id);
    });
    tx();
  }

  /**
   * Count memories matching optional filters.
   */
  function count(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.project) {
      conditions.push('project = ?');
      params.push(filters.project);
    }
    if (filters.workspace) {
      conditions.push('workspace = ?');
      params.push(filters.workspace);
    }
    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM memories ${where}`).get(...params);
    return row.cnt;
  }

  /**
   * Drop all data (for rebuild).
   */
  function rebuild() {
    const tx = db.transaction(() => {
      db.exec('DELETE FROM memories');
      db.exec('DELETE FROM vec_memories');
    });
    tx();
  }

  /**
   * Get all memory entries (for debugging).
   */
  function getAll() {
    const rows = stmts.getAll.all();
    return rows.map((r) => ({
      id: r.id,
      text: r.text,
      type: r.type,
      project: r.project,
      workspace: r.workspace,
      branch: r.branch,
      timestamp: r.timestamp,
      sourceFile: r.source_file,
      permanent: r.permanent === 1,
    }));
  }

  /**
   * Close the database.
   */
  function close() {
    db.close();
  }

  return {
    insert,
    search,
    delete: del,
    count,
    rebuild,
    getAll,
    close,
  };
}
