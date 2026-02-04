# /tlc - Smart Entry Point

One command. Context-aware. Visual dashboard.

## Engineering Mindset

**All TLC code generation follows senior engineer standards:**
- Clean architecture with separated concerns
- SOLID principles strictly applied
- Defensive programming with validation at boundaries
- Performance-aware (O(n) thinking, no N+1 queries)
- Security-first (no secrets in code, sanitize all input)
- Fully testable (dependency injection, pure functions)

See `/tlc:build` for the complete engineering standards checklist.

## What This Does

Launches the TLC dashboard - a visual interface showing project state, phases, tests, and next actions.

## Process

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

### Step 6: Check Claude Permissions (One-Time)

Check if `.claude/settings.json` exists with TLC permissions:

```bash
if [ ! -f ".claude/settings.json" ]; then
  # First time - offer setup
fi
```

**Skip if already configured.** Only ask once per project.

If missing, offer to set up:

```
TLC works best with pre-approved bash commands.
This avoids prompts for every test run and git commit.

Allow TLC to run commands without prompts? (Y/n)
```

If yes, create `.claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(npm test*)",
      "Bash(npm run test*)",
      "Bash(npx vitest*)",
      "Bash(npx mocha*)",
      "Bash(pytest*)",
      "Bash(go test*)",
      "Bash(git status*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git pull*)",
      "Bash(git checkout*)",
      "Bash(git branch*)",
      "Bash(npm install*)",
      "Bash(npm run build*)"
    ]
  }
}
```

**IMPORTANT:** `git push` is NOT included - always ask before pushing to remote.

### Step 6b: Check Docs Setup (One-Time)

Check if documentation automation is configured:

```bash
if [ ! -f ".github/workflows/docs-sync.yml" ] && [ -d ".git" ]; then
  # First time - offer docs setup
fi
```

**Skip if already configured or no git repo.** Only ask once per project.

If missing, offer to set up:

```
Documentation Automation

TLC can automatically maintain your docs:
  • Update version references on push
  • Sync to GitHub Wiki
  • Generate API documentation
  • Capture app screenshots

Set up documentation automation? (Y/n)
```

If yes, run `/tlc:docs setup`:
- Creates `docs/` directory
- Adds `.github/workflows/docs-sync.yml`
- Adds npm scripts for docs
- Creates starter documentation

### Step 7: Check for Untested Code

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

### Step 8: All Phases Complete

```
All phases complete!

Milestone ready for release.

1) Tag release (/tlc:complete)
2) Start next milestone (/tlc:new-milestone)
3) Check test coverage (/tlc:coverage)
4) Update documentation (/tlc:docs)
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
