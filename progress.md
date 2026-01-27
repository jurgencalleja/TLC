# /tlc:progress - Where Am I?

Show current project state and what to do next.

## What This Does

Scans project state and presents:
1. Current milestone and phase
2. What's done, what's next
3. Test status
4. Suggested action

## Usage

```
/tlc:progress
```

## Process

### Step 1: Check Project Exists

Look for:
- `PROJECT.md` - project exists
- `.planning/ROADMAP.md` - has roadmap

If neither exists:
```
No project found.

Run /tlc:new-project to start, or /tlc:init to add TLC to existing code.
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

Suggested: /tlc:build 4
```

### Step 5b: Team Status (Multi-User)

If task markers (`[>@user]`, `[x@user]`) exist in PLAN.md, show team activity:

```
Team Activity:
  @alice: Task 1 (done), Task 5 (working)
  @bob: Task 3 (working)
  @you: Task 2 (working)

Available: Task 4, Task 6
```

Parse `[>@user]` and `[x@user]` markers from current phase PLAN.md to build this view.

If no markers exist, skip this section (single-user mode).

### Step 6: Suggest Next Action

Based on state:

| State | Suggestion |
|-------|------------|
| No discussion | `/tlc:discuss {N}` |
| Discussed, no plan | `/tlc:plan {N}` |
| Planned, no tests | `/tlc:build {N}` |
| Tests failing | Fix failures, then `/tlc:build {N}` |
| Tests passing, not verified | `/tlc:verify {N}` |
| Verified | Move to next phase |
| All phases done | `/tlc:complete` |

Or just:
```
Run /tlc to continue.
```

## Example Output

```
> /tlc:progress

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

Next: /tlc:build 4 (or just /tlc)
```

## Compact Mode

For quick checks:
```
> /tlc:progress

Phase 4/5: Reports
Status: Planned
Tests: 47/49 passing
Next: /tlc:build
```
