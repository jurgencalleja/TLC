# Phase 57: Coding Standards Injection - Plan

## Overview

Automatic coding standards injection for all TLC projects. When users run `tlc` or `npx tlc-claude-code`, standards are injected into the target project.

## Prerequisites

- [x] TLC command system exists
- [x] Template system for commands

## Tasks

### Task 1: Standards Templates [ ]

**Goal:** Create template files for CLAUDE.md and CODING-STANDARDS.md

**Files:**
- server/templates/CLAUDE.md
- server/templates/CODING-STANDARDS.md

**Acceptance Criteria:**
- [ ] CLAUDE.md template includes code quality section
- [ ] CLAUDE.md references CODING-STANDARDS.md
- [ ] CODING-STANDARDS.md covers module structure (by entity, not type)
- [ ] CODING-STANDARDS.md covers types in separate files
- [ ] CODING-STANDARDS.md covers schemas in schemas/ folder
- [ ] CODING-STANDARDS.md covers constants (no magic strings)
- [ ] CODING-STANDARDS.md covers config from environment
- [ ] CODING-STANDARDS.md covers JSDoc requirements
- [ ] CODING-STANDARDS.md covers file naming conventions
- [ ] CODING-STANDARDS.md covers import rules

**Test Cases:**
- Templates are valid markdown
- Templates contain required sections
- No placeholder text remaining

---

### Task 2: Standards Injector Module [ ]

**Goal:** Node module to inject standards into target projects

**Files:**
- server/lib/standards/standards-injector.js
- server/lib/standards/standards-injector.test.js

**Acceptance Criteria:**
- [ ] `injectStandards(projectPath)` main function
- [ ] Creates CLAUDE.md if missing
- [ ] Appends TLC section to existing CLAUDE.md
- [ ] Creates CODING-STANDARDS.md if missing
- [ ] Skips if CODING-STANDARDS.md already exists
- [ ] Returns action report (created/appended/skipped)
- [ ] `reportResults(results)` logs to console

**Test Cases:**
- Creates both files in empty project
- Appends to existing CLAUDE.md without TLC section
- Skips CLAUDE.md that already has TLC section
- Skips existing CODING-STANDARDS.md
- Reports correct actions taken
- Handles missing project directory

---

### Task 3: Audit Command [ ]

**Goal:** `/tlc:audit` command to check standards compliance

**Files:**
- .claude/commands/tlc/audit.md
- server/lib/standards/audit-checker.js
- server/lib/standards/audit-checker.test.js

**Acceptance Criteria:**
- [ ] Checks standards files exist
- [ ] Detects flat services/interfaces/controllers folders
- [ ] Detects inline interfaces in services
- [ ] Detects hardcoded URLs/ports
- [ ] Detects magic strings
- [ ] Checks seed file organization
- [ ] Checks JSDoc coverage
- [ ] Checks import style
- [ ] Outputs report to .planning/AUDIT-REPORT.md

**Test Cases:**
- Passes clean project
- Fails on flat services/ folder
- Fails on inline interface
- Fails on hardcoded URL
- Fails on magic string
- Reports all issues found
- Creates AUDIT-REPORT.md

---

### Task 4: Cleanup Command [ ]

**Goal:** `/tlc:cleanup` command for automatic refactoring

**Files:**
- .claude/commands/tlc/cleanup.md
- server/lib/standards/cleanup-executor.js
- server/lib/standards/cleanup-executor.test.js

**Acceptance Criteria:**
- [ ] Ensures standards files exist
- [ ] Runs full audit first
- [ ] Extracts hardcoded config to environment
- [ ] Migrates flat folders to entity-based structure
- [ ] Extracts inline interfaces to types/ files
- [ ] Replaces magic strings with constants
- [ ] Adds missing JSDoc
- [ ] Commits after each module
- [ ] Reports results when done

**Test Cases:**
- Extracts hardcoded URL to config
- Moves service from services/ to entity/
- Extracts inline interface to types/
- Replaces magic string with constant
- Adds JSDoc to public function
- Creates appropriate commits

---

### Task 5: Refactor Command [ ]

**Goal:** `/tlc:refactor` command - step-by-step with checkpoints

**Files:**
- .claude/commands/tlc/refactor.md
- server/lib/standards/refactor-stepper.js
- server/lib/standards/refactor-stepper.test.js

**Acceptance Criteria:**
- [ ] Same functionality as cleanup
- [ ] Pauses after each step for user confirmation
- [ ] Can skip individual steps
- [ ] Can abort at any point
- [ ] Shows preview before each change
- [ ] Checkpoint saves allow resume

**Test Cases:**
- Shows preview before change
- Waits for user confirmation
- Skips step on user request
- Aborts cleanly
- Resume from checkpoint works

---

### Task 6: Init Integration [ ]

**Goal:** Hook standards injection into TLC init/install

**Files:**
- server/lib/init/project-initializer.js (modify)
- server/lib/init/project-initializer.test.js (modify)

**Acceptance Criteria:**
- [ ] Standards injected after command installation
- [ ] import-project.md runs standards injection
- [ ] Results reported to user
- [ ] Non-blocking if injection fails

**Test Cases:**
- Init creates standards files
- Import project creates standards files
- Failure doesn't block init
- Results displayed to user

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 1, 2 | Audit needs templates and injector |
| 4 | 3 | Cleanup runs audit first |
| 5 | 4 | Refactor is step-by-step cleanup |
| 6 | 2 | Integration needs injector |

**Parallel groups:**
- Group A: Tasks 1, 2 (can work simultaneously)
- Group B: Task 3 (after Group A)
- Group C: Tasks 4, 6 (after Task 3)
- Group D: Task 5 (after Task 4)

## Estimated Scope

- Tasks: 6
- Files: ~15
- Tests: ~60 (estimated)
