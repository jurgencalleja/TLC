# Phase 82: Memory Bridge — Plan

## Overview

Connect Claude Code sessions to the TLC memory pipeline via Claude Code hooks. When Claude responds during a session, the `Stop` hook captures the exchange and POSTs it to the TLC server's existing capture endpoint. A local spool handles server downtime. This is the final piece that makes the memory system actually work.

## Prerequisites

- [x] Phase 81 complete (memory bugs fixed, server wiring done)
- [x] Capture endpoint exists: POST /api/projects/:projectId/memory/capture
- [x] Claude Code hooks configured in .claude/settings.json
- [x] Stop hook provides last_assistant_message in stdin

## Tasks

### Task 1: Create capture hook script

**Goal:** Shell script that reads the Stop hook stdin JSON, extracts the last assistant message, and POSTs it to the TLC server capture endpoint. Fails silently — never blocks or errors.

**Files:**
- .claude/hooks/tlc-capture-exchange.sh

**Acceptance Criteria:**
- [ ] Reads JSON from stdin (Stop hook provides session_id, last_assistant_message, transcript_path, cwd)
- [ ] Extracts last_assistant_message from stdin JSON
- [ ] Extracts last user message from transcript_path JSONL (last user turn)
- [ ] Detects projectId from .tlc.json in cwd (or derives from directory name)
- [ ] POSTs to http://localhost:3147/api/projects/{projectId}/memory/capture
- [ ] Truncates messages over 10KB
- [ ] On POST failure, appends to local spool file (.tlc/memory/.spool.jsonl)
- [ ] Exit 0 always — never fails the hook

**Test Cases:**
- Hook script exits 0 when server unreachable
- Hook script exits 0 with valid JSON input
- Hook script creates spool entry on POST failure
- Hook script truncates large messages
- Hook script extracts user message from transcript JSONL

---

### Task 2: Create spool drain mechanism

**Goal:** On session start or when the capture hook runs successfully, drain any spooled exchanges that accumulated while the server was down.

**Files:**
- .claude/hooks/tlc-drain-spool.sh
- .claude/hooks/tlc-session-init.sh (modify existing)

**Acceptance Criteria:**
- [ ] Reads .tlc/memory/.spool.jsonl line by line
- [ ] POSTs each entry to the capture endpoint
- [ ] Removes successfully posted entries from spool
- [ ] Handles empty/missing spool file gracefully
- [ ] Runs on SessionStart (modify existing tlc-session-init.sh)
- [ ] Also called from capture hook after successful POST

**Test Cases:**
- Empty spool file handled without error
- Missing spool file handled without error
- Spool entries posted and removed on success
- Failed entries remain in spool for next drain

---

### Task 3: Register hooks in settings.json

**Goal:** Add the Stop hook (async) to .claude/settings.json so it fires after every Claude response.

**Files:**
- .claude/settings.json

**Acceptance Criteria:**
- [ ] Stop hook registered with async: true
- [ ] timeout: 30 seconds
- [ ] Points to tlc-capture-exchange.sh
- [ ] Existing hooks (SessionStart, UserPromptSubmit, PreToolUse) preserved
- [ ] SessionStart hook also calls drain on startup

**Test Cases:**
- settings.json is valid JSON after modification
- All existing hooks still present
- Stop hook has async: true
- Hook script path resolves correctly

---

### Task 4: Harden capture endpoint

**Goal:** Add input validation, size limits, and deduplication to the existing capture endpoint per Codex recommendations.

**Files:**
- server/lib/workspace-api.js
- server/lib/workspace-api.test.js (or relevant test file)

**Acceptance Criteria:**
- [ ] Reject payloads over 100KB (413 status)
- [ ] Validate exchange objects have at least one of user/assistant as non-empty string
- [ ] Deduplicate by content hash within a 60-second window (same text = skip)
- [ ] Rate limit: max 100 captures per minute per project (429 status)
- [ ] Return captured count (existing behavior preserved)

**Test Cases:**
- Oversized payload returns 413
- Invalid exchange objects rejected with 400
- Duplicate exchanges within 60s window are deduplicated
- Rate limit returns 429 after threshold
- Valid payload still returns captured count

---

### Task 5: End-to-end integration test

**Goal:** Prove the full pipeline works: hook script → POST → observeAndRemember → pattern detection → file storage. This is the test that proves the memory system achieves its original goal.

**Files:**
- server/lib/memory-bridge-e2e.test.js

**Acceptance Criteria:**
- [ ] Simulates hook script stdin (Stop hook JSON format)
- [ ] Calls capture endpoint with exchange containing a decision pattern
- [ ] Verifies observeAndRemember was called with correct exchange
- [ ] Verifies decision file created in .tlc/memory/team/decisions/
- [ ] Verifies exchange is findable via memory search
- [ ] Tests spool → drain → capture flow
- [ ] Tests dedup (same exchange twice = captured once)

**Test Cases:**
- Decision in assistant response creates decision file
- Gotcha in assistant response creates gotcha file
- Preference in assistant response stored in preferences
- Spool entry captured after drain
- Duplicate exchange deduplicated

---

### Task 6: Documentation and verification

**Goal:** Update CLAUDE.md and PROJECT.md to document the memory bridge. Mark Phase 82 complete.

**Files:**
- CLAUDE.md (add memory bridge section)
- .planning/ROADMAP.md (mark phase complete)

**Acceptance Criteria:**
- [ ] CLAUDE.md documents that conversations are auto-captured
- [ ] Documents the spool mechanism for resilience
- [ ] Documents how to disable capture (remove Stop hook)
- [ ] ROADMAP updated

**Test Cases:**
- N/A (documentation only)

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Drain needs capture script format to be defined first |
| 3 | 1 | Can't register hook until script exists |
| 5 | 1, 4 | E2E test needs both hook and hardened endpoint |
| 6 | 5 | Docs written after everything verified |

**Parallel groups:**
- Group A: Task 1, Task 4 (hook script and endpoint hardening, independent)
- Group B: Tasks 2, 3 (after Task 1)
- Group C: Task 5 (after Tasks 1, 4)
- Group D: Task 6 (after Task 5)

## Estimated Scope

- Tasks: 6
- Files: ~8 (3 new shell scripts, 2 test files, 3 modifications)
- Tests: ~20 (estimated)
