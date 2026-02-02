# Phase 39: Functional Web Dashboard

## Overview

Transform the web dashboard from a UI shell into a polished, working application inspired by **Replit** and **Coolify**. Every interaction should feel instant, every action should have feedback, and non-dev users (PMs, QA, clients) should be able to use it without reading docs.

## Core Concepts

### 1. Self-Awareness (AI Context Loading)
TLC must know itself. Every Claude session should automatically understand:
- What modules exist and their test status
- What APIs are real vs placeholder
- What dashboard panels work vs broken
- Current project state

**Implementation:** `/tlc` generates `.tlc/MANIFEST.md` on every run, which gets loaded into context via CLAUDE.md include.

### 2. Self-Healing Dashboard
The dashboard must never show blank screens or crash. When something breaks:
- API missing → Show "Not configured" with setup hint
- API error → Show retry button, not console dump
- WebSocket dies → Auto-reconnect, show banner
- Module missing → Graceful degradation, not 500

**Implementation:** Every fetch wrapped in try/catch with fallback UI.

### 3. Auto-Update Detection
Devserver should know when TLC has new functionality:
- Detect version mismatch (local vs deployed)
- Show banner: "TLC v1.5.0 available"
- One-click update button
- Changelog preview

**Implementation:** Version check on dashboard load, compare with npm registry or git tags.

## Design Principles (from Replit/Coolify)

1. **Instant feedback** - Submit → see result immediately (optimistic UI)
2. **Real-time sync** - WebSocket pushes updates to all panels
3. **Loading states** - Skeletons, not blank screens
4. **Error recovery** - Friendly messages + retry buttons, not console dumps
5. **Mobile-first** - QA tests on iPads, clients use phones on-site
6. **One-click actions** - Bug with screenshot in 2 clicks, not 5
7. **Zero config** - Works out of the box, no setup required

## Problem Statement

The web dashboard (server/dashboard/index.html) has:
- ✅ Beautiful Coolify-style dark theme
- ✅ WebSocket connection code
- ✅ JavaScript that calls APIs
- ❌ APIs that don't exist or return wrong format
- ❌ No loading states (blank panels while loading)
- ❌ No error states (silent failures)
- ❌ No way to CREATE tasks/bugs (only view)
- ❌ No client-facing mode for external users
- ❌ No real-time updates working

## Prerequisites

- [x] Phase 38 complete (Dashboard components exist)
- [x] Server index.js has basic API structure

## Tasks

### Task 0: TLC Self-Awareness Module

**Goal:** TLC introspects itself and generates context for AI tools

**Files:**
- server/lib/introspect.js (create)
- server/lib/introspect.test.js (create)
- CLAUDE.md (add include directive)

**What it scans:**
```
Modules:     server/lib/*.js → count tests, check exports
APIs:        server/index.js → extract app.get/post routes
Dashboard:   server/dashboard/index.html → extract panel IDs, fetch calls
Tests:       npm test --json → pass/fail counts
Config:      .tlc.json → current settings
```

**Output:** `.tlc/MANIFEST.md`
```markdown
# TLC Manifest (auto-generated)
Generated: 2024-02-02T10:30:00Z

## Modules (147 files, 2847 tests)
| Module | Tests | Passing | Status |
|--------|-------|---------|--------|
| cli-detector | 13 | 13 | ✅ |
| tasks-api | 0 | 0 | ❌ Missing |
| health-api | 0 | 0 | ❌ Missing |

## API Endpoints (23 routes)
| Method | Path | Handler | Status |
|--------|------|---------|--------|
| GET | /api/tasks | parsePlan | ⚠️ Wrong format |
| GET | /api/health | - | ❌ Missing |
| POST | /api/bug | handlers | ✅ Working |

## Dashboard Panels
| Panel | API | Status |
|-------|-----|--------|
| tasks | /api/tasks | ⚠️ Format mismatch |
| health | /api/health | ❌ No API |
| bugs | /api/bugs | ✅ Working |

## What Needs Work
1. tasks-api.js - API returns wrong format
2. health-api.js - Endpoint missing
3. router-status-api.js - Endpoint missing
```

