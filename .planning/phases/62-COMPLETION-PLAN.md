# Phase 62 Completion: Dashboard Gaps - Plan

## Overview

Phase 62 was marked complete but has gaps: 4 pages on mock data, ~10 missing server API endpoints, and 3 unused hooks. This plan closes every gap to make the dashboard fully functional.

---

## Tasks

### Task 1: Add Missing Server API Endpoints [>]

**Goal:** Add `/api/config`, `/api/tasks/:id` CRUD, `/api/logs/:type` DELETE, `/api/health` to main server.

**Files:**
- server/index.js

**Changes:**
- `GET /api/config` — read .tlc.json and return
- `PUT /api/config` — write .tlc.json
- `GET /api/tasks/:id` — find task by id from parsePlan
- `PATCH /api/tasks/:id` — update task status/owner in PLAN.md
- `DELETE /api/tasks/:id` — remove task from PLAN.md
- `DELETE /api/logs/:type` — clear log buffer
- `GET /api/health` — return system health (uptime, memory, services)
- `GET /api/changelog` already exists, wire to activity feed format

**Test File:** server/lib/dashboard-api-completion.test.js (~25 tests)

---

### Task 2: Wire ProjectsPage to Real API [>]

**Goal:** Replace hardcoded mock projects with `useProjects` hook.

**Files:**
- dashboard-web/src/pages/ProjectsPage.tsx

**Changes:**
- Import and use `useProjects` hook (already built, unused)
- Add loading skeleton state
- Add error state
- Remove `mockProjects` constant
- Call `fetchProjects()` on mount

---

### Task 3: Wire SettingsPage to Real API [>]

**Goal:** Replace fake setTimeout with `useSettings` hook.

**Files:**
- dashboard-web/src/pages/SettingsPage.tsx

**Changes:**
- Import and use `useSettings` hook (already built, unused)
- Wire `saveConfig()` to real API
- Add loading state for initial config fetch
- Add error display
- Remove `defaultConfig` and simulated save

---

### Task 4: Wire DashboardPage Activity Feed to Real Data [>]

**Goal:** Replace `mockActivities` with real git changelog data from API.

**Files:**
- dashboard-web/src/pages/DashboardPage.tsx

**Changes:**
- Fetch `/api/changelog` on mount
- Transform git commits into ActivityItem format
- Replace `mockActivities` constant with real data
- Wire "Run Tests" button to `/api/test` POST
- Add loading state for activity feed

---

### Task 5: Wire TeamPage to Real Data [>]

**Goal:** Replace mock team data with WebSocket presence + git changelog.

**Files:**
- dashboard-web/src/pages/TeamPage.tsx

**Changes:**
- Fetch `/api/changelog` for activity feed (git commits as activity)
- Use WebSocket connection status for presence indicators
- For local mode: show current user from git config
- Remove `mockMembers` and `mockActivities` constants
- Add loading/error states

---

### Task 6: Wire HealthPage to Real API [>]

**Goal:** Pass real health data to HealthDiagnosticsPanel.

**Files:**
- dashboard-web/src/pages/HealthPage.tsx

**Changes:**
- Fetch `/api/health` on mount
- Fetch `/api/status` for app/test status
- Pass data as props to HealthDiagnosticsPanel
- Add loading skeleton
- Add error state
- Add refresh button

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | — | Server endpoints needed by all pages |
| 2 | 1 | Needs working /api/project |
| 3 | 1 | Needs /api/config GET/PUT |
| 4 | 1 | Needs /api/changelog |
| 5 | 1 | Needs /api/changelog |
| 6 | 1 | Needs /api/health |

**Build order:** Task 1 first, then Tasks 2-6 in parallel.

---

## Estimated Scope

- Tasks: 6
- Modified files: ~7
- New server endpoints: 7
- Tests: ~25 server + update existing dashboard tests
- Mock data removed: 5 constants across 4 files
