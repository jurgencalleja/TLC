# Phase 15: Project Views - Plan

## Overview

Project cards, grid layout, and detail views for the TLC terminal dashboard.

**Note:** Dashboard uses Ink (terminal-based React), not web React.

## Tasks

### Task 1: ProjectCard component [x]

**Goal:** Display project summary in a card

**Files:**
- dashboard/src/components/ProjectCard.tsx
- dashboard/src/components/ProjectCard.test.tsx

**Acceptance Criteria:**
- [x] Shows project name and description
- [x] Displays test status (passing/failing count)
- [x] Shows coverage percentage with color
- [x] Current phase indicator
- [x] Last activity timestamp

---

### Task 2: ProjectList component [x]

**Goal:** List of projects with filtering

**Files:**
- dashboard/src/components/ProjectList.tsx
- dashboard/src/components/ProjectList.test.tsx

**Acceptance Criteria:**
- [x] Renders list of ProjectCards
- [x] Search/filter by name
- [x] Sort by name, activity, status
- [x] Empty state when no projects
- [x] Keyboard navigation (j/k)

---

### Task 3: ProjectDetail component [x]

**Goal:** Detailed view of a single project

**Files:**
- dashboard/src/components/ProjectDetail.tsx
- dashboard/src/components/ProjectDetail.test.tsx

**Acceptance Criteria:**
- [x] Tabs: Overview, Tasks, Tests, Logs
- [x] Overview shows phases progress
- [x] Tasks shows current phase tasks
- [x] Tests shows recent test runs
- [x] Tab switching with number keys

---

### Task 4: BranchSelector component [x]

**Goal:** Select and display current branch

**Files:**
- dashboard/src/components/BranchSelector.tsx
- dashboard/src/components/BranchSelector.test.tsx

**Acceptance Criteria:**
- [x] Shows current branch name
- [x] List recent branches
- [x] Quick switch with arrow keys
- [x] Shows branch ahead/behind status

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | ProjectList uses ProjectCard |
| 3 | 1 | ProjectDetail may show cards |

## Scope

- Tasks: 4/4 complete
- Files: 8 (4 components + 4 test files)
- Tests: 71 passing
