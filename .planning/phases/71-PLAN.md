# Phase 71: Semantic Memory & Rich Capture - Plan

## Overview

Transform TLC's memory system from thin one-liner extraction with text search into rich conversation capture with semantic vector recall. Conversations are chunked by topic and stored as detailed markdown in `memory/conversations/`. A local sqlite-vec database indexes all memory for semantic similarity search. Vectors are derived data (`.gitignored`, rebuilt from text per machine). The text travels via git — clone on a new machine, vectors rebuild in seconds.

**Stack:** `better-sqlite3` + `sqlite-vec` for storage, `Ollama` + `mxbai-embed-large` (1024 dims) for local embeddings.

## Prerequisites

- [ ] Ollama installed locally (for embeddings — graceful degradation if absent)
- [ ] `better-sqlite3` and `sqlite-vec` npm packages added to server dependencies
- [x] Existing memory system (Phases 10-13): storage, writer, reader, observer, hooks
- [x] Pattern detector and memory classifier modules

## Tasks

### Task 1: Vector Database Module [ ]

**Goal:** SQLite database with sqlite-vec extension for storing and querying vector embeddings. Single file at `~/.tlc/memory/vectors.db`.

**Files:**
- `server/lib/vector-store.js` (new)
- `server/lib/vector-store.test.js` (new)

**Acceptance Criteria:**
- [ ] Creates `~/.tlc/memory/vectors.db` on first use (creates `~/.tlc/memory/` if needed)
- [ ] Loads `sqlite-vec` extension via `sqliteVec.load(db)`
- [ ] Schema: `memories` table with `id TEXT PK, text TEXT, embedding FLOAT32[1024], type TEXT, project TEXT, workspace TEXT, branch TEXT, timestamp INTEGER, source_file TEXT, permanent INTEGER DEFAULT 0`
- [ ] `insert(entry)` — stores text + embedding + metadata
- [ ] `search(queryEmbedding, options)` — KNN search with metadata filters (`project`, `workspace`, `type`, `limit`, `minSimilarity`)
- [ ] `delete(id)` — remove a memory
- [ ] `count(filters)` — count memories matching filters
- [ ] `rebuild()` — drop all rows, signal for re-indexing from text files
- [ ] `close()` — clean shutdown
- [ ] Handles missing `~/.tlc/` directory gracefully
- [ ] Configurable embedding dimensions (default 1024 for mxbai-embed-large)

**Test Cases:**
- Creates database file and table on init
- Inserts memory with embedding and metadata
- KNN search returns closest matches sorted by similarity
- Search filters by project
- Search filters by workspace
- Search filters by type (decision, gotcha, conversation)
- Search respects minSimilarity threshold
- Search respects limit
- Combined filters work (project + type + limit)
- Delete removes entry
- Count returns correct count with filters
- Rebuild clears all data
- Close shuts down cleanly
- Handles missing directory (creates it)
- Configurable dimensions (384 for smaller models)
- Permanent flag stored and queryable
- Duplicate insert updates existing entry (upsert)

---

### Task 2: Embedding Client [ ]

**Goal:** Generate vector embeddings from text using Ollama local API. Default model: `mxbai-embed-large` (1024 dims). Configurable to smaller models.

**Files:**
- `server/lib/embedding-client.js` (new)
- `server/lib/embedding-client.test.js` (new)

**Acceptance Criteria:**
- [ ] Connects to Ollama API at `http://localhost:11434` (configurable via `OLLAMA_HOST`)
- [ ] `embed(text)` — returns Float32Array of embedding
- [ ] `embedBatch(texts)` — batch embed multiple texts
- [ ] Default model: `mxbai-embed-large` (configurable via `.tlc.json` or `TLC_EMBED_MODEL`)
- [ ] `isAvailable()` — checks if Ollama is running and model is pulled
- [ ] `getModelInfo()` — returns model name and dimensions
- [ ] Graceful degradation: returns `null` when Ollama unavailable (caller falls back to text search)
- [ ] Auto-pull model on first use if not present (with user confirmation)
- [ ] Timeout: 30s per embed request
- [ ] Text truncation: max 8192 tokens per embed (model limit)

