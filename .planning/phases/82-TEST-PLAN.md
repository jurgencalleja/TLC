# Phase 82 Test Plan

## Task 1+2: Capture Bridge (capture-bridge.js)

### File: server/lib/capture-bridge.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| parseStopHookInput extracts last_assistant_message | happy path | returns parsed fields |
| parseStopHookInput handles missing fields gracefully | edge case | returns nulls, no throw |
| parseStopHookInput handles invalid JSON | edge case | returns null, no throw |
| extractLastUserMessage reads last user turn from transcript JSONL | happy path | returns user text |
| extractLastUserMessage returns null for empty transcript | edge case | returns null |
| extractLastUserMessage returns null for missing file | edge case | returns null |
| captureExchange POSTs to capture endpoint | happy path | calls fetch with correct payload |
| captureExchange spools on POST failure | error | writes to spool JSONL file |
| captureExchange truncates messages over 10KB | edge case | message truncated before POST |
| captureExchange exits cleanly on any error | error | never throws |
| captureExchange detects projectId from .tlc.json | happy path | reads project name |
| captureExchange falls back to directory name when no .tlc.json | edge case | uses dir basename |
| drainSpool posts spooled entries and removes them | happy path | spool file emptied |
| drainSpool handles empty spool file | edge case | no errors, no POSTs |
| drainSpool handles missing spool file | edge case | no errors |
| drainSpool preserves failed entries | error | failed entries remain |

### Dependencies to mock:
- fetch (HTTP POST)
- filesystem (spool file, transcript file, .tlc.json)

---

## Task 4: Harden Capture Endpoint

### File: server/lib/capture-endpoint-hardening.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| rejects payload over 100KB with 413 | edge case | 413 status |
| rejects exchange without user or assistant | validation | 400 status |
| deduplicates identical exchanges within 60s | edge case | captured count = 1 |
| allows same exchange after 60s window | happy path | captured count = 2 |
| rate limits at 100 captures/minute | edge case | 429 status |
| valid payload still returns captured count | happy path | { captured: N } |

### Dependencies to mock:
- observeAndRemember
- vectorIndexer

---

## Task 5: E2E Integration Test

### File: server/lib/memory-bridge-e2e.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| decision in response creates decision file | e2e | file exists in team/decisions/ |
| gotcha in response creates gotcha file | e2e | file exists in team/gotchas/ |
| spool entry captured after drain | e2e | spool empty, file created |
| duplicate exchange deduplicated | e2e | only one file created |
| full pipeline: capture → observe → store → findable | e2e | memory search returns result |
