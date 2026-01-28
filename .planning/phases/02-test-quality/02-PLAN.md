# Phase 2: Test Quality & Auto-Fix - Plan

## Overview

Add test quality scoring, automatic test failure recovery, and edge case generation to TLC. Engineers get visibility into test health, failing tests get auto-fixed when possible, and edge cases are generated to improve coverage.

## Prerequisites

- [x] Vitest configured (dashboard/vitest.config.ts)
- [x] Existing test suite (61 tests passing)
- [ ] Install coverage dependencies

## Tasks

### Task 1: Coverage Infrastructure [ ]

**Goal:** Enable coverage measurement in Vitest

**Files:**
- dashboard/package.json (add dependencies)
- dashboard/vitest.config.ts (configure coverage)

**Acceptance Criteria:**
- [ ] @vitest/coverage-v8 installed
- [ ] Coverage reporters configured (json, text, lcov)
- [ ] `npm run test:coverage` script added
- [ ] Coverage runs and generates report

**Test Cases:**
- Running `npm run test:coverage` produces coverage-final.json
- Coverage report shows line, branch, function metrics

---

### Task 2: Quality Scoring Engine [ ]

**Goal:** Calculate quality score from coverage + edge case detection

**Files:**
- server/lib/quality-scorer.js (new)
- server/lib/coverage-parser.js (new)

**Acceptance Criteria:**
- [ ] Parses Vitest coverage JSON output
- [ ] Detects missing edge case patterns in test files
- [ ] Calculates weighted quality score (0-100)
- [ ] Identifies uncovered lines/functions
- [ ] Generates recommendations

**Test Cases:**
- Parser extracts coverage percentages from JSON
- Edge case detector flags missing null/empty/boundary tests
- Score calculation matches formula: 40% coverage + 30% edge cases + 30% mutations
- Recommendations prioritized by impact

---

### Task 3: Quality Command (/tlc:quality) [ ]

**Goal:** CLI command to analyze and report test quality

**Files:**
- .claude/commands/tlc/quality.md (update - make executable)
- server/lib/quality-command.js (new)

**Acceptance Criteria:**
- [ ] Runs coverage analysis
- [ ] Runs edge case detection
- [ ] Displays quality score with breakdown
- [ ] Generates .planning/QUALITY.md report
- [ ] Offers to generate tests for gaps

**Test Cases:**
- Command outputs score and breakdown
- QUALITY.md created with correct format
- Uncovered files listed with line numbers
- Edge case gaps identified by category

---

### Task 4: AutoFix Engine [ ]

**Goal:** Analyze and fix failing tests automatically

**Files:**
- server/lib/autofix-engine.js (new)
- server/lib/error-patterns.js (new)
- server/lib/fix-strategies.js (new)

**Acceptance Criteria:**
- [ ] Parses test failure output
- [ ] Matches errors to known patterns
- [ ] Generates fix proposals
- [ ] Applies fixes and re-runs tests
- [ ] Rolls back if fix breaks other tests
- [ ] Respects max attempts config

**Test Cases:**
- Recognizes "Cannot read property of null" → null check fix
- Recognizes "Expected X got undefined" → return value fix
- Recognizes import errors → adds missing import
- Failed fix attempts are rolled back
- Stops after maxAttempts (default 5)

---

### Task 5: AutoFix Command (/tlc:autofix) [ ]

**Goal:** CLI command to automatically fix failing tests

**Files:**
- .claude/commands/tlc/autofix.md (update - make executable)
- server/lib/autofix-command.js (new)

**Acceptance Criteria:**
- [ ] Runs tests and captures failures
- [ ] Displays analysis for each failure
- [ ] Shows fix proposal before applying
- [ ] Reports success/failure per test
- [ ] Offers to commit fixes
- [ ] Lists tests that couldn't be fixed

**Test Cases:**
- Shows failure count and details
- Fix progress displayed (1/4, 2/4, etc.)
- Successful fixes marked with checkmark
- Unfixable tests show reason and suggestion
- Commit prompt appears after fixes

---

### Task 6: Edge Case Generator [ ]

**Goal:** Analyze code and generate edge case tests

**Files:**
- server/lib/edge-case-generator.js (new)
- server/lib/edge-case-patterns.js (new)

**Acceptance Criteria:**
- [ ] Parses function signatures and body
- [ ] Identifies parameter types and constraints
- [ ] Generates edge cases by category (null, empty, boundary, etc.)
- [ ] Produces valid test code for Vitest/Mocha
- [ ] Respects test framework config

**Test Cases:**
- String param generates null, empty, whitespace, long tests
- Number param generates 0, -1, MAX_INT, NaN tests
- Array param generates empty, single, large tests
- Security patterns included (SQL injection, XSS)
- Output is syntactically valid JavaScript

---

### Task 7: Edge Cases Command (/tlc:edge-cases) [ ]

**Goal:** CLI command to generate edge case tests

**Files:**
- .claude/commands/tlc/edge-cases.md (update - make executable)
- server/lib/edge-cases-command.js (new)

**Acceptance Criteria:**
- [ ] Accepts file or function target
- [ ] Displays generated test summary
- [ ] Allows selection of tests to include
- [ ] Writes to appropriate test file
- [ ] Optionally runs tests (expect some to fail)

**Test Cases:**
- Targeting function generates relevant edge cases
- Summary shows count by category
- Selected tests written to correct file
- Running tests shows red (expected failures)

---

### Task 8: Dashboard Quality Panel [ ]

**Goal:** Show quality metrics in TLC dashboard

**Files:**
- dashboard/src/components/QualityPane.tsx (new)
- dashboard/src/App.tsx (add pane)
- server/index.js (serve quality data)

**Acceptance Criteria:**
- [ ] Quality score displayed with progress bar
- [ ] Coverage percentage shown
- [ ] Edge case coverage shown
- [ ] "Run Analysis" button triggers /tlc:quality
- [ ] Updates when tests run

**Test Cases:**
- Pane renders with placeholder when no data
- Score displays correctly (72/100)
- Progress bar reflects score
- Button triggers quality analysis
- Real-time update after test run

---

### Task 9: Configuration Schema [ ]

**Goal:** Add quality/autofix settings to .tlc.json

**Files:**
- server/lib/config.js (update)
- .tlc.json (schema update)

**Acceptance Criteria:**
- [ ] quality.coverageThreshold setting (default 80)
- [ ] quality.runMutationTests setting (default false)
- [ ] autofix.maxAttempts setting (default 5)
- [ ] autofix.strategies setting (default all)
- [ ] edgeCases.patterns setting

**Test Cases:**
- Default config used when not specified
- Custom thresholds respected
- Invalid config shows helpful error

---

## Dependencies

```
Task 1 (Coverage Infrastructure)
    ↓
Task 2 (Quality Scorer) ──→ Task 3 (Quality Command)
    ↓
Task 8 (Dashboard) ←── Task 4 (AutoFix Engine) ──→ Task 5 (AutoFix Command)
                            ↑
Task 6 (Edge Case Generator) ──→ Task 7 (Edge Cases Command)
                            ↑
Task 9 (Configuration) ────────┘
```

Start order: Task 1 → Task 9 → (Task 2, Task 4, Task 6 parallel) → (Task 3, Task 5, Task 7) → Task 8

## Estimated Scope

- Tasks: 9
- New files: ~12
- Modified files: ~5
- Tests: ~40 (estimated)

## Success Criteria (from Roadmap)

- [ ] Test quality score visible in dashboard
- [ ] 80%+ of simple test failures auto-fixed
- [ ] Edge cases generated for each task
