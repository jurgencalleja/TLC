# Phase 84: Wire Memory System End-to-End — Discussion

## The Problem

The memory system was built across phases 71-73 and 81-83 but never actually wired together:

1. **memoryStore stubs** — `createMemoryApi()` in index.js receives hardcoded empty stubs instead of the real `createMemoryStoreAdapter(projectRoot)`
2. **No directory initialization** — `.tlc/memory/team/{decisions,gotchas}` and `.local/{preferences,sessions}` never get created on startup. `memory-writer.js` creates them lazily on first write, but the adapter returns `[]` if dirs don't exist
3. **richCapture stub** — `processChunk` returns `{ stored: false }`
4. **No Ollama dependency** — Vector/semantic features degrade gracefully without Ollama, but we should make the file-based features (decisions, gotchas, pattern detection) work independently

## What Works

| Component | Status |
|-----------|--------|
| `observeAndRemember()` pipeline | Works (observer → detector → writer) |
| `memory-writer.js` | Works (creates dirs on demand, writes .md files) |
| `memory-store-adapter.js` | Works (reads .md files from filesystem) |
| `pattern-detector.js` | Works (regex patterns on user field) |
| Per-project REST endpoints | Work (use adapter directly in workspace-api.js) |
| Capture bridge (Phase 82) | Works (Stop hook → POST → server) |
| Vector pipeline | Works when Ollama available |

## Implementation Decision

**Approach:** Wire the real adapter into index.js. No new modules needed — just replace stubs with existing code.

| Decision | Choice | Notes |
|----------|--------|-------|
| memoryStore | Use `createMemoryStoreAdapter(PROJECT_DIR)` | Already exists, already tested |
| Directory init | Call `initMemorySystem()` on startup | From memory-init.js, async, non-blocking |
| richCapture | Leave stubbed for now | Phase 74 scope |
| Ollama | Optional — file-based memory works without it | Semantic search degrades to text search |
| Testing | Integration test: capture → store → read back | Prove the full loop works |

## Ollama Health Check

When `/tlc` runs (or server starts), check Ollama status and report clearly:

- **Not installed:** "Ollama not installed. Memory works (decisions/gotchas) but semantic search is disabled. Install: `brew install ollama && ollama pull mxbai-embed-large`"
- **Installed but not running:** "Ollama installed but not running. Start with: `ollama serve`"
- **Running but no model:** "Ollama running but mxbai-embed-large model not found. Pull it: `ollama pull mxbai-embed-large`"
- **Running with model:** "Memory: full (pattern detection + semantic search)"

This check should be:
1. Non-blocking (don't slow down startup)
2. Visible in `/tlc` status output
3. Cached (don't hit Ollama on every request)

## Constraints

- Must not break existing 7898 tests
- Must not require Ollama for basic functionality
- Server startup must not block on memory init
- Backward compatible with projects that don't have .tlc/ directory
