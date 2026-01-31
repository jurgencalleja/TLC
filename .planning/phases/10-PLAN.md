# Phase 10: Memory Storage Layer - Plan

## Overview

Create persistent storage for team and personal memory with proper git separation.

## Architecture

```
.tlc/
├── memory/
│   ├── team/                      # Git tracked
│   │   ├── decisions/
│   │   │   └── 001-postgres-jsonb.md
│   │   ├── gotchas/
│   │   │   └── auth-service-warmup.md
│   │   ├── conventions.md
│   │   └── vocabulary.json
│   │
│   └── .local/                    # Gitignored
│       ├── preferences.json
│       ├── patterns.json
│       ├── corrections.jsonl
│       └── sessions/
│           └── 2026-01-31.jsonl
```

## Tasks

### Task 1: Create memory directory structure [x]

**Goal:** Initialize memory directories on /tlc:init

**Files:**
- server/lib/memory-storage.js
- server/lib/memory-storage.test.js

**Acceptance Criteria:**
- [ ] Creates .tlc/memory/team/decisions directory
- [ ] Creates .tlc/memory/team/gotchas directory
- [ ] Creates .tlc/memory/.local directory
- [ ] Creates .tlc/memory/.local/sessions directory
- [ ] Adds .tlc/memory/.local/ to .gitignore

**Test Cases:**
- Creates team and local directories on init
- Adds .local to gitignore
- Does not duplicate gitignore entry
- Works with existing .tlc directory

---

### Task 2: Memory write utilities [x]

**Goal:** Functions to write team decisions, gotchas, and personal preferences

**Files:**
- server/lib/memory-writer.js
- server/lib/memory-writer.test.js

**Acceptance Criteria:**
- [ ] writeTeamDecision() creates numbered markdown file
- [ ] writeTeamGotcha() creates gotcha markdown file
- [ ] writePersonalPreference() updates preferences.json
- [ ] appendSessionLog() appends to daily JSONL file
- [ ] Auto-increments decision/gotcha IDs

**Test Cases:**
- Writes team decision with auto-increment ID
- Writes personal preference without git tracking
- Appends to session log
- Handles concurrent writes safely
- Creates parent directories if missing

---

### Task 3: Memory read utilities [x]

**Goal:** Functions to read and search memory

**Files:**
- server/lib/memory-reader.js
- server/lib/memory-reader.test.js

**Acceptance Criteria:**
- [ ] loadTeamDecisions() returns all decision files
- [ ] loadTeamGotchas() returns all gotcha files
- [ ] loadPersonalPreferences() returns preferences object
- [ ] loadRecentSessions(n) returns last n session files
- [ ] searchMemory(query) searches across all memory

**Test Cases:**
- Loads all team decisions
- Loads personal preferences
- Loads recent session logs
- Searches memory by keyword
- Handles empty memory gracefully
- Returns empty array when no memory exists

---

## Dependencies

Tasks are independent and can be worked in parallel.

## File Formats

### Decision File
```markdown
# Decision: Use Postgres over MySQL

**Date:** 2026-01-31
**Status:** Active
**Context:** Database selection

## Decision
Use PostgreSQL as the primary database.

## Reasoning
- JSONB support for flexible schemas
- Team familiarity

## Alternatives Considered
- MySQL: Rejected due to limited JSON support
```

### Gotcha File
```markdown
# Gotcha: Auth Service Needs Warm-up

**Date:** 2026-01-31
**Severity:** Medium
**Affected:** src/auth/*

## Issue
Auth service needs ~2 seconds to warm up.

## Workaround
Add delay in test setup.
```

### Preferences JSON
```json
{
  "codeStyle": {
    "exports": "named",
    "functions": "arrow"
  },
  "communication": {
    "explanationDepth": "concise"
  }
}
```

### Session Log JSONL
```jsonl
{"ts":"2026-01-31T10:15:00Z","type":"session_start","branch":"feature/auth"}
{"ts":"2026-01-31T10:16:00Z","type":"decision","content":"use JWT","classification":"team"}
```
