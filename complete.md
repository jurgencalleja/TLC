# /tdd:complete - Complete Milestone

Archive current milestone and tag the release.

## What This Does

1. **Verify all tests pass** for all phases
2. **Call `/gsd:complete-milestone`**

## Usage

```
/tdd:complete
```

## Process

Before completing:
- Runs full test suite
- If any failures → Block completion, show what needs fixing
- If all pass → Proceed with GSD milestone completion

This ensures you don't tag a release with failing tests.
