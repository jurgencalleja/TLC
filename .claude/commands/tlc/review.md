# /tlc:review - Review Current Branch

Review changes on current branch before pushing.

## What This Does

1. Compares current branch to main/master
2. **Invokes configured review providers** (Claude, Codex, Gemini)
3. Checks test coverage for all changed files
4. Analyzes commit order for TDD compliance
5. Scans for security issues
6. Generates verdict: APPROVED or CHANGES_REQUESTED

**This runs automatically at the end of `/tlc:build`.**

## Multi-Provider Reviews

TLC automatically uses ALL providers configured for the `review` capability in `.tlc.json`:

```json
{
  "router": {
    "capabilities": {
      "review": { "providers": ["claude", "codex"], "fallback": "claude" }
    }
  }
}
```

**With this config, `/tlc:review` will:**
1. Run Claude's review (current session)
2. Invoke Codex CLI for second opinion: `codex "Review this diff: ..."`
3. Combine verdicts - both must approve for APPROVED

## Usage

```
/tlc:review              # Review current branch vs main
/tlc:review --base dev   # Review vs different base branch
```

## Process

### Step 1: Load Router Configuration

Read `.tlc.json` to get configured review providers:

```javascript
const config = JSON.parse(fs.readFileSync('.tlc.json', 'utf-8'));
const reviewProviders = config.router?.capabilities?.review?.providers || ['claude'];
const providers = config.router?.providers || {};
```

**Default providers for review:** `['claude', 'codex']`

If Codex is configured and available, it WILL be invoked automatically.

### Step 2: Identify Changes

```bash
git diff --name-status main...HEAD
```

Categorize files:
- Implementation files (`.js`, `.ts`, `.py`, etc.)
- Test files (`*.test.*`, `test_*`, `*_test.*`)
- Other files (docs, config, etc.)

### Step 3: Check Test Coverage

For each implementation file, verify a corresponding test exists:

| Implementation | Expected Test |
|---------------|---------------|
| `src/auth.js` | `src/auth.test.js` or `test/auth.test.js` |
| `lib/utils.ts` | `lib/utils.test.ts` or `tests/utils.test.ts` |
| `pkg/main.go` | `pkg/main_test.go` |
| `src/login.py` | `tests/test_login.py` |

**Fail if:** Implementation files have no corresponding test (in changeset or on disk).

### Step 4: Analyze TDD Compliance

Check commit order to verify tests were written first:

```bash
git log --oneline --name-status main..HEAD
```

**Score calculation:**
- Test-only commits → +1 TDD point
- Implementation-only commits → -1 TDD point (except fix/refactor/chore)
- Mixed commits → neutral

**TDD Score = (test-first commits / total commits) × 100**

**Fail if:** TDD score < 50% with more than 2 commits.

### Step 5: Security Scan

Scan diff for common security issues:

| Pattern | Issue | Severity |
|---------|-------|----------|
| `password = "..."` | Hardcoded password | HIGH |
| `api_key = "..."` | Hardcoded API key | HIGH |
| `eval(...)` | Code injection risk | MEDIUM |
| `innerHTML =` | XSS risk | MEDIUM |
| `dangerouslySetInnerHTML` | React XSS risk | MEDIUM |
| `exec("..." + var)` | Command injection | HIGH |
| `SELECT...WHERE...+` | SQL injection | HIGH |

**Fail if:** Any HIGH severity issues found.

### Step 6: Invoke External Providers (Codex, Gemini)

**CRITICAL: This step runs automatically when providers are configured.**

For each provider in `reviewProviders` (except `claude` which is the current session):

**How to invoke:**

1. **Save diff to temporary file** (LLM CLIs read files, not piped input):
```bash
git diff main...HEAD > /tmp/review-diff.patch
```

2. **Invoke each configured provider:**

```bash
# For Codex (GPT-5.2) - use file attachment
codex --print "Review this code diff for quality issues, bugs, security vulnerabilities, and test coverage. Respond with APPROVED or CHANGES_REQUESTED. File: /tmp/review-diff.patch"

# For Gemini - use file attachment
gemini --print "Review this code diff for quality and security issues. File: /tmp/review-diff.patch"
```

**Note:** Each CLI has its own syntax. Check `codex --help` and `gemini --help` for exact flags. The `--print` flag outputs the response without interactive mode.

**Example output:**

```
Invoking Codex (GPT-5.2) for review...
┌─────────────────────────────────────────┐
│ Codex Review Result                     │
├─────────────────────────────────────────┤
│ Verdict: APPROVED                       │
│                                         │
│ Comments:                               │
│ - Clean implementation                  │
│ - Tests cover main paths                │
│ - No security issues detected           │
└─────────────────────────────────────────┘
```