**Test Cases:**
- Embeds text and returns Float32Array
- Returns correct dimensions for mxbai-embed-large (1024)
- Batch embed processes multiple texts
- Batch embed returns array of Float32Arrays
- isAvailable returns true when Ollama running
- isAvailable returns false when Ollama not running
- Graceful degradation returns null on connection failure
- Respects configurable model name
- Respects configurable host
- Truncates text exceeding token limit
- Timeout after 30s
- getModelInfo returns model name and dimensions
- Handles Ollama API error responses
- Empty text returns null (skip embedding)

---

### Task 3: Conversation Chunker [ ]

**Goal:** Split conversation exchanges into topic-coherent chunks with rich context. Detects topic boundaries from signals (TLC commands, user cues, semantic shifts).

**Files:**
- `server/lib/conversation-chunker.js` (new)
- `server/lib/conversation-chunker.test.js` (new)

**Acceptance Criteria:**
- [ ] `chunk(exchanges, options)` — takes array of `{user, assistant, timestamp}` exchanges, returns chunks
- [ ] Each chunk: `{ id, title, summary, exchanges, topic, startTime, endTime, metadata }`
- [ ] Detects hard boundaries: TLC command invocations (`/tlc:plan`, `/tlc:build`, `/tlc:discuss`)
- [ ] Detects soft boundaries: user signals ("ok", "let's move on", "next", "let's build this")
- [ ] Detects semantic shifts: when consecutive exchanges diverge in topic (via keyword overlap or embedding similarity)
- [ ] Generates title from chunk content (first decision or topic phrase)
- [ ] Generates summary (2-3 sentence distillation of what was discussed/decided)
- [ ] Adaptive chunk size: 3-8 exchanges per chunk depending on coherence
- [ ] Single-exchange chunks allowed for important moments (decisions, corrections)
- [ ] Chunks include metadata: `{ projects, files, commands, decisions }`

**Test Cases:**
- Chunks exchanges by TLC command boundaries
- Chunks exchanges by user boundary signals ("ok", "next")
- Chunks by semantic shift (topic change detected)
- Generates meaningful title from content
- Generates summary from exchanges
- Single important exchange becomes its own chunk
- Adaptive sizing: short Q&A grouped, deep discussion kept together
- Metadata extracts mentioned file paths
- Metadata extracts mentioned project names
- Metadata extracts TLC commands used
- Metadata flags decisions detected
- Empty exchanges returns empty chunks
- Single exchange returns single chunk
- Handles very long exchanges (>20) with multiple splits
- Preserves exchange order within chunks
- Chunk IDs are unique and deterministic

---

### Task 4: Rich Capture Writer [ ]

**Goal:** Write conversation chunks as detailed markdown to `memory/conversations/`. Format designed for both human reading and vector embedding.

**Files:**
- `server/lib/rich-capture.js` (new)
- `server/lib/rich-capture.test.js` (new)

**Acceptance Criteria:**
- [ ] `writeConversationChunk(projectRoot, chunk)` — writes chunk to `memory/conversations/{date}-{slug}.md`
- [ ] Rich markdown format with: title, date, context, exchanges, decisions, related files
- [ ] Appends to existing file if same date+topic (accumulates through session)
- [ ] `writeDecisionDetail(projectRoot, decision)` — writes enhanced decision (full context, alternatives, reasoning chain)
- [ ] Auto-extracts decisions, gotchas, preferences from chunk content (reuses pattern-detector)
- [ ] Cross-references: links to related plan files, phase numbers
- [ ] Permanent flag for `/tlc:remember` content (frontmatter: `permanent: true`)
- [ ] File naming: `YYYY-MM-DD-{topic-slug}.md` (e.g., `2026-02-09-vector-db-architecture.md`)
- [ ] Creates `memory/conversations/` directory if not exists

