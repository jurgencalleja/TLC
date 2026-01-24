# /tdd:status - Check Test Status

Quick check on test status for current or specified phase.

## Usage

```
/tdd:status [phase_number]
```

If no phase specified, shows overall test status.

## Process

1. **Detect test framework** (Vitest, Jest, pytest, etc.)
2. **Run the test suite**
3. **Report results** with next action

## Output Examples

**All tests passing:**
```
Test Status
───────────
✅ 18 passing, 0 failing, 0 errors

Ready for: /tdd:verify
```

**Some failing:**
```
Test Status
───────────
🔄 12 passing, 6 failing, 0 errors

Failing:
• tests/auth.test.ts: login rejects invalid password
• tests/auth.test.ts: login returns httpOnly cookie
• tests/session.test.ts: session expires after timeout
...

Action: Fix implementation or run /tdd:build to retry
```

**Tests erroring:**
```
Test Status
───────────
⚠️ 10 passing, 0 failing, 3 errors

Errors:
• tests/auth.test.ts:45 - Cannot find module '../src/auth'
• tests/session.test.ts:12 - TypeError: x is not a function

Action: Fix test errors before continuing
```

**No tests found:**
```
Test Status
───────────
No tests found.

Run /tdd:build to write tests and implement.
```
