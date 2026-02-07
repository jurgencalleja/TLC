# Phase 65: Automated Code Gate (Commit-Level Review) - Plan

## Overview

Non-dev team members are pushing code directly to the branch without review. Since we use trunk-based development (single branch, no PRs), there's no traditional PR gate. This phase adds an **automatic, strict code review that runs on every commit** — enforcing best practices, catching bad patterns, and blocking pushes that don't meet standards.

## Problem

- Non-dev contributors commit code that bypasses quality checks
- No PR-based review (single branch workflow)
- Existing `/tlc:review` and `/tlc:audit` are manual opt-in
- Code quality degrades silently

## Solution

**Two-tier automatic enforcement — no manual opt-in required:**

### Tier 1: Pre-Commit (fast, static, < 3s)
- Lint changed files against CODING-STANDARDS.md rules
- Fast static analysis (no LLM needed)
- Catch obvious anti-patterns (hardcoded values, missing tests, security issues)
- Block commit with clear fix instructions

### Tier 2: Pre-Push (LLM-powered deep review, mandatory)
- **Automatically invokes a full LLM code review** using the multi-model router
- Reviews every changed file in the diff (since last push)
- Uses available LLM providers (Claude, Codex, Gemini) via TLC's router
- Blocks push if review finds blocking issues
- Produces a local "PR review" report (even though there's no actual PR)
- No escape without explicit team lead approval

**Philosophy:** If you want to push, you must pass the gate. The gate is the review. The review uses LLMs. Non-negotiable.

## Prerequisites

- [x] Phase 57 complete (Coding Standards Injection)
- [x] Phase 49 complete (Container Security Hardening)
- [x] `standards/audit-checker.js` exists
- [x] `CODING-STANDARDS.md` exists

## Tasks

### Task 1: Code Gate Engine [ ]

**Goal:** Fast static analysis engine that checks changed files against rules.

**Files:**
- `server/lib/code-gate/gate-engine.js`
- `server/lib/code-gate/gate-engine.test.js`

**Acceptance Criteria:**
- [ ] Accepts a list of changed files + their content
- [ ] Runs configurable rule sets against each file
- [ ] Returns pass/fail with detailed findings per file
- [ ] Supports severity levels: block, warn, info
- [ ] Fast execution (< 2s for typical commit)
- [ ] No external dependencies (pure JS analysis)

**Test Cases (~20 tests):**
- Engine runs rules on single file
- Engine aggregates findings across files
- Block-level finding causes overall failure
- Warn-level findings pass but report
- Empty changeset passes
- Engine respects .tlc-gate-ignore patterns

---

### Task 2: Built-in Rule Set [ ]

**Goal:** Comprehensive rules based on CODING-STANDARDS.md + best practices.

**Files:**
- `server/lib/code-gate/rules/structure-rules.js`
- `server/lib/code-gate/rules/quality-rules.js`
- `server/lib/code-gate/rules/security-rules.js`
- `server/lib/code-gate/rules/test-rules.js`
- `server/lib/code-gate/rules/structure-rules.test.js`
- `server/lib/code-gate/rules/quality-rules.test.js`
- `server/lib/code-gate/rules/security-rules.test.js`
- `server/lib/code-gate/rules/test-rules.test.js`

**Acceptance Criteria:**

Structure Rules:
- [ ] Detect flat folder anti-patterns (services/, interfaces/, controllers/)
- [ ] Detect files in wrong location (loose files at root)
- [ ] Enforce module colocation (service + test together)

Quality Rules:
- [ ] Detect hardcoded URLs, IPs, ports
- [ ] Detect hardcoded credentials/secrets
- [ ] Detect missing JSDoc on exports
- [ ] Detect functions > 50 lines
- [ ] Detect files > 300 lines
- [ ] Detect console.log left in production code
- [ ] Detect TODO/FIXME/HACK without issue reference
- [ ] Detect any/unknown TypeScript types

Security Rules:
- [ ] Detect eval(), new Function()
- [ ] Detect innerHTML/dangerouslySetInnerHTML
- [ ] Detect SQL string concatenation
- [ ] Detect missing input validation patterns
- [ ] Detect disabled security headers

Test Rules:
- [ ] Detect source files without corresponding test file
- [ ] Detect test files with no assertions
- [ ] Detect skipped tests (.skip, xit, xdescribe)

**Test Cases (~40 tests):**
- Each rule detects positive case
- Each rule passes clean code
- Rules configurable (enable/disable per project)

---

### Task 3: Git Hooks Generator [ ]

**Goal:** Generate and install git hooks that run the code gate.

**Files:**
- `server/lib/code-gate/hooks-generator.js`
- `server/lib/code-gate/hooks-generator.test.js`

**Acceptance Criteria:**
- [ ] Generates pre-commit hook script
- [ ] Generates pre-push hook script
- [ ] Pre-commit: fast checks only (< 3s)
- [ ] Pre-push: full analysis including test coverage check
- [ ] Hook scripts are portable (sh, not bash-specific)
- [ ] `--no-verify` bypass with warning logged to audit
- [ ] Hooks self-update when TLC version changes

**Test Cases (~15 tests):**
- Generates valid pre-commit hook
- Generates valid pre-push hook
- Hook runs gate engine on staged files
- Hook blocks on blocking findings
- Hook allows warnings through
- Hook logs bypass attempts

---

### Task 4: Gate Configuration [ ]

**Goal:** Per-project gate configuration in .tlc.json.

**Files:**
- `server/lib/code-gate/gate-config.js`
- `server/lib/code-gate/gate-config.test.js`

**Acceptance Criteria:**
- [ ] Reads gate config from .tlc.json `gate` section
- [ ] Supports rule enable/disable
- [ ] Supports custom severity overrides
- [ ] Supports file/path ignore patterns
- [ ] Supports strictness levels: relaxed, standard, strict
- [ ] Default: strict (block on all high/critical findings)
- [ ] Per-user strictness (stricter for non-dev roles)

**Configuration Schema:**
```json
{
  "gate": {
    "enabled": true,
    "strictness": "strict",
    "preCommit": true,
    "prePush": true,
    "rules": {
      "no-hardcoded-urls": "block",
      "max-function-length": "warn",
      "require-test-file": "block"
    },
    "ignore": ["*.md", "*.json", "migrations/*"],
    "byRole": {
      "non-dev": { "strictness": "strict" },
      "dev": { "strictness": "standard" }
    }
  }
}
```

**Test Cases (~15 tests):**
- Loads gate config from .tlc.json
- Applies default strict settings
- Merges rule overrides
- Respects ignore patterns
- Role-based strictness

---

### Task 5: Gate Report Formatter [ ]

**Goal:** Clear, actionable output when gate blocks a commit.

**Files:**
- `server/lib/code-gate/gate-reporter.js`
- `server/lib/code-gate/gate-reporter.test.js`

**Acceptance Criteria:**
- [ ] Terminal-formatted report with colors
- [ ] Groups findings by file
- [ ] Shows severity badges (BLOCK/WARN/INFO)
- [ ] Includes fix suggestions for each finding
- [ ] Shows which rule triggered each finding
- [ ] Summary line: "3 blocking, 2 warnings — commit blocked"
- [ ] Suggests `--no-verify` as escape hatch (with warning)

**Example Output:**
```
╭──────────────────────────────────────────╮
│ TLC Code Gate — Commit Blocked           │
╰──────────────────────────────────────────╯

src/api/users.js
  [BLOCK] hardcoded-url (line 12)
    URL 'http://localhost:3000' should use config/env var
    Fix: Use process.env.API_URL or config.apiUrl

  [BLOCK] missing-test-file
    No test file found: src/api/users.test.js
    Fix: Create test file before committing

  [WARN] function-too-long (line 45)
    Function 'handleLogin' is 67 lines (max: 50)
    Fix: Extract helper functions

Summary: 2 blocking | 1 warning
Commit blocked. Fix blocking issues or use --no-verify (logged).
```

**Test Cases (~10 tests):**
- Formats single finding
- Groups findings by file
- Shows summary
- Includes fix suggestions
- Handles zero findings (all clear)

---

### Task 6: TLC Gate Command [ ]

**Goal:** `/tlc:gate` command to install, configure, and run the code gate.

**Files:**
- `server/lib/code-gate/gate-command.js`
- `server/lib/code-gate/gate-command.test.js`

**Acceptance Criteria:**
- [ ] `tlc:gate install` — installs git hooks
- [ ] `tlc:gate check` — runs gate on current staged changes
- [ ] `tlc:gate status` — shows gate configuration and last results
- [ ] `tlc:gate config` — interactive strictness configuration
- [ ] Auto-installs hooks on `/tlc` run (like permissions)

**Test Cases (~15 tests):**
- Install creates hook files
- Check runs engine on staged files
- Status shows configuration
- Config updates .tlc.json

---

### Task 7: Audit Trail for Bypasses [ ]

**Goal:** Log when someone uses `--no-verify` to bypass the gate.

**Files:**
- `server/lib/code-gate/bypass-logger.js`
- `server/lib/code-gate/bypass-logger.test.js`

**Acceptance Criteria:**
- [ ] Logs bypass to `.tlc/audit/gate-bypasses.jsonl`
- [ ] Records: timestamp, user, commit hash, files changed
- [ ] Dashboard shows bypass history
- [ ] `/tlc:gate report` shows bypass frequency per user
- [ ] Alert when bypass rate exceeds threshold

**Test Cases (~10 tests):**
- Logs bypass event
- Reads bypass history
- Calculates bypass rate per user
- Generates bypass report

---

### Task 8: Dashboard GatePane Component [ ]

**Goal:** Dashboard view showing code gate status and history.

**Files:**
- `dashboard/src/components/GatePane.tsx`
- `dashboard/src/components/GatePane.test.tsx`

**Acceptance Criteria:**
- [ ] Shows current gate configuration
- [ ] Shows recent gate results (last 10 commits)
- [ ] Shows bypass history with user attribution
- [ ] Color-coded pass/fail/bypass status
- [ ] Link to fix suggestions

**Test Cases (~12 tests):**
- Renders gate status
- Shows commit history
- Shows bypass history
- Handles loading/error states

---

### Task 9: LLM-Powered Push Review [ ]

**Goal:** Mandatory LLM code review before every push, using multi-model router.

**Files:**
- `server/lib/code-gate/llm-reviewer.js`
- `server/lib/code-gate/llm-reviewer.test.js`

**Acceptance Criteria:**
- [ ] Collects full diff since last push (git diff origin/main..HEAD)
- [ ] Sends diff to LLM via TLC's model router (Phase 33)
- [ ] Uses cheapest available model first, escalates for complex code
- [ ] Review checks: logic errors, security flaws, best practices, test coverage
- [ ] Produces structured review result (pass/fail + findings)
- [ ] Blocks push on critical/high findings
- [ ] Stores review result in `.tlc/reviews/{commit-hash}.json`
- [ ] Works offline: falls back to static-only review if no LLM available
- [ ] Configurable: skip LLM review for docs-only changes
- [ ] Review prompt includes CODING-STANDARDS.md context

**Review Prompt Template:**
```
You are a strict code reviewer. Review this diff against the project's coding standards.

Standards: {CODING-STANDARDS.md content}

Diff:
{git diff}

For each issue found, report:
- severity: critical | high | medium | low
- file: affected file path
- line: approximate line number
- rule: which standard is violated
- message: clear description
- fix: how to fix it

Be STRICT. Non-dev contributors are pushing this code.
Block on: security issues, missing tests, hardcoded secrets, major anti-patterns.
```

**Test Cases (~20 tests):**
- Reviewer collects correct diff
- Reviewer sends to model router
- Reviewer parses LLM response into findings
- Reviewer blocks on critical findings
- Reviewer passes clean code
- Reviewer falls back to static when LLM unavailable
- Reviewer skips docs-only changes
- Reviewer stores result to file
- Reviewer includes standards context in prompt
- Reviewer respects cost budget

---

### Task 10: Push Gate Integration [ ]

**Goal:** Wire the LLM reviewer into the pre-push hook as mandatory step.

**Files:**
- `server/lib/code-gate/push-gate.js`
- `server/lib/code-gate/push-gate.test.js`

**Acceptance Criteria:**
- [ ] Pre-push hook runs static gate THEN LLM review
- [ ] Static gate failures block immediately (fast feedback)
- [ ] LLM review runs only if static gate passes
- [ ] Combined report shows both static + LLM findings
- [ ] "Local PR review" summary saved to `.tlc/reviews/`
- [ ] Team lead override: `TLC_GATE_OVERRIDE=1` with audit log
- [ ] Progress indicator during LLM review ("Reviewing with Claude...")
- [ ] Timeout: 60s for LLM review, falls back to static-only

**Test Cases (~15 tests):**
- Push gate runs static then LLM
- Static failure blocks without LLM call
- LLM failure blocks push
- Combined report merges findings
- Override logged to audit
- Timeout falls back gracefully

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Rules plug into engine |
| 3 | 1 | Hooks invoke engine |
| 5 | 1 | Reporter formats engine results |
| 6 | 1, 2, 3, 4, 5 | Command orchestrates everything |
| 7 | 1 | Logger hooks into engine bypass events |
| 8 | 6, 7, 10 | Dashboard shows command + review results |
| 9 | 1, 4 | LLM reviewer uses engine + config |
| 10 | 3, 5, 9 | Push gate wires hooks + reviewer + reporter |

**Parallel groups:**
- Group A: Tasks 1, 4 (engine + config — independent)
- Group B: Tasks 2, 3, 5, 9 (after Task 1)
- Group C: Tasks 6, 10 (after Group B)
- Group D: Tasks 7, 8 (after Group C)

## Estimated Scope

- Tasks: 10
- New Files: ~25
- Tests: ~172
- Coverage: Static analysis, git hooks, LLM review, reporting, audit trail, dashboard

## Success Criteria

- [ ] Every commit runs through static code gate automatically
- [ ] Every push triggers mandatory LLM-powered code review
- [ ] Non-dev contributors get clear, actionable feedback
- [ ] No code with blocking findings reaches the branch
- [ ] LLM review catches logic errors and architectural issues static can't
- [ ] Bypass attempts are logged and visible to team leads
- [ ] Review uses multi-model router (cheapest available model)
- [ ] Zero false positives on TLC's own codebase
- [ ] ~172 tests passing