**Test Cases:**
- Writes chunk as markdown file with correct filename
- Markdown includes title, date, context section
- Markdown includes full exchange content (user + assistant)
- Markdown includes extracted decisions
- Markdown includes related files section
- Appends to existing file for same date+topic
- Creates conversations/ directory if missing
- Permanent flag set in frontmatter
- Enhanced decision format includes alternatives and reasoning chain
- File slug is URL-safe
- Handles special characters in titles
- Cross-references plan files when phase mentioned
- Timestamp in ISO format

---

### Task 5: Vector Indexer [ ]

**Goal:** Embed and index all memory content (decisions, gotchas, conversations) into the vector store. Supports full rebuild from text and incremental indexing.

**Files:**
- `server/lib/vector-indexer.js` (new)
- `server/lib/vector-indexer.test.js` (new)

**Acceptance Criteria:**
- [ ] `indexAll(projectRoot, options)` — full index rebuild from all text files in `memory/`
- [ ] `indexFile(projectRoot, filePath)` — index a single file (incremental)
- [ ] `indexChunk(projectRoot, chunk)` — index a conversation chunk immediately after capture
- [ ] Scans `memory/decisions/`, `memory/gotchas/`, `memory/conversations/` for text files
- [ ] Extracts embeddable text from markdown (title + content, strips formatting)
- [ ] Calls embedding client for each text
- [ ] Stores in vector-store with metadata (type, project, workspace, branch, timestamp, source_file)
- [ ] `isIndexed(filePath)` — check if file already indexed (by source_file + modification time)
- [ ] Skips unchanged files during rebuild (hash comparison)
- [ ] Progress callback: `onProgress({ indexed, total, current })`
- [ ] Graceful degradation: if Ollama unavailable, logs warning and skips (text files still readable)
- [ ] `rebuildIndex(projectRoot)` — drops all vectors, re-indexes everything from text

**Test Cases:**
- Indexes all decisions from memory/decisions/
- Indexes all gotchas from memory/gotchas/
- Indexes all conversations from memory/conversations/
- Incremental index adds single file
- Incremental index for conversation chunk
- Skips already-indexed unchanged files
- Re-indexes file when modification time changes
- Progress callback fires with counts
- Graceful degradation when Ollama unavailable
- Rebuild drops and re-indexes all
- Extracts clean text from markdown (strips headers, formatting)
- Sets correct metadata (type, project, workspace)
- Permanent flag preserved in index
- Handles empty memory directories
- Handles malformed markdown files gracefully

---

### Task 6: Semantic Recall [ ]

**Goal:** Search memory by meaning. Query the vector DB with natural language, filter by context, rank by combined score (similarity + recency + project relevance).

**Files:**
- `server/lib/semantic-recall.js` (new)
- `server/lib/semantic-recall.test.js` (new)

**Acceptance Criteria:**
- [ ] `recall(query, context, options)` — semantic search returning ranked results
- [ ] Context: `{ projectId, workspace, branch, touchedFiles }` (for filtering and boosting)
- [ ] Options: `{ limit, scope, types, minScore }` where scope = 'project' | 'workspace' | 'global'
- [ ] Default scope: project → workspace fallback (search own project first, widen if few results)
- [ ] Combined ranking: `vectorSimilarity * 0.5 + recency * 0.25 + projectRelevance * 0.25`
- [ ] Permanent memories boosted (1.2x multiplier)
- [ ] Returns: `[{ id, text, score, type, source, date, permanent }]`
- [ ] Graceful degradation: if vector store unavailable, falls back to existing text search (`searchMemory()`)
- [ ] `recallForContext(projectRoot, context)` — auto-recall for context injection (session start, post-compaction)
- [ ] Deduplication: if same content found via multiple paths, keep highest-scoring

