# Phase 68: Production Lessons Integration - Plan

## Overview

Five features derived from real-world team experience with TLC in the KashaCH project. Each addresses a gap discovered through production usage: auto-audit on first commit, multi-model reviews, cleanup dry-run, infrastructure templates, and a learning registry.

## Prerequisites

- [x] Phase 57 complete (Coding Standards / audit-checker)
- [x] Phase 65 complete (Code Gate / llm-reviewer)
- [x] Phase 66-67 complete (Battle-tested rules)

## Tasks

### Task 1: First-Commit Audit Hook [x] ✓

**Goal:** Auto-run architectural audit on first commit to catch AI-generated code issues before they accumulate. The "2-hour audit on day 1 saves 10 days" lesson.

**Files:**
- `server/lib/code-gate/first-commit-audit.js`
- `server/lib/code-gate/first-commit-audit.test.js`

**Acceptance Criteria:**
- [ ] Detect if project has had its first audit (`.tlc/first-audit-done` marker)
- [ ] Run `auditProject()` automatically on first gate check
- [ ] Convert audit issues to gate findings (severity: warn)
- [ ] Create marker file after first audit runs
- [ ] Skip subsequent runs (idempotent)
- [ ] Configurable via gate config (`gate.firstCommitAudit: true`)

**Test Cases (~10 tests):**
- Runs audit when no marker exists
- Skips audit when marker exists
- Converts audit issues to gate findings
- Creates marker after successful run
- Handles audit with zero issues
- Handles audit with multiple issues
- Respects enabled/disabled config
- Returns correct severity for findings
- Includes fix suggestions from audit
- Works with injectable dependencies

---

### Task 2: Multi-Model Review Mode [x]

**Goal:** Send code reviews to 2+ LLM models and aggregate findings. Different models catch different bugs.

**Files:**
- `server/lib/code-gate/multi-model-reviewer.js`
- `server/lib/code-gate/multi-model-reviewer.test.js`

**Acceptance Criteria:**
- [ ] Accept list of model names to review with
- [ ] Send same diff to each model in parallel
- [ ] Aggregate findings from all models
- [ ] Deduplicate findings by file+line+rule
- [ ] Track which model(s) flagged each finding (flaggedBy field)
- [ ] Calculate consensus score (% of models that agree)
- [ ] Higher severity wins on conflicts
- [ ] Fall back to single-model if others fail
- [ ] Configurable via gate config (`gate.multiModel: true`)

**Test Cases (~12 tests):**
- Sends to multiple models in parallel
- Aggregates findings from 2 models
- Deduplicates identical findings
- Tracks flaggedBy for each finding
- Higher severity wins on conflict
- Calculates consensus percentage
- Falls back when one model fails
- All models fail = static-only fallback
- Single model mode still works
- Respects model list from config
- Merges summaries from all models
- Timeout applies per-model

---

### Task 3: Cleanup Dry-Run Mode [x]

**Goal:** Preview what `/tlc:cleanup` would change without making any modifications. Critical for team adoption.

**Files:**
- `server/lib/standards/cleanup-dry-run.js`
- `server/lib/standards/cleanup-dry-run.test.js`

**Acceptance Criteria:**
- [ ] Accept project path and return planned changes
- [ ] List files that would be moved (flat folder fixes)
- [ ] List files that would be modified (hardcoded URLs, magic strings)
- [ ] List interfaces that would be extracted
- [ ] Show JSDoc that would be added
- [ ] Show git commits that would be created
- [ ] Return structured report (not side effects)
- [ ] No file system writes in dry-run mode

**Test Cases (~10 tests):**
- Lists files that would be moved
- Lists hardcoded URLs that would be extracted
- Lists interfaces that would be extracted
- Lists functions needing JSDoc
- Shows planned commit messages
- Returns empty plan for clean project
- Handles multiple issue types
- No fs.writeFileSync calls in dry-run
- No git operations in dry-run
- Includes before/after preview for transforms

---

### Task 4: Infrastructure Blueprint Generator [x]

**Goal:** Generate Docker dev environment with observability stack (Prometheus, Grafana, MailHog, MinIO, pgAdmin) from a template.

**Files:**
- `server/lib/infra/infra-generator.js`
- `server/lib/infra/infra-generator.test.js`

**Acceptance Criteria:**
- [ ] Generate docker-compose with selectable services
- [ ] Available services: postgres, redis, prometheus, grafana, mailhog, minio, pgadmin
- [ ] Each service includes proper volume config (with name: property!)
- [ ] Network segmentation (app, monitoring, storage)
- [ ] Environment file template (.env.example)
- [ ] Health checks for all services
- [ ] Configurable ports to avoid conflicts
- [ ] Return file contents (not write directly)

**Test Cases (~12 tests):**
- Generates docker-compose with postgres
- Generates docker-compose with full observability stack
- Each volume has explicit name property
- No external: true in any volume
- Services on correct networks
- Health checks present for each service
- Generates .env.example with all vars
- Ports configurable via options
- Includes pgAdmin with connection pre-configured
- Includes Grafana with Prometheus datasource
- Empty service list returns minimal compose
- Returns structured output (not writes files)

---

### Task 5: Wall of Shame Registry (/tlc:shame) [x]

**Goal:** Document bugs with root causes, creating a project-level learning registry. Gate rules can be suggested from shame entries.

**Files:**
- `server/lib/shame/shame-registry.js`
- `server/lib/shame/shame-registry.test.js`

**Acceptance Criteria:**
- [ ] Add shame entry (title, root cause, category, fix, lesson)
- [ ] Load shame entries from `.tlc/shame.json`
- [ ] Save shame entries to `.tlc/shame.json`
- [ ] Categorize: architecture, type-safety, duplication, docker, security, data-loss
- [ ] Generate markdown report from entries
- [ ] Suggest gate rules based on shame category
- [ ] Track recurrence (same category = pattern)
- [ ] Entry format matches Wall of Shame structure

**Test Cases (~12 tests):**
- Adds shame entry with all fields
- Loads entries from file
- Saves entries to file
- Categorizes entries correctly
- Generates markdown report
- Suggests gate rules for architecture category
- Suggests gate rules for type-safety category
- Tracks recurrence count per category
- Handles empty registry
- Handles malformed file gracefully
- Entry includes timestamp and ID
- Report groups by category

## Dependencies

All tasks are independent of each other.

## Estimated Scope

- Tasks: 5
- New Files: 10
- Tests: ~56
