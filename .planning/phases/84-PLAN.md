# Phase 84: Wire Memory System End-to-End — Plan

## Overview

Replace hardcoded stubs in server/index.js with real memory modules. Initialize memory directories on startup. Add Ollama health check so users know when semantic search is unavailable. Prove the full loop: capture → detect → store → read back.

## Prerequisites

- [x] Phase 82 complete (capture bridge, Stop hook)
- [x] Phase 83 complete (server always-on)
- [x] memory-store-adapter.js exists and is tested
- [x] memory-init.js exists and is tested
- [x] memory-writer.js creates dirs on demand

## Tasks

### Task 1: Create Ollama health checker

**Goal:** Module that checks Ollama status (not installed / not running / no model / ready) with clear actionable messages. Non-blocking, result cached for 60 seconds.

**Files:**
- server/lib/ollama-health.js
- server/lib/ollama-health.test.js

**Acceptance Criteria:**
- [ ] `checkOllamaHealth()` returns `{ status, message, action }`
- [ ] status: `ready` | `not_installed` | `not_running` | `no_model`
- [ ] message is human-readable (e.g. "Ollama not installed")
- [ ] action tells user what to do (e.g. "brew install ollama && ollama pull mxbai-embed-large")
- [ ] Checks `http://localhost:11434/api/tags` for running + model list
- [ ] Caches result for 60 seconds (avoid hammering on every request)
- [ ] Never throws — returns `not_installed` on any network error

**Test Cases:**
- Returns ready when Ollama responds with correct model
- Returns not_running when connection refused
- Returns no_model when Ollama responds but model missing
- Caches result within 60s window
- Returns actionable message for each status

---

### Task 2: Replace memoryStore stubs with real adapter

**Goal:** Wire `createMemoryStoreAdapter(PROJECT_DIR)` into the `createMemoryApi()` call in index.js instead of the hardcoded empty stubs.

**Files:**
- server/index.js

**Acceptance Criteria:**
- [ ] `memoryStore` uses `createMemoryStoreAdapter(PROJECT_DIR)`
- [ ] `listDecisions()` reads actual .md files from `.tlc/memory/team/decisions/`
- [ ] `listGotchas()` reads actual .md files from `.tlc/memory/team/gotchas/`
- [ ] `getStats()` returns real counts
- [ ] Gracefully returns empty when directories don't exist yet

**Test Cases:**
- N/A (integration wiring — covered by Task 4 e2e test)

---

### Task 3: Initialize memory directories on server startup

**Goal:** Call `initMemorySystem(PROJECT_DIR)` during server startup so the directory structure exists before any writes or reads.

**Files:**
- server/index.js

**Acceptance Criteria:**
- [ ] `initMemorySystem()` called after server config, before API setup
- [ ] Non-blocking (async, doesn't delay server startup)
- [ ] Creates `.tlc/memory/team/decisions/`, `.tlc/memory/team/gotchas/`, `.tlc/memory/.local/preferences/`, `.tlc/memory/.local/sessions/`
- [ ] Handles missing `.tlc/` directory gracefully
- [ ] Skips if directories already exist

**Test Cases:**
- N/A (integration wiring — covered by Task 4 e2e test)

---

### Task 4: End-to-end memory integration test

**Goal:** Prove the full loop works: POST exchange with decision pattern → observeAndRemember processes it → file written to decisions dir → adapter reads it back via API.

**Files:**
- server/lib/memory-wiring-e2e.test.js

**Acceptance Criteria:**
- [ ] Creates temp project with `.tlc.json` and memory directory structure
- [ ] Calls `observeAndRemember()` with an exchange containing a decision pattern
- [ ] Verifies decision .md file created in `team/decisions/`
- [ ] Creates adapter with `createMemoryStoreAdapter(projectPath)`
- [ ] Verifies `listDecisions()` returns the stored decision
- [ ] Verifies `getStats()` shows correct counts
- [ ] Same flow for gotchas

**Test Cases:**
- Decision exchange → file created → adapter reads it back
- Gotcha exchange → file created → adapter reads it back
- Stats reflect actual file counts
- Empty project returns empty arrays (no crash)

---

### Task 5: Add Ollama status to server health endpoint

**Goal:** Include Ollama/memory status in the existing `/api/health` response so the dashboard and `/tlc` command can show memory system health.

**Files:**
- server/index.js

**Acceptance Criteria:**
- [ ] `/api/health` response includes `memory` field
- [ ] `memory.ollama` shows status from health checker
- [ ] `memory.fileStore` shows whether memory dirs exist
- [ ] `memory.decisions` shows count of stored decisions
- [ ] `memory.gotchas` shows count of stored gotchas
- [ ] Non-blocking (health check uses cached result)

**Test Cases:**
- N/A (integration wiring — verified manually + Task 4 covers adapter)

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | - | Independent |
| 3 | - | Independent |
| 4 | 2, 3 | E2E test needs real adapter + initialized dirs |
| 5 | 1 | Health endpoint needs Ollama checker |

**Parallel groups:**
- Group A: Tasks 1, 2, 3 (independent)
- Group B: Task 4 (after 2+3)
- Group C: Task 5 (after 1)

## Estimated Scope

- Tasks: 5
- Files: 4 (1 new module + test, 2 modifications, 1 new test)
- Tests: ~14 (estimated)
