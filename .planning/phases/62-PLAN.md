# Phase 62: Revolutionary Dashboard v2.0 - Plan

## Overview

Transform the dashboard-web from a collection of tested components into a fully functional, revolutionary dashboard that replaces the old HTML dashboard in `server/dashboard/`.

**Current State:**
- 637 tests passing
- 90+ components built and tested
- App.tsx is a placeholder (all routes show same dummy component)
- No stores, hooks, or API layer
- Components not wired together

**Target State:**
- Real-time dashboard with WebSocket updates
- All components connected to live data
- Spotlight-style command palette (⌘K)
- Vim-style keyboard navigation
- Framer Motion animations
- Charts and visualizations
- Docker deployment ready

---

## Prerequisites

- [x] Design tokens established
- [x] UI components built (Button, Badge, Card, Input, Modal, Toast, Skeleton, Dropdown)
- [x] Layout components built (Shell, Sidebar, Header, MobileNav)
- [x] Feature components built (ProjectCard, TaskBoard, LogStream, etc.)
- [ ] Server API endpoints verified

---

## Tasks

### Task 1: State Management Layer [x]

**Goal:** Create Zustand stores for global state management

**Files:**
- dashboard-web/src/stores/ui.store.ts
- dashboard-web/src/stores/project.store.ts
- dashboard-web/src/stores/task.store.ts
- dashboard-web/src/stores/log.store.ts
- dashboard-web/src/stores/websocket.store.ts
- dashboard-web/src/stores/index.ts

**Acceptance Criteria:**
- [ ] UI store manages theme, sidebar state, command palette, active view
- [ ] Project store manages current project, list, loading states
- [ ] Task store manages tasks by status, filters, selected task
- [ ] Log store manages log entries by type, filters, search
- [ ] WebSocket store manages connection state, reconnection
- [ ] All stores have TypeScript interfaces

**Test Cases:**
- UI store toggles theme correctly
- Project store handles loading/success/error states
- Task store filters by status and assignee
- Log store limits entries to prevent memory issues
- WebSocket store handles reconnection backoff

---

### Task 2: API Client Layer [x]

**Goal:** Create typed API client for all backend endpoints

**Files:**
- dashboard-web/src/api/client.ts
- dashboard-web/src/api/projects.api.ts
- dashboard-web/src/api/tasks.api.ts
- dashboard-web/src/api/logs.api.ts
- dashboard-web/src/api/health.api.ts
- dashboard-web/src/api/router.api.ts
- dashboard-web/src/api/index.ts

**Acceptance Criteria:**
- [ ] Base client with error handling and auth headers
- [ ] Projects API: getProject, getStatus
- [ ] Tasks API: getTasks, createTask, updateTask, claimTask
- [ ] Logs API: getLogs (with pagination)
- [ ] Health API: getHealth, getServices
- [ ] Router API: getRouterStatus, getProviders
- [ ] All responses typed with TypeScript interfaces

**Test Cases:**
- Client handles 401 (redirect to login)
- Client handles 500 (show error toast)
- Client handles network errors (offline mode)
- All API methods return typed responses

---

### Task 3: WebSocket Hook [x]

**Goal:** Create useWebSocket hook for real-time updates

**Files:**
- dashboard-web/src/hooks/useWebSocket.ts
- dashboard-web/src/hooks/useWebSocket.test.ts

**Acceptance Criteria:**
- [ ] Connects to WebSocket on mount
- [ ] Handles reconnection with exponential backoff
- [ ] Dispatches events to appropriate stores
- [ ] Provides connection status
- [ ] Handles message types: task-update, log-entry, health-update, agent-update

**Test Cases:**
- Connects on mount, disconnects on unmount
- Reconnects after disconnect with backoff
- Parses and dispatches task-update messages
- Updates connection status in UI store

---

### Task 4: Custom Hooks [x]

**Goal:** Create hooks for data fetching and subscriptions

**Files:**
- dashboard-web/src/hooks/useProject.ts
- dashboard-web/src/hooks/useTasks.ts
- dashboard-web/src/hooks/useLogs.ts
- dashboard-web/src/hooks/useHealth.ts
- dashboard-web/src/hooks/useKeyboard.ts
- dashboard-web/src/hooks/useTheme.ts
- dashboard-web/src/hooks/index.ts

**Acceptance Criteria:**
- [ ] useProject: fetches project, subscribes to updates
- [ ] useTasks: fetches tasks, provides CRUD operations
- [ ] useLogs: fetches logs, handles pagination
- [ ] useHealth: fetches health, auto-refreshes
- [ ] useKeyboard: global keyboard shortcuts
- [ ] useTheme: theme toggle with localStorage persistence

**Test Cases:**
- useProject returns loading/data/error states
- useTasks provides filtered task lists
- useLogs handles infinite scroll
- useKeyboard fires callbacks for registered shortcuts

---

### Task 5: Wire Up Dashboard Home [x]

**Goal:** Create functional dashboard home page with real data

