# /tlc - Smart Entry Point

One command. Context-aware. Visual dashboard.

## What This Does

Launches the TLC dashboard - a visual interface showing project state, phases, tests, and next actions.

## Process

### Step 0: Check Sync Status (ALWAYS FIRST)

Before anything else, check if codebase is synced:

```bash
# Check if .tlc.json exists
if [ ! -f ".tlc.json" ]; then
  # No TLC config - need first-time setup
  echo "No TLC configuration found."
  echo "→ Run /tlc:sync to set up TLC"
  exit
fi

# Check for rebase marker
if [ -f ".tlc-rebase-marker" ]; then
  echo "⚠️ Rebase detected since last sync."
  echo "→ Run /tlc:sync to reconcile changes"
  exit
fi

# Check if HEAD matches lastSync
lastSync=$(jq -r '.lastSync // ""' .tlc.json)
currentHead=$(git rev-parse HEAD 2>/dev/null)

if [ -n "$lastSync" ] && [ "$lastSync" != "$currentHead" ]; then
  echo "⚠️ Codebase changed since last sync."
  echo "   Last sync: ${lastSync:0:7}"
  echo "   Current:   ${currentHead:0:7}"
  echo ""
  echo "→ Run /tlc:sync to reconcile changes"
  exit
fi
```

Only proceed if synced. This prevents working on out-of-sync code.

### Step 1: Launch Dashboard

Run the TLC dashboard:

```bash
# If in TLC repo (development)
cd dashboard && npm run dev

# If installed globally
tlc-dashboard
```

The dashboard shows:
- Project overview (from PROJECT.md)
- Phase progress (from ROADMAP.md)
- Test status (pass/fail counts)
- Available actions

### Step 2: Fallback to Text Mode

If the dashboard cannot be launched (not installed, dependencies missing), fall back to text-based status:

Check what exists:

```
□ PROJECT.md exists?
□ .planning/ directory exists?
□ .planning/ROADMAP.md exists?
□ Test framework configured? (vitest.config.*, pytest.ini, etc.)
□ Test files exist?
□ Source files exist?
```

### Step 3: Route Based on State (Text Fallback)

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

### Step 4: Determine Current Phase Action

For the current/next phase, check what exists:

```
Phase {N}: {Name}
□ DISCUSSION.md exists? (.planning/phases/{N}-DISCUSSION.md)
□ PLAN.md exists? (.planning/phases/{N}-*-PLAN.md)
□ Tests written? (.planning/phases/{N}-TESTS.md or test files)
□ Implementation done? (check if tests pass)
□ Verified? (.planning/phases/{N}-VERIFIED.md)
```

### Step 5: Present Contextual Action

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

Tests passing (12/12)

Next: Human verification.

→ Continue? (Y/n)
```
Then run verify flow.

**Phase complete:**
```
Phase 2: User Dashboard - Complete

Moving to Phase 3: Reports

→ Continue? (Y/n)
```

### Step 6: Check for Untested Code

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

### Step 7: All Phases Complete

```
All phases complete!

Milestone ready for release.

1) Tag release (/tlc:complete)
2) Start next milestone (/tlc:new-milestone)
3) Check test coverage (/tlc:coverage)
```

## Usage

```
/tlc
```

No arguments. Auto-detects everything. Launches dashboard when available.

## Why This Exists

Instead of remembering:
- `/tlc:discuss 2`
- `/tlc:plan 2`
- `/tlc:build 2`
- `/tlc:verify 2`

Just run `/tlc`. It knows where you are.