**Test Cases:**
- Recall with query returns semantically similar results
- Results sorted by combined score (highest first)
- Project scope filters to current project
- Workspace scope includes workspace-level memories
- Global scope searches everything
- Auto-widens from project to workspace when few results
- Permanent memories get 1.2x boost
- Respects minScore threshold
- Respects limit
- Falls back to text search when vector store unavailable
- recallForContext returns top-K for injection
- Deduplicates overlapping results
- Empty query returns empty results
- Combined score calculation is correct
- Type filter works (only decisions, only conversations, etc.)

---

### Task 7: Enhanced Context Injection [ ]

**Goal:** Update existing context-builder.js and claude-injector.js to use semantic recall instead of keyword-only. Inject richer, more relevant memories.

**Files:**
- `server/lib/context-builder.js` (modified)
- `server/lib/context-builder.test.js` (modified — add new tests)
- `server/lib/relevance-scorer.js` (modified)
- `server/lib/relevance-scorer.test.js` (modified — add new tests)
- `server/lib/claude-injector.js` (modified)

**Acceptance Criteria:**
- [ ] `buildSessionContext()` calls `recallForContext()` when vector store available
- [ ] Falls back to existing keyword-based context when vector store unavailable
- [ ] Relevance scorer adds new weight: `VECTOR_SIMILARITY: 0.35` (rebalance others)
- [ ] New weights: `{ VECTOR_SIMILARITY: 0.35, FILE_MATCH: 0.20, BRANCH_MATCH: 0.20, RECENCY: 0.15, KEYWORD_MATCH: 0.10 }`
- [ ] Context includes conversation chunks (not just decisions/gotchas)
- [ ] Token budget respects conversation chunk sizes (may need truncation)
- [ ] CLAUDE.md injection includes "Related Conversations" section
- [ ] Conversation chunks formatted as concise summaries in injection (not full exchanges)

**Test Cases:**
- buildSessionContext uses semantic recall when available
- buildSessionContext falls back to keyword search when unavailable
- New relevance weights sum to 1.0
- Vector similarity score integrated into ranking
- Conversation chunks included in context
- Token budget respected with conversation chunks
- CLAUDE.md gets "Related Conversations" section
- Conversation summaries are concise (not full exchanges)
- Backward compatible: no vector store = same behavior as before

---

### Task 8: Auto-Capture Hooks [ ]

**Goal:** Update memory hooks to trigger rich capture continuously and at TLC command boundaries. Integrate with conversation chunker and vector indexer.

**Files:**
- `server/lib/memory-hooks.js` (modified)
- `server/lib/memory-hooks.test.js` (modified — add new tests)
- `server/lib/memory-observer.js` (modified)
- `server/lib/memory-observer.test.js` (modified — add new tests)

**Acceptance Criteria:**
- [ ] Accumulates exchanges in memory (rolling buffer, last 20 exchanges)
- [ ] Every 3-5 exchanges: run chunker, write chunks, index vectors
- [ ] TLC command invocations trigger immediate chunk + capture (hard boundary)
- [ ] `/tlc:discuss` captures full discussion with all decisions
- [ ] `/tlc:plan` captures plan rationale and task breakdown
- [ ] `/tlc:build` captures build decisions and implementation choices
- [ ] `AskUserQuestion` responses captured with the question context
- [ ] Always-record categories auto-detected: devops, infrastructure, security, code quality
- [ ] Non-blocking: all capture runs via `setImmediate()` (existing pattern)
- [ ] Capture failures logged but never block the user

**Test Cases:**
- Accumulates exchanges in rolling buffer
- Triggers chunking after 5 exchanges
- TLC command triggers immediate capture
- /tlc:discuss captured with full context
- /tlc:plan captured with rationale
- /tlc:build captured with implementation choices
- AskUserQuestion response captured
- DevOps decisions auto-detected and flagged
- Infrastructure decisions auto-detected
- Security decisions auto-detected
- Non-blocking: capture runs in background
- Capture failure doesn't throw (logs warning)
- Buffer resets after chunk written
- Indexing triggered after capture

