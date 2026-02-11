# Phase 73: Memory Hierarchy & Inheritance - Plan

## Overview

When working in a child repo (e.g., `kasha-api/`), TLC should automatically inherit workspace-level decisions, conventions, and memory from the parent workspace. The parent workspace's CLAUDE.md, decisions, and gotchas cascade down to child projects. Query-time inheritance means child repos get workspace context without duplicating files.

## Prerequisites

- [x] Phase 70: Workspace Dashboard (workspace detection)
- [x] Phase 71: Semantic Memory (vector store, recall)
- [x] Phase 72: Infra Repo (projects.json, workspace structure)

## Tasks

### Task 1: Workspace Detector [ ]

**Goal:** Detect when the current project is inside a workspace (has a parent directory with TLC artifacts). Resolve the hierarchy: workspace root → project.

**Files:**
- `server/lib/workspace-detector.js` (new)
- `server/lib/workspace-detector.test.js` (new)

**Acceptance Criteria:**
- [ ] `detectWorkspace(projectDir)` — walks up directory tree looking for workspace markers
- [ ] Workspace markers: `projects.json`, `.tlc.json` with `workspace: true`, or `memory/` directory with sub-repos
- [ ] Returns `{ isInWorkspace, workspaceRoot, projectPath, relativeProjectPath }`
- [ ] Returns `null` workspace when project is standalone (no parent workspace)
- [ ] Stops at filesystem root or home directory (doesn't scan endlessly)
- [ ] Caches result per process (workspace doesn't change mid-session)
- [ ] Handles nested workspaces (uses nearest parent)

**Test Cases:**
- Detects workspace when projects.json exists in parent
- Detects workspace when parent has .tlc.json with workspace flag
- Detects workspace when parent has memory/ directory
- Returns null for standalone project
- Stops at home directory
- Stops at filesystem root
- Caches result across calls
- Handles nested workspaces (nearest parent wins)
- Returns correct relative project path
- Works with symlinked directories

---

### Task 2: Memory Inheritance Engine [ ]

**Goal:** When loading memory for a project, also load workspace-level memory. Merge with correct priority: project-specific > workspace-level.

**Files:**
- `server/lib/memory-inheritance.js` (new)
- `server/lib/memory-inheritance.test.js` (new)

**Acceptance Criteria:**
- [ ] `loadInheritedMemory(projectDir)` — loads project memory + workspace memory
- [ ] Returns merged decisions: workspace decisions + project decisions (project overrides workspace for same topic)
- [ ] Returns merged gotchas: union of workspace + project gotchas
- [ ] Returns merged preferences: project preferences override workspace
- [ ] Returns merged conversations: both included, tagged with source
- [ ] Each memory item tagged with `{ source: 'project' | 'workspace' }`
- [ ] Workspace memory has lower priority in relevance scoring
- [ ] `getInheritedRoots(projectDir)` — returns `[projectMemoryPath, workspaceMemoryPath]` for indexing

**Test Cases:**
- Loads project-level decisions
- Loads workspace-level decisions
- Merges decisions (union)
- Project decisions override workspace for same topic
- Loads and merges gotchas (union)
- Project preferences override workspace preferences
- Conversations from both sources included
- Each item tagged with source
- Workspace items have lower relevance
- Standalone project returns only own memory
- getInheritedRoots returns both paths
- Handles missing workspace memory directory

---

### Task 3: CLAUDE.md Cascade [ ]

**Goal:** When working in a child project, inject workspace-level CLAUDE.md content into the project's context. Workspace conventions flow down automatically.

**Files:**
- `server/lib/claude-cascade.js` (new)
- `server/lib/claude-cascade.test.js` (new)
- `server/lib/claude-injector.js` (modified — add cascade support)

**Acceptance Criteria:**
- [ ] `getCascadedContext(projectDir)` — reads workspace CLAUDE.md + project CLAUDE.md
- [ ] Workspace CLAUDE.md injected as "Workspace Conventions" section
- [ ] Project CLAUDE.md takes precedence (overrides workspace rules if conflicting)
- [ ] Injection uses markers: `<!-- TLC-WORKSPACE-START -->` / `<!-- TLC-WORKSPACE-END -->`
- [ ] Only injects workspace content that's relevant (not entire file — uses section detection)
- [ ] Sections detected: coding standards, conventions, architecture decisions, team rules
- [ ] Respects token budget (truncates workspace content if too large)
- [ ] `syncCascade(projectDir)` — updates project CLAUDE.md with latest workspace content

**Test Cases:**
- Reads workspace CLAUDE.md
- Reads project CLAUDE.md
- Injects workspace content between markers
- Project rules override workspace rules
- Only relevant sections injected
- Token budget respected
- syncCascade updates markers in project CLAUDE.md
- No cascade when no workspace detected
- Handles missing workspace CLAUDE.md
- Handles missing project CLAUDE.md
- Marker-based replacement is idempotent

---

### Task 4: Inherited Vector Search [ ]

**Goal:** Semantic recall searches project vectors first, then workspace vectors, with configurable scope widening.

**Files:**
- `server/lib/semantic-recall.js` (modified — add inheritance)
- `server/lib/semantic-recall.test.js` (modified — add inheritance tests)
- `server/lib/vector-indexer.js` (modified — index workspace + project)

**Acceptance Criteria:**
- [ ] Default search: project scope first
- [ ] Auto-widen to workspace scope when project returns < 3 results
- [ ] Workspace results scored lower than project results (0.8x multiplier)
- [ ] `scope: 'inherited'` option explicitly searches project + workspace
- [ ] Vector indexer indexes both project and workspace memory paths
- [ ] Index rebuild processes workspace memory when inside a workspace
- [ ] Deduplication across scopes (same content found in both → keep higher-scoring)

**Test Cases:**
- Project-scope search returns project memories only
- Auto-widens to workspace when few project results
- Workspace results scored 0.8x lower
- Explicit inherited scope searches both
- Indexer processes workspace memory path
- Indexer processes project memory path
- Rebuild indexes both paths
- Deduplication across scopes
- Standalone project doesn't search workspace
- Combined ranking sorts correctly across scopes

---

### Task 5: Workspace Context in TLC Commands [ ]

**Goal:** TLC commands (`/tlc:plan`, `/tlc:build`, `/tlc:discuss`) receive workspace context automatically when working in a child project.

**Files:**
- `server/lib/memory-hooks.js` (modified — add workspace context)
- `server/lib/context-builder.js` (modified — add inherited memory)

**Acceptance Criteria:**
- [ ] `onSessionStart()` loads inherited memory (project + workspace)
- [ ] Context builder includes workspace decisions in "Workspace Context" section
- [ ] `/tlc:plan` receives workspace architecture decisions as input
- [ ] `/tlc:discuss` has access to workspace-level prior discussions
- [ ] Workspace gotchas surfaced as warnings when relevant
- [ ] Token budget allocates: 60% project context, 40% workspace context
- [ ] No workspace context when standalone project

**Test Cases:**
- Session start loads inherited memory
- Context includes "Workspace Context" section
- Workspace decisions included in plan context
- Workspace discussions available in discuss context
- Workspace gotchas surfaced as warnings
- Token budget split respected
- No workspace section for standalone projects
- Workspace context refreshes on sync

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | — | Independent (detection logic) |
| 2 | 1 | Inheritance needs workspace detection |
| 3 | 1 | Cascade needs workspace detection |
| 4 | 1, 2 | Search inheritance needs detection + loading |
| 5 | 2, 3, 4 | Commands use all inheritance layers |

**Parallel groups:**
- Group A: Task 1 (foundation)
- Group B: Tasks 2, 3 (after Task 1, independent)
- Group C: Task 4 (after Tasks 1, 2)
- Group D: Task 5 (after Tasks 2, 3, 4)

## Estimated Scope

- Tasks: 5
- New files: 8 (4 modules + 4 test files)
- Modified files: 6 (semantic-recall, vector-indexer, claude-injector, memory-hooks, context-builder + tests)
- Tests: ~70 (estimated)
