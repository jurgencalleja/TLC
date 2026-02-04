# Phase 62 Test Plan

## Task 1: State Management Layer

### File: dashboard-web/src/stores/ui.store.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| toggles theme between dark and light | happy path | theme state changes |
| toggles sidebar collapsed state | happy path | collapsed state toggles |
| opens and closes command palette | happy path | isCommandPaletteOpen toggles |
| sets active view | happy path | activeView updates |
| persists theme to localStorage | happy path | localStorage.setItem called |
| loads theme from localStorage on init | happy path | initial state from storage |

### File: dashboard-web/src/stores/project.store.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| initial state is loading false, project null | happy path | correct initial state |
| setProject updates project and clears loading | happy path | project set, loading false |
| setLoading sets loading state | happy path | loading state changes |
| setError sets error and clears loading | error | error set, loading false |
| clearError removes error | happy path | error cleared |

### File: dashboard-web/src/stores/task.store.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| setTasks populates task list | happy path | tasks array populated |
| filters tasks by status | happy path | filtered list correct |
| filters tasks by assignee | happy path | filtered list correct |
| selectTask sets selected task | happy path | selectedTask updated |
| updateTask modifies existing task | happy path | task updated in list |
| addTask appends new task | happy path | task added |

### File: dashboard-web/src/stores/log.store.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| addLog appends log entry | happy path | log added to type |
| limits logs to MAX_LOGS per type | edge case | oldest logs removed |
| setLogType changes active type | happy path | activeType updated |
| clearLogs removes all logs | happy path | logs emptied |
| filters logs by search query | happy path | filtered results |

### File: dashboard-web/src/stores/websocket.store.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| initial state is disconnected | happy path | status is 'disconnected' |
| setConnected updates status | happy path | status is 'connected' |
| setReconnecting updates status | happy path | status is 'reconnecting' |
| incrementReconnectAttempts increases count | happy path | count incremented |
| resetReconnectAttempts resets to zero | happy path | count is 0 |

---

## Task 2: API Client Layer

### File: dashboard-web/src/api/client.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| makes GET request with correct URL | happy path | fetch called with URL |
| makes POST request with body | happy path | fetch called with body |
| adds auth header when token exists | happy path | Authorization header set |
| handles 401 by redirecting to login | error | window.location changed |
| handles 500 with error message | error | throws ApiError |
| handles network error | error | throws NetworkError |

### File: dashboard-web/src/api/projects.api.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| getProject returns typed project | happy path | Project type returned |
| getStatus returns test counts | happy path | status object returned |

### File: dashboard-web/src/api/tasks.api.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| getTasks returns task array | happy path | Task[] returned |
| createTask posts and returns task | happy path | created task returned |
| updateTask patches and returns task | happy path | updated task returned |
| claimTask updates owner | happy path | task with owner returned |

---

## Task 3: WebSocket Hook

### File: dashboard-web/src/hooks/useWebSocket.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| connects to WebSocket on mount | happy path | WebSocket constructed |
| disconnects on unmount | happy path | ws.close called |
| calls onMessage when message received | happy path | handler invoked |
| reconnects with exponential backoff | error | setTimeout with increasing delay |
| updates connection status on open | happy path | store status updated |
| updates connection status on close | error | store status updated |
| parses JSON messages | happy path | parsed object passed to handler |
| handles malformed JSON gracefully | edge case | no crash, error logged |

---

## Task 4: Custom Hooks

### File: dashboard-web/src/hooks/useProject.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| returns loading true initially | happy path | loading is true |
| fetches project on mount | happy path | API called |
| returns project data after fetch | happy path | project populated |
| handles fetch error | error | error state set |

### File: dashboard-web/src/hooks/useTasks.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| returns tasks from store | happy path | tasks returned |
| provides filter function | happy path | filter updates store |
| provides createTask function | happy path | API called, store updated |

### File: dashboard-web/src/hooks/useKeyboard.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| registers keyboard listener on mount | happy path | addEventListener called |
| unregisters on unmount | happy path | removeEventListener called |
| calls handler for registered shortcut | happy path | callback invoked |
| ignores unregistered shortcuts | edge case | no callback |
| handles modifier keys (Ctrl, Cmd) | happy path | modifiers detected |

### File: dashboard-web/src/hooks/useTheme.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| returns current theme from store | happy path | theme value returned |
| toggle switches theme | happy path | theme changes |
| persists theme to localStorage | happy path | localStorage updated |
| respects system preference initially | happy path | matches prefers-color-scheme |

---

## Task 5-10: Pages (similar pattern)

Each page test file follows:
- Renders loading skeleton initially
- Displays data after fetch
- Handles empty state
- Responds to user interactions
- Keyboard navigation works

---

## Task 11: Command Palette Integration

### File: dashboard-web/src/hooks/useCommandPalette.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| opens palette on Cmd+K | happy path | isOpen becomes true |
| closes palette on Escape | happy path | isOpen becomes false |
| filters commands by query | happy path | filtered list returned |
| executes command on Enter | happy path | command action called |
| navigates with arrow keys | happy path | selectedIndex changes |
| shows recent commands first | happy path | recent at top |

---

## Task 12: Router Configuration

### File: dashboard-web/src/router.test.tsx

| Test | Type | Expected Result |
|------|------|-----------------|
| / renders Dashboard page | happy path | Dashboard component shown |
| /projects renders Projects page | happy path | Projects component shown |
| /tasks renders Tasks page | happy path | Tasks component shown |
| /tasks/:id renders TaskDetail | happy path | TaskDetail with id |
| /unknown renders 404 page | edge case | NotFound component |
| redirects to login when not authenticated | auth | login page shown |

---

## Task 13-14: Animations & Charts

### File: dashboard-web/src/components/motion/FadeIn.test.tsx

| Test | Type | Expected Result |
|------|------|-----------------|
| renders children | happy path | children visible |
| respects reduced motion | a11y | no animation class |

### File: dashboard-web/src/components/charts/TestTrendChart.test.tsx

| Test | Type | Expected Result |
|------|------|-----------------|
| renders with data | happy path | chart rendered |
| handles empty data | edge case | empty state shown |
| updates on theme change | happy path | colors update |

---

## Dependencies to mock:
- fetch (all API tests)
- WebSocket (useWebSocket tests)
- localStorage (theme persistence)
- window.matchMedia (system theme)
- React Router (navigation tests)