**Files:**
- dashboard-web/src/pages/Dashboard.tsx
- dashboard-web/src/pages/Dashboard.test.tsx

**Acceptance Criteria:**
- [ ] Shows project overview card with real stats
- [ ] Shows phase progress bar
- [ ] Shows recent activity feed
- [ ] Shows test status summary
- [ ] Shows quick actions (Run Tests, View Logs, etc.)
- [ ] Loading skeletons while fetching

**Test Cases:**
- Renders loading state initially
- Displays project name from API
- Shows correct test pass/fail counts
- Quick actions navigate to correct routes

---

### Task 6: Wire Up Projects Page [x]

**Goal:** Functional projects page with ProjectGrid and ProjectDetail

**Files:**
- dashboard-web/src/pages/Projects.tsx
- dashboard-web/src/pages/Projects.test.tsx

**Acceptance Criteria:**
- [ ] Shows project grid (or single project in local mode)
- [ ] Project cards show real stats
- [ ] Click project opens detail view
- [ ] Branch selector changes active branch
- [ ] Search filters projects

**Test Cases:**
- Renders projects from API
- Filters by search query
- Opens detail on card click
- Branch selector updates URL

---

### Task 7: Wire Up Tasks Page [x]

**Goal:** Functional Kanban board with drag-and-drop

**Files:**
- dashboard-web/src/pages/Tasks.tsx
- dashboard-web/src/pages/Tasks.test.tsx

**Acceptance Criteria:**
- [ ] TaskBoard shows tasks in columns (To Do, In Progress, Done)
- [ ] Tasks fetched from API (parsed from PLAN.md)
- [ ] Click task opens TaskDetail modal
- [ ] Filter by assignee, priority, phase
- [ ] Keyboard navigation (h/l/j/k)
- [ ] Claim/Release from detail modal

**Test Cases:**
- Renders tasks in correct columns
- Opens detail modal on click
- Filters reduce visible tasks
- Keyboard navigation changes selection

---

### Task 8: Wire Up Logs Page [x]

**Goal:** Real-time log streaming with filtering

**Files:**
- dashboard-web/src/pages/Logs.tsx
- dashboard-web/src/pages/Logs.test.tsx

**Acceptance Criteria:**
- [ ] LogStream shows logs from WebSocket
- [ ] Tabs for log types (App, Test, Git, System)
- [ ] LogSearch filters logs by query
- [ ] Color coding by level (error, warn, info, success)
- [ ] Auto-scroll with pause on user scroll
- [ ] Virtual scrolling for 10k+ entries

**Test Cases:**
- Receives logs via WebSocket
- Filters by type and search
- Color codes by level
- Virtual scroll renders only visible items

---

### Task 9: Wire Up Preview Page [x]

**Goal:** Live app preview with device frames

**Files:**
- dashboard-web/src/pages/Preview.tsx
- dashboard-web/src/pages/Preview.test.tsx

**Acceptance Criteria:**
- [ ] PreviewPanel shows iframe of running app
- [ ] Device toggle (Phone 375px, Tablet 768px, Desktop 100%)
- [ ] Refresh button reloads iframe
- [ ] Open in new tab button
- [ ] Shows app URL
- [ ] Service selector (if multiple services)

**Test Cases:**
- Renders iframe with correct src
- Device toggle changes iframe size
- Refresh reloads iframe
- Service selector updates URL

---

### Task 10: Wire Up Settings Page [x]

**Goal:** Settings page with theme, notifications, keyboard shortcuts

**Files:**
- dashboard-web/src/pages/Settings.tsx
- dashboard-web/src/pages/Settings.test.tsx

**Acceptance Criteria:**
- [ ] Theme toggle (dark/light/system)
- [ ] Notification settings (enable/disable types)
- [ ] Keyboard shortcut reference
- [ ] Connection status display
- [ ] .tlc.json editor (advanced mode)

**Test Cases:**
- Theme toggle persists to localStorage
- Notification settings save
- Keyboard shortcuts display correctly

---

### Task 11: Command Palette Integration [x]

**Goal:** Spotlight-style command palette (⌘K)

**Files:**
- dashboard-web/src/components/settings/CommandPalette.tsx (update)
- dashboard-web/src/hooks/useCommandPalette.ts

**Acceptance Criteria:**
- [ ] Opens with Cmd+K / Ctrl+K
- [ ] Fuzzy search across all commands
- [ ] Recent commands shown first
- [ ] Keyboard navigation (up/down/enter/esc)
- [ ] Categories: Navigation, Actions, Settings
- [ ] Extensible command registry

**Test Cases:**
- Opens on Cmd+K
- Fuzzy search matches commands
- Enter executes selected command
- Esc closes palette

---

### Task 12: Router Configuration [x]

**Goal:** React Router setup with all pages

**Files:**
- dashboard-web/src/App.tsx (rewrite)
- dashboard-web/src/router.tsx

