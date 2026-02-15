# Phase 76: Dashboard That Actually Works — Plan

## Overview

Fix every broken page, rewire navigation to workspace-first, add write operations (create/edit tasks and bugs), and deliver full drill-down depth on phases and tasks. After this phase, a PO or QA can open the dashboard and understand the entire project without touching a CLI.

**Scope boundary:** This phase makes everything *work*. Phase 77 (future) adds polish: deep link protocol, inline phase creation, client mode, and advanced QA workflows.

## Prerequisites

- [x] Phase 75: Dashboard Project Understanding (APIs exist)
- [x] Phase 70: Workspace dashboard (project discovery, routing, stores)
- [x] Server running with `TLC_AUTH=false node server/index.js --skip-db`

## Tasks

### Task 1: Fix Route Mismatches & Blank Pages [x]

**Goal:** Every sidebar link renders a working page. Zero blank screens. Fix the test-suite route mismatch and ensure all pages have proper error boundaries with fallback UI.

**Files:**
- `dashboard-web/src/App.tsx` (modify — fix routes)
- `dashboard-web/src/components/layout/Sidebar.tsx` (modify — fix nav hrefs)
- `dashboard-web/src/pages/SettingsPage.tsx` (modify — ensure renders)
- `dashboard-web/src/pages/TeamPage.tsx` (modify — render git authors + activity)
- `dashboard-web/src/pages/HealthPage.tsx` (modify — render health data from API)
- `dashboard-web/src/pages/ClientDashboard.tsx` (modify — wire into router)
- `dashboard-web/src/pages/PreviewPage.tsx` (modify — fix default state)
- `dashboard-web/src/components/ErrorBoundary.tsx` (modify — per-page fallback)

**Acceptance Criteria:**
- [ ] Sidebar "Tests" link matches the TestSuitePage route (`/test-suite` → consistent)
- [ ] SettingsPage renders theme toggle and config panel (not blank)
- [ ] TeamPage renders git authors from changelog API with commit counts
- [ ] HealthPage renders server health data (uptime, memory, app status)
- [ ] PreviewPage shows helpful empty state with setup instructions (not just "No preview")
- [ ] ClientDashboard accessible via `/client` route
- [ ] Every page wrapped in ErrorBoundary with retry button (not blank on error)
- [ ] Console has zero unhandled errors on any page navigation

**Test Cases:**
- Each page route renders without crash
- Error boundary catches API failures and shows retry UI
- Settings page renders theme toggle
- Team page renders at least one git author
- Health page shows uptime and memory stats
- Sidebar active state matches current route
- Route mismatch between sidebar and page is fixed

---

### Task 2: Workspace-First Navigation [x]

**Goal:** Replace flat 48-repo project list with workspace-first navigation. Landing page shows workspaces (Kasha-Platform, TLC, Cyberpayments). Clicking a workspace shows its repos as filterable cards.

**Files:**
- `server/lib/workspace-api.js` (modify — add workspace grouping endpoint)
- `server/lib/workspace-api.test.js` (modify — add tests)
- `dashboard-web/src/pages/ProjectsPage.tsx` (modify — workspace-first view)
- `dashboard-web/src/pages/ProjectsPage.test.tsx` (new)
- `dashboard-web/src/hooks/useWorkspaces.ts` (new)
- `dashboard-web/src/hooks/useWorkspaces.test.ts` (new)
- `dashboard-web/src/api/endpoints.ts` (modify — add workspace grouping)

**Acceptance Criteria:**
- [ ] `GET /api/workspace/groups` returns projects grouped by parent directory
- [ ] Groups: `{ name: "Kasha-Platform", path: "...", repos: [...], hasTlc: true, repoCount: 33 }`
- [ ] Landing page shows workspace cards (not individual repos)
- [ ] Each workspace card shows: name, repo count, TLC status, current phase
- [ ] Click workspace → shows filterable card grid of its repos
- [ ] Filter by: All / TLC initialized / Has tests / Backend / Frontend
- [ ] Sort by: Name / Recent activity / Test count / Coverage
- [ ] Single-repo workspaces (like TLC itself) go directly to project detail
- [ ] Breadcrumb navigation: Workspaces > Kasha-Platform > lr-admin-service

