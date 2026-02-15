# Phase 76 Discussion Addendum: Auto-Mark Tasks

## Problem

During Phase 76 build, tasks were completed (tests passing, code committed) but the `[ ]` markers in `76-PLAN.md` were never updated to `[x]`. The user had to manually remind Claude to mark tasks as done.

**Root cause:** Step 7e in `/tlc:build` only triggered task marking in **multi-user mode** (when tasks had `[>@user]` markers). In single-user mode, the `[ ]` → `[x]` update was never performed.

## Fix Applied

Updated `.claude/commands/tlc/build.md`:

1. **Step 7e is now MANDATORY** — not conditional on multi-user mode
2. Single-user tasks update `[ ]` → `[x]` immediately after tests pass
3. Multi-user tasks still update `[>@user]` → `[x@user]`
4. Added to Critical Rules: "Mark task `[x]` in PLAN.md after each passing task — never defer this"

## Rationale

The PLAN.md file is the single source of truth for task status. If markers aren't updated as work progresses, the plan becomes stale and `/tlc:progress` reports inaccurate status. This is especially important when builds run autonomously without user interaction.
