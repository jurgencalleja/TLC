# /tdd:progress - Where Am I?

Show current project state and what to do next.

## What This Does

Scans project state and presents:
1. Current milestone and phase
2. What's done, what's next
3. Test status
4. Suggested action

## Usage

```
/tdd:progress
```

## Process

### Step 1: Check Project Exists

Look for:
- `PROJECT.md` - project exists
- `.planning/ROADMAP.md` - has roadmap

If neither exists:
```
No project found.

Run /tdd:new-project to start, or /tdd:init to add TDD to existing code.
```

### Step 2: Parse Roadmap

Read `.planning/ROADMAP.md` and identify:
- Total phases
- Completed phases (marked `[x]` or `[completed]`)
- Current phase (marked `[>]` or `[current]`)
- Pending phases

### Step 3: Check Current Phase State

For the current/next phase, check what exists:

| File | Meaning |
|------|---------|
| `{N}-DISCUSSION.md` | Discussed |
| `{N}-PLAN.md` | Planned |
| `{N}-TESTS.md` | Tests written |
| `{N}-VERIFIED.md` | Human verified |

### Step 4: Run Tests

Execute test suite and capture:
- Total tests
- Passing
- Failing
- Skipped

### Step 5: Present Status

```
Project: My App
Milestone: v1.0

Progress: ████████░░░░ 3/5 phases

Completed:
  ✓ Phase 1: Project Setup
  ✓ Phase 2: Authentication
  ✓ Phase 3: User Dashboard

Current:
  → Phase 4: Reports (planned, not built)

Pending:
  ○ Phase 5: Settings

Tests: 47 total | 45 passing | 2 failing

Suggested: /tdd:build 4
```

### Step 6: Suggest Next Action

Based on state:

| State | Suggestion |
|-------|------------|
| No discussion | `/tdd:discuss {N}` |
| Discussed, no plan | `/tdd:plan {N}` |
| Planned, no tests | `/tdd:build {N}` |
| Tests failing | Fix failures, then `/tdd:build {N}` |
| Tests passing, not verified | `/tdd:verify {N}` |
| Verified | Move to next phase |
| All phases done | `/tdd:complete` |

Or just:
```
Run /tdd to continue.
```

## Example Output

```
> /tdd:progress

╭─────────────────────────────────────╮
│ My App - v1.0                       │
╰─────────────────────────────────────╯

Phases: ████████░░░░ 3/5 complete

  ✓ 1. Project Setup
  ✓ 2. Authentication
  ✓ 3. User Dashboard
  → 4. Reports (ready to build)
  ○ 5. Settings

Tests: 47 passing | 2 failing

Next: /tdd:build 4 (or just /tdd)
```

## Compact Mode

For quick checks:
```
> /tdd:progress

Phase 4/5: Reports
Status: Planned
Tests: 47/49 passing
Next: /tdd:build
```
