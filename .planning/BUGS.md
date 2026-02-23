# Bug Tracker

## Summary

| Status | Count |
|--------|-------|
| Open | 4 |
| In Progress | 0 |
| Fixed | 0 |
| Verified | 0 |
| Closed | 0 |

---

## Open Bugs

### BUG-010: Command injection in deploy-engine.js (6 vectors) [open]

- **Reported:** 2026-02-24
- **Severity:** critical
- **Source:** Codex + Claude audit (Phase 84)

Unsanitized user input (branch, repoUrl, domain, JSON) interpolated directly into SSH shell commands and config files. 6 injection vectors:
1. `deploy()` — branch param in `git checkout ${branch}`
2. `deploy()` — repoUrl in `git clone ${project.repoUrl}`
3. `setupSsl()` — domain in `certbot -d ${domain}`
4. Port allocation — JSON.stringify into single-quoted shell string
5. `deployBranch()` — raw branch in `git clone -b ${branch}`
6. Nginx heredoc delimiter collision risk

**Files:** server/lib/deploy-engine.js
**Fix:** Validate all inputs against safe regex patterns before shell interpolation.

---

### BUG-009: Security gates always pass [open]

- **Reported:** 2026-02-24
- **Severity:** high
- **Source:** Codex full audit (Phase 84)

Default gate runners in `deploy/security-gates.js` return `{ passed: true, findings: [] }` for all 5 gate types (SAST, DAST, dependencies, container, secrets). They never fail.

**Files:** server/lib/deploy/security-gates.js
**Fix:** Implement real runners or require explicit injection.

---

### BUG-008: Stream resource leaks in docker-client.js [open]

- **Reported:** 2026-02-24
- **Severity:** high
- **Source:** Claude review (Phase 84)

`streamContainerLogs` and `streamContainerStats` abort functions set a flag but never call `stream.destroy()`. If no data arrives after abort, streams stay open indefinitely.

**Files:** server/lib/docker-client.js (lines 171-183, 192-222)
**Fix:** Store stream ref in outer scope, destroy in abort function.

---

### BUG-007: validateCommand always returns true [open]

- **Reported:** 2026-02-24
- **Severity:** high
- **Source:** Claude review (Phase 84)

`VALID_COMMANDS.includes(command) || command.length > 0` — second condition makes whitelist irrelevant. Any non-empty string passes.

**Files:** server/lib/command-runner.js (line 142-143)
**Fix:** Remove `|| command.length > 0`.

---

### BUG-006: Dead code — memory-api.js handlers never mounted [open]

- **Reported:** 2026-02-24
- **Severity:** low
- **Source:** Codex full audit (Phase 84)

`memory-api.js` exports 8 handlers (handleSearch, handleListConversations, etc.) that are never connected to Express routes. workspace-api.js uses `createMemoryStoreAdapter` directly, bypassing memoryApi entirely.

**Files:** server/lib/memory-api.js, server/lib/workspace-api.js
**Fix:** Either mount the handlers or consolidate into workspace-api.

---

*E2E test bugs (BUG-001 through BUG-005) removed — test artifacts, not real bugs.*

---

## Closed Bugs

*No closed bugs*
