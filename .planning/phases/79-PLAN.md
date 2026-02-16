# Phase 79: Scanner Intelligence + Memory Wiring - Plan

## Overview

Fix project scanner to stop recursion at project boundaries (eliminating 40+ false-positive sub-projects from monorepos). Wire the real memory capture pipeline into the server so memory pages surface auto-captured data from conversations.

## Tasks

### Task 1: Stop scanner recursion at project boundaries [x]

**Goal:** When the scanner finds a directory that IS a project (has `.tlc.json`, `.planning`, or `package.json + .git`), stop recursing into its children. This prevents monorepo sub-packages from being listed as separate top-level projects.

**Files:**
- server/lib/project-scanner.js (modify)
- server/lib/project-scanner.test.js (modify)

**Acceptance Criteria:**
- [ ] When a directory is classified as a project, `_scanDir` does NOT recurse into its subdirectories
- [ ] Kasha-Platform appears once (not 40+ times with all sub-packages)
- [ ] TLC itself appears once (server/ subdirectory not listed separately)
- [ ] Top-level directories without project markers are still traversed
- [ ] Existing tests updated to reflect new behavior
- [ ] New tests verify recursion stops at project boundary

---

### Task 2: Add monorepo sub-package metadata to project scanner [x]

**Goal:** When a project is a monorepo (has `workspaces` in package.json), parse and attach the list of workspace directories as metadata. This lets the dashboard show sub-packages as part of a project rather than as separate projects.

**Files:**
- server/lib/project-scanner.js (modify `readProjectMetadata`)
- server/lib/project-scanner.test.js (modify)

**Acceptance Criteria:**
- [ ] `readProjectMetadata` detects `workspaces` field in package.json (array or `{packages: []}` format)
- [ ] Returns `workspaces: string[]` array in project metadata (glob patterns resolved to actual directories)
- [ ] Returns `isMonorepo: true` when workspaces detected
- [ ] Returns `workspaces: [], isMonorepo: false` when no workspaces field
- [ ] Handles both npm (`"workspaces": ["packages/*"]`) and yarn (`"workspaces": {"packages": [...]}`) formats

---

### Task 3: Wire embedding client and vector store in server [x]

**Goal:** Instantiate the real `createEmbeddingClient` and `createVectorStore` in index.js. These are the foundation for the memory pipeline. Use lazy initialization — only create the vector store when first needed.

**Files:**
- server/index.js (modify)

**Acceptance Criteria:**
- [ ] `createEmbeddingClient` imported and instantiated with default options
- [ ] `createVectorStore` imported with lazy async initialization
- [ ] Vector DB path defaults to `~/.tlc/memory/vectors.db`
- [ ] Server starts successfully even if Ollama is not running (embedding client handles unavailability gracefully)
- [ ] No performance impact on server startup (lazy init)

---

### Task 4: Wire vector indexer, semantic recall, and memory hooks [x]

**Goal:** Instantiate `createVectorIndexer`, `createSemanticRecall`, and `createMemoryHooks`. Replace the stub memoryApi in index.js with real implementations. The memory routes should now return real data from the vector store and file-based memory.

**Files:**
- server/index.js (modify)
- server/lib/workspace-api.js (modify memory routes to also query vector store)

**Acceptance Criteria:**
- [ ] `createVectorIndexer({ vectorStore, embeddingClient })` instantiated
- [ ] `createSemanticRecall({ vectorStore, embeddingClient })` instantiated
- [ ] `createMemoryApi` receives real dependencies instead of stubs
- [ ] Memory routes combine file-based adapter results with vector store results
- [ ] GET /projects/:id/memory/stats includes vector entry count
- [ ] Server doesn't crash if vector store is empty or unavailable

---

### Task 5: Add memory capture endpoint [x]

**Goal:** Add a POST endpoint that accepts conversation exchanges and triggers the memory observer pipeline. This is how Claude Code sessions will feed memory into TLC — by POSTing exchanges to the server.

**Files:**
- server/lib/workspace-api.js (modify — add POST route)
- server/lib/workspace-api.test.js (modify)

**Acceptance Criteria:**
- [ ] POST /projects/:projectId/memory/capture accepts `{ exchanges: [...] }` body
- [ ] Calls `observeAndRemember(projectRoot, exchange)` for each exchange
- [ ] Calls `vectorIndexer.indexChunk()` if vector indexer is available
- [ ] Returns `{ captured: number }` count
- [ ] Non-blocking — responds immediately, processes in background
- [ ] Returns 404 for invalid projectId
- [ ] Returns 400 for missing/empty exchanges body

---

### Task 6: Add memory search endpoint with semantic recall [x]

**Goal:** Add a GET endpoint for searching memories using semantic recall (vector similarity). The dashboard's MemoryPage search already calls a search endpoint — wire it to the real semantic recall system.

**Files:**
- server/lib/workspace-api.js (modify — add GET route)
- server/lib/workspace-api.test.js (modify)

**Acceptance Criteria:**
- [ ] GET /projects/:projectId/memory/search?q=query returns semantically similar memories
- [ ] Uses `semanticRecall.recall(query, context)` when vector store is available
- [ ] Falls back to file-based text search (memory-reader.searchMemory) when vector store unavailable
- [ ] Returns `{ results: [...], source: 'vector' | 'file' }` indicating search method used
- [ ] Returns 400 for missing query parameter
- [ ] Returns empty results (not error) when no matches found

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Monorepo metadata only useful after recursion fix |
| 4 | 3 | Indexer and recall need vector store and embedding client |
| 5 | 4 | Capture endpoint needs vector indexer wired |
| 6 | 4 | Search endpoint needs semantic recall wired |

**Parallel groups:**
- Group A: Tasks 1, 3 (independent — scanner fix and vector store setup)
- Group B: Task 2 (after 1)
- Group C: Task 4 (after 3)
- Group D: Tasks 5, 6 (after 4, can be parallel)

## Estimated Scope

- Tasks: 6
- Files: ~8
- Tests: ~35
