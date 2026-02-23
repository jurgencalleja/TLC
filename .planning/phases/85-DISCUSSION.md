# Phase 85: Security Bug Fixes - Discussion

## Audit Findings Triage

After re-reading all affected source files, **3 of 4 security bugs are already fixed** in the current codebase. They were false positives from audits run against stale code snapshots.

### Already Fixed (Close)

| Bug | Claimed Issue | Evidence |
|-----|--------------|----------|
| BUG-007 | `validateCommand` always returns true | `command-runner.js:147` reads `return VALID_COMMANDS.includes(command)` — no `\|\| command.length > 0` |
| BUG-008 | Stream resource leaks in docker-client | Both `streamContainerLogs` and `streamContainerStats` already use `streamRef` pattern with `stream.destroy()` in abort |
| BUG-010 | Command injection in deploy-engine (6 vectors) | `deploy-engine.js` imports and validates all inputs via `input-sanitizer.js`, plus base64 encodes port JSON |

### Still Open

| Bug | Issue | Severity |
|-----|-------|----------|
| BUG-009 | Security gates always pass — default runners are placeholders | high |
| BUG-006 | Dead code — memory-api.js handlers never mounted | low |

## Implementation Preferences

| Decision | Choice | Notes |
|----------|--------|-------|
| Default runners | Remove placeholders | Gates should SKIP (not fake-pass) when no real runner is provided |
| Real runners | `dependencies` + `secrets` | These are easiest to implement with existing tools (npm audit, grep) |
| SAST/DAST/container | Leave as injectable | Complex — require external tools, better as future extensions |
| Testing approach | Unit tests with runner injection | Test the gate orchestration, not the external tools |
| BUG-006 cleanup | Defer to separate phase | Low priority, doesn't affect security |

## Edge Cases to Handle

- [ ] npm audit returning non-JSON output
- [ ] npm audit exit code 1 (has vulnerabilities) vs exit code 2+ (error)
- [ ] Secrets scanner false positives (test data, example configs)
- [ ] Projects without package.json (skip dependencies gate)
- [ ] Runner timeout (long-running scans)

## Constraints

- Must not break existing tests (382 files, 7908 tests)
- Runners must be async and return `{ passed: boolean, findings: Array }`
- Must work with existing `createSecurityGates({ runners })` injection pattern

## Notes

The architecture is already solid — `runSecurityGate` returns SKIPPED when no runner is available (line 121-123). The only issue is `createSecurityGates` merges with `defaultRunners` (line 201), so placeholder runners always get used instead of SKIP. Fix: remove default runners object, keep the merge pattern for custom runners only.