**Test Cases:**
- Workspace grouping endpoint groups projects by parent directory
- Single-project directories treated as standalone workspace
- Workspace card renders name and repo count
- Click workspace shows repo grid
- Filter toggles correctly reduce visible repos
- Sort changes repo order
- Breadcrumb shows correct hierarchy
- Empty workspace shows guidance message

---

### Task 3: Tabbed Project Detail Page [x]

**Goal:** When a project is selected, show a tabbed detail page instead of the current single-page dashboard. Tabs: Overview | Roadmap | Tasks | Tests | Logs. Each tab loads its own data.

**Files:**
- `dashboard-web/src/pages/ProjectDetailPage.tsx` (new)
- `dashboard-web/src/pages/ProjectDetailPage.test.tsx` (new)
- `dashboard-web/src/components/layout/TabBar.tsx` (new)
- `dashboard-web/src/components/layout/TabBar.test.tsx` (new)
- `dashboard-web/src/App.tsx` (modify — add tabbed route)

**Acceptance Criteria:**
- [ ] Project detail has horizontal tab bar: Overview | Roadmap | Tasks | Tests | Logs
- [ ] Tab state persisted in URL (`/projects/:id/roadmap`, `/projects/:id/tasks`, etc.)
- [ ] Overview tab shows: project name, version, stat cards (phases, tests, coverage), recent commits
- [ ] Active tab visually highlighted
- [ ] Tab content lazy-loaded (no fetching all data upfront)
- [ ] Mobile: tabs become scrollable horizontal strip
- [ ] Tab bar sticks below header on scroll

**Test Cases:**
- Tab bar renders all 5 tabs
- Click tab changes URL and content
- Active tab has visual indicator
- Overview tab shows project stats
- Tab state survives page refresh
- Mobile viewport makes tabs scrollable

---

### Task 4: Roadmap Drill-Down Page [x]

**Goal:** Full milestone/phase tree with expandable phases showing goal, deliverables, tasks, test results, and verified status. Click a phase to see everything about it. This replaces the flat phase list on the current DashboardPage.

**Files:**
- `dashboard-web/src/pages/RoadmapPage.tsx` (new)
- `dashboard-web/src/pages/RoadmapPage.test.tsx` (new)
- `dashboard-web/src/components/roadmap/PhaseDetail.tsx` (new)
- `dashboard-web/src/components/roadmap/PhaseDetail.test.tsx` (new)

**Acceptance Criteria:**
- [ ] Roadmap grouped by milestone headers (v1.0, v1.1, v1.2, etc.)
- [ ] Each phase row: number, name, status chip (done/in-progress/pending), task fraction, test count
- [ ] Click phase → expands inline to show:
  - Goal paragraph
  - Deliverables checklist (done/pending)
  - Task list with status, assignee, acceptance criteria preview
  - Discussion summary (key decisions table from DISCUSSION.md, if exists)
  - Verified badge with date (from VERIFIED.md)
- [ ] Current/in-progress phase highlighted with accent border
- [ ] Collapse/expand all button
- [ ] Phase progress bar (tasks completed / total)
- [ ] "Plan this phase" action on phases without PLAN.md

**Test Cases:**
- Milestones render as section headers
- Phases render under correct milestone
- Status chips show correct color/icon per status
- Click phase expands detail section
- Detail shows goal, deliverables, tasks
- Deliverables show check/uncheck icons
- Task list shows assignee and status
- Discussion summary renders as key decisions table
- Verified badge shown when VERIFIED.md exists
- Collapse all button collapses expanded phases
- Phase without PLAN.md shows "Plan this phase" CTA

---

### Task 5: Task CRUD API (Server) [x]