---

### Task 9: `/tlc:remember` Command [ ]

**Goal:** Explicit command for permanent memory capture. Content flagged as never-pruned, highest recall priority.

**Files:**
- `.claude/commands/tlc/remember.md` (new)
- `server/lib/remember-command.js` (new)
- `server/lib/remember-command.test.js` (new)

**Acceptance Criteria:**
- [ ] `/tlc:remember` captures current conversation context as permanent memory
- [ ] `/tlc:remember <text>` captures specific text as permanent
- [ ] Permanent flag: `permanent: true` in frontmatter and vector metadata
- [ ] Written to `memory/conversations/` with `[PERMANENT]` prefix in title
- [ ] Indexed in vector store with `permanent = 1`
- [ ] Recall boosts permanent memories (1.2x in scoring)
- [ ] Never pruned/archived by any cleanup process
- [ ] Confirmation: "Remembered permanently: {summary}"
- [ ] Works without arguments (captures recent exchanges)

**Test Cases:**
- Captures current context as permanent memory
- Captures explicit text when provided
- Permanent flag set in file frontmatter
- Permanent flag set in vector store
- File written to memory/conversations/ with PERMANENT prefix
- Recall boosts permanent memories
- Works without arguments (captures recent)
- Shows confirmation message
- Markdown format is detailed and complete

---

### Task 10: `/tlc:recall` Command [ ]

**Goal:** Semantic search command for querying memory. "What did we decide about X?"

**Files:**
- `.claude/commands/tlc/recall.md` (new)
- `server/lib/recall-command.js` (new)
- `server/lib/recall-command.test.js` (new)

**Acceptance Criteria:**
- [ ] `/tlc:recall <query>` searches memory semantically
- [ ] Returns top-5 results with similarity scores
- [ ] Shows: title, date, score, type (decision/gotcha/conversation), excerpt
- [ ] `--scope project|workspace|global` flag (default: workspace)
- [ ] `--type decision|gotcha|conversation|all` flag (default: all)
- [ ] `--limit N` flag (default: 5)
- [ ] Falls back to text search if vector store unavailable
- [ ] Displays source file path for each result
- [ ] Permanent items marked with indicator

**Test Cases:**
- Semantic search returns relevant results
- Results show title, date, score, excerpt
- Score displayed as percentage
- --scope flag filters correctly
- --type flag filters correctly
- --limit flag respected
- Falls back to text search gracefully
- Source file path shown
- Permanent items marked
- No results message when nothing matches
- Empty query shows usage help

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | — | Independent (Ollama client) |
| 1 | — | Independent (SQLite setup) |
| 3 | — | Independent (text processing) |
| 4 | 3 | Rich capture uses chunker output |
| 5 | 1, 2 | Indexer uses vector store + embedding client |
| 6 | 1, 2, 5 | Recall queries vector store with embeddings |
| 7 | 6 | Context injection uses semantic recall |
| 8 | 3, 4, 5 | Hooks trigger chunking, capture, indexing |
| 9 | 4, 5, 6 | Remember uses capture + indexing + recall |
| 10 | 6 | Recall command wraps semantic recall |

**Parallel groups:**
- Group A: Tasks 1, 2, 3 (all independent — can work simultaneously)
- Group B: Tasks 4, 5 (after Group A)
- Group C: Tasks 6, 8 (after Group B)
- Group D: Tasks 7, 9, 10 (after Group C)

## Estimated Scope

- Tasks: 10
- New files: 16 (8 modules + 8 test files) + 2 command .md files
- Modified files: 6 (context-builder, relevance-scorer, claude-injector, memory-hooks, memory-observer + their tests)
- Tests: ~150 (estimated)
- npm dependencies: `better-sqlite3`, `sqlite-vec`
