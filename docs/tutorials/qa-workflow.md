# QA Workflow Tutorial

How to run quality assurance cycles in TLC. This guide covers testing, verification, bug reporting, and quality gates.

## The QA Cycle

TLC's QA workflow has four stages:

```
Tests → Coverage → Quality → Verify
  ↑                          ↓
  └────── Bugs Fixed ←───────┘
```

1. **Tests** - Automated tests must pass
2. **Coverage** - Code must be adequately tested
3. **Quality** - Tests must be meaningful
4. **Verify** - Human verification of features

## Part 1: Running Tests

### Check Test Status

```
/tlc:status
```

Output:
```
Test Status

Framework: vitest
Command: npm test

Results:
  ✅ 47 passing
  ❌ 2 failing
  ⏭️  1 skipped

Failing tests:
  - tests/auth/login.test.ts:45 "rejects expired tokens"
  - tests/api/users.test.ts:92 "handles pagination"

Run tests: npm test
```

### Fix Failing Tests

When tests fail, you have two options:

**Option A: Manual fix**
Read the failing test, understand what's wrong, fix the code.

**Option B: Autofix**
```
/tlc:autofix
```

TLC analyzes failures and attempts automatic fixes:
```
Analyzing 2 failing tests...

tests/auth/login.test.ts:45
  Issue: Token expiry check uses wrong date comparison
  Fix: Replace Date.now() with new Date().getTime()
  Confidence: High

Apply this fix? (Y/n)
```

### Run Specific Tests

For focused testing during development:

```bash
# Single file
npm test -- tests/auth/login.test.ts

# Pattern match
npm test -- --grep "login"

# Watch mode
npm test -- --watch
```

## Part 2: Coverage Analysis

### Check Coverage Gaps

```
/tlc:coverage
```

Output:
```
Coverage Analysis

Overall: 78% (target: 80%)

Uncovered Code:

src/utils/retry.ts (0%)
  Lines 1-45: No tests found
  Priority: HIGH - utility used across codebase

src/api/webhooks.ts (34%)
  Lines 67-89: Error handling branch
  Lines 102-115: Retry logic
  Priority: MEDIUM

src/models/user.ts (92%)
  Lines 78-82: Edge case in validation
  Priority: LOW

Generate tests for high-priority gaps? (Y/n)
```

### Generate Missing Tests

When you confirm, TLC generates tests:

```
/tlc:coverage
> y

Generating tests for src/utils/retry.ts...

Created: tests/utils/retry.test.ts

describe('retry', () => {
  it('retries failed operations up to max attempts', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const result = await retry(operation, { maxAttempts: 3 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('throws after max attempts exceeded', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(retry(operation, { maxAttempts: 2 }))
      .rejects.toThrow('always fails');
  });
});

Running new tests...
✅ 2 passing

Coverage: src/utils/retry.ts now at 100%
Overall: 82% ✅
```

### Coverage Thresholds

Configure minimum coverage in `.tlc.json`:

```json
{
  "coverage": {
    "target": 80,
    "enforce": true,
    "exclude": ["src/migrations/**", "src/scripts/**"]
  }
}
```

When `enforce: true`, builds fail if coverage drops below target.

## Part 3: Quality Scoring

Coverage alone isn't enough. Tests must be meaningful.

### Check Test Quality

```
/tlc:quality
```

Output:
```
Test Quality Report

Overall Score: 72/100 (Good)

Breakdown:
  Coverage:        82% → 25/30 pts
  Assertion Depth: 68% → 20/30 pts
  Edge Cases:      45% → 10/20 pts
  TDD Compliance:  85% → 17/20 pts

Issues Found:

LOW ASSERTION DEPTH (12 tests)
  tests/api/users.test.ts:
    - "creates user" only checks status code
    - "updates user" missing field validation

  Recommendation: Add assertions for response body,
  database state, and side effects.

MISSING EDGE CASES (8 functions)
  src/utils/validate.ts:validateEmail
    - Only tests valid emails
    - Missing: empty string, null, unicode, long strings

  Recommendation: Run /tlc:edge-cases validate.ts

WEAK MOCKS (3 tests)
  tests/services/email.test.ts:
    - Mocks return static data
    - Doesn't test error paths
```

