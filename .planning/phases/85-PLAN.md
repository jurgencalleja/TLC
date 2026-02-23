# Phase 85: Security Gate Runners - Plan

## Overview

Replace placeholder security gate runners with real implementations. Currently, all 5 default runners return `{ passed: true, findings: [] }` unconditionally (BUG-009). Gates that lack a real runner should SKIP instead of fake-pass.

## Prerequisites

- [x] Phase 80: Deploy Pipeline (security-gates.js exists)
- [x] Phase 84: Wire Memory E2E (audits identified BUG-009)

## Tasks

### Task 1: Remove placeholder default runners [x]

**Goal:** Gates without real runners should SKIP, not fake-pass. Remove the `defaultRunners` object and adjust `createSecurityGates` merge logic.

**Files:**
- `server/lib/deploy/security-gates.js` (modified)
- `server/lib/deploy/security-gates.test.js` (modified)

**Acceptance Criteria:**
- [ ] `defaultRunners` object removed (was lines 41-62)
- [ ] `createSecurityGates()` with no custom runners → all gates SKIP
- [ ] `createSecurityGates({ runners: { sast: fn } })` → only sast runs, others SKIP
- [ ] Existing tests updated: "provides default runners" test changed to verify SKIP behavior

**Test Cases:**
- Gates without runners return SKIPPED status
- createSecurityGates() with no config skips all gates
- createSecurityGates() with partial runners only runs provided ones
- Existing injection tests still pass

---

### Task 2: Implement dependencies runner [x]

**Goal:** Real dependency scanning via `npm audit --json`. Parses output, maps severity, returns findings.

**Files:**
- `server/lib/deploy/runners/dependency-runner.js` (new)
- `server/lib/deploy/runners/dependency-runner.test.js` (new)

**Acceptance Criteria:**
- [ ] Runs `npm audit --json` in projectPath
- [ ] Parses JSON output into findings array
- [ ] Each finding: `{ severity, package, title, url, fixAvailable }`
- [ ] `passed: true` when no high/critical vulnerabilities
- [ ] `passed: false` when high or critical found
- [ ] Handles missing package.json (returns passed with note)
- [ ] Handles npm audit parse errors gracefully (returns error result)
- [ ] Configurable severity threshold (default: high)

**Test Cases:**
- Parses clean npm audit output (no vulnerabilities)
- Parses npm audit with high-severity vulnerability
- Parses npm audit with only low/moderate vulnerabilities (passes)
- Handles missing package.json
- Handles npm audit JSON parse error
- Handles npm audit process error (exit code > 1)
- Configurable severity threshold

---

### Task 3: Implement secrets runner [x]

**Goal:** Scan project files for hardcoded secrets using regex patterns. No external tools needed.

**Files:**
- `server/lib/deploy/runners/secrets-runner.js` (new)
- `server/lib/deploy/runners/secrets-runner.test.js` (new)

**Acceptance Criteria:**
- [ ] Scans files matching glob pattern (default: `**/*.{js,ts,json,env,yml,yaml}`)
- [ ] Detects patterns: API keys, passwords in strings, AWS keys, private keys, tokens
- [ ] Excludes: `node_modules/`, `*.test.*`, `.git/`, lockfiles
- [ ] Each finding: `{ severity, file, line, pattern, match }`
- [ ] `passed: true` when no secrets found
- [ ] `passed: false` when secrets detected
- [ ] Configurable exclusion patterns

**Test Cases:**
- Clean project passes (no secrets)
- Detects hardcoded password assignment
- Detects AWS access key pattern
- Detects private key header
- Detects generic API key pattern
- Excludes test files
- Excludes node_modules
- Configurable exclusion patterns
- Handles empty project directory

---

### Task 4: Wire runners into createSecurityGates [x]

**Goal:** Provide built-in runners for `dependencies` and `secrets` while keeping SAST/DAST/container as injectable-only.

**Files:**
- `server/lib/deploy/security-gates.js` (modified)
- `server/lib/deploy/security-gates.test.js` (modified)

**Acceptance Criteria:**
- [ ] `createSecurityGates()` includes real `dependencies` and `secrets` runners by default
- [ ] SAST, DAST, container gates SKIP unless custom runner injected
- [ ] Custom runners override built-in runners
- [ ] Integration test: `runAll('feature')` runs real dependency + sast (skips sast since no runner)

**Test Cases:**
- Default gates include dependencies and secrets runners
- SAST/DAST/container skip without custom runners
- Custom runner overrides built-in
- runAll with feature tier runs dependencies (real) and sast (skips)

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | — | Independent (remove placeholders) |
| 2 | — | Independent (new runner module) |
| 3 | — | Independent (new runner module) |
| 4 | 1, 2, 3 | Wires runners into gates |

**Parallel groups:**
- Group A: Tasks 1, 2, 3 (independent)
- Group B: Task 4 (after all of Group A)

## Estimated Scope

- Tasks: 4
- New files: 4 (2 runners + 2 test files)
- Modified files: 2 (security-gates.js + security-gates.test.js)
- Tests: ~30 (estimated)
