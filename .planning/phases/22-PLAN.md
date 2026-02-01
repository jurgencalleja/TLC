# Phase 22: Refactor Command - Plan

## Overview

Systematic codebase refactoring with safety guarantees. Provides hybrid analysis (AST metrics + AI semantic review), git-based checkpoints, and multi-audience reporting (plain English + diffs + diagrams).

## Prerequisites

- [x] Phase 20: Multi-LLM Infrastructure (adapters in `server/lib/adapters/`)
- [x] Phase 21: Review Command (`file-collector.js`, `consensus-engine.js`)

## Tasks

### Task 1: AST Code Analyzer [ ]

**Goal:** Parse JavaScript/TypeScript files and extract metrics using AST

**Files:**
- server/lib/ast-analyzer.js
- server/lib/ast-analyzer.test.js

**Acceptance Criteria:**
- [ ] Parse JS/TS files into AST (using TypeScript compiler API)
- [ ] Calculate cyclomatic complexity per function
- [ ] Measure function/method length (line count)
- [ ] Detect deeply nested code (>4 levels)
- [ ] Return structured metrics object

**Test Cases:**
- Parses simple function, returns complexity 1
- Parses function with if/else, returns complexity 2
- Detects function with 50+ lines as "long"
- Detects 5-level nesting as "deep"
- Handles syntax errors gracefully
- Works with TypeScript files
- Works with JSX/TSX files

---

### Task 2: Duplication Detector [ ]

**Goal:** Find copy-pasted and structurally similar code

**Files:**
- server/lib/duplication-detector.js
- server/lib/duplication-detector.test.js

**Acceptance Criteria:**
- [ ] Detect exact duplicate code blocks (>5 lines)
- [ ] Detect similar code patterns (same structure, different names)
- [ ] Group duplicates by file pairs
- [ ] Calculate duplication percentage per file

**Test Cases:**
- Finds exact duplicate blocks across files
- Finds similar functions with renamed variables
- Ignores small duplicates (<5 lines)
- Reports file pairs with duplication
- Calculates accurate duplication percentage
- Handles empty files gracefully

---

### Task 3: Semantic Analyzer [ ]

**Goal:** Use AI to detect naming issues and semantic problems

**Files:**
- server/lib/semantic-analyzer.js
- server/lib/semantic-analyzer.test.js

**Acceptance Criteria:**
- [ ] Detect poor variable/function names
- [ ] Identify unclear function purposes
- [ ] Suggest better naming conventions
- [ ] Use existing model adapters from Phase 20
- [ ] Support multi-model consensus

**Test Cases:**
- Flags single-letter variable names
- Flags cryptic function names (e.g., `fn1`, `doIt`)
- Suggests descriptive alternatives
- Uses consensus engine for multi-model
- Respects budget limits
- Gracefully handles model failures

---

### Task 4: Impact Scorer [ ]

**Goal:** Calculate priority score for refactoring opportunities

**Files:**
- server/lib/impact-scorer.js
- server/lib/impact-scorer.test.js

**Acceptance Criteria:**
- [ ] Score based on complexity reduction potential
- [ ] Factor in blast radius (files affected)
- [ ] Factor in change frequency (git history)
- [ ] Factor in risk (test coverage)
- [ ] Return 0-100 impact score

**Test Cases:**
- High complexity reduction = high score
- Many files affected = higher score
- Frequently changed files = higher score
- Low test coverage = higher risk score
- Combines factors into single 0-100 score
- Handles missing git history

---

### Task 5: Checkpoint Manager [ ]

**Goal:** Create and manage git-based checkpoints for safe refactoring

**Files:**
- server/lib/checkpoint-manager.js
- server/lib/checkpoint-manager.test.js

**Acceptance Criteria:**
- [ ] Stash uncommitted changes before refactoring
- [ ] Create feature branch for refactoring
- [ ] Provide rollback (delete branch, restore stash)
- [ ] Track checkpoint state
- [ ] Handle edge cases (dirty state, conflicts)

