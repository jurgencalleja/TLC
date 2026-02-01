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
- [ ] Stores list of repo paths (relative or absolute)
- [ ] Validates repos exist and have .tlc.json
- [ ] Supports glob patterns for monorepo packages

**Test Cases:**
- Creates workspace config file
- Adds repo to workspace
- Removes repo from workspace
- Validates repo has TLC config
- Handles relative and absolute paths
- Expands glob patterns (packages/*)
- Returns error for missing repos
- Returns error for non-TLC repos

---

### Task 2: Workspace Scanner [ ]

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

### Task 3: Cross-Repo Dependency Tracker [ ]

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

### Task 4: Unified Test Runner [ ]

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

### Task 5: Workspace Memory [ ]

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

### Task 6: Workspace Command [ ]

**Goal:** `/tlc:workspace` CLI command

**Files:**
- server/lib/workspace-command.js
- server/lib/workspace-command.test.js

**Acceptance Criteria:**
- [ ] `--init` creates workspace config
- [ ] `--add <path>` adds repo
- [ ] `--remove <path>` removes repo
- [ ] `--list` shows all repos
- [ ] `--test` runs workspace tests
- [ ] `--graph` shows dependency graph

**Test Cases:**
- Init creates .tlc-workspace.json
- Add validates and adds repo
- Remove removes repo from config
- List shows repos with status
- Test runs unified test runner
- Graph outputs Mermaid diagram
- Status shows repo health (tests, coverage)
- Handles workspace not initialized error

---

### Task 7: Dashboard WorkspacePane [ ]

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
| 2 | 1 | Scanner needs config to know which repos |
| 3 | 2 | Dependency tracker uses scanner output |
| 4 | 2, 3 | Test runner needs scan and dependency order |
| 5 | 1 | Memory needs workspace root |
| 6 | 1-5 | Command orchestrates all modules |
| 7 | 6 | Pane uses command output |

**Parallel groups:**
- Group A: Task 1 (foundation)
- Group B: Tasks 2, 5 (after Task 1, can run in parallel)
- Group C: Task 3 (after Task 2)
- Group D: Task 4 (after Tasks 2, 3)
- Group E: Task 6 (after Tasks 1-5)
- Group F: Task 7 (after Task 6)

## Estimated Scope

- Tasks: 7
- Files: 14 (7 implementations + 7 tests)
- Tests: ~120 estimated
