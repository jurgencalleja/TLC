# Phase 72: Infra Repo & Workspace Bootstrap - Plan

## Overview

A TLC workspace is a git repo. It contains `projects.json` (repo URLs and config), workspace-level TLC artifacts (`.planning/`, `CLAUDE.md`, `memory/`), and setup instructions. Cloning the infra repo on a new machine and running setup recreates the entire workspace: all sub-repos cloned, TLC initialized, vectors rebuilt. This is the portability layer for multi-machine development.

## Prerequisites

- [x] Phase 70: Workspace Dashboard (workspace config, project discovery)
- [x] Phase 71: Semantic Memory (vector rebuild from text)

## Tasks

### Task 1: Projects Registry [ ]

**Goal:** `projects.json` file that tracks all repos in the workspace with their git URLs, local paths, and TLC config.

**Files:**
- `server/lib/projects-registry.js` (new)
- `server/lib/projects-registry.test.js` (new)

**Acceptance Criteria:**
- [ ] `load(workspaceRoot)` — reads `projects.json` from workspace root
- [ ] `save(workspaceRoot, registry)` — writes `projects.json` atomically
- [ ] `addProject(workspaceRoot, { name, gitUrl, localPath, branch })` — adds project
- [ ] `removeProject(workspaceRoot, name)` — removes project
- [ ] `listProjects(workspaceRoot)` — returns all projects
- [ ] `detectFromFilesystem(workspaceRoot)` — scans existing sub-repos, builds registry automatically
- [ ] Schema: `{ version, projects: [{ name, gitUrl, localPath, defaultBranch, hasTlc, description }] }`
- [ ] Validates git URLs (SSH and HTTPS formats)
- [ ] Relative `localPath` (portable across machines)
- [ ] Auto-detects `gitUrl` from `git remote get-url origin` in existing repos

**Test Cases:**
- Creates projects.json with schema version
- Adds project with git URL and local path
- Removes project by name
- Lists all projects
- Detects existing repos from filesystem
- Auto-extracts git remote URL from sub-repos
- Relative paths stored (not absolute)
- Validates SSH git URLs
- Validates HTTPS git URLs
- Rejects invalid git URLs
- Duplicate project names rejected
- Atomic write prevents corruption
- Empty registry returns empty array

---

### Task 2: Workspace Bootstrap Command [ ]

**Goal:** `/tlc:bootstrap` command that clones all repos from `projects.json` and sets up the workspace on a new machine.

**Files:**
- `.claude/commands/tlc/bootstrap.md` (new)
- `server/lib/workspace-bootstrap.js` (new)
- `server/lib/workspace-bootstrap.test.js` (new)

**Acceptance Criteria:**
- [ ] `bootstrap(workspaceRoot, options)` — reads `projects.json`, clones all repos
- [ ] Clones to `localPath` relative to workspace root
- [ ] Skips already-cloned repos (idempotent)
- [ ] Checks out `defaultBranch` for each repo
- [ ] Runs `npm install` / `pip install` / equivalent per project type (auto-detected)
- [ ] Triggers vector rebuild after all repos cloned (Phase 71 indexer)
- [ ] Progress reporting: `onProgress({ phase, project, status })`
- [ ] `--dry-run` flag shows what would be cloned without doing it
- [ ] `--skip-install` flag skips dependency installation
- [ ] `--parallel N` flag for concurrent clones (default 3)
- [ ] Reports summary: N repos cloned, N already present, N failed

**Test Cases:**
- Clones repos from projects.json
- Skips already-cloned repos
- Checks out correct branch per repo
- Dry-run shows plan without cloning
- Skip-install flag respected
- Parallel cloning works
- Progress callback fires per repo
- Summary reports counts correctly
- Handles clone failure gracefully (continues with others)
- Triggers vector index rebuild after clone
- Creates local directories as needed
- Handles SSH and HTTPS git URLs

---

### Task 3: Workspace Snapshot & Restore [ ]

**Goal:** Capture workspace state (branches, uncommitted changes indicator, TLC phase) and restore it. "Where was I?" across machines.

**Files:**
- `server/lib/workspace-snapshot.js` (new)
- `server/lib/workspace-snapshot.test.js` (new)

