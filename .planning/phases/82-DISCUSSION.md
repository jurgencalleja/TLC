# Phase 82: Memory Bridge — Discussion

## The Problem

The memory system (phases 10-13, 71-81) is fully built but never receives data. Claude Code sessions run in the terminal. The TLC server runs as a dashboard on port 3147. Nothing bridges the two.

## Approach Decision

**Chosen: Claude Code `Stop` hook + HTTP POST to existing capture endpoint**

Codex (GPT-5.2) recommended Approach A (hooks + HTTP POST) as most reliable and least invasive. Claude Code guide confirmed the `Stop` hook provides `last_assistant_message` in stdin JSON, and supports `async: true` for non-blocking execution.

### Why This Approach

1. **Endpoint already exists**: `POST /api/projects/:projectId/memory/capture` (Phase 79)
2. **Hook system already configured**: `.claude/settings.json` has SessionStart, UserPromptSubmit, PreToolUse hooks
3. **`Stop` hook fires after each response**: Provides `last_assistant_message` + `transcript_path`
4. **Async hooks don't block CLI**: `async: true` means capture runs in background
5. **No Claude Code internals modified**: Pure shell script integration

### Codex Recommendations Applied

- Local JSONL spool for resilience when server is down
- Fire-and-forget with fail-open semantics
- Payload size limits on the server endpoint
- Deduplication by exchange hash

### Failure Modes Considered

| Risk | Mitigation |
|------|-----------|
| Server unreachable | Local spool, retry on next hook fire |
| Hook timeout | async: true with 30s timeout |
| Large responses | Truncate at 10KB before POST |
| Duplicate captures | Dedup by content hash server-side |
| Session without server | Spool accumulates, drains when server returns |

## Exchange Format

```json
{
  "sessionId": "abc-123",
  "exchanges": [{
    "user": "last user prompt (from transcript)",
    "assistant": "last assistant message (from stdin)",
    "timestamp": 1708345200000
  }]
}
```

## Hook Events Used

| Event | Purpose |
|-------|---------|
| `Stop` (async) | Capture assistant response after each turn |
| `UserPromptSubmit` | Log user prompt for pairing with next Stop |
| `SessionStart` | Initialize session tracking, drain spool |
