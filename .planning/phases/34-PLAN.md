# Phase 34: Cost Controller - Plan

## Overview

Budget management and cost optimization across all AI operations. Real-time tracking, budget limits, projections, and reporting.

## Prerequisites

- [x] Phase 32 complete (Agent Registry)
- [x] Phase 33 complete (Multi-Model Router)

## Tasks

### Task 1: Cost Tracker [ ]

**Goal:** Real-time cost tracking per agent, session, and day

**Files:**
- server/lib/cost-tracker.js
- server/lib/cost-tracker.test.js

**Acceptance Criteria:**
- [ ] Track cost per agent execution
- [ ] Aggregate by session
- [ ] Aggregate by day/week/month
- [ ] Track by model/provider
- [ ] Persist cost history
- [ ] Calculate running totals

**Test Cases:**
- recordCost adds to agent total
- recordCost adds to session total
- recordCost adds to daily total
- getAgentCost returns agent spend
- getSessionCost returns session spend
- getDailyCost returns day spend
- getWeeklyCost aggregates days
- getMonthlyCost aggregates weeks
- getCostByModel groups by model
- getCostByProvider groups by provider
- persistCosts saves to disk
- loadCosts restores from disk

---

### Task 2: Model Pricing [ ]

**Goal:** Pricing database for all supported models

**Files:**
- server/lib/model-pricing.js
- server/lib/model-pricing.test.js

**Acceptance Criteria:**
- [ ] Input/output token pricing per model
- [ ] Support for tiered pricing
- [ ] Calculate cost from token counts
- [ ] Update pricing without code changes
- [ ] CLI providers: $0 when local
- [ ] Fallback to estimated pricing

**Test Cases:**
- getPricing returns model pricing
- getPricing returns null for unknown
- calculateCost uses input/output rates
- calculateCost handles tiered pricing
- calculateCost returns 0 for local CLI
- loadPricing reads from config
- updatePricing modifies runtime
- defaultPricing has all models
- estimateCost uses fallback rate
- formatCost displays currency

---

### Task 3: Budget Limits [ ]

**Goal:** Configurable budget limits with enforcement

**Files:**
- server/lib/budget-limits.js
- server/lib/budget-limits.test.js

**Acceptance Criteria:**
- [ ] Daily budget limit
- [ ] Monthly budget limit
- [ ] Per-model budget limit
- [ ] Hard stop at limit
- [ ] Soft warning at threshold (50%, 80%)
- [ ] Admin override capability

**Test Cases:**
- setBudget configures limit
- checkBudget returns ok under limit
- checkBudget returns warning at threshold
- checkBudget returns exceeded at limit
- enforceBudget blocks when exceeded
- enforceBudget allows with override
- getDailyBudget returns config
- getMonthlyBudget returns config
- getModelBudget returns per-model
- resetBudget clears to zero
- budgetRemaining calculates left

---

### Task 4: Cost Projections [ ]

**Goal:** Estimate costs before execution

**Files:**
- server/lib/cost-projections.js
- server/lib/cost-projections.test.js

**Acceptance Criteria:**
- [ ] Estimate tokens from prompt length
- [ ] Estimate output tokens by task type
- [ ] Project cost before running
- [ ] Compare across models
- [ ] Historical accuracy tracking

**Test Cases:**
- estimateInputTokens counts from prompt
- estimateOutputTokens uses task patterns
- projectCost combines estimates
- projectCost uses model pricing
- compareModels returns cost ranking
- cheapestModel returns lowest cost
- trackAccuracy compares estimate vs actual
- getAccuracyHistory returns metrics
- adjustEstimates learns from history
- projectMultiModel sums providers

---

### Task 5: Optimization Suggestions [ ]

**Goal:** Recommend cheaper alternatives

**Files:**
- server/lib/cost-optimizer.js
- server/lib/cost-optimizer.test.js

**Acceptance Criteria:**
- [ ] Identify expensive operations
- [ ] Suggest cheaper models
- [ ] Suggest batching opportunities
- [ ] Suggest caching opportunities
- [ ] Quality vs cost tradeoffs
- [ ] User preference learning

**Test Cases:**
- analyzeUsage finds expensive ops
- suggestCheaperModel returns alternative
- suggestBatching identifies patterns
- suggestCaching finds repeated prompts
- getQualityScore rates model quality
- getCostScore rates model cost
- rankByValue combines quality/cost
- applyPreferences filters suggestions
- learnPreferences updates from choices
- formatSuggestions creates readable output

---

### Task 6: Cost Reports [ ]

**Goal:** Generate cost reports by various dimensions

**Files:**
- server/lib/cost-reports.js
- server/lib/cost-reports.test.js

**Acceptance Criteria:**
- [ ] Report by time period
- [ ] Report by model
- [ ] Report by operation type
- [ ] Report by trigger (manual, CI, webhook)
- [ ] Export as CSV, JSON
- [ ] Trend analysis

**Test Cases:**
- generateReport creates report object
- filterByPeriod selects date range
- groupByModel aggregates costs
- groupByOperation aggregates costs
- groupByTrigger aggregates costs
- exportCSV formats correctly
- exportJSON formats correctly
- analyzeTrends shows direction
- compareToLastPeriod calculates diff
- formatReport creates markdown

---

### Task 7: Cost Command [ ]

**Goal:** CLI for cost management

**Files:**
- server/lib/cost-command.js
- server/lib/cost-command.test.js

**Acceptance Criteria:**
- [ ] `tlc cost status` - show current spend
- [ ] `tlc cost budget` - configure budgets
- [ ] `tlc cost report` - generate report
- [ ] `tlc cost estimate <task>` - project cost
- [ ] `tlc cost optimize` - show suggestions
- [ ] Formatted output

**Test Cases:**
- execute status shows spend summary
- execute status shows budget remaining
- execute budget sets daily limit
- execute budget sets monthly limit
- execute report generates report
- execute report filters by period
- execute estimate projects cost
- execute estimate compares models
- execute optimize shows suggestions
- formatStatus creates readable output

---

### Task 8: Dashboard CostPane [ ]

**Goal:** Dashboard component for cost visibility

**Files:**
- dashboard/src/components/CostPane.tsx
- dashboard/src/components/CostPane.test.tsx

**Acceptance Criteria:**
- [ ] Show current spend vs budget
- [ ] Progress bar visualization
- [ ] Cost breakdown chart
- [ ] Trend sparkline
- [ ] Optimization suggestions
- [ ] Configure budget from UI

**Test Cases:**
- renders spend vs budget
- progress bar shows percentage
- warning color at threshold
- danger color at limit
- breakdown chart renders
- trend sparkline renders
- suggestions list renders
- configure button works
- handles loading state
- handles zero spend

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | - | Foundation for all cost tracking |
| 2 | - | Pricing data independent |
| 3 | 1, 2 | Limits check against tracked costs |
| 4 | 2 | Projections use pricing |
| 5 | 1, 2, 4 | Optimizer uses all cost data |
| 6 | 1, 2 | Reports aggregate tracked costs |
| 7 | 1-6 | Command uses all modules |
| 8 | 1-6 | Dashboard shows all cost data |

**Parallel groups:**
- Group A: Tasks 1, 2 (independent foundations)
- Group B: Tasks 3, 4, 6 (after 1, 2)
- Group C: Task 5 (after 1, 2, 4)
- Group D: Tasks 7, 8 (after all)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 modules + 8 test files)
- Tests: ~95 (estimated)