**Test Cases:**
- Creates stash with uncommitted changes
- Creates branch with naming pattern `refactor/{timestamp}`
- Rollback deletes branch and pops stash
- Handles already clean working directory
- Handles existing branch with same name
- Reports checkpoint state accurately

---

### Task 6: Refactor Executor [ ]

**Goal:** Apply refactoring changes with interactive confirmation

**Files:**
- server/lib/refactor-executor.js
- server/lib/refactor-executor.test.js

**Acceptance Criteria:**
- [ ] Apply single refactoring (extract, rename, split)
- [ ] Interactive mode: show change, ask Y/n/skip
- [ ] Run tests after each change
- [ ] Auto-rollback on test failure (3 attempts first)
- [ ] Track applied changes

**Test Cases:**
- Applies extract function refactoring
- Applies rename refactoring across files
- Interactive mode pauses for confirmation
- Runs test command after each change
- Attempts autofix on failure (up to 3 times)
- Rolls back after 3 failed attempts
- Tracks all applied changes in log

---

### Task 7: Report Generator [ ]

**Goal:** Generate multi-audience refactoring reports

**Files:**
- server/lib/refactor-reporter.js
- server/lib/refactor-reporter.test.js

**Acceptance Criteria:**
- [ ] Plain English summary for non-developers
- [ ] Technical diff for developers (collapsible)
- [ ] Mermaid diagrams for architecture changes
- [ ] Markdown, JSON, HTML output formats
- [ ] Before/after comparisons

**Test Cases:**
- Generates plain English: "Extracted X from Y"
- Generates unified diff format
- Generates Mermaid diagram for function relationships
- Outputs valid Markdown
- Outputs valid JSON
- Outputs valid HTML
- Includes before/after code blocks

---

### Task 8: Candidates Tracker [ ]

**Goal:** Maintain REFACTOR-CANDIDATES.md automatically

**Files:**
- server/lib/candidates-tracker.js
- server/lib/candidates-tracker.test.js

**Acceptance Criteria:**
- [ ] Create/update `.planning/REFACTOR-CANDIDATES.md`
- [ ] Add candidates from analysis
- [ ] Organize by priority (High/Medium/Low based on impact score)
- [ ] Merge with existing candidates (no duplicates)
- [ ] Mark completed candidates as done

**Test Cases:**
- Creates file if not exists
- Appends new candidates to correct priority section
- Deduplicates by file:line key
- Updates impact scores on re-analysis
- Marks candidate as complete after refactoring
- Preserves manual notes in file

---

### Task 9: Progress Tracker [ ]

**Goal:** Show progress for large codebase analysis with ETA

**Files:**
- server/lib/refactor-progress.js
- server/lib/refactor-progress.test.js

**Acceptance Criteria:**
- [ ] Track files analyzed / total files
- [ ] Calculate and update ETA based on actual speed
- [ ] Emit progress events for UI
- [ ] Support cancellation
- [ ] Cache results for unchanged files

**Test Cases:**
- Shows "Analyzing 50/1000 files"
- Updates ETA based on rolling average speed
- Emits 'progress' events with percentage
- Cancellation stops analysis cleanly
- Caches results (skip unchanged files on re-run)
- Loads cache from disk on startup

---

### Task 10: Refactor Command [ ]

**Goal:** Main `/tlc:refactor` command orchestrating all modules

**Files:**
- server/lib/refactor-command.js
- server/lib/refactor-command.test.js
- .claude/commands/tlc/refactor.md

**Acceptance Criteria:**
- [ ] `--analyze` runs full codebase analysis
- [ ] `--analyze --models` uses multi-model consensus
- [ ] `--plan` generates refactoring plan from candidates
- [ ] `--execute` applies refactorings interactively
- [ ] Path targeting: `/tlc:refactor src/api/`
- [ ] Severity filter: `--severity high`
- [ ] Issue filter: `--issue "duplication"`
- [ ] Budget tracking and warnings

