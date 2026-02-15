# Phase 77: Dashboard Intelligence & Project Pages - Plan

## Overview

Add Memory/Decisions page and rich Project Info page to the dashboard. Fix 0% coverage bug. Memory API already exists server-side - this phase wires it into the UI and adds project file serving.

## Tasks

### Task 1: Mount Memory API Routes + Project File Endpoint [x]

**Goal:** Wire existing memory-api handlers into server routes and add a project file endpoint.

**Files:**
- server/lib/workspace-api.js
- server/lib/workspace-api.test.js

**Acceptance Criteria:**
- [x] GET /api/projects/:id/memory/decisions returns decisions array
- [x] GET /api/projects/:id/memory/gotchas returns gotchas array  
- [x] GET /api/projects/:id/memory/stats returns stats object
- [x] GET /api/projects/:id/files/:filename reads from .planning/ and returns markdown
- [x] File endpoint rejects path traversal
- [x] File endpoint returns 404 for missing files

---

### Task 2: API Client Types + Memory Endpoints [x]

**Goal:** Add TypeScript interfaces and API client methods for memory and project file endpoints.

**Files:**
- dashboard-web/src/api/endpoints.ts

---

### Task 3: useMemory Hook [x]

**Goal:** Data fetching hook for memory decisions, gotchas, and stats.

**Files:**
- dashboard-web/src/hooks/useMemory.ts (new)
- dashboard-web/src/hooks/useMemory.test.ts (new)

---

### Task 4: useProjectFiles Hook [x]

**Goal:** Hook for fetching project documentation files.

**Files:**
- dashboard-web/src/hooks/useProjectFiles.ts (new)
- dashboard-web/src/hooks/useProjectFiles.test.ts (new)

---

### Task 5: MemoryPage Component [x]

**Goal:** Page showing decisions, gotchas, and memory search.

**Files:**
- dashboard-web/src/pages/MemoryPage.tsx (new)
- dashboard-web/src/pages/MemoryPage.test.tsx (new)

---

### Task 6: ProjectInfoPage Component [x]

**Goal:** Page rendering project documentation as formatted content.

**Files:**
- dashboard-web/src/pages/ProjectInfoPage.tsx (new)
- dashboard-web/src/pages/ProjectInfoPage.test.tsx (new)

---

### Task 7: Wire Tabs + Routes [x]

**Goal:** Add Memory and Project Info tabs to ProjectDetailPage and routes to App.tsx.

**Files:**
- dashboard-web/src/pages/ProjectDetailPage.tsx (modify)
- dashboard-web/src/App.tsx (modify)
- dashboard-web/src/pages/index.ts (modify)

---

### Task 8: Memory Search with Debounce [x]

**Goal:** Add semantic search with debounced input to MemoryPage.

**Files:**
- dashboard-web/src/hooks/useMemorySearch.ts (new)
- dashboard-web/src/hooks/useMemorySearch.test.ts (new)
- dashboard-web/src/pages/MemoryPage.tsx (modify)

---

### Task 9: Fix Coverage Display in Project Cards [x]

**Goal:** Fix 0% coverage bug. readProjectStatus never sets coverage. ProjectCard shows undefined as 0%.

**Files:**
- server/lib/workspace-api.js (modify readProjectStatus)
- server/lib/workspace-api.test.js (add tests)
- dashboard-web/src/components/project/ProjectCard.tsx (handle undefined)

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 2 | useMemory needs API client methods |
| 4 | 2 | useProjectFiles needs API client methods |
| 5 | 3 | MemoryPage needs useMemory hook |
| 6 | 4 | ProjectInfoPage needs useProjectFiles hook |
| 7 | 5, 6 | Routes need page components |
| 8 | 5 | Search adds to MemoryPage |
| 9 | - | Independent bug fix |

## Estimated Scope

- Tasks: 9
- Files: ~18
- Tests: ~70
