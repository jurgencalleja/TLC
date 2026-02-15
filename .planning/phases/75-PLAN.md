# Phase 75: Dashboard Project Understanding — Plan

## Overview

Fix the dashboard to give good project understanding without CLI. The dashboard currently shows basic stats (phase count, test numbers) but lacks the depth needed for an LLM or developer to understand a project at a glance. This phase enriches the server-side data extraction to deliver:

1. **Full roadmap** — every milestone, phase, goal, deliverables, with per-phase task/test/verified status
2. **Testing suite** — all test files across the project with counts, pass/fail, recent run results
3. **Project overview** — Kasha-style project page with at-a-glance health

**Inspired by:**
- Kasha Platform's `ROADMAP.md` — milestones, phases with goals and deliverables, `[x]` / `[>]` markers
- Kasha's `COVERAGE-REPORT.md` — per-service test file inventory with risk levels
- OpenClaw's overview page — information-dense stat cards, status chips, progressive disclosure

**Scope:** Focus on project scoping and building visibility — NOT cosmetic UI polish.

## Prerequisites

- [x] Phase 70: Workspace dashboard (project discovery, routing, stores)
- [x] Phase 74 Task 1: Memory API endpoints (server-side)

## Tasks

### Task 1: Enrich Project Status API [ ]

**Goal:** New `project-status.js` module that extracts comprehensive project data from the filesystem. Full roadmap parsing — milestones, per-phase goals/deliverables/status, per-phase task counts, test file inventory, git activity.

**Files:**
- `server/lib/project-status.js` (new)
- `server/lib/project-status.test.js` (new)

**Acceptance Criteria:**
- [ ] `getFullStatus(projectPath)` returns complete project picture
- [ ] **Roadmap structure:** `{ milestones[{ name, phases[] }] }` — groups phases under milestones
- [ ] Each phase: `{ number, name, goal, status (done|in_progress|pending), deliverables[], taskCount, completedTaskCount, testCount, testFileCount, hasTests, verified }`
- [ ] `goal` extracted from `**Goal:**` line in ROADMAP.md
- [ ] `deliverables[]` extracted from `- [x]` / `- [ ]` lists under each phase
- [ ] Parses heading format (`### Phase N: Name [x]`) with `✓ COMPLETE` suffixes
- [ ] Reads each phase's `-PLAN.md` for task count and per-task status
- [ ] Reads each phase's `-TESTS.md` for test file count and total test count
- [ ] Reads each phase's `-VERIFIED.md` for verification status
- [ ] `testSummary`: `{ totalFiles, totalTests, passingTests, failingTests }` — aggregated from TESTS.md files
- [ ] `recentCommits[]`: last 15 git commits (hash, message, date, author) via `git log`
- [ ] `projectInfo`: name, version, description from package.json + PROJECT.md first paragraph
- [ ] Works for projects with no `.planning/` (returns minimal info)
- [ ] Handles malformed ROADMAP.md gracefully

**Test Cases:**
- Full roadmap parsed with milestones grouping phases
- Phase goals extracted from ROADMAP.md
- Phase deliverables extracted as arrays
- Phase task counts from PLAN.md files
- TESTS.md test counts parsed (total tests, file count)
- VERIFIED.md presence detected per phase
- Recent commits extracted via git log
- Project info from package.json and PROJECT.md
- Graceful fallback for missing .planning directory
- Handles heading format with status suffixes
- Empty roadmap returns zero phases
- Milestone boundary correctly separates phases

---

### Task 2: Test Suite Inventory API [ ]

**Goal:** New `test-inventory.js` module that discovers all test files in a project, counts tests per file, and optionally runs the suite to get pass/fail results. Produces a Kasha-style coverage report view.

**Files:**
- `server/lib/test-inventory.js` (new)
- `server/lib/test-inventory.test.js` (new)

**Acceptance Criteria:**
- [ ] `getTestInventory(projectPath)` discovers all test files (`*.test.js`, `*.test.ts`, `*.test.tsx`, `*.spec.*`)
- [ ] Groups test files by directory (e.g., `server/lib/`, `dashboard-web/src/`)
- [ ] Per-file: `{ path, relativePath, testCount, group }`
- [ ] `testCount` extracted by counting `it(` / `test(` occurrences in file
- [ ] Summary: `{ totalFiles, totalTests, groups[{ name, fileCount, testCount }] }`
- [ ] `getLastTestRun(projectPath)` reads cached test output if available (from `.tlc/` or vitest output)
- [ ] Groups sorted by test count descending
- [ ] Handles projects with no test files (returns empty inventory)
- [ ] Ignores `node_modules/`, `dist/`, `.git/`

