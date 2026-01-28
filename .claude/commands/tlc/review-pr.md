# /tlc:review-pr - Review a Pull Request

Review a GitHub/GitLab pull request for TLC compliance.

## What This Does

1. Fetches PR diff from GitHub/GitLab
2. Checks test coverage for all changed files
3. Analyzes commit order for TDD compliance
4. Scans for security issues
5. Posts review comment with verdict

## Usage

```
/tlc:review-pr <pr_number>
/tlc:review-pr <pr_url>
/tlc:review-pr              # Review current PR (if on PR branch)
```

## Process

### Step 1: Fetch PR Information

```bash
# Get PR details
gh pr view <number> --json number,title,headRefName,baseRefName,additions,deletions

# Get changed files
gh pr diff <number> --name-only
```

### Step 2: Checkout PR Branch (if needed)

```bash
gh pr checkout <number>
```

### Step 3: Run Full Review

Same checks as `/tlc:review`:
- Test coverage for changed files
- TDD compliance (commit order)
- Security scan

### Step 4: Generate PR Comment

```markdown
## 🤖 TLC Code Review

| Check | Status |
|-------|--------|
| Test Coverage | ✅ All files covered |
| TDD Score | ✅ 75% |
| Security | ✅ No issues |

### Summary

- 8 files changed (5 impl, 3 tests)
- 4 commits analyzed
- No security vulnerabilities detected

### Verdict: ✅ APPROVED

---
*Automated review by [TLC](https://github.com/jurgencalleja/TLC)*
```

### Step 5: Post Review

```bash
# Post as PR comment
gh pr comment <number> --body "<review_markdown>"

# Or submit as review
gh pr review <number> --approve --body "<review_markdown>"
gh pr review <number> --request-changes --body "<review_markdown>"
```

## Example Output

### Reviewing PR #42

```
/tlc:review-pr 42

Fetching PR #42: "Add user authentication"
Branch: feature/auth → main
Author: @alice

Fetching diff...
Changed files: 6
├── src/auth/login.js (+120, -0)
├── src/auth/login.test.js (+85, -0) ✓
├── src/auth/session.js (+45, -0)
├── src/auth/session.test.js (+60, -0) ✓
├── src/middleware/auth.js (+30, -0)
└── src/middleware/auth.test.js (+40, -0) ✓

Running checks...

Test coverage: ✅ All implementation files have tests
TDD Score: 67% ✅
Security: ✅ No issues

Posting review...

─────────────────────────────────
✅ PR #42 APPROVED

Review posted: https://github.com/org/repo/pull/42#review-123456
─────────────────────────────────
```

### PR with Issues

```
/tlc:review-pr 43

Fetching PR #43: "Quick fix for login"
Branch: hotfix/login → main

Changed files: 2
├── src/auth/login.js (+15, -3)
└── src/config.js (+2, -0)

Running checks...

Test coverage: ❌ 2 files without tests
├── src/auth/login.js (modified, existing tests may not cover changes)
└── src/config.js (no test file found)

TDD Score: 0% ❌
Security: ⚠️ 1 medium severity issue
└── console.log with sensitive data

Posting review...

─────────────────────────────────
❌ PR #43 CHANGES REQUESTED

Review posted with requested changes.
See: https://github.com/org/repo/pull/43#review-123457

Required actions:
1. Add/update tests for modified files
2. Remove console.log with sensitive data
─────────────────────────────────
```

## Flags

| Flag | Description |
|------|-------------|
| `--no-post` | Generate review but don't post to PR |
| `--approve` | Force approve (skip checks) |
| `--comment-only` | Post as comment instead of review |

## GitHub Actions Integration

Add to your workflow:

```yaml
name: TLC Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: TLC Review
        run: |
          npx tlc-claude-code review-pr ${{ github.event.pull_request.number }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## ARGUMENTS

$ARGUMENTS
