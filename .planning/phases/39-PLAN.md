# Phase 39: Functional Web Dashboard - Plan

## Overview

Transform web dashboard from UI shell into working application for PMs, QA, and clients.

## Prerequisites

- [x] Dashboard UI exists (from v2.0)
- [x] Basic server infrastructure

## Tasks

### Task 1: TLC Introspection Module

**Goal:** Server module to read TLC project state

**Files:**
- server/lib/dashboard/tlc-introspection.js
- server/lib/dashboard/tlc-introspection.test.js

**Acceptance Criteria:**
- [ ] Reads .planning/ROADMAP.md and parses phases
- [ ] Reads PROJECT.md for project info
- [ ] Reads .tlc.json for configuration
- [ ] Returns structured project state

**Test Cases:**
- Parses roadmap phases with status
- Extracts project name and description
- Handles missing files gracefully
- Returns test counts from TESTS.md files

---

### Task 2: Tasks API Module

**Goal:** REST API for task management

**Files:**
- server/lib/dashboard/tasks-api.js
- server/lib/dashboard/tasks-api.test.js

**Acceptance Criteria:**
- [ ] GET /api/tasks returns flat task array
- [ ] POST /api/tasks creates new task
- [ ] PATCH /api/tasks/:id updates task
- [ ] Tasks read from/write to PLAN.md files

**Test Cases:**
- GET returns tasks from current phase
- POST creates task with required fields
- PATCH updates task status
- Validates task format

---

### Task 3: Health API Module

**Goal:** Health check endpoint for dashboard

**Files:**
- server/lib/dashboard/health-api.js
- server/lib/dashboard/health-api.test.js

**Acceptance Criteria:**
- [ ] GET /api/health returns server status
- [ ] Includes uptime, memory, test status
- [ ] Returns degraded status on issues

**Test Cases:**
- Returns healthy status
- Includes system metrics
- Detects degraded conditions

---

### Task 4: Router Status API

**Goal:** Multi-LLM router status for dashboard

**Files:**
- server/lib/dashboard/router-api.js
- server/lib/dashboard/router-api.test.js

**Acceptance Criteria:**
- [ ] GET /api/router/status returns provider states
- [ ] Shows costs, request counts, errors
- [ ] Filters by time range

**Test Cases:**
- Returns all provider statuses
- Calculates cost totals
- Filters by date range

---

### Task 5: Notes API Module

**Goal:** PROJECT.md and notes management

**Files:**
- server/lib/dashboard/notes-api.js
- server/lib/dashboard/notes-api.test.js

**Acceptance Criteria:**
- [ ] GET /api/notes returns PROJECT.md content
- [ ] PUT /api/notes updates PROJECT.md
- [ ] GET /api/notes/bugs returns BUGS.md

**Test Cases:**
- Reads PROJECT.md
- Writes updates safely
- Handles concurrent edits

---

### Task 6: Bug Submission Panel

**Goal:** Enhanced bug form with screenshots

**Files:**
- dashboard-web/src/components/BugSubmitPanel.tsx
- dashboard-web/src/components/BugSubmitPanel.test.tsx

**Acceptance Criteria:**
- [ ] Form with title, description, severity
- [ ] Screenshot paste/upload support
- [ ] Submits to /api/bugs endpoint

**Test Cases:**
- Renders form fields
- Handles screenshot paste
- Validates required fields
- Submits successfully

---

### Task 7: Task Creation UI

**Goal:** Task creation form in dashboard

**Files:**
- dashboard-web/src/components/TaskCreatePanel.tsx
- dashboard-web/src/components/TaskCreatePanel.test.tsx

**Acceptance Criteria:**
- [ ] Form with subject, description, phase
- [ ] Assigns to current phase by default
- [ ] Shows success/error feedback

**Test Cases:**
- Renders form
- Submits to API
- Shows validation errors

---

### Task 8: Client Mode Dashboard

**Goal:** Simplified dashboard for external users

**Files:**
- dashboard-web/src/pages/ClientDashboard.tsx
- dashboard-web/src/pages/ClientDashboard.test.tsx

**Acceptance Criteria:**
- [ ] Shows project progress (no code details)
- [ ] Bug submission form
- [ ] Status updates view
- [ ] No access to internal tooling

**Test Cases:**
- Renders client view
- Hides developer features
- Shows bug form
- Displays progress bars

---

### Task 9: WebSocket Integration

**Goal:** Real-time updates for dashboard

**Files:**
- server/lib/dashboard/websocket-server.js
- server/lib/dashboard/websocket-server.test.js

**Acceptance Criteria:**
- [ ] WebSocket server for live updates
- [ ] Broadcasts task changes
- [ ] Broadcasts test results
- [ ] Client reconnection handling

**Test Cases:**
- Connects clients
- Broadcasts events
- Handles disconnection
- Reconnects automatically

---

### Task 10: Dashboard API Server

**Goal:** Express server combining all APIs

**Files:**
- server/lib/dashboard/api-server.js
- server/lib/dashboard/api-server.test.js

**Acceptance Criteria:**
- [ ] Mounts all API routes
- [ ] CORS configuration
- [ ] Error handling middleware
- [ ] Request logging

**Test Cases:**
- Mounts routes correctly
- Handles CORS
- Returns proper error format

---

### Task 11: Self-Healing Error Boundaries

**Goal:** Dashboard gracefully handles API failures

**Files:**
- dashboard-web/src/components/ErrorBoundary.tsx
- dashboard-web/src/components/ErrorBoundary.test.tsx

**Acceptance Criteria:**
- [ ] Catches component errors
- [ ] Shows friendly error message
- [ ] Retry button for failed requests
- [ ] Reports errors to server

**Test Cases:**
- Catches errors
- Renders fallback
- Retry works

---

### Task 12: Version Check API

**Goal:** Dashboard checks for TLC updates

**Files:**
- server/lib/dashboard/version-api.js
- server/lib/dashboard/version-api.test.js

**Acceptance Criteria:**
- [ ] GET /api/version returns current version
- [ ] Checks npm for latest version
- [ ] Returns update available flag

**Test Cases:**
- Returns current version
- Detects updates
- Handles network errors

---

### Task 13: Health Diagnostics Panel

**Goal:** Dashboard panel showing system health

**Files:**
- dashboard-web/src/components/HealthDiagnosticsPanel.tsx
- dashboard-web/src/components/HealthDiagnosticsPanel.test.tsx

**Acceptance Criteria:**
- [ ] Shows server health status
- [ ] Memory/CPU graphs
- [ ] Test pass rate
- [ ] Router provider status

**Test Cases:**
- Renders health status
- Updates in real-time
- Shows alerts on issues

## Dependencies

- Task 10 depends on Tasks 1-5, 9
- Tasks 6, 7, 8, 11, 13 are UI-only, can be parallel

## Estimated Scope

- Tasks: 13
- Files: ~26
- Tests: ~150 (estimated)
