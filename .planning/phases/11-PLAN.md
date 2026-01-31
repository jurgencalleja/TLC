# Phase 11: Automatic Capture - Plan

## Overview

Detect and store decisions, preferences, gotchas from conversations automatically without user intervention.

## Tasks

### Task 1: Pattern detection [x]

**Goal:** Detect decision, preference, correction, and gotcha patterns from conversation exchanges

**Files:**
- server/lib/pattern-detector.js
- server/lib/pattern-detector.test.js

**Acceptance Criteria:**
- [ ] Detects decision patterns ("let's use X instead of Y", "we decided to")
- [ ] Detects preference patterns ("I prefer", "no, use X not Y")
- [ ] Detects correction patterns (user correcting Claude's approach)
- [ ] Detects gotcha patterns ("ah, X needs Y", "watch out for")
- [ ] Extracts structured data from detected patterns

**Test Cases:**
- Detects "let's use Stripe instead of Paddle" as decision
- Detects "no, use named exports not default" as preference
- Detects "ah the auth service needs time to warm up" as gotcha
- Detects "because the team already knows React" as reasoning
- Returns empty array for non-memorable exchanges

---

### Task 2: Memory classification [x]

**Goal:** Classify detected patterns as team (git-tracked) or personal (local)

**Files:**
- server/lib/memory-classifier.js
- server/lib/memory-classifier.test.js

**Acceptance Criteria:**
- [ ] Classifies architectural decisions as team
- [ ] Classifies style preferences as personal
- [ ] Classifies project gotchas as team
- [ ] Classifies corrections as personal
- [ ] Uses "we" language as team indicator
- [ ] Uses "I" language as personal indicator
- [ ] Defaults to personal when ambiguous

**Test Cases:**
- Architectural decision → team
- Style preference → personal
- Project gotcha → team
- Code correction → personal
- "we decided" → team
- "I prefer" → personal

---

### Task 3: Background observer hook [x]

**Goal:** Non-blocking capture that processes exchanges after they complete

**Files:**
- server/lib/memory-observer.js
- server/lib/memory-observer.test.js

**Acceptance Criteria:**
- [ ] Processes conversation exchanges asynchronously
- [ ] Extracts patterns and classifies them
- [ ] Writes to appropriate storage (team/personal)
- [ ] Does not block or slow down responses
- [ ] Handles errors gracefully without crashing

**Test Cases:**
- Extracts and stores memory after exchange
- Does not block response (< 50ms)
- Handles empty extraction gracefully
- Handles storage errors without crashing
- Logs errors but continues operation

---

## Pattern Examples

### Decision Patterns
- "let's use X instead of Y"
- "we decided to use X"
- "going with X because..."
- "X is better for this because..."

### Preference Patterns
- "I prefer X"
- "no, use X not Y"
- "always use X"
- "don't use Y, use X"

### Gotcha Patterns
- "ah, X needs Y"
- "watch out for X"
- "X doesn't work because Y"
- "remember that X"

### Reasoning Patterns
- "because..."
- "the reason is..."
- "since we need..."
- "given that..."
