# /tlc:verify - Human Acceptance Testing

Verify the phase works as expected — with your own eyes.

## What This Does

1. Runs tests to confirm code works
2. Walks you through each deliverable
3. Captures issues for fixing
4. Marks phase as verified when done

## Usage

```
/tlc:verify [phase_number]
```

If no phase number, auto-detect current phase.

## Process

### Step 1: Run Tests

```bash
npm test   # or pytest, go test, etc.
```

- ✅ All pass → Continue to human verification
- ❌ Some fail → Report failures, suggest fixing first

### Step 2: Load Phase Deliverables

Read from `.planning/phases/{N}-PLAN.md`:
- Extract acceptance criteria from each task
- Build verification checklist

### Step 3: Walk Through Each Deliverable

For each testable feature:

```
Phase 1: Authentication

Verifying 3 deliverables:

[1/3] User login with email/password

Can you:
1. Go to /login
2. Enter valid credentials
3. Get redirected to dashboard

Works as expected? (Y/n/describe issue)
>
```

### Step 4: Handle Issues

If user reports issue:
```
> n - login works but no error message for wrong password

Got it. Creating fix task:

Issue: No error message for wrong password
Location: Login form
Expected: Show "Invalid credentials" message

Add to current phase as fix task? (Y/n)
```

### Step 5: Mark Verified or Loop

**All verified:**
```
✅ Phase 1 verified

All 3 deliverables confirmed working.

Creating .planning/phases/1-VERIFIED.md

Ready for next phase? (Y/n)
```

**Issues found:**
```
Phase 1 verification incomplete

Issues found:
1. No error message for wrong password
2. Session doesn't persist on refresh

Fix tasks added to phase. Run /tlc:build 1 to implement fixes.
```

### Step 6: Create Verification Record

Save to `.planning/phases/{N}-VERIFIED.md`:

```markdown
# Phase {N}: {Name} - Verification

Verified: {date}

## Deliverables

- [x] User login with email/password
- [x] Session persistence
- [x] Logout functionality

## Issues Found & Fixed

- Login error message (fixed in commit abc123)
- Session refresh (fixed in commit def456)

## Notes

{Any additional observations}
```

## Why Human Verification?

**Tests verify code works.**
**You verify it works the way you wanted.**

Tests catch:
- Logic errors
- Regressions
- Edge cases

You catch:
- "Technically correct but wrong layout"
- "Works but confusing UX"
- "Missing something I forgot to specify"

Both matter.

## Example

```
> /tlc:verify 1

Running tests... ✅ 11 passing

Phase 1: Authentication

[1/3] Login with email/password
Works? (Y/n) > y

[2/3] Session persists across page refresh
Works? (Y/n) > y

[3/3] Logout clears session
Works? (Y/n) > y

✅ Phase 1 verified!

Moving to Phase 2: Dashboard
```