**Goal:** Server endpoints that persist task changes back to PLAN.md files. Create, update status, update content, claim/release tasks.

**Files:**
- `server/lib/plan-writer.js` (new)
- `server/lib/plan-writer.test.js` (new)
- `server/lib/workspace-api.js` (modify — add write endpoints)
- `server/lib/workspace-api.test.js` (modify — add endpoint tests)

**Acceptance Criteria:**
- [ ] `plan-writer.js` module with: `updateTaskStatus(planPath, taskNum, newStatus, owner)`
- [ ] `updateTaskContent(planPath, taskNum, { title, acceptanceCriteria })`
- [ ] `createTask(planPath, { title, goal, acceptanceCriteria, testCases })`
- [ ] Status update changes `[ ]` → `[>@user]` → `[x@user]` in PLAN.md heading
- [ ] Content update preserves surrounding markdown structure
- [ ] Create appends new task section at end of Tasks section
- [ ] `PUT /api/workspace/projects/:id/tasks/:taskNum/status` — update task status
- [ ] `PUT /api/workspace/projects/:id/tasks/:taskNum` — update task content
- [ ] `POST /api/workspace/projects/:id/tasks` — create new task
- [ ] All writes are atomic (write to temp file, then rename)
- [ ] WebSocket broadcast after each write (`task-updated`, `task-created`)

**Test Cases:**
- updateTaskStatus changes `[ ]` to `[>@alice]` in heading
- updateTaskStatus changes `[>@alice]` to `[x@alice]` in heading
- updateTaskContent preserves other tasks in file
- updateTaskContent updates acceptance criteria list
- createTask appends new task with correct format
- createTask generates next task number
- PUT endpoint returns updated task
- POST endpoint returns created task with assigned number
- Write is atomic (temp file + rename)
- WebSocket broadcasts after write
- Invalid task number returns 404
- Malformed PLAN.md doesn't crash (graceful error)

---

### Task 6: Bug CRUD API (Server) [x]

**Goal:** Complete bug lifecycle — create (already works), update status, update content, upload standalone screenshots.

**Files:**
- `server/lib/bug-writer.js` (new)
- `server/lib/bug-writer.test.js` (new)
- `server/lib/workspace-api.js` (modify — add bug write endpoints)
- `server/lib/workspace-api.test.js` (modify — add endpoint tests)

**Acceptance Criteria:**
- [ ] `bug-writer.js` module with: `updateBugStatus(bugsPath, bugId, newStatus)`
- [ ] `updateBugContent(bugsPath, bugId, { title, severity, description })`
- [ ] `PUT /api/workspace/projects/:id/bugs/:bugId/status` — change open/closed/fixed
- [ ] `PUT /api/workspace/projects/:id/bugs/:bugId` — update bug content
- [ ] `POST /api/workspace/projects/:id/screenshots` — upload screenshot (returns URL)
- [ ] Screenshot saved to `.planning/screenshots/` with unique filename
- [ ] Screenshot resized to max 1920px width, max 2MB
- [ ] Status update changes `[open]` → `[fixed]` or `[closed]` in BUGS.md heading
- [ ] WebSocket broadcast after each write (`bug-updated`)

**Test Cases:**
- updateBugStatus changes `[open]` to `[fixed]` in heading
- updateBugStatus changes `[open]` to `[closed]`
- updateBugContent updates severity line
- Screenshot upload saves to .planning/screenshots/
- Screenshot upload returns URL path
- Screenshot respects max size
- PUT status endpoint returns updated bug
- PUT content endpoint returns updated bug
- Invalid bug ID returns 404
- WebSocket broadcasts after bug update

---

### Task 7: Tasks Page — Full Kanban with Detail Panel [x]

**Goal:** Kanban board that shows real task data with full detail. Click a task card → side panel shows goal, acceptance criteria, test cases, assignee, and edit controls.

