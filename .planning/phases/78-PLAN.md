# Phase 78: Memory Wiring + Clickable Roadmap - Plan

## Overview

Wire the memory API into the server so Memory pages actually show data. Add a PhaseDetailPage so roadmap items are clickable and drill down into phase-specific tasks. Fix ESM/CJS mismatch in memory-api.js.

## Tasks

### Task 1: Convert memory-api.js to CommonJS

**Goal:** Fix the ESM/CJS mismatch — memory-api.js uses `export function` but the server is CommonJS.

**Files:**
- server/lib/memory-api.js (modify)
- server/lib/memory-api.test.js (modify)

**Acceptance Criteria:**
- [x] `createMemoryApi` exported via `module.exports`
- [x] Tests use `require()` not `import`
- [x] All existing memory-api tests still pass

---

### Task 2: Create file-based memory store adapter

**Goal:** Create a lightweight memoryStore adapter that reads decisions/gotchas from `.tlc/memory/team/` markdown files on disk. No vector DB required — just file-based reading. Returns empty arrays when no files exist.

**Files:**
- server/lib/memory-store-adapter.js (new)
- server/lib/memory-store-adapter.test.js (new)

**Acceptance Criteria:**
- [x] `createMemoryStoreAdapter(projectPath)` factory function
- [x] `listDecisions(options)` reads from `.tlc/memory/team/decisions/` and returns array
- [x] `listGotchas(options)` reads from `.tlc/memory/team/gotchas/` and returns array
- [x] `getStats()` returns basic stats (file counts, no vector info)
- [x] Returns empty arrays/zeroes when directories don't exist
- [x] Handles malformed markdown gracefully

---

### Task 3: Wire memoryApi into server index.js

**Goal:** Create a memoryApi instance in index.js and pass it to `createWorkspaceRouter`. The memory routes are already defined in workspace-api.js behind the `if (memoryApi)` guard.

**Files:**
- server/index.js (modify)

**Acceptance Criteria:**
- [x] `createMemoryApi` required from memory-api.js
- [x] `createMemoryStoreAdapter` used to create per-project memoryStore
- [x] memoryApi passed to `createWorkspaceRouter({ globalConfig, projectScanner, memoryApi })`
- [x] GET /api/projects/:id/memory/decisions returns 200
- [x] GET /api/projects/:id/memory/gotchas returns 200
- [x] GET /api/projects/:id/memory/stats returns 200
- [x] Empty project returns empty arrays (not 500)

---

### Task 4: Fix memory routes to be per-project

**Goal:** The current memory routes call `memoryApi.handleListDecisions(req, res)` but don't pass the project path. The adapter needs to know which project to read from. Fix routes to create per-project adapter or pass project path in request.

**Files:**
- server/lib/workspace-api.js (modify memory routes)
- server/lib/workspace-api.test.js (update tests)

**Acceptance Criteria:**
- [x] Memory routes resolve the project path from projectId
- [x] Adapter reads from the correct project's `.tlc/memory/team/` directory
- [x] Different projects return different memory data
- [x] Tests verify project-scoped memory lookup

---

### Task 5: PhaseDetailPage component

**Goal:** New page showing a single phase's details: goal, deliverables, and task list filtered to that phase. Accessed via `/projects/:projectId/phases/:phaseNumber`.

**Files:**
- dashboard-web/src/pages/PhaseDetailPage.tsx (new)
- dashboard-web/src/pages/PhaseDetailPage.test.tsx (new)

**Acceptance Criteria:**
- [x] Displays phase name, number, and status badge
- [x] Shows goal text
- [x] Shows deliverables with checkmarks
- [x] Lists tasks filtered to this phase (using useTasks + useRoadmap)
- [x] Each task shows title, status, assignee
- [x] Shows loading skeleton
- [x] Shows "Phase not found" for invalid phase number
- [x] Back navigation to roadmap

---

### Task 6: Wire PhaseDetailPage route + navigation

**Goal:** Add route for PhaseDetailPage in App.tsx. Make roadmap phase rows navigate to the phase detail instead of just toggling expand/collapse.

**Files:**
- dashboard-web/src/App.tsx (modify)
- dashboard-web/src/pages/index.ts (modify)
- dashboard-web/src/pages/RoadmapPage.tsx (modify)
- dashboard-web/src/pages/RoadmapPage.test.tsx (modify)

**Acceptance Criteria:**
- [x] Route `/projects/:projectId/phases/:phaseNumber` renders PhaseDetailPage
- [x] Clicking phase row in RoadmapPage navigates to phase detail
- [x] Expand/collapse still works via chevron icon click (stopPropagation)
- [x] PhaseDetailPage exported from pages/index.ts

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 1, 2 | index.js needs both CJS memory-api and adapter |
| 4 | 2, 3 | Routes need adapter wired in to fix per-project scope |
| 6 | 5 | Routes need the page component |

**Parallel groups:**
- Group A: Tasks 1, 2, 5 (independent)
- Group B: Task 3 (after 1, 2)
- Group C: Task 4 (after 2, 3)
- Group D: Task 6 (after 5)

## Estimated Scope

- Tasks: 6
- Files: ~12
- Tests: ~45
