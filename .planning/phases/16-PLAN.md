# Phase 16: Task Management - Plan

## Overview

Task board and management for the TLC terminal dashboard. Kanban-style display adapted for terminal (keyboard navigation instead of drag-and-drop).

**Note:** Dashboard uses Ink (terminal-based React), not web React. No mouse drag-and-drop.

## Tasks

### Task 1: TaskCard component [x]

**Goal:** Display task summary in a compact card

**Files:**
- dashboard/src/components/TaskCard.tsx
- dashboard/src/components/TaskCard.test.tsx

**Acceptance Criteria:**
- [x] Shows task title and status
- [x] Displays priority indicator (high/medium/low)
- [x] Shows assignee when present
- [x] Test status badge (passing/failing/none)
- [x] Compact and full display modes

---

### Task 2: TaskBoard component [x]

**Goal:** Kanban-style board with columns for task status

**Files:**
- dashboard/src/components/TaskBoard.tsx
- dashboard/src/components/TaskBoard.test.tsx

**Acceptance Criteria:**
- [x] Three columns: Pending, In Progress, Completed
- [x] Keyboard navigation between columns (h/l or left/right)
- [x] Keyboard navigation within column (j/k or up/down)
- [x] Move task between columns (m key + number)
- [x] Column header shows count

---

### Task 3: TaskDetail component [x]

**Goal:** Detailed view of a single task

**Files:**
- dashboard/src/components/TaskDetail.tsx
- dashboard/src/components/TaskDetail.test.tsx

**Acceptance Criteria:**
- [x] Shows full task description
- [x] Activity/comment history
- [x] Claim/release actions
- [x] Status change actions
- [x] Back navigation (Esc)

---

### Task 4: TaskFilter component [x]

**Goal:** Filter tasks by assignee/status/priority

**Files:**
- dashboard/src/components/TaskFilter.tsx
- dashboard/src/components/TaskFilter.test.tsx

**Acceptance Criteria:**
- [x] Filter by assignee (dropdown)
- [x] Filter by status (toggle)
- [x] Filter by priority (toggle)
- [x] Clear all filters
- [x] Shows active filter count

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | TaskBoard uses TaskCard |
| 3 | 1 | TaskDetail extends TaskCard data |

## Scope

- Tasks: 4/4 complete
- Files: 8 (4 components + 4 test files)
- Tests: 78 passing