**Consensus Mode:**
- If multiple providers are configured, ALL must approve
- Any CHANGES_REQUESTED = overall CHANGES_REQUESTED
- Issues from all providers are combined in the report

### Step 7: Generate Report

```markdown
# Code Review Report

**Date:** 2024-01-15T10:30:00Z
**Base:** main → **Head:** feature/auth

## ✅ Verdict: APPROVED

## Summary

- ✅ All changed files have tests
- ✅ TDD score: 75%
- ✅ No security issues detected

## Statistics

- Files changed: 8
- Implementation files: 5
- Test files: 3
- Commits: 4
- TDD Score: 75%
```

### Step 8: Return Verdict

**APPROVED** - All checks pass. Ready to push/merge.

**CHANGES_REQUESTED** - Issues found:
- Missing tests → Add tests for flagged files
- Low TDD score → Consider reordering commits or adding test commits
- Security issues → Fix flagged patterns

## Example Output

### Passing Review (Multi-Provider)

```
/tlc:review

Loading router config from .tlc.json...
  Review providers: claude, codex

Reviewing current branch vs main...

Changed files: 6
├── src/auth/login.js (impl)
├── src/auth/login.test.js (test) ✓
├── src/auth/session.js (impl)
├── src/auth/session.test.js (test) ✓
└── README.md (docs)

Test coverage: ✅ All implementation files have tests

Commit analysis:
├── abc1234 test: add login tests
├── def5678 feat: implement login
├── ghi9012 test: add session tests
└── jkl3456 feat: implement session

TDD Score: 50% ✅

Security scan: ✅ No issues found

───────────────────────────────────────
Invoking Codex (GPT-5.2) for review...
───────────────────────────────────────
Codex verdict: ✅ APPROVED
  - Clean implementation
  - Good separation of concerns
  - Tests are comprehensive
───────────────────────────────────────

Provider Results:
  ✅ Claude: APPROVED
  ✅ Codex:  APPROVED

─────────────────────────────────────────────
✅ APPROVED - Ready to push (2/2 agree)
─────────────────────────────────────────────
```

### Failing Review (Multi-Provider Disagreement)

```
/tlc:review

Loading router config from .tlc.json...
  Review providers: claude, codex

Reviewing current branch vs main...

Changed files: 4
├── src/api/users.js (impl)
├── src/api/auth.js (impl)
└── src/utils.js (impl)

Test coverage: ❌ 3 files missing tests
├── src/api/users.js → needs src/api/users.test.js
├── src/api/auth.js → needs src/api/auth.test.js
└── src/utils.js → needs src/utils.test.js

Commit analysis:
└── abc1234 feat: add all features

TDD Score: 0% ❌ (target: 50%+)

Security scan: ❌ 1 high severity issue
└── src/api/auth.js: password = "admin123"

───────────────────────────────────────
Invoking Codex (GPT-5.2) for review...
───────────────────────────────────────
Codex verdict: ❌ CHANGES_REQUESTED
  - Missing input validation in users.js
  - SQL injection risk in auth.js line 45
  - No error handling for network failures
───────────────────────────────────────

Provider Results:
  ❌ Claude: CHANGES_REQUESTED
  ❌ Codex:  CHANGES_REQUESTED

Combined Issues:
  [Claude] Missing tests for 3 files
  [Claude] Hardcoded password
  [Codex]  Missing input validation
  [Codex]  SQL injection risk
  [Codex]  No error handling

───────────────────────────────────────────
❌ CHANGES_REQUESTED (0/2 approved)

Action required:
1. Add tests for 3 implementation files
2. Fix hardcoded password in src/api/auth.js
3. Add input validation (Codex)
4. Fix SQL injection risk (Codex)
5. Consider splitting into test-first commits
───────────────────────────────────────────
```

## Flags

| Flag | Description |
|------|-------------|
| `--base <branch>` | Compare against different base (default: main) |
| `--strict` | Fail on any TDD violation |
| `--no-security` | Skip security scan |
| `--providers <list>` | Override providers (e.g., `--providers codex,gemini`) |
| `--codex-only` | Use only Codex for review |
| `--no-external` | Skip external providers, use Claude only |

## Integration

This review runs automatically:
- At the end of `/tlc:build` (blocks completion if fails)
- Before `/tlc:verify` (informational)
- Can be run manually anytime

## ARGUMENTS

$ARGUMENTS