**Test Cases:**
- --analyze scans all files, updates CANDIDATES.md
- --analyze --models prompts for multi-model
- --plan generates ordered refactoring steps
- --execute creates checkpoint, applies changes
- Path targeting limits scope correctly
- --severity high filters to impact 80+
- --issue filters by issue type
- Warns at 80% budget, stops at 100%

---

### Task 11: Background Observer Hook [ ]

**Goal:** Auto-detect refactoring opportunities during normal TLC work

**Files:**
- server/lib/refactor-observer.js
- server/lib/refactor-observer.test.js

**Acceptance Criteria:**
- [ ] Hook into `/tlc:build` to observe new code
- [ ] Hook into `/tlc:review` to capture suggestions
- [ ] Silently add to REFACTOR-CANDIDATES.md
- [ ] Non-blocking (don't slow down primary operation)
- [ ] Configurable (can disable in .tlc.json)

**Test Cases:**
- Detects high-complexity function during build
- Captures refactoring suggestions from review
- Adds to candidates without user prompt
- Runs in background (doesn't block)
- Respects `refactor.autoDetect: false` config
- Handles file write errors gracefully

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | - | Uses adapters from Phase 20, no internal deps |
| 4 | 1, 2 | Needs metrics from AST and duplication analysis |
| 6 | 5 | Needs checkpoint before applying changes |
| 7 | 6 | Reports on executed changes |
| 8 | 4 | Organizes by impact score |
| 10 | 1-9 | Orchestrates all modules |
| 11 | 8, 10 | Hooks into command, updates candidates |

**Parallel Groups:**
- Group A: Tasks 1, 2, 3, 5 (independent analysis modules)
- Group B: Task 4 (after 1, 2)
- Group C: Tasks 6, 8, 9 (after 4, 5)
- Group D: Task 7 (after 6)
- Group E: Task 10 (after all)
- Group F: Task 11 (after 8, 10)

## Estimated Scope

- Tasks: 11
- Files: 22 (11 modules + 11 test files) + 1 command doc
- Tests: ~220 (estimated 20 per module)

## E2E Scenarios

### Scenario 1: Codebase Sweep
```
User runs: /tlc:refactor --analyze
Expected:
1. Scans all files with progress indicator
2. AST analysis for metrics
3. Duplication detection
4. Creates/updates REFACTOR-CANDIDATES.md
5. Shows summary: "Found 47 opportunities. Top 10 would reduce complexity by 35%"
```

### Scenario 2: Multi-Model Analysis
```
User runs: /tlc:refactor --analyze
Prompt: "Run with multiple models? [Y/n]"
User: Y
Expected:
1. Runs analysis with Claude, OpenAI, DeepSeek
2. Shows consensus on issues
3. Higher confidence scores for agreed issues
4. Cost summary at end
```

### Scenario 3: Execute Refactoring
```
User runs: /tlc:refactor --execute
Expected:
1. Creates checkpoint (stash + branch)
2. Shows first change: "Extract validateEmail from createUser?"
3. User: Y
4. Applies change, runs tests
5. If tests pass: continue to next
6. If tests fail: try autofix (3x), then rollback
7. Summary: "Applied 5/7 refactorings. 2 skipped."
```

### Scenario 4: Test Failure Recovery
```
During --execute, tests fail after refactoring
Expected:
1. "Tests failed. Attempting auto-fix (1/3)..."
2. If fix works: continue
3. If 3 failures: "Rolling back to checkpoint"
4. Branch deleted, stash popped
5. "Refactoring aborted. Codebase unchanged."
```

### Scenario 5: Conflicting Model Suggestions
```
Multi-model analysis returns disagreement
Expected:
1. "Models disagree on this issue:"
2. Shows each model's suggestion
3. "Which approach? [1/2/3/skip]"
4. User picks, that suggestion used
```
