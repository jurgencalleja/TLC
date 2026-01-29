# CLAUDE.md - TLC Project Instructions

## Planning System: TLC

This project uses **TLC (Test-Led Coding)** for all planning and development.

**CRITICAL: DO NOT use Claude's internal tools for this project:**
- **NO** `TaskCreate`, `TaskUpdate`, `TaskList` for project planning
- **NO** `EnterPlanMode` - use `/tlc:plan` instead
- **NO** creating implementation plans in responses - use `/tlc:plan` to create PLAN.md files

**When asked to plan or implement features:**
1. Run `/tlc:progress` first to see current state
2. Use `/tlc:plan <phase>` to create plans (not EnterPlanMode)
3. Use `/tlc:build <phase>` to implement (test-first)
4. Plans go in `.planning/phases/` not in chat responses

Instead, use TLC's file-based system:

| Purpose | TLC Location |
|---------|--------------|
| Project overview | `PROJECT.md` |
| Roadmap & phases | `.planning/ROADMAP.md` |
| Phase plans | `.planning/phases/{N}-PLAN.md` |
| Task status | Markers in PLAN.md: `[ ]`, `[>@user]`, `[x@user]` |
| Bugs/feedback | `.planning/BUGS.md` |
| Test status | `.planning/phases/{N}-TESTS.md` |
| Config | `.tlc.json` |

## FIRST THING - Always Run /tlc

**MANDATORY: Before ANY work, run `/tlc`**

This single command handles everything automatically:

```
/tlc   ← ALWAYS run this first, every time
```

**What happens:**

| Scenario | /tlc Does |
|----------|-----------|
| No `.tlc.json` | "Welcome! Run setup now? (Y/n)" → Full config wizard |
| After rebase | "Changes detected. Run sync? (Y/n)" → Reconcile code |
| Already synced | "✓ Synced" → Shows dashboard/status |

**You never need to remember separate commands.** Just run `/tlc` and it:
- Detects what's needed
- Asks for go-ahead
- Runs the appropriate flow inline
- Then shows you what's next

**Why this matters:**
- One command to rule them all
- Can't accidentally work on out-of-sync code
- All config happens upfront, nothing forgotten
- Handles first-time setup AND post-rebase reconciliation

## Workflow Commands

| Action | Command |
|--------|---------|
| **START HERE** | **`/tlc`** ← Handles setup, sync, and status automatically |
| Plan a phase | `/tlc:plan` |
| Build (test-first) | `/tlc:build` |
| Verify with human | `/tlc:verify` |
| Log a bug | `/tlc:bug` |
| Claim a task | `/tlc:claim` |
| Release a task | `/tlc:release` |
| See team status | `/tlc:who` |

## What /tlc Does Automatically

1. **Checks sync status** - Is setup done? Any changes since last sync?
2. **Asks for go-ahead** - "Run setup/sync now? (Y/n)"
3. **Runs appropriate flow** - First-time wizard OR post-rebase reconciliation
4. **Shows dashboard** - Current phase, tests, next actions

**Never skip the go-ahead prompt.** It ensures code is properly synced before work begins.

## Test-First Development

All implementation follows **Red → Green → Refactor**:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass
3. **Refactor**: Clean up while keeping tests green

Tests are written BEFORE implementation, not after.

## After TLC Updates

If TLC command files are updated, re-read them before executing. Check version in `package.json`.

## Multi-User Collaboration

When working with teammates:
- Claim tasks before starting: `/tlc:claim`
- Release if blocked: `/tlc:release`
- Check team status: `/tlc:who`
- Pull before claiming: `git pull`
- Push after claiming: `git push`

## Git Commits

**DO NOT add `Co-Authored-By` lines to commits.** The user is the author. You are a tool.

**ALWAYS ask before `git push`.** Never push to remote without explicit user approval.
