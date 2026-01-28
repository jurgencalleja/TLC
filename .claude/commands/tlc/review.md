# /tlc:review - Review Current Branch

Review changes on current branch before pushing.

## What This Does

1. Compares current branch to main/master
2. Checks test coverage for all changed files
3. Analyzes commit order for TDD compliance
4. Scans for security issues
5. Generates verdict: APPROVED or CHANGES_REQUESTED

**This runs automatically at the end of `/tlc:build`.**

## Usage

```
/tlc:review              # Review current branch vs main
/tlc:review --base dev   # Review vs different base branch
```

## Process

### Step 1: Identify Changes

```bash
git diff --name-status main...HEAD
```

Categorize files:
- Implementation files (`.js`, `.ts`, `.py`, etc.)
- Test files (`*.test.*`, `test_*`, `*_test.*`)
- Other files (docs, config, etc.)

### Step 2: Check Test Coverage

For each implementation file, verify a corresponding test exists:

| Implementation | Expected Test |
|---------------|---------------|
| `src/auth.js` | `src/auth.test.js` or `test/auth.test.js` |
| `lib/utils.ts` | `lib/utils.test.ts` or `tests/utils.test.ts` |
| `pkg/main.go` | `pkg/main_test.go` |
| `src/login.py` | `tests/test_login.py` |

**Fail if:** Implementation files have no corresponding test (in changeset or on disk).

### Step 3: Analyze TDD Compliance

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

### Step 4: Security Scan

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

### Step 5: Generate Report

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

### Step 6: Return Verdict

**APPROVED** - All checks pass. Ready to push/merge.

**CHANGES_REQUESTED** - Issues found:
- Missing tests → Add tests for flagged files
- Low TDD score → Consider reordering commits or adding test commits
- Security issues → Fix flagged patterns

## Example Output

### Passing Review

```
/tlc:review

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

─────────────────────────────
✅ APPROVED - Ready to push
─────────────────────────────
```

### Failing Review

```
/tlc:review

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

───────────────────────────────────
❌ CHANGES_REQUESTED

Action required:
1. Add tests for 3 implementation files
2. Fix hardcoded password in src/api/auth.js
3. Consider splitting into test-first commits
───────────────────────────────────
```

## Flags

| Flag | Description |
|------|-------------|
| `--base <branch>` | Compare against different base (default: main) |
| `--strict` | Fail on any TDD violation |
| `--no-security` | Skip security scan |

## Integration

This review runs automatically:
- At the end of `/tlc:build` (blocks completion if fails)
- Before `/tlc:verify` (informational)
- Can be run manually anytime

## ARGUMENTS

$ARGUMENTS
