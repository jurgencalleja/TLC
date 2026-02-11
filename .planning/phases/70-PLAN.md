# Phase 70: Workspace-Level Dashboard - Plan

## Overview

Transform the TLC dashboard from single-project to multi-project workspace mode. Users configure root folder(s) via the dashboard UI on first launch; TLC recursively discovers all projects and displays them in a grid with drill-down detail views. Configuration persists across restarts via `~/.tlc/config.json`.

## Prerequisites

- [x] v1.8.5 deployed with table-format roadmap parsing
- [x] Existing `workspace-config.js` and `workspace-scanner.js` modules
- [x] Dashboard `ProjectGrid`/`ProjectCard` already support multiple projects
- [x] `useProjects()` hook returns array (currently wraps single project)

## Tasks

### Task 1: Global TLC Config Module [ ]

**Goal:** Persistent global configuration at `~/.tlc/config.json` that stores workspace root paths and survives reinstalls.

**Files:**
- `server/lib/global-config.js` (new)
- `server/lib/global-config.test.js` (new)

**Acceptance Criteria:**
- [ ] Reads/writes `~/.tlc/config.json` (XDG-aware: `$TLC_CONFIG_DIR` or `~/.tlc/`)
- [ ] Stores `roots` array of absolute folder paths
- [ ] Stores `lastScan` timestamp per root
- [ ] Stores `scanDepth` (default 5)
- [ ] Creates directory and file if not exists
- [ ] `addRoot(path)` validates path exists and is a directory
- [ ] `removeRoot(path)` removes a root path
- [ ] `getRoots()` returns all configured roots
- [ ] `isConfigured()` returns false when no roots set
- [ ] Atomic writes (write to temp file, rename) to prevent corruption
- [ ] Thread-safe for concurrent reads

**Test Cases:**
- Creates `~/.tlc/` directory if not exists
- Creates config file with defaults on first access
- Adds root path and persists to disk
- Rejects non-existent directory path
- Rejects file path (must be directory)
- Removes root path
- Returns empty roots when not configured
- `isConfigured()` returns false with no roots
- `isConfigured()` returns true with roots
- Respects `$TLC_CONFIG_DIR` environment variable
- Handles corrupted JSON gracefully (resets to defaults)
- Atomic write prevents partial file corruption
- Multiple roots supported (work + personal)
- Duplicate root paths rejected
- Config schema has version field for future migrations

---

### Task 2: Workspace Project Scanner [ ]

**Goal:** Recursively discover TLC projects within configured root paths, returning structured project metadata.

**Files:**
- `server/lib/project-scanner.js` (new)
- `server/lib/project-scanner.test.js` (new)

**Acceptance Criteria:**
- [ ] Scans root directories recursively up to configurable depth
- [ ] Detects TLC projects by `.tlc.json` presence
- [ ] Detects potential projects by `.planning/` directory
- [ ] Detects candidate projects by `package.json` + `.git/` (marked as "not initialized")
- [ ] Skips `node_modules`, `.git`, `dist`, `build`, `coverage`, `vendor`, `.next`, `.nuxt`
- [ ] Returns project metadata: name, path, version, phase, phaseName, totalPhases, completedPhases, hasTlc, hasPlanning
- [ ] Caches scan results with configurable TTL (default 60s)
- [ ] Supports forced re-scan bypassing cache
- [ ] Handles permission errors gracefully (skip directory, log warning)
- [ ] Scan completes in <5s for typical setups (100 projects)
- [ ] Returns projects sorted by name