**Acceptance Criteria:**
- [ ] `snapshot(workspaceRoot)` — captures current state of all repos
- [ ] Per-repo state: `{ branch, lastCommit, hasUncommitted, tlcPhase, tlcPhaseName, activeTasks }`
- [ ] Saves to `workspace-state.json` in workspace root (git-tracked)
- [ ] `restore(workspaceRoot)` — checks out correct branches in all repos
- [ ] `diff(workspaceRoot)` — shows what changed since last snapshot (new commits, branch changes)
- [ ] Auto-snapshot on `/tlc:remember` and session end (if detectable)
- [ ] Timestamp in snapshot for "last seen" tracking

**Test Cases:**
- Captures branch and commit per repo
- Captures uncommitted changes indicator
- Captures TLC phase per repo
- Saves snapshot to workspace-state.json
- Restore checks out correct branches
- Diff shows changes since last snapshot
- Handles repo with no commits
- Handles repo on detached HEAD
- Snapshot includes timestamp
- Active tasks captured per repo

---

### Task 4: Workspace Setup Script Generator [ ]

**Goal:** Generate a `setup.md` with human-readable instructions and a `setup.sh` script for automated workspace rebuild.

**Files:**
- `server/lib/setup-generator.js` (new)
- `server/lib/setup-generator.test.js` (new)

**Acceptance Criteria:**
- [ ] `generateSetupMd(workspaceRoot)` — creates `setup.md` with step-by-step instructions
- [ ] `generateSetupSh(workspaceRoot)` — creates `setup.sh` bash script
- [ ] Instructions include: prerequisites (Node, Ollama, Docker), clone commands, install steps
- [ ] Script is idempotent (safe to run multiple times)
- [ ] Detects required tools per project (Node.js version, Python version, Go, etc.)
- [ ] Includes TLC-specific setup: vector rebuild, dashboard start
- [ ] `setup.md` readable by humans AND Claude (can be given to Claude on new machine)

**Test Cases:**
- Generates setup.md with prerequisites section
- Generates setup.sh with clone commands
- Script includes npm install for Node projects
- Script includes pip install for Python projects
- Detects Node.js version from .nvmrc or engines
- Includes Ollama model pull command
- Includes vector rebuild command
- Script is idempotent
- Setup.md includes TLC dashboard start instructions
- Handles workspace with mixed project types

---

### Task 5: Auto-Detect & Register New Repos [ ]

**Goal:** When user clones a new repo into the workspace, auto-detect and add to `projects.json`.

**Files:**
- `server/lib/workspace-watcher.js` (new)
- `server/lib/workspace-watcher.test.js` (new)

**Acceptance Criteria:**
- [ ] Watches workspace root for new directories containing `.git/`
- [ ] Auto-adds to `projects.json` when new repo detected
- [ ] Extracts git remote URL, name, description from new repo
- [ ] Broadcasts "new-project" event via WebSocket (Phase 70 dashboard)
- [ ] Ignores non-repo directories (no `.git/`)
- [ ] Configurable: enable/disable in `.tlc.json` (default: enabled)
- [ ] Debounced: waits 2s after filesystem change before processing

**Test Cases:**
- Detects new directory with .git/
- Adds to projects.json automatically
- Extracts git remote URL
- Broadcasts WebSocket event
- Ignores directories without .git/
- Configurable enable/disable
- Debounced filesystem events
- Handles rapid successive additions
- Handles directory deletion (removes from registry)

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | — | Independent (registry module) |
| 2 | 1 | Bootstrap reads from registry |
| 3 | 1 | Snapshot queries repo states from registry |
| 4 | 1, 2 | Setup generator uses registry and bootstrap logic |
| 5 | 1 | Watcher updates registry |

**Parallel groups:**
- Group A: Task 1 (foundation)
- Group B: Tasks 2, 3, 5 (after Task 1, independent of each other)
- Group C: Task 4 (after Tasks 1, 2)

## Estimated Scope

- Tasks: 5
- New files: 12 (5 modules + 5 test files + 1 command .md + setup.sh template)
- Tests: ~60 (estimated)
