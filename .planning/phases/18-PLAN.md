# Phase 18: Team Features (VPS) - Plan

## Overview

Team presence and activity components for VPS deployments. Shows online team members, activity feed, and environment-aware features.

**Note:** Dashboard uses Ink (terminal-based React). WebSocket connection handled externally; components receive data as props.

## Tasks

### Task 1: TeamPresence component [x]

**Goal:** Show online/offline team members

**Files:**
- dashboard/src/components/TeamPresence.tsx
- dashboard/src/components/TeamPresence.test.tsx

**Acceptance Criteria:**
- [x] Shows list of team members
- [x] Online/offline status indicators
- [x] Current activity for each member
- [x] "Away" status after idle timeout
- [x] Compact and expanded modes

---

### Task 2: ActivityFeed component [x]

**Goal:** Real-time activity stream with filtering

**Files:**
- dashboard/src/components/ActivityFeed.tsx
- dashboard/src/components/ActivityFeed.test.tsx

**Acceptance Criteria:**
- [x] Shows recent activities (commits, claims, completions)
- [x] Filter by user
- [x] Filter by activity type
- [x] Relative timestamps
- [x] Links to related items

---

### Task 3: EnvironmentBadge component [x]

**Goal:** Show current environment (local/VPS/production)

**Files:**
- dashboard/src/components/EnvironmentBadge.tsx
- dashboard/src/components/EnvironmentBadge.test.tsx

**Acceptance Criteria:**
- [x] Detects environment from config
- [x] Different colors per environment
- [x] Shows branch/version info
- [x] Warning for production

---

### Task 4: TeamPanel component [x]

**Goal:** Combined team dashboard panel

**Files:**
- dashboard/src/components/TeamPanel.tsx
- dashboard/src/components/TeamPanel.test.tsx

**Acceptance Criteria:**
- [x] Combines presence and activity
- [x] Hidden in local-only mode
- [x] Connection status indicator
- [x] Refresh/reconnect action

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 4 | 1, 2 | TeamPanel combines presence and activity |

## Scope

- Tasks: 4/4 complete
- Files: 8 (4 components + 4 test files)
- Tests: 75 passing
