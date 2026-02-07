# Phase 67: Remaining Code Gate Coverage - Plan

## Overview

Close the gap on the 19 bugs that Phase 65+66 rules don't catch. Three tiers: TypeScript compilation gate (7 bugs), new static rules (3 bugs), and schema-level checks (1 bug). Total: 11 more bugs covered, bringing overall coverage from 15/34 to 26/34.

The remaining 8 bugs (2, 5, 14, 15, 16, 17, 22, 26, 28) require runtime checks, cross-file analysis, or E2E tests — beyond what per-file static analysis can do.

## Prerequisites

- [x] Phase 65 complete (Code Gate engine)
- [x] Phase 66 complete (Battle-tested rules)

## Bugs Addressed

### Task 1 catches:
- Bug #4: Invalid company status ("pre-onboarding" doesn't exist in enum)
- Bug #7: Wrong API field names (name vs contactName)
- Bug #8: Date object where ISO string expected
- Bug #31: Undefined variable `gross` instead of `lineTotal`
- Bug #32: 99 TypeScript errors across 31 files
- Bug #33: Invented enum value "not_started"
- Bug #34: Object spread missing required fields

### Task 2 catches:
- Bug #18: Hardcoded role mappings
- Bug #23: Magic numbers (timeouts, thresholds)

### Task 3 catches:
- Bug #12: Zod date coercion missing
- Bug #13: Zustand stores without persistence

## Tasks

### Task 1: TypeScript Compilation Gate [x]

**Goal:** Integrate `tsc --noEmit` as an optional check in the push gate pipeline.

**Files:**
- `server/lib/code-gate/typescript-gate.js`
- `server/lib/code-gate/typescript-gate.test.js`

**Acceptance Criteria:**
- [ ] Detect if tsconfig.json exists in project
- [ ] Run `tsc --noEmit` and parse error output
- [ ] Parse TypeScript error format (file:line:col - error TSxxxx: message)
- [ ] Convert TS errors to gate findings (severity: block)
- [ ] Report error count and affected files
- [ ] Skip gracefully if TypeScript not installed
- [ ] Configurable via gate config (`gate.typescript: true`)

**Test Cases (~12 tests):**
- Detects tsconfig.json exists
- Parses TS error output into findings
- Handles zero-error output (clean pass)
- Handles multiple errors across files
- Extracts file, line, code, message from each error
- Maps all TS errors to severity: block
- Returns passed: false when errors found
- Returns passed: true when no errors
- Skips when no tsconfig.json
- Skips when TypeScript not installed
- Reports total error count in summary
- Configurable enable/disable

---

### Task 2: Magic Numbers & Hardcoded Config Rules [x]

**Goal:** Detect hardcoded magic numbers (timeouts, durations, thresholds) and hardcoded role strings.

**Files:**
- `server/lib/code-gate/rules/config-rules.js`
- `server/lib/code-gate/rules/config-rules.test.js`

**Acceptance Criteria:**
- [ ] Detect large hardcoded numbers (>= 60000) that look like timeouts
- [ ] Detect hardcoded role strings in comparisons (role === "admin")
- [ ] Detect hardcoded role strings in object literals (role: "manager")
- [ ] Allow constants/config references (TIMEOUT, config.timeout)
- [ ] Allow common safe numbers (0, 1, 100, HTTP status codes)
- [ ] Skip test files and config files

**Test Cases (~12 tests):**
- Magic numbers: detects hardcoded 86400000 (24h in ms)
- Magic numbers: detects hardcoded 3600000 (1h in ms)
- Magic numbers: allows named constants (const TIMEOUT = 86400000)
- Magic numbers: allows common numbers (0, 1, 100, 200, 404, 500)
- Magic numbers: skips test files
- Magic numbers: skips config files
- Hardcoded roles: detects role === "admin" comparison
- Hardcoded roles: detects { role: "manager" } in object
- Hardcoded roles: allows role variable references
- Hardcoded roles: allows RBAC constant references
- Hardcoded roles: skips test files
- Hardcoded roles: skips role definition files

---

### Task 3: Client-Side Pattern Rules [x]

**Goal:** Detect missing Zustand persistence and missing Zod date coercion.

**Files:**
- `server/lib/code-gate/rules/client-rules.js`
- `server/lib/code-gate/rules/client-rules.test.js`

**Acceptance Criteria:**
- [ ] Detect Zustand `create()` without `persist` middleware
- [ ] Allow stores explicitly marked as ephemeral
- [ ] Detect `z.date()` without `z.coerce.date()` in API schemas
- [ ] Allow z.date() in non-API contexts
- [ ] Skip test files

**Test Cases (~10 tests):**
- Zustand: detects create() without persist
- Zustand: passes create(persist(...))
- Zustand: allows stores in ephemeral files
- Zustand: skips test files
- Zustand: handles different create syntax (create<Type>())
- Zod dates: detects z.date() in schema files
- Zod dates: passes z.coerce.date()
- Zod dates: allows z.date() in non-schema files
- Zod dates: skips test files
- Zod dates: detects in insertSchema definitions

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | Phase 65 | Integrates with push gate |
| 2 | Phase 65 | Rules plug into gate engine |
| 3 | Phase 65 | Rules plug into gate engine |

**All tasks are independent of each other.**

## Estimated Scope

- Tasks: 3
- New Files: 6
- Tests: ~34
