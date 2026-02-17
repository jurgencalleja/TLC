# Phase 81: Memory Integration Fix — Plan

## Overview

The memory system (Phases 10-13, 71-79) has all infrastructure built but the critical wiring is broken or missing. Semantic recall is broken (wrong call signature), remembered items can't be found (missing text field), and the core promise — continuous autonomous decision logging — was never connected. This phase fixes all P1/P2 bugs found by the Codex + Claude review and completes the integration.

## Prerequisites

- [x] Phase 80 complete (Docker/VPS/deploy)
- [x] Security hardening committed (input-sanitizer)
- [x] Combined review report (Codex + Claude) identifying 6 issues

## Tasks

### Task 1: Fix vectorStore.search call signature in semantic-recall [ ]

**Goal:** Fix the P1 bug where `recall()` passes an object to `vectorStore.search()` instead of the expected `(embedding, options)` arguments.

**Files:**
- server/lib/semantic-recall.js
- server/lib/semantic-recall.test.js

**Acceptance Criteria:**
- [ ] `vectorStore.search` called with `(embedding, { limit })` not `({ embedding, limit })`
- [ ] Semantic recall returns results for matching queries
- [ ] Existing tests updated to verify correct call signature

**Test Cases:**
- search is called with embedding as first arg and options as second
- recall returns scored results for a matching query
- recall returns empty array for empty embedding
- recall with type filter only returns matching types

---

### Task 2: Fix remember-command chunk.text for vector indexing [ ]

**Goal:** Fix the P1 bug where `/tlc:remember` writes chunks without a `text` field, causing `vectorIndexer.indexChunk` to silently fail (it only reads `chunk.text`).

**Files:**
- server/lib/remember-command.js
- server/lib/remember-command.test.js

**Acceptance Criteria:**
- [ ] Chunk built with `text` field set to the content being remembered
- [ ] Explicit text mode: `chunk.text = text`
- [ ] Exchange capture mode: `chunk.text = summary` (or joined exchange text)
- [ ] vectorIndexer.indexChunk receives a chunk with non-empty text

**Test Cases:**
- explicit text remember sets chunk.text to the input text
- exchange capture sets chunk.text to exchange summary
- indexChunk called with chunk that has non-empty text field
- indexChunk success means item is findable via search

---

### Task 3: Fix buffer race condition in capture hooks [ ]

**Goal:** Fix the P2 bug where `processBuffer()` discards exchanges that arrive during async processing by setting `buffer = []` after completion.

**Files:**
- server/lib/memory-hooks.js
- server/lib/memory-hooks-capture.test.js

**Acceptance Criteria:**
- [ ] Buffer swap happens before async processing begins (snapshot pattern)
- [ ] New exchanges arriving during processing are preserved
- [ ] Processing errors don't lose buffered exchanges

**Test Cases:**
- exchanges added during processing are not lost
- buffer is cleared atomically (snapshot then reset)
- error during processing does not discard new exchanges
- concurrent onExchange calls during processBuffer are safe

---

### Task 4: Fix detectUncommittedMemory to use git status [ ]

**Goal:** Fix the P2 bug where `detectUncommittedMemory()` returns ALL files instead of only uncommitted ones, causing spurious `git commit` attempts.

**Files:**
- server/lib/memory-committer.js
- server/lib/memory-committer.test.js

**Acceptance Criteria:**
- [ ] Uses `git status --porcelain` to filter to modified/untracked files only
- [ ] Clean repo returns empty array (no files to commit)
- [ ] New/modified memory files correctly detected
- [ ] Falls back to walkDir if not in a git repo

**Test Cases:**
- clean repo returns empty uncommitted list
- new memory file detected as uncommitted
- modified memory file detected as uncommitted
- non-git directory falls back gracefully

---

### Task 5: Fix branch sanitization in deploy-engine [ ]

**Goal:** Fix the P2 bug where `deployBranch()` uses the sanitized branch name in git commands (`git clone -b`, `git reset --hard origin/`), but the remote branch has the original name (e.g., `feature/login-page`). Sanitized names should only be used for file paths, DNS, and container names.

**Files:**
- server/lib/deploy-engine.js
- server/lib/deploy-engine.test.js

**Acceptance Criteria:**
- [ ] `git clone -b` uses original branch name
- [ ] `git fetch origin && git reset --hard origin/` uses original branch name
- [ ] Sanitized name used only for: deploy dir path, container name, nginx subdomain
- [ ] Branches with slashes (e.g., `feature/login`) deploy correctly

**Test Cases:**
- git clone uses original branch name not sanitized
- git reset uses original branch name not sanitized
- deploy dir uses sanitized branch name
- container name uses sanitized branch name
- branches with slashes work end-to-end

---

### Task 6: Wire memory hooks into server session lifecycle [ ]

**Goal:** Connect `createMemoryHooks()` and `createCaptureHooks()` to the TLC server so that conversations are automatically captured during normal development without user action. This is the core missing integration.

**Files:**
- server/index.js
- server/lib/workspace-api.js (verify capture endpoint works)
- server/lib/memory-hooks.js (already complete, just needs calling)

**Acceptance Criteria:**
- [ ] Server initializes memory hooks on startup
- [ ] WebSocket `assistant_response` events trigger `observeAndRemember()` automatically
- [ ] TLC command events (`/tlc:build`, `/tlc:plan`, etc.) flush capture buffer
- [ ] Session start loads context via `buildSessionContext()`
- [ ] All capture is non-blocking (fire-and-forget)
- [ ] Capture failures never crash the server or block responses

**Test Cases:**
- WebSocket response event triggers observeAndRemember
- TLC command event flushes capture buffer
- capture failure does not propagate to response handler
- session context is built on WebSocket connection
- memory hooks initialize without error when vector DB unavailable

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 6 | 1, 2, 3 | Wiring hooks requires the underlying bugs to be fixed first |

**Parallel groups:**
- Group A: Tasks 1, 2, 3, 4, 5 (all independent bug fixes)
- Group B: Task 6 (after Group A — integration wiring)

## File Overlap Analysis

```
server/lib/memory-hooks.js → Task 3, Task 6
```

Task 3 fixes the buffer race in `createCaptureHooks()`, Task 6 wires `createMemoryHooks()` into the server. Different functions in the same file — Task 3 should complete first to avoid conflicts.

## Estimated Scope

- Tasks: 6
- Files: ~10 (6 implementation + 4 test updates)
- Tests: ~25 (estimated new/updated)