**Test Cases:**
- Discovers project with `.tlc.json`
- Discovers project with `.planning/` directory (no `.tlc.json`)
- Discovers candidate project with `package.json` + `.git/` (marked `hasTlc: false`)
- Skips `node_modules` directories
- Skips all ignored directories (dist, build, coverage, etc.)
- Respects depth limit (default 5)
- Depth 1 only scans immediate children
- Returns empty array for empty root directory
- Handles multiple root paths
- Deduplicates projects found in overlapping roots
- Caches results on repeated calls within TTL
- Force re-scan bypasses cache
- Handles permission denied errors gracefully
- Returns project metadata (name, version, phase from package.json/ROADMAP.md)
- Reads phase info from ROADMAP.md (heading format)
- Reads phase info from ROADMAP.md (table format)
- Projects sorted alphabetically by name
- Handles root path that doesn't exist (returns empty, logs warning)
- Scan progress callback reports discovered count

---

### Task 3: Workspace REST API Endpoints [ ]

**Goal:** Server-side HTTP endpoints for workspace configuration and project listing.

**Files:**
- `server/lib/workspace-api.js` (new)
- `server/lib/workspace-api.test.js` (new)
- `server/index.js` (modified — mount workspace routes)

**Acceptance Criteria:**
- [ ] `GET /api/workspace/config` — returns current workspace config (roots, scanDepth, lastScan)
- [ ] `POST /api/workspace/config` — sets root paths `{ roots: ["/path/..."] }`
- [ ] `DELETE /api/workspace/roots/:index` — removes a root by index
- [ ] `POST /api/workspace/scan` — triggers re-scan, returns project list
- [ ] `GET /api/projects` — returns all discovered projects with metadata
- [ ] `GET /api/projects/:projectId` — returns full detail for one project (replaces current `/api/project`)
- [ ] `GET /api/projects/:projectId/status` — returns status for one project
- [ ] `GET /api/projects/:projectId/tasks` — returns tasks for one project
- [ ] `GET /api/projects/:projectId/bugs` — returns bugs for one project
- [ ] Project ID is base64-encoded relative path (URL-safe)
- [ ] Backward compatible: existing `/api/project` and `/api/status` still work (return first/default project)
- [ ] Returns 404 for unknown project IDs
- [ ] Returns 400 for invalid root paths in POST

**Test Cases:**
- `GET /api/workspace/config` returns empty roots when not configured
- `POST /api/workspace/config` with valid root persists config
- `POST /api/workspace/config` with invalid path returns 400
- `DELETE /api/workspace/roots/0` removes first root
- `POST /api/workspace/scan` triggers scan and returns projects
- `GET /api/projects` returns all discovered projects
- `GET /api/projects` returns empty array when no roots configured
- `GET /api/projects/:id` returns project detail
- `GET /api/projects/:id` returns 404 for unknown project
- `GET /api/projects/:id/status` returns project status
- `GET /api/projects/:id/tasks` returns project tasks
- `GET /api/projects/:id/bugs` returns project bugs
- Backward compat: `GET /api/project` still works
- Backward compat: `GET /api/status` still works
- Project ID encoding/decoding is URL-safe
- Concurrent scan requests don't cause race conditions

---

### Task 4: Dashboard Workspace Store & API Client [ ]

**Goal:** Frontend state management and API integration for workspace data.

**Files:**
- `dashboard-web/src/stores/workspace.store.ts` (new)
- `dashboard-web/src/stores/workspace.store.test.ts` (new)
- `dashboard-web/src/api/endpoints.ts` (modified — add workspace endpoints)
- `dashboard-web/src/api/endpoints.test.ts` (modified)

**Acceptance Criteria:**
- [ ] `WorkspaceStore` holds: `roots`, `projects`, `selectedProjectId`, `isConfigured`, `isScanning`, `lastScan`
- [ ] `setRoots(roots)` updates configured roots
- [ ] `setProjects(projects)` updates project list
- [ ] `selectProject(id)` sets active project, persists to `localStorage`
- [ ] `isConfigured` computed from roots array length > 0
- [ ] On init, restore `selectedProjectId` from `localStorage`
- [ ] API endpoints added: `workspace.getConfig()`, `workspace.setConfig(roots)`, `workspace.scan()`, `workspace.getProjects()`
- [ ] Per-project endpoints: `projects.getProject(id)`, `projects.getStatus(id)`, `projects.getTasks(id)`, `projects.getBugs(id)`