**CLAUDE.md Integration:**
```markdown
<!-- In CLAUDE.md -->
## Current TLC State
See `.tlc/MANIFEST.md` for auto-generated module/API status.
Always check this before assuming what exists.
```

**Acceptance Criteria:**
- [ ] `tlc introspect` generates MANIFEST.md
- [ ] Runs automatically on `/tlc`
- [ ] Detects modules with/without tests
- [ ] Detects API endpoints from index.js
- [ ] Detects dashboard panel data sources
- [ ] Flags mismatches (panel expects API that doesn't exist)

**Test Cases:**
- Scans server/lib and counts files
- Extracts test counts from test files
- Parses app.get/post from index.js
- Parses fetch() calls from dashboard HTML
- Generates valid markdown

---

### Task 1: Fix Tasks API + Loading State

**Goal:** Make `/api/tasks` return correct format with proper UX

**Files:**
- server/lib/tasks-api.js (create)
- server/lib/tasks-api.test.js (create)
- server/index.js (add route)

**Current:** Returns `{ phase, phaseName, items: [...] }`
**Expected:** Returns `[{ id, title, status, owner, phase, createdAt }]`

**Acceptance Criteria:**
- [ ] GET /api/tasks returns flat array of tasks
- [ ] Each task has: id, title, status (pending/in_progress/completed), owner, phase
- [ ] Status mapped from PLAN.md markers: `[ ]`→pending, `[>@user]`→in_progress, `[x@user]`→completed
- [ ] Dashboard shows skeleton while loading
- [ ] Dashboard shows empty state when no tasks

**Test Cases:**
- Returns empty array when no PLAN.md
- Returns tasks with correct status mapping
- Owner extracted from `[>@user]` markers
- Handles malformed PLAN.md gracefully
- Multiple phases aggregated

---

### Task 2: Add Health API Endpoint

**Goal:** Create `/api/health` endpoint matching dashboard expectations

**Files:**
- server/lib/health-api.js (create)
- server/lib/health-api.test.js (create)
- server/index.js (add route)

**Acceptance Criteria:**
- [ ] GET /api/health returns { status, memory, cpu, disk, services, uptime }
- [ ] Memory: process.memoryUsage().heapUsed
- [ ] Services: detect running processes (app server, test runner)
- [ ] Dashboard health cards update with real values
- [ ] Color coding: good (green), warning (yellow), bad (red)

**Test Cases:**
- Returns memory in bytes
- Returns services array with state
- CPU usage calculation works
- Handles os module errors
- Works on Linux/Mac/Windows

---

### Task 3: Add Router Status API

**Goal:** Create `/api/router/status` using Phase 33 modules

**Files:**
- server/lib/router-status-api.js (create)
- server/lib/router-status-api.test.js (create)
- server/index.js (add route)

**Acceptance Criteria:**
- [ ] GET /api/router/status returns { providers, capabilities, devserver, usage }
- [ ] Providers from cli-detector.js (claude, codex, gemini, deepseek)
- [ ] Each provider has: name, type (cli/api), detected (bool), version
- [ ] Devserver connection status
- [ ] Dashboard router panel renders provider cards

**Test Cases:**
- Returns detected CLI providers
- Returns version when available
- Handles no providers gracefully
- Integrates with existing cli-detector.js
- Returns usage statistics

---

### Task 4: Add Create Task API

**Goal:** Allow creating tasks via POST /api/tasks

**Files:**
- server/lib/tasks-api.js (extend)
- server/lib/tasks-api.test.js (extend)

**Acceptance Criteria:**
- [ ] POST /api/tasks creates task in current phase PLAN.md
- [ ] Request body: { title, description?, priority? }
- [ ] Returns created task with generated id
- [ ] Broadcasts 'task-created' via WebSocket
- [ ] Validation: title required, max 200 chars

**Test Cases:**
- Creates task with title only
- Creates task with description
- Appends to existing Tasks section in PLAN.md
- Creates Tasks section if missing
- Rejects empty title with 400
- WebSocket broadcast on success

---

### Task 5: Task Creation UI

**Goal:** Replit-style quick task creation

**Files:**
- server/dashboard/index.html (modify)

**Acceptance Criteria:**
- [ ] "+" button in tasks panel header (Replit-style)
- [ ] Inline form expands (not modal - faster)
- [ ] Title field with placeholder "What needs to be done?"
- [ ] Enter submits, Esc cancels
- [ ] Optimistic UI: task appears immediately, removes on error
- [ ] Toast on success/error

**Test Cases (manual E2E):**
- Form expands on + click
- Enter submits form
- Esc cancels and collapses
- Task appears instantly (before API returns)
- Error toast if API fails
- Focus returns to + button after submit

---

### Task 6: Bug Submission Panel (Coolify-style)

**Goal:** One-click bug submission with screenshots

**Files:**
- server/dashboard/index.html (add bugs panel)

**Current:** No dedicated bugs panel, form is hidden
**Expected:** Visible bugs panel with form + list

**Acceptance Criteria:**
- [ ] New "Bugs" nav item in sidebar
- [ ] Bug form: title, description, severity dropdown, screenshot button
- [ ] Screenshot captures preview iframe via html2canvas
- [ ] Severity: critical (red), high (orange), medium (yellow), low (gray)
- [ ] Bug list with status badges
- [ ] Filter: All / Open / Closed

**Test Cases (manual E2E):**
- Bug form visible on bugs panel
- Screenshot button captures preview
- Severity selector works
- Submit creates bug in BUGS.md
- Bug appears in list immediately
- Filter toggles work

---

### Task 7: Project Notes Panel

**Goal:** View and edit PROJECT.md from dashboard

**Files:**
- server/lib/notes-api.js (create)
- server/lib/notes-api.test.js (create)
- server/index.js (add routes)
- server/dashboard/index.html (add panel)

**Acceptance Criteria:**
- [ ] GET /api/notes returns { content, lastModified }
- [ ] PUT /api/notes saves content
- [ ] Notes panel with markdown preview (marked.js)
- [ ] "Edit" button switches to textarea
- [ ] "Save" / "Cancel" buttons
- [ ] Auto-save draft to localStorage

**Test Cases:**
- Returns PROJECT.md content
- Returns empty content when no file
- PUT creates file if missing
- PUT updates existing file
- Concurrent edit warning (If-Modified-Since)

---

### Task 8: Client Mode Dashboard

**Goal:** Simplified dashboard for external clients

**Files:**
- server/dashboard/client.html (create)
- server/index.js (add route)

**Design:** Single page with:
- App preview (full width)
- Bug report button (floating action button)
- Bug form (slide-up panel)
- Status indicator (connected/disconnected)

**Acceptance Criteria:**
- [ ] GET /client serves client mode
- [ ] Only shows: Preview + Bug Report
- [ ] No sidebar, no navigation, no code
- [ ] Project name in header (from .tlc.json or package.json)
- [ ] Mobile-first: works on iPhone SE (375px)
- [ ] FAB (floating action button) for "Report Bug"

**Test Cases (manual E2E):**
- Page loads without errors
- Preview iframe shows app
- FAB opens bug form
- Bug form submits successfully
- Works on mobile viewport

---

### Task 9: Real-Time WebSocket Integration

**Goal:** All panels update in real-time

**Files:**
- server/dashboard/index.html (modify WebSocket handlers)
- server/index.js (add broadcasts)

**Current:** WebSocket connects but doesn't update UI properly
**Expected:** All data changes broadcast and UI updates

**Acceptance Criteria:**
- [ ] Task created → tasks panel updates
- [ ] Bug submitted → bugs panel updates
- [ ] Test run → logs panel streams
- [ ] Agent started → agents panel updates
- [ ] Connection lost → banner shows "Reconnecting..."
- [ ] Reconnect → full data refresh

**Broadcast Events:**
- task-created, task-updated
- bug-created, bug-updated
- test-start, test-output, test-complete
- agent-created, agent-updated
- health-update (every 30s)

**Test Cases:**
- WebSocket connects on page load
- Receives task-created, panel updates
- Receives bug-created, panel updates
- Disconnect shows banner
- Reconnect refreshes all data

---

### Task 10: Loading & Error States

**Goal:** Every panel has proper loading and error states

**Files:**
- server/dashboard/index.html (modify all panels)

**Acceptance Criteria:**
- [ ] Loading: skeleton cards (gray pulsing placeholders)
- [ ] Empty: friendly message + action (e.g., "No tasks yet. Create one!")
- [ ] Error: red banner with retry button
- [ ] Retry button calls refresh function
- [ ] Toast notifications for actions (success green, error red)

**Skeleton Design:**
```
┌────────────────────────┐
│ ████████████  ████     │  <- Title placeholder
│ ██████████████████████ │  <- Description placeholder
│ ████  ████             │  <- Meta placeholder
└────────────────────────┘
```

**Test Cases (manual E2E):**
- Skeleton shows while loading
- Empty state shows when no data
- Error state shows on API failure
- Retry button works
- Toast appears on action

---

### Task 11: Integration Tests (Playwright)

**Goal:** E2E tests for all flows

**Files:**
- tests/e2e/dashboard-functional.spec.ts (create)

**Test Flows:**
1. Task creation: Open dashboard → Create task → See task in list
2. Bug submission: Open dashboard → Submit bug → See bug in list
3. Notes editing: Open notes → Edit → Save → Verify saved
4. Client mode: Open /client → Submit bug → Verify created
5. Real-time: Open 2 tabs → Create task in tab 1 → See in tab 2

**Acceptance Criteria:**
- [ ] All 5 flows pass
- [ ] Tests run in CI
- [ ] Screenshots on failure
- [ ] < 30s total runtime

---

### Task 12: Self-Healing Error Boundaries

**Goal:** Dashboard never crashes, always shows helpful fallback

**Files:**
- server/dashboard/index.html (wrap all fetches)

**Error Handling Pattern:**
```javascript
async function safeFetch(url, panelId) {
  const panel = document.getElementById(panelId);
  try {
    panel.innerHTML = renderSkeleton();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    panel.innerHTML = renderError(err, () => safeFetch(url, panelId));
    reportError(url, err); // Log to /api/errors for debugging
    return null;
  }
}
```

**Fallback States:**
| Error | Fallback UI |
|-------|-------------|
| 404 Not Found | "This feature isn't set up yet. Run `tlc setup`" |
| 500 Server Error | "Something went wrong. [Retry] [View Logs]" |
| Network Error | "Can't reach server. Check if `tlc server` is running" |
| Timeout | "Request timed out. [Retry]" |
| Parse Error | "Received invalid data. [Report Bug]" |

**Acceptance Criteria:**
- [ ] Every fetch has try/catch
- [ ] Every panel has error state
- [ ] Retry button actually retries
- [ ] Errors logged to /api/errors
- [ ] No blank panels ever

**Test Cases:**
- 404 shows setup hint
- 500 shows retry button
- Network error shows server hint
- Retry button calls fetch again
- Multiple errors don't stack

---

### Task 13: Auto-Update Detection (Devserver)

**Goal:** Devserver knows when TLC has updates available

**Files:**
- server/lib/version-checker.js (create)
- server/lib/version-checker.test.js (create)
- server/dashboard/index.html (add update banner)

**Version Check Flow:**
```
1. Dashboard loads
2. GET /api/version → { current: "1.4.2", latest: "1.5.0", changelog: [...] }
3. If current < latest → Show update banner
4. User clicks "Update" → POST /api/update
5. Server pulls latest, restarts
```

**Update Banner:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎉 TLC v1.5.0 available (you have v1.4.2)                   │
│                                                             │
│ What's new:                                                 │
│ • Self-healing dashboard                                    │
│ • Client mode for external testers                          │
│ • Real-time WebSocket sync                                  │
│                                                             │
│ [Update Now]  [Remind Me Later]  [View Changelog]      [×]  │
└─────────────────────────────────────────────────────────────┘
```

**Version Sources:**
- Local: package.json version
- Latest: npm registry OR git tags OR GitHub releases

**Acceptance Criteria:**
- [ ] GET /api/version returns current and latest
- [ ] Compares semver correctly
- [ ] Shows banner only when update available
- [ ] Banner dismissable (remembers for 24h)
- [ ] "Update Now" triggers update process
- [ ] Changelog fetched from CHANGELOG.md or GitHub

**Test Cases:**
- Returns correct current version
- Fetches latest from npm
- Semver comparison works (1.5.0 > 1.4.2)
- Banner not shown if up to date
- Banner shows changelog items
- Dismiss persists to localStorage

---

### Task 14: Health Check Self-Repair

**Goal:** Dashboard detects and suggests fixes for common issues

**Files:**
- server/lib/health-check.js (create)
- server/lib/health-check.test.js (create)
- server/dashboard/index.html (add health diagnostics)

**Health Checks:**
| Check | Detection | Auto-Fix |
|-------|-----------|----------|
| Server not running | fetch timeout | "Run `tlc server`" |
| App not running | /api/status.appRunning=false | "Run `tlc start`" |
| No .tlc.json | 404 on config | "Run `tlc init`" |
| Missing API | 404 on endpoint | "Update TLC: `npm update tlc`" |
| Test failures | /api/status.testsFail > 0 | "Run `tlc:build` to fix" |
| Outdated deps | /api/outdated | "Run `npm update`" |

**Diagnostics Panel:**
```
System Health
─────────────
✅ TLC Server     Running on :3147
✅ App Server     Running on :5001
⚠️ Tests          3 failing
❌ Health API     Not configured
   └─ Fix: This is a new feature. Update TLC to enable.

[Run Diagnostics] [Auto-Fix All]
```

**Acceptance Criteria:**
- [ ] GET /api/health/diagnostics returns all checks
- [ ] Each check has: name, status, message, fix
- [ ] "Auto-Fix" runs safe fixes (not destructive)
- [ ] Diagnostics panel in Settings or Health view
- [ ] Fix commands are copy-paste ready

**Test Cases:**
- Detects missing config file
- Detects server not responding
- Detects test failures
- Suggests correct fix command
- Auto-fix runs safe commands only

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 0 | - | Foundation - runs first |
| 1-3 | 0 | APIs need introspection context |
| 4 | 1 | Create needs list API |
| 5 | 4 | Form needs create API |
| 6 | - | Bug API exists |
| 7 | - | Independent |
| 8 | 6 | Client uses bug form |
| 9 | 1-4 | WebSocket needs APIs |
| 10 | 1-9 | Polish after features |
| 11 | All | Integration after all |
| 12 | 10 | Error handling polish |
| 13 | 2 | Version check needs health |
| 14 | 2, 12 | Diagnostics needs health + errors |

**Execution Order:**
```
Phase A (Foundation):
  └─ Task 0: Introspection

Phase B (APIs - parallel):
  ├─ Task 1: Tasks API
  ├─ Task 2: Health API
  ├─ Task 3: Router Status API
  └─ Task 7: Notes API

Phase C (Create APIs):
  └─ Task 4: Create Task API

Phase D (UI - parallel):
  ├─ Task 5: Task Creation UI
  ├─ Task 6: Bug Panel
  └─ Task 8: Client Mode

Phase E (Integration):
  └─ Task 9: WebSocket Integration

Phase F (Polish):
  ├─ Task 10: Loading & Error States
  └─ Task 12: Self-Healing Error Boundaries

Phase G (Devserver):
  ├─ Task 13: Auto-Update Detection
  └─ Task 14: Health Check Self-Repair

Phase H (Testing):
  └─ Task 11: E2E Tests
```

## Definition of Done

A panel is "done" when it has:
- [ ] Real data from API
- [ ] Loading skeleton
- [ ] Empty state
- [ ] Error state with retry
- [ ] Real-time WebSocket updates
- [ ] Mobile responsive (375px+)
- [ ] Keyboard accessible
- [ ] Self-healing (never crashes)

## Estimated Scope

- Tasks: 15 (0-14)
- Files: ~25
- Unit Tests: ~150
- E2E Tests: ~25
- Total: ~175 tests

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first render | < 500ms |
| API error → fallback | < 100ms |
| WebSocket reconnect | < 3s |
| Mobile usable | iPhone SE (375px) |
| Crash rate | 0% (self-healing) |
| PM can create task | < 10 seconds |
| QA can submit bug | < 30 seconds |
| Client can report bug | < 20 seconds |
