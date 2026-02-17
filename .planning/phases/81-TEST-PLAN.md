# Phase 81 Test Plan

## Task 1: Fix vectorStore.search call signature

### File: server/lib/semantic-recall.test.js (update existing)

| Test | Type | Expected Result |
|------|------|-----------------|
| search called with (embedding, {limit}) not ({embedding, limit}) | bug fix | vectorStore.search receives Float32Array as first arg |
| recall returns empty for null embedding | edge case | returns [] |

### Dependencies to mock:
- vectorStore (already mocked)
- embeddingClient (already mocked)

---

## Task 2: Fix remember-command chunk.text

### File: server/lib/remember-command.test.js (update existing)

| Test | Type | Expected Result |
|------|------|-----------------|
| explicit text sets chunk.text on indexChunk call | bug fix | indexChunk receives chunk with text field |
| exchange capture sets chunk.text to summary | bug fix | indexChunk receives chunk with non-empty text |

### Dependencies to mock:
- richCapture (already mocked)
- vectorIndexer (already mocked)

---

## Task 3: Fix buffer race condition

### File: server/lib/memory-hooks-capture.test.js (update existing)

| Test | Type | Expected Result |
|------|------|-----------------|
| exchanges added during processing are preserved | race condition | buffer contains late exchanges after processing |
| error during processing preserves new exchanges | error + race | new exchanges survive processing error |

### Dependencies to mock:
- chunker, richCapture, vectorIndexer (already mocked)

---

## Task 4: Fix detectUncommittedMemory

### File: server/lib/memory-committer.test.js (update existing)

| Test | Type | Expected Result |
|------|------|-----------------|
| committed files not returned as uncommitted | bug fix | returns empty for committed files |
| uses git status when in git repo | integration | filters by git status |

### Dependencies to mock:
- execAsync (child_process.exec)

---

## Task 5: Fix branch sanitization in deploy-engine

### File: server/lib/deploy-engine.test.js (update existing)

| Test | Type | Expected Result |
|------|------|-----------------|
| git clone uses original branch name | bug fix | ssh exec receives original branch in git clone -b |
| git reset uses original branch name | bug fix | ssh exec receives original branch in git reset |
| deploy dir uses sanitized branch | regression | path contains sanitized name |

### Dependencies to mock:
- sshClient (already mocked)

---

## Task 6: Wire memory hooks into server

### File: server/lib/memory-hooks-integration.test.js (new)

| Test | Type | Expected Result |
|------|------|-----------------|
| createServerMemoryCapture initializes without error | happy path | returns capture object |
| onAssistantResponse triggers observeAndRemember | integration | observer called |
| onTlcCommand flushes capture buffer | integration | processBuffer called |
| capture failure does not throw | error resilience | no exception |
| works when vector DB unavailable | degraded mode | graceful fallback |