### Improve Assertion Depth

Weak test:
```javascript
it('creates user', async () => {
  const res = await request(app)
    .post('/users')
    .send({ email: 'test@test.com', name: 'Test' });

  expect(res.status).toBe(201);  // Only checks status!
});
```

Strong test:
```javascript
it('creates user with all fields populated', async () => {
  const res = await request(app)
    .post('/users')
    .send({ email: 'test@test.com', name: 'Test' });

  expect(res.status).toBe(201);
  expect(res.body.id).toBeDefined();
  expect(res.body.email).toBe('test@test.com');
  expect(res.body.name).toBe('Test');
  expect(res.body.createdAt).toBeDefined();

  // Verify database
  const user = await db.users.findById(res.body.id);
  expect(user).toBeDefined();
  expect(user.email).toBe('test@test.com');
});
```

### Generate Edge Cases

```
/tlc:edge-cases src/utils/validate.ts
```

Output:
```
Edge Case Analysis: validateEmail

Current tests cover:
  ✓ Valid email (basic)
  ✓ Invalid email (missing @)

Missing edge cases:
  ✗ Empty string
  ✗ Null/undefined input
  ✗ Unicode characters
  ✗ Very long email (>254 chars)
  ✗ Multiple @ symbols
  ✗ Whitespace only
  ✗ Email with quotes

Generated tests:

describe('validateEmail edge cases', () => {
  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('handles null gracefully', () => {
    expect(validateEmail(null)).toBe(false);
  });

  it('rejects email exceeding max length', () => {
    const longEmail = 'a'.repeat(255) + '@test.com';
    expect(validateEmail(longEmail)).toBe(false);
  });

  it('handles unicode in local part', () => {
    expect(validateEmail('tëst@test.com')).toBe(true);
  });

  // ... more edge cases
});

Add these tests? (Y/n)
```

## Part 4: Human Verification

After tests pass, humans verify features actually work as expected.

### Start Verification

```
/tlc:verify 2
```

Output:
```
Phase 2 Verification: User Dashboard

All tests passing: 24/24 ✅
Coverage: 91% ✅
Quality Score: 85/100 ✅

Please manually verify:

1. Dashboard Layout
   [ ] Page loads without errors
   [ ] Responsive on mobile (test at 375px width)
   [ ] All sections visible: Stats, Charts, Activity

2. Stat Cards
   [ ] Numbers match database
   [ ] Updates when data changes
   [ ] Shows loading state initially

3. Activity Feed
   [ ] Shows recent items (last 10)
   [ ] Timestamps are relative ("2 hours ago")
   [ ] Click navigates to detail

4. Charts
   [ ] Data renders correctly
   [ ] Tooltips show on hover
   [ ] Legend toggles series

Test commands:
  Start app: npm run dev
  Open: http://localhost:3000/dashboard

Enter issues found (or "pass" if all good):
```

### Report Issues

If something's wrong:

```
> Charts don't show tooltips on mobile

Issue logged:

BUG-007: Charts don't show tooltips on mobile
Severity: Medium
Phase: 2 (User Dashboard)
Task: Charts implementation

Added to .planning/BUGS.md

Continue verification? (Y/n)
```

### Pass Verification

When everything works:

```
> pass

Phase 2 Verified ✅

Summary:
  - Tests: 24 passing
  - Coverage: 91%
  - Quality: 85/100
  - Human: Verified by @alice

Phase 2 marked complete.
Next: /tlc:plan 3
```

## Part 5: Bug Management

### View Bugs

```
/tlc:bug --list
```

Output:
```
Active Bugs

BUG-007 [MEDIUM] Charts don't show tooltips on mobile
  Phase 2 | Reported: 2 hours ago | @alice

BUG-003 [LOW] Footer links have wrong color
  Phase 1 | Reported: 1 day ago | @bob

BUG-001 [CRITICAL] Login fails for Google OAuth
  Phase 1 | Reported: 2 days ago | @alice

3 open bugs (1 critical, 1 medium, 1 low)
```

