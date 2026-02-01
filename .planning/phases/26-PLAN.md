# Phase 26: Multi-Repo Support - Plan

## Overview

Manage multiple repositories as a unified workspace. Engineers working on microservices, monorepos, or distributed systems can coordinate across repos with shared memory, unified test runs, and a single dashboard view.

## Prerequisites

- [x] Phase 25 complete
- [x] Memory system exists (Phase 10-13)
- [x] Dashboard infrastructure exists

## Tasks

### Task 1: Workspace Configuration [ ]

**Goal:** Define and persist workspace structure

**Files:**
- server/lib/workspace-config.js
- server/lib/workspace-config.test.js

**Acceptance Criteria:**
- [ ] Creates .tlc-workspace.json in root
- [ ] Stores list of repo paths (relative)
- [ ] Auto-discovers subdirectories with package.json
- [ ] Supports glob patterns for monorepo packages
- [ ] Detects npm/pnpm/yarn workspaces automatically

**Test Cases:**
- Creates workspace config file
- Adds repo to workspace
- Removes repo from workspace
- Auto-discovers repos in subdirectories
- Detects package.json in subdirs
- Expands glob patterns (packages/*)
- Detects npm workspaces from root package.json
- Handles relative paths only (portable)
- Ignores node_modules, .git, etc.

---

### Task 2: Bulk Repo Initializer [ ]

**Goal:** Initialize TLC in multiple repos at once

**Files:**
- server/lib/bulk-repo-init.js
- server/lib/bulk-repo-init.test.js

**Acceptance Criteria:**
- [ ] Detects repos without .tlc.json
- [ ] Creates minimal .tlc.json for each
- [ ] Infers project type (node, python, go, etc.)
- [ ] Infers test framework from existing config
- [ ] Reports success/failure per repo

**Test Cases:**
- Detects repo without .tlc.json
- Creates .tlc.json with inferred settings
- Detects Node.js project (package.json)
- Detects Python project (pyproject.toml, setup.py)
- Detects Go project (go.mod)
- Infers vitest from vite.config
- Infers jest from jest.config
- Infers pytest from pytest.ini
- Handles mixed project types in workspace
- Reports summary (X initialized, Y failed)
- Skips repos that already have .tlc.json

---

### Task 3: Workspace Scanner [ ]

**Goal:** Discover and index repos in workspace

**Files:**
- server/lib/workspace-scanner.js
- server/lib/workspace-scanner.test.js

**Acceptance Criteria:**
- [ ] Scans all repos for project info
- [ ] Extracts name, version, dependencies
- [ ] Detects cross-repo dependencies
- [ ] Builds dependency graph

**Test Cases:**
- Scans single repo
- Scans multiple repos
- Extracts package.json info
- Detects npm workspace dependencies
- Detects import references to other repos
- Builds dependency order for test runs
- Handles missing package.json
- Handles circular dependencies

---

### Task 4: Cross-Repo Dependency Tracker [ ]

**Goal:** Track dependencies between repos

**Files:**
- server/lib/repo-dependency-tracker.js
- server/lib/repo-dependency-tracker.test.js

**Acceptance Criteria:**
- [ ] Parses package.json dependencies
- [ ] Detects workspace: protocol refs
- [ ] Detects file: protocol refs
- [ ] Generates Mermaid dependency diagram

**Test Cases:**
- Detects workspace:* dependencies
- Detects file:../other-repo dependencies
- Identifies dependency direction (A depends on B)
- Calculates affected repos when one changes
- Generates topological sort for build order
- Detects circular dependencies
- Handles missing dependencies gracefully

---

### Task 5: Unified Test Runner [ ]

**Goal:** Run tests across all workspace repos

**Files:**
- server/lib/workspace-test-runner.js
- server/lib/workspace-test-runner.test.js

**Acceptance Criteria:**
- [ ] Runs tests in dependency order
- [ ] Supports parallel execution for independent repos
- [ ] Aggregates results across repos
- [ ] Respects per-repo test config

**Test Cases:**
- Runs tests in single repo
- Runs tests in multiple repos sequentially
- Runs independent repos in parallel
- Respects dependency order (test A before B if B depends on A)
- Aggregates pass/fail counts
- Stops on first failure (--bail mode)
- Continues on failure (--no-bail mode)
- Handles repo with no tests

---

### Task 6: Workspace Memory [ ]

**Goal:** Share memory across workspace repos

**Files:**
- server/lib/workspace-memory.js
- server/lib/workspace-memory.test.js

**Acceptance Criteria:**
- [ ] Creates shared .tlc-workspace/memory directory
- [ ] Syncs decisions across repos
- [ ] Repo-specific memory still works
- [ ] Resolves conflicts (workspace vs repo)

**Test Cases:**
- Creates workspace memory directory
- Writes to workspace-level memory
- Writes to repo-level memory
- Reads from both levels
- Workspace memory visible to all repos
- Repo memory only visible to that repo
- Conflict resolution (repo overrides workspace)
- Memory search spans workspace

---

### Task 7: Workspace Command [ ]

**Goal:** `/tlc:workspace` CLI command

**Files:**
- server/lib/workspace-command.js
- server/lib/workspace-command.test.js

**Acceptance Criteria:**
- [ ] `--init` scans, prompts, and bulk-initializes repos
- [ ] `--add <path>` adds repo (auto-inits if needed)
- [ ] `--remove <path>` removes repo from workspace
- [ ] `--list` shows all repos with TLC status
- [ ] `--test` runs workspace tests
- [ ] `--graph` shows dependency graph

**Test Cases:**
- Init scans subdirectories for repos
- Init shows which repos need TLC setup
- Init bulk-initializes repos on confirm
- Init creates .tlc-workspace.json
- Add auto-initializes repo if no .tlc.json
- Remove removes repo from config
- List shows repos with status (ready/needs-init)
- Test runs unified test runner
- Graph outputs Mermaid diagram
- Status shows repo health (tests, coverage)
- Handles workspace not initialized error
- Skips hidden directories and node_modules

---

### Task 8: Dashboard WorkspacePane [ ]

**Goal:** Dashboard component for workspace view

**Files:**
- dashboard/src/components/WorkspacePane.tsx
- dashboard/src/components/WorkspacePane.test.tsx

**Acceptance Criteria:**
- [ ] Shows all repos in workspace
- [ ] Shows dependency graph visualization
- [ ] Shows aggregate test status
- [ ] Links to individual repo dashboards

**Test Cases:**
- Renders repo list
- Shows repo names and paths
- Shows test status per repo
- Shows aggregate totals
- Renders dependency graph (Mermaid or D3)
- Highlights repos with failing tests
- Click navigates to repo detail
- Shows loading state
- Shows empty state

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Bulk init needs config to know workspace root |
| 3 | 1 | Scanner needs config to know which repos |
| 4 | 3 | Dependency tracker uses scanner output |
| 5 | 3, 4 | Test runner needs scan and dependency order |
| 6 | 1 | Memory needs workspace root |
| 7 | 1-6 | Command orchestrates all modules |
| 8 | 7 | Pane uses command output |

**Parallel groups:**
- Group A: Task 1 (foundation)
- Group B: Tasks 2, 3, 6 (after Task 1, independent)
- Group C: Task 4 (after Task 3)
- Group D: Task 5 (after Tasks 3, 4)
- Group E: Task 7 (after Tasks 1-6)
- Group F: Task 8 (after Task 7)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 implementations + 8 tests)
- Tests: ~140 estimated
