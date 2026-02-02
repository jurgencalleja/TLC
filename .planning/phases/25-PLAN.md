# Phase 25: Usage Dashboard - Plan

## Overview

Budget and usage visibility for multi-LLM operations. Extends existing `budget-tracker.js` with history, alerts, and a `/tlc:usage` command.

## Prerequisites

- [x] Phase 20 complete (budget-tracker.js exists)

## Existing Code

`server/lib/budget-tracker.js` already provides:
- `canSpend(model, amount, config)` - check budget
- `record(model, amount)` - record spending
- `shouldAlert(model, config)` - threshold alerts
- `getUsage(model)` - get current usage
- `reset(model)` - admin reset

## Tasks

### Task 1: Usage History Tracker [ ]

**Goal:** Track 7-day rolling history of usage per model

**Files:**
- server/lib/usage-history.js
- server/lib/usage-history.test.js

**Acceptance Criteria:**
- [ ] Records daily usage snapshots
- [ ] Maintains 7-day rolling window
- [ ] Persists to .tlc/usage-history.json
- [ ] Aggregates by model and day

**Test Cases:**
- Records daily snapshot
- Maintains only 7 days
- Aggregates multiple records per day
- Handles missing days
- Persists and loads correctly
- Returns empty array for new model

---

### Task 2: Usage Formatter [ ]

**Goal:** Format usage data for display

**Files:**
- server/lib/usage-formatter.js
- server/lib/usage-formatter.test.js

**Acceptance Criteria:**
- [ ] Formats daily/monthly totals as table
- [ ] Shows per-model breakdown
- [ ] Includes percentage of budget used
- [ ] Generates ASCII bar chart for history

**Test Cases:**
- Formats single model usage
- Formats multiple models
- Shows budget percentage
- Generates 7-day bar chart
- Handles zero usage
- Formats currency correctly

---

### Task 3: Budget Alerts [ ]

**Goal:** Alert system for budget thresholds

**Files:**
- server/lib/budget-alerts.js
- server/lib/budget-alerts.test.js

**Acceptance Criteria:**
- [ ] Fires alert when threshold crossed
- [ ] Supports multiple thresholds (50%, 80%, 100%)
- [ ] Tracks which alerts already fired (no duplicates)
- [ ] Generates alert messages

**Test Cases:**
- Fires at 50% threshold
- Fires at 80% threshold
- Fires at 100% (budget exceeded)
- Does not fire duplicate alerts
- Resets alerts on daily reset
- Generates formatted alert message

---

### Task 4: Usage Command [ ]

**Goal:** `/tlc:usage` command implementation

**Files:**
- server/lib/usage-command.js
- server/lib/usage-command.test.js

**Acceptance Criteria:**
- [ ] Shows current daily/monthly usage
- [ ] Shows 7-day history chart
- [ ] Shows budget remaining
- [ ] Supports --reset flag (admin)
- [ ] Supports --model flag (filter)
- [ ] Supports --json flag (machine readable)

**Test Cases:**
- Shows usage summary
- Shows history chart
- Filters by model
- Outputs JSON format
- Reset clears usage
- Handles no usage data
- Shows alerts if threshold crossed

---

### Task 5: Dashboard UsagePane [ ]

**Goal:** Dashboard component for usage display

**Files:**
- dashboard/src/components/UsagePane.tsx
- dashboard/src/components/UsagePane.test.tsx

**Acceptance Criteria:**
- [ ] Shows per-model usage bars
- [ ] Shows daily/monthly totals
- [ ] Highlights when over threshold
- [ ] Refreshes on interval

**Test Cases:**
- Renders usage bars
- Shows model names
- Shows dollar amounts
- Highlights over-budget
- Shows alert messages
- Updates on data change

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Formatter needs history data |
| 4 | 1, 2, 3 | Command uses all modules |
| 5 | 2, 4 | Pane uses formatter and command |

**Parallel groups:**
- Group A: Tasks 1, 3 (independent)
- Group B: Task 2 (after Task 1)
- Group C: Task 4 (after Tasks 1, 2, 3)
- Group D: Task 5 (after Task 4)

## Estimated Scope

- Tasks: 5
- Files: 10 (5 implementations + 5 tests)
- Tests: ~70 estimated
