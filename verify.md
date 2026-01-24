# /tdd:verify - Human Acceptance Testing

Verify the phase works as expected — with your own eyes.

## What This Does

1. **Check tests pass** — Quick sanity check before human testing
2. **Call `/gsd:verify-work`** — Walk through testable deliverables

## Usage

```
/tdd:verify [phase_number]
```

## Process

### Step 1: Run Tests

```bash
npm test   # or pytest, go test, etc.
```

- ✅ All pass → Continue to human verification
- ❌ Some fail → Report failures, suggest `/tdd:build {N}` to fix

### Step 2: Human Verification

Call `/gsd:verify-work {phase_number}`

GSD walks you through each deliverable:
- "Can you log in with email?" → Yes / No / Describe issue
- "Does the dashboard load?" → Yes / No / Describe issue

Issues get diagnosed and fix plans created.

## Why Both?

**Tests verify code works.**
**You verify it works the way you wanted.**

Tests catch regressions and logic errors. Human verification catches "technically correct but not what I meant" issues — wrong layout, confusing flow, missing edge case you forgot to specify.

Both matter.

## Example

```
User: /tdd:verify 1

Claude: Running tests...
✅ 11 tests passing

Starting human verification...

Phase 1 delivered:
1. User login with email/password
2. Session persistence
3. Logout functionality

Let's verify each:

[1/3] Can you log in with a valid email and password?
→ 
```