**Test Cases:**
- Store initializes with empty state
- `setRoots` updates roots array
- `setProjects` updates project list
- `selectProject` sets selectedProjectId
- `selectProject` persists to localStorage
- Init restores selectedProjectId from localStorage
- `isConfigured` false when no roots
- `isConfigured` true when roots exist
- `isScanning` tracks scan state
- `reset()` clears all state
- API client calls correct workspace endpoints
- API client calls correct per-project endpoints
- Project ID included in per-project API paths

---

### Task 5: Setup Screen Component [ ]

**Goal:** First-run UI that prompts for root folder path(s) when no workspace is configured.

**Files:**
- `dashboard-web/src/components/workspace/SetupScreen.tsx` (new)
- `dashboard-web/src/components/workspace/SetupScreen.test.tsx` (new)

**Acceptance Criteria:**
- [ ] Displays welcome message explaining workspace concept
- [ ] Text input for root folder path with placeholder (e.g., `~/Projects`)
- [ ] "Add Root" button to add multiple roots
- [ ] Shows list of added roots with remove button
- [ ] "Scan Projects" button triggers scan and navigates to projects grid
- [ ] Shows scan progress (discovering... N projects found)
- [ ] Shows error if path is invalid (server returns 400)
- [ ] Responsive layout (works on mobile)
- [ ] Accessible (labels, focus management, keyboard nav)

**Test Cases:**
- Renders welcome message and input
- Accepts path input
- "Add Root" button adds path to list
- Shows validation error for empty path
- Remove button removes root from list
- "Scan Projects" button calls API with roots
- Shows scanning state during API call
- Navigates to projects page on successful scan
- Shows error message on API failure
- Multiple roots can be added
- Keyboard: Enter in input adds root
- Accessible: input has label, buttons have labels

---

### Task 6: Workspace-Aware Routing & Navigation [ ]

**Goal:** Update App.tsx routing and sidebar navigation for multi-project context.

**Files:**
- `dashboard-web/src/App.tsx` (modified)
- `dashboard-web/src/components/layout/Sidebar.tsx` (modified)
- `dashboard-web/src/components/workspace/ProjectSelector.tsx` (new)
- `dashboard-web/src/components/workspace/ProjectSelector.test.tsx` (new)
- `dashboard-web/src/hooks/useWorkspace.ts` (new)
- `dashboard-web/src/hooks/useWorkspace.test.ts` (new)

**Acceptance Criteria:**
- [ ] `useWorkspace()` hook: fetches config on mount, returns `{ isConfigured, projects, selectedProject, selectProject, scan, isScanning }`
- [ ] If not configured → redirect to `/setup` (SetupScreen)
- [ ] If configured → show projects grid at `/projects`
- [ ] Route: `/projects/:projectId/dashboard` — project detail
- [ ] Route: `/projects/:projectId/tasks` — project tasks
- [ ] Route: `/projects/:projectId/logs` — project logs
- [ ] Route: `/setup` — setup screen
- [ ] `ProjectSelector` dropdown in sidebar — shows current project, switch between projects
- [ ] Sidebar shows project name when inside a project detail view
- [ ] Breadcrumb: Workspace > Project Name > View
- [ ] Back button / breadcrumb click returns to project grid
- [ ] Old routes (`/dashboard`, `/tasks`, `/logs`) redirect to workspace-aware equivalents

**Test Cases:**
- `useWorkspace` fetches config on mount
- `useWorkspace` returns isConfigured=false when no roots
- `useWorkspace` triggers redirect to /setup when not configured
- `useWorkspace` fetches projects when configured
- `useWorkspace.selectProject` updates store and navigates
- ProjectSelector renders dropdown with project names
- ProjectSelector shows current project as selected
- Clicking project in selector navigates to its dashboard
- Breadcrumb shows Workspace > Project > View
- Old routes redirect to new workspace routes
- /setup route renders SetupScreen
- /projects route renders ProjectGrid

