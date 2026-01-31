# Phase 12: Automatic Recall - Plan

## Overview

Surface relevant memory at session start by building context and injecting into CLAUDE.md.

## Tasks

### Task 1: Session context builder [ ]

**Goal:** Build context from memory sources with token budget

**Files:**
- server/lib/context-builder.js
- server/lib/context-builder.test.js

**Acceptance Criteria:**
- [ ] Gathers preferences, recent sessions, decisions, gotchas
- [ ] Prioritizes by relevance to current context
- [ ] Respects token budget limit
- [ ] Formats for CLAUDE.md injection

---

### Task 2: Relevance scoring [ ]

**Goal:** Score memory items by relevance to current context

**Files:**
- server/lib/relevance-scorer.js
- server/lib/relevance-scorer.test.js

**Acceptance Criteria:**
- [ ] Scores by file overlap
- [ ] Scores by branch match
- [ ] Scores by recency
- [ ] Scores by keyword overlap
- [ ] Returns weighted combination

---

### Task 3: CLAUDE.md injection [ ]

**Goal:** Inject memory context into CLAUDE.md

**Files:**
- server/lib/claude-injector.js
- server/lib/claude-injector.test.js

**Acceptance Criteria:**
- [ ] Finds or creates Active Memory section
- [ ] Replaces content without duplicating
- [ ] Preserves rest of CLAUDE.md
- [ ] Handles missing CLAUDE.md gracefully
