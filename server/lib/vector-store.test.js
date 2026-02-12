import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createVectorStore } from './vector-store.js';

/**
 * Generates a random Float32Array embedding of the given dimensions.
 * Values are random floats between 0 and 1.
 * @param {number} dims - Number of dimensions (default 1024)
 * @returns {Float32Array}
 */
function randomEmbedding(dims = 1024) {
  const arr = new Float32Array(dims);
  for (let i = 0; i < dims; i++) {
    arr[i] = Math.random();
  }
  return arr;
}

/**
 * Creates a uniform embedding where all values are the same.
 * Useful for deterministic similarity testing.
 * @param {number} value - The uniform value
 * @param {number} dims - Number of dimensions
 * @returns {Float32Array}
 */
function uniformEmbedding(value, dims = 1024) {
  const arr = new Float32Array(dims);
  arr.fill(value);
  return arr;
}

describe('vector-store', () => {
  let testDir;
  let store;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-vector-test-'));
  });

  afterEach(async () => {
    if (store) {
      await store.close();
      store = null;
    }
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('createVectorStore', () => {
    it('creates database file and table on init', async () => {
      const dbPath = path.join(testDir, 'vectors.db');
      store = await createVectorStore({ dbPath, dimensions: 1024 });

      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('handles missing directory by creating it', async () => {
      const nestedDir = path.join(testDir, 'deep', 'nested', 'dir');
      const dbPath = path.join(nestedDir, 'vectors.db');

      store = await createVectorStore({ dbPath, dimensions: 1024 });

      expect(fs.existsSync(dbPath)).toBe(true);
      expect(fs.existsSync(nestedDir)).toBe(true);
    });

    it('configurable dimensions (384 for smaller models)', async () => {
      const dbPath = path.join(testDir, 'small-vectors.db');
      store = await createVectorStore({ dbPath, dimensions: 384 });

      const embedding = randomEmbedding(384);
      await store.insert({
        id: 'small-1',
        text: 'small model entry',
        embedding,
        type: 'decision',
        project: 'test-proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'test.js',
        permanent: false,
      });

      const results = await store.search(embedding, { limit: 1 });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('small-1');
    });
  });

  describe('insert', () => {
    beforeEach(async () => {
      const dbPath = path.join(testDir, 'vectors.db');
      store = await createVectorStore({ dbPath, dimensions: 1024 });
    });

    it('inserts memory with embedding and metadata', async () => {
      const embedding = randomEmbedding();
      await store.insert({
        id: 'mem-1',
        text: 'Always use named exports in this project',
        embedding,
        type: 'decision',
        project: 'my-project',
        workspace: '/home/user/project',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'CONVENTIONS.md',
        permanent: true,
      });

      const count = await store.count({});
      expect(count).toBe(1);
    });

    it('duplicate insert updates existing entry (upsert)', async () => {
      const embedding = randomEmbedding();
      const id = 'upsert-1';

      await store.insert({
        id,
        text: 'Original text',
        embedding,
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'file.js',
        permanent: false,
      });

      const updatedEmbedding = randomEmbedding();
      await store.insert({
        id,
        text: 'Updated text',
        embedding: updatedEmbedding,
        type: 'gotcha',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'file.js',
        permanent: true,
      });

      const count = await store.count({});
      expect(count).toBe(1);

      const all = await store.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].text).toBe('Updated text');
      expect(all[0].type).toBe('gotcha');
      expect(all[0].permanent).toBe(true);
    });

    it('permanent flag stored and queryable', async () => {
      await store.insert({
        id: 'perm-1',
        text: 'Permanent memory',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'decisions.md',
        permanent: true,
      });

      await store.insert({
        id: 'temp-1',
        text: 'Temporary memory',
        embedding: randomEmbedding(),
        type: 'conversation',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'chat.log',
        permanent: false,
      });

      const all = await store.getAll();
      const permanentEntries = all.filter((e) => e.permanent === true);
      const temporaryEntries = all.filter((e) => e.permanent === false);

      expect(permanentEntries).toHaveLength(1);
      expect(permanentEntries[0].id).toBe('perm-1');
      expect(temporaryEntries).toHaveLength(1);
      expect(temporaryEntries[0].id).toBe('temp-1');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const dbPath = path.join(testDir, 'vectors.db');
      store = await createVectorStore({ dbPath, dimensions: 1024 });
    });

    it('KNN search returns closest matches sorted by similarity', async () => {
      // embed1 and embed2 are very similar (all ~0.1), embed3 is very different (all 0.9)
      const embed1 = uniformEmbedding(0.1);
      const embed2 = uniformEmbedding(0.1);
      // Add slight variation to embed2 so it is not identical but still very close
      embed2[0] = 0.12;
      embed2[1] = 0.11;
      const embed3 = uniformEmbedding(0.9);

      await store.insert({
        id: 'close-match',
        text: 'Very similar to query',
        embedding: embed2,
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'far-match',
        text: 'Very different from query',
        embedding: embed3,
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: false,
      });

      const results = await store.search(embed1, { limit: 10 });

      expect(results).toHaveLength(2);
      // close-match should be returned before far-match (higher similarity)
      expect(results[0].id).toBe('close-match');
      expect(results[1].id).toBe('far-match');
      // Similarity scores should be present and ordered descending
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it('search filters by project', async () => {
      await store.insert({
        id: 'proj-a-1',
        text: 'Project A memory',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'project-a',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'proj-b-1',
        text: 'Project B memory',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'project-b',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: false,
      });

      const queryEmbedding = randomEmbedding();
      const results = await store.search(queryEmbedding, { project: 'project-a', limit: 10 });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('proj-a-1');
      expect(results[0].project).toBe('project-a');
    });

    it('search filters by workspace', async () => {
      await store.insert({
        id: 'ws-a-1',
        text: 'Workspace A memory',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'proj',
        workspace: '/workspace-a',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'ws-b-1',
        text: 'Workspace B memory',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'proj',
        workspace: '/workspace-b',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: false,
      });

      const queryEmbedding = randomEmbedding();
      const results = await store.search(queryEmbedding, { workspace: '/workspace-a', limit: 10 });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('ws-a-1');
      expect(results[0].workspace).toBe('/workspace-a');
    });

    it('search filters by type (decision, gotcha, conversation)', async () => {
      await store.insert({
        id: 'type-decision',
        text: 'A decision',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'type-gotcha',
        text: 'A gotcha',
        embedding: randomEmbedding(),
        type: 'gotcha',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: false,
      });

      await store.insert({
        id: 'type-conversation',
        text: 'A conversation',
        embedding: randomEmbedding(),
        type: 'conversation',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'c.js',
        permanent: false,
      });

      const queryEmbedding = randomEmbedding();

      const decisions = await store.search(queryEmbedding, { type: 'decision', limit: 10 });
      expect(decisions).toHaveLength(1);
      expect(decisions[0].id).toBe('type-decision');

      const gotchas = await store.search(queryEmbedding, { type: 'gotcha', limit: 10 });
      expect(gotchas).toHaveLength(1);
      expect(gotchas[0].id).toBe('type-gotcha');

      const conversations = await store.search(queryEmbedding, { type: 'conversation', limit: 10 });
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('type-conversation');
    });

    it('search respects minSimilarity threshold', async () => {
      // Insert one very similar and one very different entry
      const queryEmbed = uniformEmbedding(0.5);
      const closeEmbed = uniformEmbedding(0.5);
      closeEmbed[0] = 0.51;
      const farEmbed = uniformEmbedding(0.0);

      await store.insert({
        id: 'similar',
        text: 'Similar entry',
        embedding: closeEmbed,
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'dissimilar',
        text: 'Dissimilar entry',
        embedding: farEmbed,
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: false,
      });

      // Use a high minSimilarity to exclude the dissimilar entry
      const results = await store.search(queryEmbed, { minSimilarity: 0.9, limit: 10 });

      // The similar entry should pass the threshold, the dissimilar one should not
      expect(results.every((r) => r.similarity >= 0.9)).toBe(true);
      expect(results.find((r) => r.id === 'dissimilar')).toBeUndefined();
    });

    it('search respects limit', async () => {
      // Insert 5 entries
      for (let i = 0; i < 5; i++) {
        await store.insert({
          id: `limit-${i}`,
          text: `Entry ${i}`,
          embedding: randomEmbedding(),
          type: 'decision',
          project: 'proj',
          workspace: '/ws',
          branch: 'main',
          timestamp: Date.now(),
          sourceFile: `file-${i}.js`,
          permanent: false,
        });
      }

      const queryEmbedding = randomEmbedding();
      const results = await store.search(queryEmbedding, { limit: 2 });

      expect(results).toHaveLength(2);
    });

    it('combined filters work (project + type + limit)', async () => {
      // Insert entries across different projects and types
      await store.insert({
        id: 'match-1',
        text: 'Matching entry 1',
        embedding: randomEmbedding(),
        type: 'gotcha',
        project: 'target-proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'match-2',
        text: 'Matching entry 2',
        embedding: randomEmbedding(),
        type: 'gotcha',
        project: 'target-proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: false,
      });

      await store.insert({
        id: 'match-3',
        text: 'Matching entry 3',
        embedding: randomEmbedding(),
        type: 'gotcha',
        project: 'target-proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'c.js',
        permanent: false,
      });

      await store.insert({
        id: 'wrong-type',
        text: 'Wrong type',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'target-proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'd.js',
        permanent: false,
      });

      await store.insert({
        id: 'wrong-project',
        text: 'Wrong project',
        embedding: randomEmbedding(),
        type: 'gotcha',
        project: 'other-proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'e.js',
        permanent: false,
      });

      const queryEmbedding = randomEmbedding();
      const results = await store.search(queryEmbedding, {
        project: 'target-proj',
        type: 'gotcha',
        limit: 2,
      });

      expect(results).toHaveLength(2);
      results.forEach((r) => {
        expect(r.project).toBe('target-proj');
        expect(r.type).toBe('gotcha');
      });
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      const dbPath = path.join(testDir, 'vectors.db');
      store = await createVectorStore({ dbPath, dimensions: 1024 });
    });

    it('removes entry by id', async () => {
      await store.insert({
        id: 'to-delete',
        text: 'This will be deleted',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'to-keep',
        text: 'This stays',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: false,
      });

      await store.delete('to-delete');

      const count = await store.count({});
      expect(count).toBe(1);

      const all = await store.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('to-keep');
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      const dbPath = path.join(testDir, 'vectors.db');
      store = await createVectorStore({ dbPath, dimensions: 1024 });
    });

    it('returns correct count with filters', async () => {
      await store.insert({
        id: 'c-1',
        text: 'Decision in project A',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'project-a',
        workspace: '/ws-1',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'c-2',
        text: 'Gotcha in project A',
        embedding: randomEmbedding(),
        type: 'gotcha',
        project: 'project-a',
        workspace: '/ws-1',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: false,
      });

      await store.insert({
        id: 'c-3',
        text: 'Decision in project B',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'project-b',
        workspace: '/ws-2',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'c.js',
        permanent: false,
      });

      // Total count
      const total = await store.count({});
      expect(total).toBe(3);

      // Filter by project
      const projA = await store.count({ project: 'project-a' });
      expect(projA).toBe(2);

      // Filter by type
      const decisions = await store.count({ type: 'decision' });
      expect(decisions).toBe(2);

      // Filter by workspace
      const ws1 = await store.count({ workspace: '/ws-1' });
      expect(ws1).toBe(2);

      // Combined filters
      const projADecisions = await store.count({ project: 'project-a', type: 'decision' });
      expect(projADecisions).toBe(1);
    });
  });

  describe('rebuild', () => {
    beforeEach(async () => {
      const dbPath = path.join(testDir, 'vectors.db');
      store = await createVectorStore({ dbPath, dimensions: 1024 });
    });

    it('clears all data', async () => {
      await store.insert({
        id: 'r-1',
        text: 'Entry 1',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      await store.insert({
        id: 'r-2',
        text: 'Entry 2',
        embedding: randomEmbedding(),
        type: 'gotcha',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'b.js',
        permanent: true,
      });

      const countBefore = await store.count({});
      expect(countBefore).toBe(2);

      await store.rebuild();

      const countAfter = await store.count({});
      expect(countAfter).toBe(0);

      const all = await store.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('close', () => {
    it('shuts down cleanly', async () => {
      const dbPath = path.join(testDir, 'vectors.db');
      store = await createVectorStore({ dbPath, dimensions: 1024 });

      await store.insert({
        id: 'close-1',
        text: 'Before close',
        embedding: randomEmbedding(),
        type: 'decision',
        project: 'proj',
        workspace: '/ws',
        branch: 'main',
        timestamp: Date.now(),
        sourceFile: 'a.js',
        permanent: false,
      });

      // Close should not throw
      await store.close();

      // Mark store as closed so afterEach does not double-close
      store = null;

      // Database file should still exist on disk
      expect(fs.existsSync(dbPath)).toBe(true);
    });
  });

});
