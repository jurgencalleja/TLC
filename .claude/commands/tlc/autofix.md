# /tlc:autofix - Automatic Test Failure Recovery

Run tests, analyze failures, and automatically apply fixes for common error patterns.

## What This Does

1. Runs test suite and captures failures
2. Matches errors against known patterns
3. Generates fix proposals
4. Applies fixes (with user confirmation)
5. Re-runs tests to verify
6. Offers to commit fixes

## Usage

```
/tlc:autofix
```

## Process

### Step 1: Run Tests

Execute test suite to capture current state:

```bash
npm test 2>&1
```

### Step 2: Parse Failures

For each failing test, extract:
- Test name
- Error message
- File and line number

### Step 3: Match Patterns

Known error patterns:

| Pattern | Example | Fix |
|---------|---------|-----|
| null-property-access | `Cannot read properties of null` | Add null check |
| undefined-property-access | `Cannot read properties of undefined` | Add undefined check |
| module-not-found | `Cannot find module './utils'` | Add/fix import |
| function-not-defined | `validateEmail is not defined` | Add import/export |
| expected-value-mismatch | `expected undefined to equal` | Check return value |
| timeout | `Timeout of 5000ms exceeded` | Add await/increase timeout |

### Step 4: Display Analysis

```
Test Failures: 4

1) src/auth.test.ts > login > rejects invalid password
   Error: Cannot read properties of null (reading 'email')
   Fix: Add null check before accessing 'email'
   Confidence: HIGH

2) src/user.test.ts > getUser > returns user object
   Error: Cannot find module '../utils/helper'
   Fix: Add missing import
   Confidence: HIGH

3) src/api.test.ts > paginate > handles page 0
   Error: expected undefined to equal []
   Fix: Check function return value
   Confidence: LOW

4) src/complex.test.ts > integration > complex flow
   Error: Some unusual error
   Fix: Unable to auto-fix
   Confidence: NONE

Fixable: 3 (2 high, 1 low)
Unfixable: 1

Apply fixes? (Y/n)
```

### Step 5: Apply Fixes

For each fixable failure:

1. Read source file
2. Apply suggested fix
3. Show progress:
   ```
   [████████░░░░░░░░░░░░] 2/4 (50%)
     Fixing null check in auth.ts
   ```

### Step 6: Verify Fixes

Re-run tests after fixes:

```bash
npm test 2>&1
```

Check results:
- ✅ Test passes → Mark as fixed
- ❌ Still fails → Rollback change, mark as unfixable

### Step 7: Display Summary

```
AutoFix Summary
═══════════════

Total:  4
fixed:  3 ✓
failed: 1 ✗

Successfully fixed:
  ✓ src/auth.test.ts > login > rejects invalid password
    Added null check
  ✓ src/user.test.ts > getUser > returns user object
    Added missing import
  ✓ src/api.test.ts > paginate > handles page 0
    Fixed return value

Could not fix:
  ✗ src/complex.test.ts > integration > complex flow
    Reason: Unknown error pattern

Commit fixes?
  1) Yes - commit all fixes
  2) No - review changes first
```

### Step 8: Commit (Optional)

If user chooses to commit:

```bash
git add -A
git commit -m "fix: auto-fix test failures (3 fixed)"
```

## Configuration

In `.tlc.json`:

```json
{
  "autofix": {
    "maxAttempts": 5,
    "strategies": ["null-check", "import", "return-value"],
    "confirmBeforeApply": true
  }
}
```

## Confidence Levels

| Level | Meaning | Behavior |
|-------|---------|----------|
| HIGH | Known pattern, reliable fix | Apply automatically |
| MEDIUM | Likely fix, may need review | Apply with confirmation |
| LOW | Suggested fix, uncertain | Show suggestion only |
| NONE | Unknown pattern | Skip, suggest manual fix |

## Error Patterns

Supported patterns for auto-fixing:

1. **null-property-access**: Accessing property on null
2. **undefined-property-access**: Accessing property on undefined
3. **module-not-found**: Missing import statement
4. **function-not-defined**: Function not exported/imported
5. **function-not-a-function**: Wrong export type
6. **timeout**: Missing async/await or slow test

## Example Session

```
User: /tlc:autofix

Claude: Running tests...
  ❌ 4 tests failing

Analyzing failures...

1) login > rejects invalid password
   → null-property-access: 'email'
   → Fix: Add null check (HIGH confidence)

2) getUser > returns user object
   → module-not-found: '../utils/helper'
   → Fix: Add import (HIGH confidence)

3) paginate > handles page 0
   → expected-value-mismatch
   → Fix: Check return (LOW confidence)

4) complex flow
   → Unknown pattern
   → Cannot auto-fix

Apply fixes? (Y/n)

User: y

Claude: [████████████████████] 3/3 (100%)

Re-running tests...
  ✅ 3 tests now passing
  ❌ 1 still failing (requires manual fix)

AutoFix Summary
═══════════════
fixed:  3 ✓
failed: 1 ✗

Commit fixes? (Y/n)
```
