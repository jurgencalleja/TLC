# /tlc - Smart Entry Point

One command. Context-aware. Tells you what to do next.

## What This Does

Detects project state and suggests the right action. No memorizing commands.

## Process

### Step 1: Detect Project State

Check what exists:

```
□ PROJECT.md exists?
□ .planning/ directory exists?
□ .planning/ROADMAP.md exists?
□ Test framework configured? (vitest.config.*, pytest.ini, etc.)
□ Test files exist?
□ Source files exist?
```

### Step 2: Route Based on State

**No PROJECT.md → New or Init**
```
No project detected.

1) Start new project (/tlc:new-project)
2) Add TLC to existing code (/tlc:init)
```

**PROJECT.md exists, no roadmap → Need Planning**
```
Project exists but no roadmap.

Let's break your project into phases.

What's the first feature to build?
```
Then create ROADMAP.md with phases based on discussion.

**Roadmap exists → Check Phase Status**

Parse ROADMAP.md to find:
- Completed phases: `[x]` or `[completed]`
- Current phase: `[>]` or `[in progress]` or `[current]`
- Next pending phase: first without marker

### Step 3: Determine Current Phase Action

For the current/next phase, check what exists:

```
Phase {N}: {Name}
□ DISCUSSION.md exists? (.planning/phases/{N}-DISCUSSION.md)
□ PLAN.md exists? (.planning/phases/{N}-*-PLAN.md)
□ Tests written? (.planning/phases/{N}-TESTS.md or test files)
□ Implementation done? (check if tests pass)
□ Verified? (.planning/phases/{N}-VERIFIED.md)
```

### Step 4: Present Contextual Action

Based on phase state, show ONE clear action:

**Phase not discussed:**
```
Phase 2: User Dashboard

Ready to discuss implementation approach.

→ Continue? (Y/n)
```
Then run discuss flow.

**Discussed but not planned:**
```
Phase 2: User Dashboard

Discussion complete. Ready to create task plan.

→ Continue? (Y/n)
```
Then run plan flow.

**Planned but no tests:**
```
Phase 2: User Dashboard

Plan ready. 4 tasks to implement.

Next: Write tests, then build.

→ Continue? (Y/n)
```
Then run build flow (tests first).

**Tests written, not implemented:**
```
Phase 2: User Dashboard

Tests ready (12 tests, all failing - expected).

Next: Implement to make tests pass.

→ Continue? (Y/n)
```
Then run implementation.

**Implemented, not verified:**
```
Phase 2: User Dashboard

Tests passing (12/12 ✓)

Next: Human verification.

→ Continue? (Y/n)
```
Then run verify flow.

**Phase complete:**
```
Phase 2: User Dashboard ✓ Complete

Moving to Phase 3: Reports

→ Continue? (Y/n)
```

### Step 5: Check for Untested Code

If project has source files without tests:

```
Found 5 files without tests:
  - src/utils/helpers.ts
  - src/api/users.ts
  - src/services/email.ts
  ...

Add tests for existing code? (Y/n)
```

If yes, run `/tlc:coverage` flow.

### Step 6: All Phases Complete

```
All phases complete! 🎉

Milestone ready for release.

1) Tag release (/tlc:complete)
2) Start next milestone (/tlc:new-milestone)
3) Check test coverage (/tlc:coverage)
```

## Examples

**Fresh directory:**
```
> /tlc

No project detected.

What would you like to do?
1) Start new project
2) Add TLC to existing code
```

**Mid-project:**
```
> /tlc

Phase 2: User Dashboard
Status: Planned, not built

4 tasks ready. Tests will be written first.

→ Build phase 2? (Y/n)
```

**Has untested code:**
```
> /tlc

Phase 3: Reports [current]

Also found: 3 files without test coverage
  - src/utils/format.ts
  - src/api/health.ts
  - src/middleware/auth.ts

1) Continue with Phase 3
2) Add tests to existing code first
```

## Usage

```
/tlc
```

No arguments. Auto-detects everything.

## Why This Exists

Instead of remembering:
- `/tlc:discuss 2`
- `/tlc:plan 2`
- `/tlc:build 2`
- `/tlc:verify 2`

Just run `/tlc`. It knows where you are.
