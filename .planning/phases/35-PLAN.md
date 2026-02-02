# Phase 35: Quality Gate - Plan

## Overview

Ensure output quality meets thresholds before accepting results. Auto-retry with better models on quality failure.

## Prerequisites

- [x] Phase 32 complete (Agent Registry)
- [x] Phase 33 complete (Multi-Model Router)
- [x] Phase 34 complete (Cost Controller)

## Tasks

### Task 1: Quality Scorer [ ]

**Goal:** Score output quality on multiple dimensions

**Files:**
- server/lib/quality-scorer.js
- server/lib/quality-scorer.test.js

**Acceptance Criteria:**
- [ ] Code style score (linting, formatting)
- [ ] Completeness score (all requirements met)
- [ ] Test coverage score (tests written)
- [ ] Correctness score (tests pass)
- [ ] Documentation score (comments, types)
- [ ] Composite score calculation

**Test Cases:**
- scoreCodeStyle runs linter
- scoreCodeStyle returns 0-100
- scoreCompleteness checks requirements
- scoreCompleteness returns 0-100
- scoreTestCoverage measures coverage
- scoreTestCoverage returns 0-100
- scoreCorrectness runs tests
- scoreCorrectness returns 0-100
- scoreDocumentation checks comments
- calculateComposite weights scores
- parseRequirements extracts from prompt

---

### Task 2: Quality Thresholds [ ]

**Goal:** Configurable quality thresholds per operation

**Files:**
- server/lib/quality-thresholds.js
- server/lib/quality-thresholds.test.js

**Acceptance Criteria:**
- [ ] Global default threshold
- [ ] Per-operation thresholds (review, code-gen, refactor)
- [ ] Per-dimension thresholds
- [ ] Threshold presets (fast, balanced, thorough)
- [ ] Custom threshold configuration

**Test Cases:**
- getThreshold returns operation threshold
- getThreshold falls back to default
- getDimensionThreshold returns per-dimension
- checkThreshold returns pass/fail
- checkThreshold returns which failed
- applyPreset sets all thresholds
- presetFast has lower thresholds
- presetThorough has higher thresholds
- presetBalanced is middle ground
- saveThresholds persists config
- loadThresholds reads config

---

### Task 3: Quality Evaluator [ ]

**Goal:** Evaluate output against thresholds

**Files:**
- server/lib/quality-evaluator.js
- server/lib/quality-evaluator.test.js

**Acceptance Criteria:**
- [ ] Run all relevant scorers
- [ ] Compare against thresholds
- [ ] Generate pass/fail result
- [ ] Identify failing dimensions
- [ ] Suggest improvements
- [ ] Confidence level calculation

**Test Cases:**
- evaluate runs all scorers
- evaluate compares to thresholds
- evaluate returns pass when all pass
- evaluate returns fail when any fail
- getFailingDimensions lists failures
- suggestImprovements returns tips
- calculateConfidence from score margins
- evaluateWithContext includes metadata
- skipDimension excludes from eval
- aggregateResults combines multi-file

---

### Task 4: Auto-Retry Logic [ ]

**Goal:** Automatically retry with better model on failure

**Files:**
- server/lib/quality-retry.js
- server/lib/quality-retry.test.js

**Acceptance Criteria:**
- [ ] Retry on quality failure
- [ ] Escalate to better model
- [ ] Include failure context in retry prompt
- [ ] Max retry limit
- [ ] Cost tracking across retries
- [ ] Report retry history

**Test Cases:**
- shouldRetry returns true on failure
- shouldRetry returns false on pass
- shouldRetry respects maxRetries
- selectBetterModel escalates
- selectBetterModel respects budget
- buildRetryPrompt includes context
- buildRetryPrompt includes failures
- trackRetryCost accumulates
- getRetryHistory returns attempts
- retryWithFeedback improves results

---

### Task 5: Quality History [ ]

**Goal:** Track quality improvements over time

**Files:**
- server/lib/quality-history.js
- server/lib/quality-history.test.js

**Acceptance Criteria:**
- [ ] Record quality scores
- [ ] Track by operation type
- [ ] Track by model
- [ ] Calculate trends
- [ ] Identify improvements
- [ ] Alert on degradation

**Test Cases:**
- recordScore saves to history
- recordScore includes metadata
- getHistory returns all records
- getHistoryByOperation filters
- getHistoryByModel filters
- calculateTrend returns direction
- detectImprovement finds gains
- detectDegradation finds losses
- alertOnDegradation triggers
- cleanupHistory removes old

---

### Task 6: Quality Presets [ ]

**Goal:** Pre-configured quality levels for common use cases

**Files:**
- server/lib/quality-presets.js
- server/lib/quality-presets.test.js

**Acceptance Criteria:**
- [ ] Fast preset (quick iterations)
- [ ] Balanced preset (normal work)
- [ ] Thorough preset (production code)
- [ ] Critical preset (mission-critical)
- [ ] Custom preset creation
- [ ] Preset recommendations by task

**Test Cases:**
- getPreset returns config
- presetFast has low thresholds
- presetFast allows cheaper models
- presetBalanced is moderate
- presetThorough is strict
- presetCritical is highest
- createCustomPreset saves
- recommendPreset suggests by task
- applyPreset updates config
- listPresets returns all

---

### Task 7: Quality Gate Command [ ]

**Goal:** CLI for quality gate management

**Files:**
- server/lib/quality-gate-command.js
- server/lib/quality-gate-command.test.js

**Acceptance Criteria:**
- [ ] `tlc quality-gate status` - show config
- [ ] `tlc quality-gate configure` - set thresholds
- [ ] `tlc quality-gate preset <name>` - apply preset
- [ ] `tlc quality-gate history` - show trends
- [ ] `tlc quality-gate evaluate <file>` - manual check
- [ ] Formatted output

**Test Cases:**
- execute status shows thresholds
- execute status shows current preset
- execute configure sets threshold
- execute configure validates input
- execute preset applies preset
- execute preset lists available
- execute history shows trends
- execute evaluate scores file
- formatOutput creates table
- parseArgs handles all commands

---

### Task 8: Dashboard QualityGatePane [ ]

**Goal:** Dashboard component for quality visibility

**Files:**
- dashboard/src/components/QualityGatePane.tsx
- dashboard/src/components/QualityGatePane.test.tsx

**Acceptance Criteria:**
- [ ] Show current preset
- [ ] Show threshold configuration
- [ ] Quality trend chart
- [ ] Recent evaluations list
- [ ] Configure from UI
- [ ] Retry controls

**Test Cases:**
- renders current preset
- renders threshold bars
- trend chart shows history
- evaluations list shows recent
- configure button opens modal
- preset selector changes preset
- retry button visible on failure
- handles loading state
- handles error state
- handles empty history

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Thresholds compare against scores |
| 3 | 1, 2 | Evaluator uses scorer and thresholds |
| 4 | 3 | Retry triggered by evaluation |
| 5 | 1, 3 | History records scores and evaluations |
| 6 | 2 | Presets are threshold configurations |
| 7 | 1-6 | Command uses all modules |
| 8 | 1-6 | Dashboard shows all data |

**Parallel groups:**
- Group A: Task 1 (foundation)
- Group B: Tasks 2, 5 (after 1, independent)
- Group C: Tasks 3, 6 (after 2)
- Group D: Task 4 (after 3)
- Group E: Tasks 7, 8 (after all)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 modules + 8 test files)
- Tests: ~90 (estimated)