### Report New Bug

```
/tlc:bug
```

Interactive form:
```
Report Bug

Title: > Payment form accepts expired cards
Severity: (1=Critical, 2=High, 3=Medium, 4=Low) > 1

Steps to reproduce:
> 1. Go to checkout
> 2. Enter card: 4111111111111111
> 3. Enter expiry: 01/20 (past date)
> 4. Click Pay

Expected: > Should reject with "Card expired" error
Actual: > Payment processes successfully

Bug logged: BUG-008
Priority: CRITICAL - blocking release
```

### Fix Bug Workflow

When fixing bugs:

```
/tlc:bug fix 8
```

Output:
```
Fixing BUG-008: Payment form accepts expired cards

1. Writing failing test...

it('rejects expired card', async () => {
  const result = await processPayment({
    number: '4111111111111111',
    expiry: '01/20'  // Past date
  });

  expect(result.success).toBe(false);
  expect(result.error).toBe('Card expired');
});

Running test...
❌ Test fails (expected - bug exists)

2. Implementing fix...

// src/payments/validate.ts
function isCardExpired(expiry) {
  const [month, year] = expiry.split('/');
  const expiryDate = new Date(2000 + parseInt(year), parseInt(month), 0);
  return expiryDate < new Date();
}

Running test...
✅ Test passes

Committed: fix: reject expired cards in payment form (BUG-008)

BUG-008 marked as fixed.
```

## Part 6: Continuous QA

### CI Integration

Set up automated QA in CI:

```
/tlc:ci
```

Creates `.github/workflows/qa.yml`:

```yaml
name: QA

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run coverage
      - name: Check threshold
        run: |
          coverage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% below 80% threshold"
            exit 1
          fi

  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx tlc-quality-check
```

### PR Reviews

Every PR gets automated QA review:

```
/tlc:review-pr 42
```

Posts to PR:
```markdown
## TLC QA Review

| Check | Status | Score |
|-------|--------|-------|
| Tests | ✅ Pass | 47/47 |
| Coverage | ✅ 84% | Above 80% threshold |
| Quality | ⚠️ 71/100 | Below 75 target |
| TDD Score | ✅ 92% | Tests written first |

### Quality Issues

**Low assertion depth in 2 tests:**
- `tests/api/orders.test.ts:34` - only checks status
- `tests/api/orders.test.ts:56` - missing error assertions

**Recommendation:** Strengthen assertions before merge.

### Verdict: ⚠️ NEEDS WORK

Please address quality issues.
```

## QA Cheat Sheet

| Task | Command |
|------|---------|
| Check test status | `/tlc:status` |
| Run coverage analysis | `/tlc:coverage` |
| Check test quality | `/tlc:quality` |
| Generate edge cases | `/tlc:edge-cases <file>` |
| Auto-fix failing tests | `/tlc:autofix` |
| Verify phase manually | `/tlc:verify <phase>` |
| Report a bug | `/tlc:bug` |
| List all bugs | `/tlc:bug --list` |
| Fix a bug | `/tlc:bug fix <id>` |
| Set up CI | `/tlc:ci` |
| Review a PR | `/tlc:review-pr <number>` |

## Quality Targets

| Metric | Minimum | Target | Excellent |
|--------|---------|--------|-----------|
| Test Coverage | 70% | 80% | 90%+ |
| Quality Score | 60/100 | 75/100 | 85/100+ |
| TDD Compliance | 80% | 90% | 95%+ |
| Bug Fix Time | 1 week | 3 days | Same day |

## Summary

The TLC QA cycle ensures quality through:

1. **Automated tests** - Fast feedback on breakage
2. **Coverage analysis** - No untested code ships
3. **Quality scoring** - Tests are meaningful, not just present
4. **Human verification** - Features work as users expect
5. **Bug tracking** - Issues are logged and fixed systematically
6. **CI integration** - Quality gates enforced automatically

Every feature goes through this cycle before it's considered done. No shortcuts, no "it works on my machine."