---

### Task 7: Per-Project Data Loading [ ]

**Goal:** Update existing hooks and pages to load data for the selected project rather than the single hardcoded project.

**Files:**
- `dashboard-web/src/hooks/useProject.ts` (modified)
- `dashboard-web/src/hooks/useProjects.ts` (modified)
- `dashboard-web/src/hooks/useTasks.ts` (modified)
- `dashboard-web/src/pages/DashboardPage.tsx` (modified)
- `dashboard-web/src/pages/ProjectsPage.tsx` (modified)
- `dashboard-web/src/pages/TasksPage.tsx` (modified)

**Acceptance Criteria:**
- [ ] `useProject(projectId?)` accepts optional projectId, fetches from `/api/projects/:id`
- [ ] `useProjects()` fetches from `/api/projects` (full list from workspace scan)
- [ ] `useTasks(projectId?)` fetches from `/api/projects/:id/tasks`
- [ ] `DashboardPage` reads projectId from URL params
- [ ] `ProjectsPage` shows all workspace projects (from `useProjects`)
- [ ] `TasksPage` shows tasks for current project (from URL params)
- [ ] Falls back to legacy endpoints when no projectId (backward compat for single-project mode)

**Test Cases:**
- `useProject` with projectId fetches from per-project endpoint
- `useProject` without projectId fetches from legacy endpoint
- `useProjects` fetches from `/api/projects`
- `useTasks` with projectId fetches project-specific tasks
- DashboardPage extracts projectId from URL params
- DashboardPage renders project detail for given projectId
- ProjectsPage renders all workspace projects
- TasksPage renders tasks for URL-specified project
- Loading states shown during fetch
- Error states shown on fetch failure

---

### Task 8: WebSocket Project Scoping [ ]

**Goal:** Include project context in WebSocket messages so the dashboard can filter updates by active project.

**Files:**
- `server/index.js` (modified — WebSocket broadcast changes)
- `dashboard-web/src/hooks/useWebSocket.ts` (modified)
- `server/lib/workspace-api.js` (modified — project context in watcher)

**Acceptance Criteria:**
- [ ] Server broadcasts include `projectId` field when applicable
- [ ] File watcher events scoped to project that changed
- [ ] Client-side `useWebSocket` filters messages by active projectId
- [ ] Workspace-level messages (new project discovered) broadcast without projectId
- [ ] Backward compatible: messages without projectId still processed

**Test Cases:**
- Server includes projectId in task-update broadcasts
- Server includes projectId in git-activity broadcasts
- Client filters messages by selected projectId
- Client processes workspace-level messages (no projectId)
- Backward compat: messages without projectId not dropped
- File change in project A doesn't trigger UI update in project B view

---

### Task 9: Background Refresh & Manual Rescan [ ]

**Goal:** Manual refresh button in dashboard and optional background re-scanning of root folders.

**Files:**
- `dashboard-web/src/components/workspace/WorkspaceToolbar.tsx` (new)
- `dashboard-web/src/components/workspace/WorkspaceToolbar.test.tsx` (new)
- `server/lib/project-scanner.js` (modified — add watcher mode)

**Acceptance Criteria:**
- [ ] "Refresh" button in workspace toolbar triggers `POST /api/workspace/scan`
- [ ] Shows spinning indicator during scan
- [ ] Displays "Last scanned: X minutes ago" timestamp
- [ ] Optional: server watches root paths for new `.tlc.json` files (configurable, off by default)
- [ ] When watcher detects new project, broadcasts via WebSocket
- [ ] Dashboard auto-adds new project to grid without full page reload
- [ ] Scan results cached with TTL — button forces fresh scan

**Test Cases:**
- Refresh button triggers scan API call
- Shows spinner during scan
- Displays last scan timestamp
- Updates project list after successful scan
- Shows error toast on scan failure
- New project detected by watcher appears in grid
- Watcher mode can be enabled/disabled
- Cache TTL respected (no scan if recent)
- Force scan bypasses cache

