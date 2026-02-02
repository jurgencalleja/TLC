# Phase 36: Agent Orchestration Dashboard - Plan

## Overview

Visual UI for monitoring and controlling AI agents. Real-time status, cost visibility, and quality indicators.

## Prerequisites

- [x] Phase 32 complete (Agent Registry)
- [x] Phase 33 complete (Multi-Model Router)
- [x] Phase 34 complete (Cost Controller)
- [x] Phase 35 complete (Quality Gate)

## Tasks

### Task 1: AgentList Component [ ]

**Goal:** List view of all agents with status

**Files:**
- dashboard/src/components/orchestration/AgentList.tsx
- dashboard/src/components/orchestration/AgentList.test.tsx

**Acceptance Criteria:**
- [ ] Show running agents
- [ ] Show queued agents
- [ ] Show completed agents
- [ ] Filter by status
- [ ] Sort by start time, cost, model
- [ ] Pagination for large lists

**Test Cases:**
- renders running agents
- renders queued agents
- renders completed agents
- filter by status works
- sort by time works
- sort by cost works
- sort by model works
- pagination shows page controls
- pagination changes page
- empty state shows message
- loading state shows spinner

---

### Task 2: AgentCard Component [ ]

**Goal:** Card display for individual agent

**Files:**
- dashboard/src/components/orchestration/AgentCard.tsx
- dashboard/src/components/orchestration/AgentCard.test.tsx

**Acceptance Criteria:**
- [ ] Show agent name/ID
- [ ] Show model with icon
- [ ] Show status badge
- [ ] Show elapsed time
- [ ] Show token count
- [ ] Show cost
- [ ] Show quality score (if available)

**Test Cases:**
- renders agent ID
- renders model name
- renders model icon
- status badge shows correct color
- elapsed time updates
- token count displays
- cost displays with currency
- quality score shows when available
- quality score hidden when unavailable
- click opens detail view

---

### Task 3: AgentDetail Component [ ]

**Goal:** Detailed view of agent execution

**Files:**
- dashboard/src/components/orchestration/AgentDetail.tsx
- dashboard/src/components/orchestration/AgentDetail.test.tsx

**Acceptance Criteria:**
- [ ] Full agent metadata
- [ ] Token breakdown (input/output)
- [ ] Cost breakdown
- [ ] Execution timeline
- [ ] Output preview
- [ ] Error details (if failed)

**Test Cases:**
- renders full metadata
- token breakdown shows input/output
- cost breakdown shows calculation
- timeline shows state transitions
- output preview shows result
- error details shown on failure
- error stack trace expandable
- retry button shown on failure
- close button returns to list
- loading state handled

---

### Task 4: AgentControls Component [ ]

**Goal:** Control buttons for agent management

**Files:**
- dashboard/src/components/orchestration/AgentControls.tsx
- dashboard/src/components/orchestration/AgentControls.test.tsx

**Acceptance Criteria:**
- [ ] Pause button (running → paused)
- [ ] Resume button (paused → running)
- [ ] Cancel button (any → cancelled)
- [ ] Retry button (failed/cancelled → pending)
- [ ] Confirm dialogs for destructive actions
- [ ] Disabled states when invalid

**Test Cases:**
- pause button shown for running
- pause button triggers pause
- resume button shown for paused
- resume button triggers resume
- cancel button shown for running/queued
- cancel button shows confirm dialog
- retry button shown for failed
- retry button triggers retry
- buttons disabled during transition
- keyboard shortcuts work

---

### Task 5: CostMeter Component [ ]

**Goal:** Visual budget meter

**Files:**
- dashboard/src/components/orchestration/CostMeter.tsx
- dashboard/src/components/orchestration/CostMeter.test.tsx

**Acceptance Criteria:**
- [ ] Progress bar (spent vs budget)
- [ ] Daily/monthly toggle
- [ ] Color coding (green/yellow/red)
- [ ] Remaining budget display
- [ ] Projected end-of-period
- [ ] Drill-down by model

**Test Cases:**
- progress bar shows percentage
- daily view shows daily budget
- monthly view shows monthly budget
- green color under 50%
- yellow color at 50-80%
- red color over 80%
- remaining budget calculates
- projection estimates end of period
- model breakdown shows per-model
- click on model filters view

---

### Task 6: ModelSelector Component [ ]

**Goal:** Override routing for specific requests

**Files:**
- dashboard/src/components/orchestration/ModelSelector.tsx
- dashboard/src/components/orchestration/ModelSelector.test.tsx

**Acceptance Criteria:**
- [ ] Dropdown of available models
- [ ] Show model capabilities
- [ ] Show model pricing
- [ ] Show model availability
- [ ] Override default routing
- [ ] One-time vs persistent override

**Test Cases:**
- dropdown lists all models
- capabilities shown per model
- pricing shown per model
- availability indicator shown
- select overrides routing
- one-time override clears after use
- persistent override stays
- clear override button works
- disabled models grayed out
- search filters models

---

### Task 7: QualityIndicator Component [ ]

**Goal:** Visual quality score display

**Files:**
- dashboard/src/components/orchestration/QualityIndicator.tsx
- dashboard/src/components/orchestration/QualityIndicator.test.tsx

**Acceptance Criteria:**
- [ ] Score gauge (0-100)
- [ ] Dimension breakdown
- [ ] Pass/fail indicator
- [ ] Threshold line
- [ ] Historical trend
- [ ] Retry recommendation

**Test Cases:**
- gauge shows score
- gauge colored by threshold
- dimension breakdown expandable
- pass indicator shows green check
- fail indicator shows red x
- threshold line visible
- trend sparkline shows history
- retry recommendation on fail
- tooltip shows details
- loading state handled

---

### Task 8: OrchestrationDashboard Component [ ]

**Goal:** Main orchestration dashboard view

**Files:**
- dashboard/src/components/orchestration/OrchestrationDashboard.tsx
- dashboard/src/components/orchestration/OrchestrationDashboard.test.tsx

**Acceptance Criteria:**
- [ ] Layout with all components
- [ ] Summary stats header
- [ ] Agent list main panel
- [ ] Cost sidebar
- [ ] Real-time updates (WebSocket)
- [ ] Responsive design

**Test Cases:**
- renders all components
- summary stats show totals
- agent list is main focus
- cost sidebar visible
- WebSocket connects
- updates on agent change
- responsive on mobile
- keyboard navigation works
- focus management correct
- error boundary catches errors

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | - | Card is atomic component |
| 3 | 2 | Detail expands from card |
| 4 | - | Controls are atomic |
| 5 | - | Meter is atomic |
| 6 | - | Selector is atomic |
| 7 | - | Indicator is atomic |
| 1 | 2 | List uses cards |
| 8 | 1-7 | Dashboard composes all |

**Parallel groups:**
- Group A: Tasks 2, 4, 5, 6, 7 (atomic components)
- Group B: Tasks 1, 3 (after 2)
- Group C: Task 8 (after all)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 components + 8 test files)
- Tests: ~85 (estimated)