**Test Cases:**
- Discovers test files by glob patterns
- Groups files by directory
- Counts tests per file (it/test occurrences)
- Summary totals are correct
- Groups sorted by test count descending
- Ignores node_modules and dist
- Returns empty inventory for no test files
- Handles mixed extensions (.test.js, .test.ts, .test.tsx)
- Handles spec files (.spec.js)
- Works with nested directory structures

---

### Task 3: Roadmap & Test Suite API Endpoints [ ]

**Goal:** REST endpoints that serve the enriched project data and test inventory to the dashboard.

**Files:**
- `server/lib/workspace-api.js` (modified — add endpoints)
- `server/lib/workspace-api.test.js` (modified — add endpoint tests)

**Acceptance Criteria:**
- [ ] `GET /api/projects/:id/roadmap` returns full roadmap with milestones, phases, tasks, deliverables
- [ ] `GET /api/projects/:id/tests` returns test inventory with groups and counts
- [ ] `GET /api/projects/:id/tasks?phase=all` returns tasks across ALL phases (not just current)
- [ ] `POST /api/projects/:id/tests/run` triggers test suite execution (async, returns immediately)
- [ ] Existing `/api/projects/:id/status` remains backward compatible
- [ ] Roadmap response cached for 30 seconds
- [ ] Test inventory response cached for 60 seconds

**Test Cases:**
- Roadmap endpoint returns milestones with phases
- Test inventory endpoint returns grouped files
- All-phases task query returns tasks from multiple phases
- Test run endpoint triggers execution
- Status endpoint still returns backward-compatible response
- Cache returns same data within TTL
- Unknown project ID returns 404
- Project without roadmap returns empty phases array

---

### Task 4: Dashboard API Client & Hooks [ ]

**Goal:** Frontend API client additions and Zustand store updates for the enriched project data. Hooks: `useRoadmap()` and `useTestSuite()`.

**Files:**
- `dashboard-web/src/api/endpoints.ts` (modified — add roadmap + test endpoints)
- `dashboard-web/src/stores/project.store.ts` (modified — add roadmap and test state)
- `dashboard-web/src/hooks/useRoadmap.ts` (new)
- `dashboard-web/src/hooks/useRoadmap.test.ts` (new)
- `dashboard-web/src/hooks/useTestSuite.ts` (new)
- `dashboard-web/src/hooks/useTestSuite.test.ts` (new)

**Acceptance Criteria:**
- [ ] `api.projects.getRoadmap(id)` calls roadmap endpoint
- [ ] `api.projects.getTestInventory(id)` calls test inventory endpoint
- [ ] `api.projects.runTests(id)` triggers test run
- [ ] `useRoadmap(projectId)` returns `{ roadmap, loading, error, refresh }`
- [ ] `useTestSuite(projectId)` returns `{ inventory, loading, error, refresh, runTests }`
- [ ] Both hooks auto-fetch when projectId changes
- [ ] Both handle loading and error states

**Test Cases:**
- useRoadmap fetches on mount
- useRoadmap re-fetches when projectId changes
- useRoadmap loading/error states
- useTestSuite fetches inventory on mount
- useTestSuite re-fetches when projectId changes
- useTestSuite loading/error states
- useTestSuite runTests triggers API call
- Both return null when no projectId

---

### Task 5: Project Overview Page [ ]

**Goal:** Rewrite DashboardPage as a Kasha-style project overview. Three sections: project header with stats, full roadmap with expandable phases, and recent activity.

**Files:**
- `dashboard-web/src/pages/DashboardPage.tsx` (modified — major rewrite)
- `dashboard-web/src/pages/DashboardPage.test.tsx` (modified — updated tests)