**Acceptance Criteria:**
- [ ] Routes: /, /projects, /tasks, /logs, /preview, /settings, /team, /agents, /health
- [ ] Nested routes for detail views (/tasks/:id)
- [ ] 404 page
- [ ] Route guards (redirect to login if not authenticated)
- [ ] URL synced with active view

**Test Cases:**
- Routes render correct pages
- 404 shows for unknown routes
- Detail routes receive ID parameter

---

### Task 13: Animation System [x]

**Goal:** Framer Motion animations for polish

**Files:**
- dashboard-web/src/components/motion/FadeIn.tsx
- dashboard-web/src/components/motion/SlideIn.tsx
- dashboard-web/src/components/motion/ScaleIn.tsx
- dashboard-web/src/components/motion/ListAnimation.tsx
- dashboard-web/package.json (add framer-motion)

**Acceptance Criteria:**
- [ ] Page transitions (fade + slide)
- [ ] Modal animations (scale + fade)
- [ ] List item stagger animations
- [ ] Toast slide in/out
- [ ] Reduced motion support (prefers-reduced-motion)

**Test Cases:**
- Animations complete without errors
- Reduced motion disables animations
- List stagger delays correctly

---

### Task 14: Charts & Visualizations [x]

**Goal:** Data visualizations for metrics

**Files:**
- dashboard-web/src/components/charts/TestTrendChart.tsx
- dashboard-web/src/components/charts/CoverageChart.tsx
- dashboard-web/src/components/charts/ActivityHeatmap.tsx
- dashboard-web/src/components/charts/CostChart.tsx
- dashboard-web/package.json (add recharts or visx)

**Acceptance Criteria:**
- [ ] Test trend chart (pass/fail over time)
- [ ] Coverage donut chart
- [ ] Activity heatmap (GitHub style)
- [ ] Cost chart (spend over time)
- [ ] Responsive sizing
- [ ] Dark/light theme support

**Test Cases:**
- Charts render with sample data
- Charts handle empty data gracefully
- Theme changes update chart colors

---

### Task 15: Docker Integration [x]

**Goal:** Build and serve dashboard via Docker

**Files:**
- dashboard-web/Dockerfile (update)
- dashboard-web/nginx.conf (update)
- docker-compose.dev.yml (update dashboard service)

**Acceptance Criteria:**
- [ ] Multi-stage build (node build + nginx serve)
- [ ] Nginx serves SPA with fallback to index.html
- [ ] API requests proxied to server
- [ ] WebSocket proxied correctly
- [ ] Environment variables at runtime
- [ ] Health check endpoint

**Test Cases:**
- Docker build succeeds
- Container starts and serves dashboard
- API proxy works
- WebSocket connection works

---

### Task 16: E2E Integration Tests [x]

**Goal:** Playwright E2E tests for critical flows

**Files:**
- dashboard-web/e2e/dashboard.spec.ts
- dashboard-web/e2e/tasks.spec.ts
- dashboard-web/e2e/logs.spec.ts
- dashboard-web/playwright.config.ts

**Acceptance Criteria:**
- [ ] Dashboard loads and shows project
- [ ] Task board displays and filters
- [ ] Logs stream in real-time
- [ ] Command palette works
- [ ] Theme toggle persists
- [ ] Mobile responsive

**Test Cases:**
- E2E: Dashboard loads within 3 seconds
- E2E: Create task via form
- E2E: Filter tasks by status
- E2E: Search logs
- E2E: Theme persists on reload

---

## Dependencies

```
Task 1 (Stores) ← Task 3 (WebSocket Hook) ← Task 4 (Custom Hooks)
Task 2 (API Client) ← Task 4 (Custom Hooks)
Task 4 (Custom Hooks) ← Tasks 5-10 (Pages)
Task 12 (Router) ← Tasks 5-10 (Pages)
Task 11 (Command Palette) ← Task 1 (Stores)
Task 15 (Docker) ← Task 12 (Router)
Task 16 (E2E) ← All other tasks
```

## Estimated Scope

- Tasks: 16
- New Files: ~50
- Updated Files: ~10
- Tests: ~200 (unit + E2E)

---

## Revolutionary Features Summary

| Feature | Implementation |
|---------|---------------|
| **Real-time** | WebSocket store + hooks |
| **Command Palette** | Fuzzy search, keyboard nav |
| **Keyboard Navigation** | useKeyboard hook, vim-style |
| **Animations** | Framer Motion |
| **Charts** | Recharts/Visx |
| **Virtual Scroll** | LogStream already has it |
| **Device Preview** | PreviewPanel with sizes |
| **Dark/Light Theme** | useTheme hook + tokens |
| **Type Safety** | Full TypeScript |
| **Test Coverage** | 637 existing + 200 new |

---

## Success Criteria

- [x] All 16 tasks completed
- [x] 1024+ tests passing (71 files)
- [x] Docker build works
- [x] Replaces old HTML dashboard
- [x] PM can create tasks via GUI
- [x] QA can submit bugs with screenshots
- [x] Real-time updates work
- [x] Keyboard navigation complete
- [x] Accessible (WCAG 2.1 AA)
