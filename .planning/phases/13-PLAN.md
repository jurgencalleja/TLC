# Phase 13: Memory Integration - Plan

## Overview

Hook memory system into TLC commands so it works seamlessly with existing workflow.

## Tasks

### Task 1: Init memory structure [ ]

**Goal:** /tlc:init creates memory directories

**Files:**
- server/lib/memory-init.js
- server/lib/memory-init.test.js

**Acceptance Criteria:**
- [ ] Creates .tlc/memory/team directory
- [ ] Creates .tlc/memory/.local directory
- [ ] Adds .local to .gitignore
- [ ] Skips if already exists

---

### Task 2: Session summary generator [ ]

**Goal:** Generate end-of-session summary from captured memory

**Files:**
- server/lib/session-summary.js
- server/lib/session-summary.test.js

**Acceptance Criteria:**
- [ ] Summarizes decisions made
- [ ] Summarizes preferences discovered
- [ ] Summarizes gotchas identified
- [ ] Formats for display

---

### Task 3: Memory auto-commit [ ]

**Goal:** Auto-commit team memory with conventional commits

**Files:**
- server/lib/memory-committer.js
- server/lib/memory-committer.test.js

**Acceptance Criteria:**
- [ ] Detects uncommitted team memory
- [ ] Generates conventional commit message
- [ ] Commits only memory files
- [ ] Handles empty changes gracefully

---

### Task 4: Memory hooks [ ]

**Goal:** Hook memory system into TLC command lifecycle

**Files:**
- server/lib/memory-hooks.js
- server/lib/memory-hooks.test.js

**Acceptance Criteria:**
- [ ] Provides before/after command hooks
- [ ] Triggers observation on responses
- [ ] Injects context on session start
- [ ] Triggers summary on session end
