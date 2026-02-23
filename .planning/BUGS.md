# Bug Tracker

## Summary

| Status | Count |
|--------|-------|
| Open | 2 |
| In Progress | 0 |
| Fixed | 0 |
| Verified | 0 |
| Closed | 3 |

---

## Open Bugs

### BUG-009: Security gates always pass [open]

- **Reported:** 2026-02-24
- **Severity:** high
- **Source:** Codex full audit (Phase 84)

Default gate runners in `deploy/security-gates.js` return `{ passed: true, findings: [] }` for all 5 gate types (SAST, DAST, dependencies, container, secrets). They never fail. `createSecurityGates` merges with `defaultRunners` (line 201), so placeholder runners always get used instead of SKIP.

**Files:** server/lib/deploy/security-gates.js
**Fix:** Remove placeholder default runners. Implement real `dependencies` and `secrets` runners. Leave SAST/DAST/container as injectable (SKIP when not provided).

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

### BUG-010: Command injection in deploy-engine.js (6 vectors) [closed — already fixed]

- **Reported:** 2026-02-24
- **Closed:** 2026-02-24
- **Severity:** critical
- **Source:** Codex + Claude audit (Phase 84)
- **Resolution:** False positive. `deploy-engine.js` already imports and uses `isValidBranch`, `isValidRepoUrl`, `isValidDomain`, `isValidProjectName` from `input-sanitizer.js`. Port data uses base64 encoding. All 6 vectors are already mitigated.

---

### BUG-008: Stream resource leaks in docker-client.js [closed — already fixed]

- **Reported:** 2026-02-24
- **Closed:** 2026-02-24
- **Severity:** high
- **Source:** Claude review (Phase 84)
- **Resolution:** False positive. Both `streamContainerLogs` and `streamContainerStats` already use `let streamRef = null` in outer scope with `streamRef = stream` in `.then()` and `streamRef.destroy()` in abort function.

---

### BUG-007: validateCommand always returns true [closed — already fixed]

- **Reported:** 2026-02-24
- **Closed:** 2026-02-24
- **Severity:** high
- **Source:** Claude review (Phase 84)
- **Resolution:** False positive. `command-runner.js:147` already reads `return VALID_COMMANDS.includes(command)` — the `|| command.length > 0` does not exist in the current code.