---

### Task 10: Workspace-Aware `/tlc:init` [ ]

**Goal:** When `/tlc:init` runs in a folder containing sub-repos, detect that it's a workspace and create the full workspace structure (not just a flat single-project structure). Also support explicit `--workspace` flag.

**Files:**
- `.claude/commands/tlc/init.md` (modified — add workspace detection)
- `server/lib/workspace-init.js` (new)
- `server/lib/workspace-init.test.js` (new)

**Acceptance Criteria:**
- [ ] Auto-detects workspace: current dir has 2+ subdirectories with `.git/` → prompt "Initialize as workspace?"
- [ ] Explicit flag: `tlc init --workspace` skips detection, forces workspace mode
- [ ] Creates full workspace structure:
  ```
  workspace/
  ├── .planning/
  │   ├── ROADMAP.md          ← workspace-level roadmap (template)
  │   ├── phases/             ← workspace-level phases
  │   └── BUGS.md             ← cross-project bugs
  ├── .tlc.json               ← workspace: true, version, config
  ├── CLAUDE.md               ← workspace conventions (template)
  ├── projects.json           ← auto-populated from discovered sub-repos
  └── memory/
      ├── decisions/
      ├── gotchas/
      └── conversations/
  ```
- [ ] Auto-populates `projects.json` from discovered sub-repos (name, git URL, path)
- [ ] Creates `.planning/phases/` subfolder (not just flat `.planning/`)
- [ ] Workspace ROADMAP.md template includes placeholder phases for cross-repo concerns
- [ ] Workspace CLAUDE.md template includes sections for shared conventions
- [ ] `.tlc.json` has `"workspace": true` flag to distinguish from project-level config
- [ ] Does NOT overwrite existing files (safe to re-run)
- [ ] Reports: "Initialized workspace with N projects"
- [ ] Offers to initialize TLC in each sub-repo that doesn't have it: "Initialize TLC in repo-a? (Y/n)"
- [ ] Backward compatible: `tlc init` in a single-project folder still works as before

**Test Cases:**
- Detects workspace when 2+ sub-repos exist
- Creates .planning/ with phases/ subfolder
- Creates .planning/ROADMAP.md template
- Creates .planning/BUGS.md
- Creates CLAUDE.md with workspace template
- Creates .tlc.json with workspace: true
- Creates projects.json from discovered repos
- Creates memory/ with subdirectories
- Auto-extracts git remote URLs for projects.json
- Does not overwrite existing files
- --workspace flag forces workspace mode
- Single-project folder still initializes as project (not workspace)
- Reports project count after init
- Offers to init TLC in sub-repos without it
- Handles sub-repos without git remotes

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Scanner reads root paths from global config |
| 3 | 1, 2 | API uses config module and scanner |
| 4 | 3 | Store/API client depends on server endpoints |
| 5 | 4 | Setup screen uses workspace store/API |
| 6 | 4, 5 | Routing depends on store and setup screen |
| 7 | 3, 6 | Per-project loading needs API endpoints and routing |
| 8 | 3, 7 | WebSocket scoping needs server changes and project context |
| 9 | 2, 4 | Refresh needs scanner and store |
| 10 | 2 | Workspace init uses project scanner for discovery |

**Parallel groups:**
- Group A: Task 1 (independent)
- Group B: Task 2 (after Task 1)
- Group C: Tasks 3, 10 (after Tasks 1, 2)
- Group D: Tasks 4, 9 (after Task 3 / Task 2)
- Group E: Tasks 5, 7 (after Task 4)
- Group F: Tasks 6, 8 (after Tasks 4+5, 3+7)

## Estimated Scope

- Tasks: 10
- New files: ~20 (10 modules + 10 test files)
- Modified files: ~11 (server/index.js, App.tsx, init.md, hooks, pages, endpoints)
- Tests: ~175 (estimated)
