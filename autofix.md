# /tlc:autofix - Automatic Test Failure Recovery

Automatically fix failing tests with AI-powered debugging.

## Usage

```
/tlc:autofix [test-file]
```

If no file specified, fixes all failing tests.

## What This Does

1. Runs tests to identify failures
2. Analyzes failure reasons
3. Attempts fixes with reasoning
4. Retries up to max attempts
5. Reports results with explanations

## Process

### Step 1: Identify Failing Tests

Run test suite and capture failures:

```bash
npm test 2>&1
```

Parse output:
```
Failing Tests:

1. login.test.js
   ✗ throws ValidationError for null email
     Expected: ValidationError
     Actual: TypeError: Cannot read property 'toLowerCase' of null

2. users.test.js
   ✗ returns empty array when no users
     Expected: []
     Actual: null
```

### Step 2: Analyze Each Failure

For each failing test:

```
Analyzing: "throws ValidationError for null email"

Test Code:
  it('throws ValidationError for null email', async () => {
    await expect(login(null, 'password'))
      .to.be.rejectedWith(ValidationError);
  });

Error:
  TypeError: Cannot read property 'toLowerCase' of null
  at login (src/auth/login.ts:15)

Source Code (line 15):
  const normalizedEmail = email.toLowerCase();

Analysis:
  - Test expects ValidationError for null input
  - Code tries to call .toLowerCase() on email before validation
  - Null check should happen BEFORE string operations

Proposed Fix:
  Add null check at start of function, before any string operations.
```

### Step 3: Generate Fix

```typescript
// BEFORE (line 12-20 of src/auth/login.ts)
async function login(email: string, password: string): Promise<User> {
  const normalizedEmail = email.toLowerCase();

  if (!normalizedEmail || !password) {
    throw new ValidationError('Email and password required');
  }
  // ...
}

// AFTER
async function login(email: string, password: string): Promise<User> {
  if (!email || !password) {
    throw new ValidationError('Email and password required');
  }

  const normalizedEmail = email.toLowerCase();
  // ...
}
```

### Step 4: Apply Fix and Retry

```
Applying fix to src/auth/login.ts...

Running test: "throws ValidationError for null email"
  ✓ PASSED

Fix successful!

Commit this fix? (Y/n)
```

### Step 5: Handle Complex Failures

If simple fix doesn't work, try alternative approaches:

```
Attempt 1: Move null check before toLowerCase()
  Result: ✗ Still failing

Analyzing deeper...
  The test expects ValidationError but we throw generic Error

Attempt 2: Change throw to ValidationError
  Result: ✗ Still failing - ValidationError not imported

Attempt 3: Import ValidationError and use it
  Result: ✓ PASSED

Fix required 3 attempts:
  1. Moved null check (insufficient)
  2. Changed error type (missing import)
  3. Added import (success)
```

### Step 6: Report Results

```
╭─────────────────────────────────────────────────────────────╮
│  AutoFix Results                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Failing tests found: 6                                     │
│  Successfully fixed: 5                                      │
│  Could not fix: 1                                           │
│                                                             │
│  Fixed:                                                     │
│    ✓ login.test.js - null email handling                    │
│    ✓ login.test.js - empty password handling                │
│    ✓ users.test.js - empty array return                     │
│    ✓ users.test.js - pagination bounds                      │
│    ✓ api.test.js - timeout handling                         │
│                                                             │
│  Could not fix:                                             │
│    ✗ integration.test.js - database connection              │
│      Reason: Requires external service configuration        │
│      Suggestion: Check DATABASE_URL environment variable    │
│                                                             │
│  Files modified:                                            │
│    - src/auth/login.ts (2 changes)                          │
│    - src/api/users.ts (1 change)                            │
│    - src/api/index.ts (1 change)                            │
│                                                             │
╰─────────────────────────────────────────────────────────────╯

Commit all fixes? (Y/n)
```

## Fix Strategies

### Strategy 1: Direct Fix
Simple issues with obvious solutions:
- Missing null checks
- Wrong return types
- Missing imports
- Typos

### Strategy 2: Pattern Matching
Recognize common error patterns:
```
TypeError: Cannot read property 'X' of null/undefined
→ Add null check before accessing property

Expected X but got undefined
→ Add return statement or default value

Timeout exceeded
→ Increase timeout or add async handling
```

### Strategy 3: Test-Driven Fix
Use the test assertion to guide the fix:
```
Test expects: throws ValidationError
Code does: throws Error
Fix: Change Error to ValidationError
```

### Strategy 4: Contextual Analysis
Read surrounding code for patterns:
```
Similar function handles null this way...
Following project's error handling pattern...
Using existing validation utility...
```

## Configuration

In `.tlc.json`:

```json
{
  "autofix": {
    "maxAttempts": 5,
    "strategies": ["direct", "pattern", "test-driven", "contextual"],
    "autoCommit": false,
    "excludePatterns": ["integration.test.*", "e2e.*"],
    "timeout": 30000
  }
}
```

## Limitations

AutoFix works best for:
- ✓ Simple logic errors
- ✓ Missing null/undefined checks
- ✓ Type mismatches
- ✓ Missing imports
- ✓ Wrong return values

AutoFix struggles with:
- ✗ Complex business logic bugs
- ✗ Architecture issues
- ✗ External service problems
- ✗ Race conditions
- ✗ Performance issues

When AutoFix can't solve it:
```
Could not fix: "handles concurrent requests"

Analysis:
  This appears to be a race condition in the request handler.
  Multiple requests modify shared state without synchronization.

This requires manual investigation:
  1. Review shared state in src/api/handler.ts
  2. Consider adding mutex/lock
  3. Or redesign to avoid shared state

Would you like to:
  1) Log this as a bug (/tlc:bug)
  2) Create a task for manual fix
  3) Skip for now
```

## Example Session

```
> /tlc:autofix

Running tests...
  12 passing
  4 failing

Analyzing failures...

[1/4] login.test.js - "throws for null email"
  Error: TypeError: Cannot read property 'toLowerCase' of null
  Fix: Add null check before string operation
  Applying... ✓ Fixed

[2/4] login.test.js - "rejects empty password"
  Error: Expected ValidationError, got nothing
  Fix: Add validation for empty string
  Applying... ✓ Fixed

[3/4] users.test.js - "returns empty array"
  Error: Expected [], got null
  Fix: Return [] instead of null when no results
  Applying... ✓ Fixed

[4/4] integration.test.js - "connects to database"
  Error: ECONNREFUSED 127.0.0.1:5432
  Cannot fix: External service issue
  Suggestion: Start PostgreSQL or set DATABASE_URL

Results: 3/4 fixed

Modified files:
  - src/auth/login.ts
  - src/api/users.ts

Commit fixes? (Y/n) y

Committed: fix: resolve 3 failing tests (null checks, empty returns)

1 test still failing - requires manual attention.
```

## Integration with Build

AutoFix runs automatically during `/tlc:build` when tests fail:

```
/tlc:build

Writing tests... ✓
Running tests...
  ✗ 2 tests failing

AutoFix enabled. Attempting repairs...
  ✓ Fixed 2/2 failures

Re-running tests...
  ✓ All tests passing

Continuing with implementation...
```

## Notes

- AutoFix modifies source code - review changes before committing
- Use `--dry-run` to preview fixes without applying
- Fixes are atomic - each fix is a separate change
- If fix breaks other tests, it's rolled back
- Works best with good test descriptions