**Files:**
- `dashboard-web/src/pages/TasksPage.tsx` (modify — major rewrite)
- `dashboard-web/src/pages/TasksPage.test.tsx` (modify — updated tests)
- `dashboard-web/src/components/tasks/TaskDetailPanel.tsx` (new)
- `dashboard-web/src/components/tasks/TaskDetailPanel.test.tsx` (new)
- `dashboard-web/src/components/tasks/TaskCreateForm.tsx` (new)
- `dashboard-web/src/components/tasks/TaskCreateForm.test.tsx` (new)
- `dashboard-web/src/hooks/useTasks.ts` (modify — add create/update mutations)
- `dashboard-web/src/hooks/useTasks.test.ts` (modify)

**Acceptance Criteria:**
- [ ] Kanban columns: To Do | In Progress | Done
- [ ] Task cards show: title, phase number, priority badge, assignee avatar, test count
- [ ] Click task card → opens detail panel (right side slide-in)
- [ ] Detail panel shows: title, goal, full acceptance criteria checklist, test cases, assignee, phase
- [ ] "Claim" button on unclaimed tasks → calls PUT status API
- [ ] "Complete" button on claimed tasks → calls PUT status API
- [ ] "Edit" button → inline edit mode for title, acceptance criteria
- [ ] "Create Task" button → form with title, goal, acceptance criteria, test cases
- [ ] Create form submits via POST API → task appears in To Do column
- [ ] Phase selector dropdown to view tasks from different phases (not just current)
- [ ] Empty state: "No tasks yet" with "Create Task" CTA

**Test Cases:**
- Kanban renders three columns
- Task cards show correct data (title, phase, priority)
- Click card opens detail panel
- Detail panel shows acceptance criteria as checklist
- Claim button calls API and moves card to In Progress
- Complete button calls API and moves card to Done
- Edit mode allows inline changes
- Create form validates required fields
- Create form submits and adds task to board
- Phase selector changes which tasks are shown
- Empty state shows create CTA

---

### Task 8: Bug Report Page with Form [x]

**Goal:** New Bugs page with bug list and create form. QA can file bugs with title, severity, steps to reproduce, screenshot, and optional URL.

**Files:**
- `dashboard-web/src/pages/BugsPage.tsx` (new)
- `dashboard-web/src/pages/BugsPage.test.tsx` (new)
- `dashboard-web/src/components/bugs/BugForm.tsx` (new)
- `dashboard-web/src/components/bugs/BugForm.test.tsx` (new)
- `dashboard-web/src/components/bugs/BugCard.tsx` (new)
- `dashboard-web/src/components/bugs/BugCard.test.tsx` (new)
- `dashboard-web/src/hooks/useBugs.ts` (new)
- `dashboard-web/src/hooks/useBugs.test.ts` (new)
- `dashboard-web/src/App.tsx` (modify — add /bugs route)
- `dashboard-web/src/components/layout/Sidebar.tsx` (modify — add Bugs nav item)

**Acceptance Criteria:**
- [ ] Bug list shows all bugs with: ID, title, severity badge, status chip, reported date
- [ ] Filter by status: All / Open / Fixed / Closed
- [ ] Sort by: Recent / Severity / Status
- [ ] Click bug → expands to show full description, steps, screenshot, URL
- [ ] "Close" / "Fixed" buttons on bug detail → calls PUT status API
- [ ] "Report Bug" button → opens form
- [ ] Bug form fields: title (required), severity (dropdown), steps to reproduce (textarea), screenshot (file upload), URL (optional)
- [ ] Screenshot preview shown before submit
- [ ] Form submits via POST API → bug appears in list
- [ ] "Discuss in CLI" button on bug detail (copies `tlc://` deep link to clipboard for now)
- [ ] Sidebar shows "Bugs" with count badge for open bugs

**Test Cases:**
- Bug list renders bugs with correct data
- Severity badges show correct color (critical=red, high=orange, medium=yellow, low=blue)
- Filter toggles reduce visible bugs
- Click bug expands to show description and screenshot
- Close button calls status API
- Report Bug button opens form
- Form validates required fields (title, severity)
- Screenshot upload shows preview
- Form submit calls API and adds bug to list
- Sidebar bug count badge updates
- Empty state shown when no bugs

