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

## Before Starting Work

Always run `/tlc:progress` or `/tlc` to understand current state.

## Workflow Commands

| Action | Command |
|--------|---------|
| See status | `/tlc` or `/tlc:progress` |
| Plan a phase | `/tlc:plan` |
| Build (test-first) | `/tlc:build` |
| Verify with human | `/tlc:verify` |
| Log a bug | `/tlc:bug` |
| Claim a task | `/tlc:claim` |
| Release a task | `/tlc:release` |
| See team status | `/tlc:who` |

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
