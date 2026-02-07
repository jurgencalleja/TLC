# Phase 66: Battle-Tested Code Gate Rules - Plan

## Overview

Add rules to Code Gate derived from 34 real-world bugs and 43 lessons learned from production KashaCH project. These rules catch the patterns that caused the most damage in actual team development with AI code generators.

## Problem

Phase 65 Code Gate has solid foundational rules but misses critical patterns discovered through real-world usage:
- Single-writer violations (7 service-layer bypasses found in one project)
- `new Date()` in DB `.set()` blocks (timestamp drift)
- Fake API calls with `setTimeout` (AI generator anti-pattern)
- Inline billing math (8+ copies of same calculation)
- Docker volume safety (AI wiped a production database)
- Stale re-export files accumulating as dead code

## Prerequisites

- [x] Phase 65 complete (Code Gate engine + existing rules)
- [x] KashaCH WALL_OF_SHAME.md analyzed (34 bugs)
- [x] TLC-BEST-PRACTICES.md analyzed (43 lessons)

## Tasks

### Task 1: Architecture Rules [x]

**Goal:** Detect single-writer violations, fake API calls, raw API bypass, and stale re-exports.

**Files:**
- `server/lib/code-gate/rules/architecture-rules.js`
- `server/lib/code-gate/rules/architecture-rules.test.js`

**Acceptance Criteria:**
- [ ] Detect `db.insert(X)` / `db.update(X)` outside X's owning service file
- [ ] Detect `setTimeout(() => resolve(...)` mock API patterns
- [ ] Detect files containing only `module.exports = require(...)` re-exports
- [ ] Detect `apiRequest()` / raw `fetch('/api/...)` patterns
- [ ] Skip test files for all checks

**Test Cases (~15 tests):**
- Single-writer: detects db.insert(users) outside users.service
- Single-writer: passes when inside correct service file
- Single-writer: detects db.update(companies) outside company.service
- Single-writer: handles plural/singular table names
- Single-writer: skips test files
- Fake API: detects setTimeout + resolve pattern
- Fake API: allows real setTimeout with function callback
- Fake API: skips test files
- Stale re-exports: detects file with only module.exports = require
- Stale re-exports: passes file with real logic alongside export
- Raw API: detects apiRequest("POST", "/api/...")
- Raw API: detects raw fetch('/api/...')
- Raw API: allows non-API fetch calls
- Raw API: allows fetch in API helper files
- Raw API: skips test files

---

### Task 2: Database Rules [x]

**Goal:** Detect `new Date()` in ORM `.set()` blocks and inline billing math.

**Files:**
- `server/lib/code-gate/rules/database-rules.js`
- `server/lib/code-gate/rules/database-rules.test.js`

**Acceptance Criteria:**
- [ ] Detect `new Date()` inside `.set({...})` blocks
- [ ] Allow `new Date()` outside `.set()` (logging, scheduling)
- [ ] Detect inline billing math patterns (quantity * rate)
- [ ] Allow math in designated calculation utility files
- [ ] Skip test files

**Test Cases (~12 tests):**
- new Date in set: detects new Date() in .set({}) block
- new Date in set: detects new Date() in .set() with updatedAt
- new Date in set: allows new Date() in logging context
- new Date in set: allows sql`now()` in .set()
- new Date in set: skips test files
- new Date in set: detects across multiline .set() call
- Inline math: detects quantity * rate pattern
- Inline math: detects subtotal - discount pattern
- Inline math: allows math in *-calculations.* files
- Inline math: allows math in utility files
- Inline math: skips test files
- Inline math: allows non-billing arithmetic

---

### Task 3: Docker Rules [x]

**Goal:** Prevent Docker volume data loss and dangerous commands.

**Files:**
- `server/lib/code-gate/rules/docker-rules.js`
- `server/lib/code-gate/rules/docker-rules.test.js`

**Acceptance Criteria:**
- [ ] Detect `external: true` in docker-compose volume definitions
- [ ] Detect volumes without explicit `name:` property
- [ ] Detect `docker compose down -v` in shell scripts
- [ ] Detect `docker volume rm` in shell scripts
- [ ] Only apply docker rules to relevant file types

**Test Cases (~10 tests):**
- External volumes: detects external: true in docker-compose
- External volumes: passes without external flag
- External volumes: only checks docker-compose files
- Missing names: detects volume without name property
- Missing names: passes volume with explicit name
- Missing names: only checks docker-compose files
- Dangerous commands: detects docker compose down -v
- Dangerous commands: detects docker volume rm
- Dangerous commands: allows docker compose down without -v
- Dangerous commands: checks shell scripts and dockerfiles

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | Phase 65 | Rules plug into existing gate engine |
| 2 | Phase 65 | Rules plug into existing gate engine |
| 3 | Phase 65 | Rules plug into existing gate engine |

**All tasks are independent of each other.**

## Estimated Scope

- Tasks: 3
- New Files: 6
- Tests: ~37
- Coverage: Architecture violations, DB timestamp patterns, Docker safety