**Acceptance Criteria:**
- [ ] **Header:** project name, version, description (from PROJECT.md), current phase name, git branch
- [ ] **Stat cards row:** Phases (completed/total), Tests (passing/total), Test Files count, Current Phase number
- [ ] **Full Roadmap section:** milestone headers, then phases listed under each milestone
- [ ] Each phase row: number, name, status chip (done ✓ green / in-progress → blue / pending ○ gray), task fraction (e.g., "5/5"), test count, verified badge
- [ ] Current/in-progress phase visually highlighted (left border accent)
- [ ] **Click phase** → expands to show: goal, deliverables checklist, task list with status
- [ ] **Recent Activity section:** last 15 commits with short hash, message, relative time
- [ ] Keeps existing empty state for no project selected
- [ ] Keeps existing non-TLC project banner
- [ ] Responsive: single column on mobile, two columns on desktop (roadmap left, activity right)

**Test Cases:**
- Renders project name and version and description
- Shows stat cards with correct numbers
- Milestone headers rendered
- Phase list shows all phases with correct status chips
- Current phase highlighted with accent
- Click phase expands to show goal and deliverables
- Deliverables show checkmark for completed items
- Task list shown in expanded phase
- Recent commits displayed with short hash and relative time
- Empty state shown when no project
- Non-TLC banner for projects without .planning
- Loading skeleton while fetching

---

### Task 6: Test Suite Page [ ]

**Goal:** New `/tests` page showing the full test inventory — all test files grouped by directory, test counts, and the ability to trigger a test run. Kasha COVERAGE-REPORT style.

**Files:**
- `dashboard-web/src/pages/TestSuitePage.tsx` (new)
- `dashboard-web/src/pages/TestSuitePage.test.tsx` (new)

**Acceptance Criteria:**
- [ ] Route: `/tests` (global) or `/projects/:id/tests` (per-project)
- [ ] **Summary bar:** total test files, total tests, groups count
- [ ] **Groups table:** directory name, file count, test count — sorted by test count desc
- [ ] Click group to expand → shows individual test files with their test counts
- [ ] **Run Tests button:** triggers `POST /api/projects/:id/tests/run`, shows spinner
- [ ] Status chip per group: green if known passing, gray if unknown
- [ ] Added to sidebar navigation (TestTube icon)
- [ ] Empty state: "No test files found" with guidance
- [ ] Search/filter test files by name

**Test Cases:**
- Renders summary bar with totals
- Groups table shows directories with counts
- Click group expands to show files
- Run Tests button triggers API call
- Sidebar shows Tests link
- Empty state when no test files
- Search filters file list
- Groups sorted by test count descending
- Per-project route scopes to project
- Loading state while fetching

---

### Task 7: Sidebar & Routing Updates [ ]

**Goal:** Add Tests page to sidebar navigation and ensure all new routes work with the existing project-scoped routing.

**Files:**
- `dashboard-web/src/components/layout/Sidebar.tsx` (modified)
- `dashboard-web/src/App.tsx` (modified — add route)

**Acceptance Criteria:**
- [ ] Sidebar shows "Tests" item with TestTube icon between Tasks and Logs
- [ ] Route `/tests` and `/projects/:id/tests` both render TestSuitePage
- [ ] Active state highlights correctly when on tests page
- [ ] Mobile navigation includes Tests

**Test Cases:**
- Sidebar renders Tests link
- Tests link navigates to /tests
- Active state on tests page
- Project-scoped route works
- Mobile nav includes Tests

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | — | Independent (server-side roadmap extraction) |
| 2 | — | Independent (server-side test inventory) |
| 3 | 1, 2 | Endpoint uses both new modules |
| 4 | 3 | Frontend calls the new endpoints |
| 5 | 4 | Page uses the new hooks |
| 6 | 4 | Page uses the new hooks |
| 7 | 5, 6 | Routing for the new pages |

**Parallel groups:**
- Group A: Tasks 1, 2 (independent server modules)
- Group B: Task 3 (after Group A)
- Group C: Task 4 (after Task 3)
- Group D: Tasks 5, 6 (after Task 4, independent of each other)
- Group E: Task 7 (after Group D)

## Estimated Scope

- Tasks: 7
- New files: 10 (4 server + 6 dashboard)
- Modified files: 5 (workspace-api.js, endpoints.ts, project.store.ts, DashboardPage.tsx, Sidebar.tsx, App.tsx)
- Tests: ~77 (estimated: 12 + 10 + 8 + 8 + 12 + 10 + 5 + existing test updates)