---

### Task 9: Tests Page — Working Inventory [x]

**Goal:** Fix the TestSuitePage to render the test inventory grouped by directory. Show test file counts, total tests, and "Run Tests" button.

**Files:**
- `dashboard-web/src/pages/TestSuitePage.tsx` (modify — fix rendering)
- `dashboard-web/src/pages/TestSuitePage.test.tsx` (modify — fix tests)

**Acceptance Criteria:**
- [ ] Summary bar: total test files, total tests, groups count
- [ ] Groups table: directory name, file count, test count — sorted by test count desc
- [ ] Click group → expand to show individual test files with test counts
- [ ] "Run Tests" button triggers POST API, shows spinner while running
- [ ] Last run results shown if available (passed/failed counts)
- [ ] Search/filter test files by name
- [ ] Empty state: "No test files found" with guidance

**Test Cases:**
- Summary bar shows correct totals
- Groups render sorted by test count descending
- Click group expands file list
- Run Tests button triggers API and shows spinner
- Search filters file list
- Empty state shown for projects with no tests
- Last run results display pass/fail counts

---

### Task 10: System Theme & Polish [x]

**Goal:** System theme preference (auto dark/light), fix the project selector dropdown in the toolbar, and ensure responsive layout works on tablet.

**Files:**
- `dashboard-web/src/hooks/useTheme.ts` (modify — add system preference)
- `dashboard-web/src/hooks/useTheme.test.ts` (modify)
- `dashboard-web/src/styles/tokens.css` (modify — light theme tokens)
- `dashboard-web/src/components/layout/Shell.tsx` (modify — responsive fixes)

**Acceptance Criteria:**
- [ ] Theme options: System (default) / Dark / Light
- [ ] System mode follows `prefers-color-scheme` media query
- [ ] Light theme has proper contrast (not just inverted dark)
- [ ] Theme preference saved to localStorage
- [ ] Project selector dropdown in toolbar works and shows current project name
- [ ] Layout doesn't break on tablet (768px-1024px)
- [ ] Sidebar collapses to icons on tablet width

**Test Cases:**
- System theme follows media query
- Dark theme applies dark tokens
- Light theme applies light tokens
- Theme preference persists across sessions
- Project selector shows project list
- Selecting project navigates to project detail
- Layout responsive at 768px breakpoint

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | — | Independent (route/page fixes) |
| 2 | — | Independent (navigation restructure) |
| 3 | 2 | Tabbed detail lives inside workspace navigation |
| 4 | 3 | Roadmap is a tab within project detail |
| 5 | — | Independent (server-side, no frontend) |
| 6 | — | Independent (server-side, no frontend) |
| 7 | 5 | Tasks page needs write API to be functional |
| 8 | 6 | Bugs page needs write API to be functional |
| 9 | 1 | Needs route fix from Task 1 |
| 10 | 1 | Needs pages working to apply theme |

**Parallel groups:**
- Group A: Tasks 1, 2, 5, 6 (all independent — server + frontend in parallel)
- Group B: Tasks 3, 9 (after Task 1 or 2)
- Group C: Tasks 4, 7, 8 (after Group B + server tasks)
- Group D: Task 10 (after everything else)

## Deferred to Phase 77

- `tlc://` deep link protocol registration
- Inline phase creation from dashboard
- Client mode (simplified external stakeholder view)
- Task drag-and-drop between columns
- Advanced QA workflows (test review, scenario requests)
- Comment threads on tasks/bugs
- Real-time collaborative editing
- Notification system

## Estimated Scope

- Tasks: 10
- New files: ~20 (10 components + 10 tests)
- Modified files: ~15
- Tests: ~110 (estimated: 7+8+6+11+12+10+11+11+7+7 + existing updates)
