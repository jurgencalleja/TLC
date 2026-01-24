# /tdd:help - Test-Led Development Commands

TDD-first workflow powered by GSD. You use `/tdd:*` for everything — tests happen automatically.

## Commands

### Getting Started

| Command | What It Does |
|---------|--------------|
| `/tdd:new-project` | Start new project with test infrastructure |
| `/tdd:init` | Add TDD to existing codebase |
| `/tdd:coverage` | Analyze gaps, write tests for existing code |

### Core Workflow

| Command | What It Does |
|---------|--------------|
| `/tdd:discuss [N]` | Capture implementation preferences for phase N |
| `/tdd:plan [N]` | Research and create task plans for phase N |
| `/tdd:build <N>` | **Write tests → implement → verify tests pass** |
| `/tdd:verify [N]` | Human acceptance testing |

### Navigation

| Command | What It Does |
|---------|--------------|
| `/tdd:progress` | Where am I? What's next? |
| `/tdd:status [N]` | Check test pass/fail counts |
| `/tdd:help` | Show this help |

### Milestones

| Command | What It Does |
|---------|--------------|
| `/tdd:complete` | Archive milestone, tag release |
| `/tdd:new-milestone [name]` | Start next version |

### Quick Tasks

| Command | What It Does |
|---------|--------------|
| `/tdd:quick` | Ad-hoc task with test-first flow |

## Workflow

```
/tdd:new-project          New project from scratch
       OR
/tdd:init                 Existing codebase
/tdd:coverage             Analyze gaps, write retro tests (optional)
    ↓
/tdd:discuss 1            Shape how phase 1 gets built
/tdd:plan 1               Create task plans
/tdd:build 1              Write tests → implement → tests pass
/tdd:verify 1             Human acceptance testing
    ↓
/tdd:discuss 2            Repeat for each phase...
/tdd:plan 2
/tdd:build 2
/tdd:verify 2
    ↓
/tdd:complete             Tag release
/tdd:new-milestone        Start v2
```

## What Happens in `/tdd:build`

This is where TDD happens:

1. **Red** — Write failing tests for each task in the plan
2. **Verify** — Run tests, confirm they fail
3. **Green** — Implement code (via GSD execute-phase)
4. **Verify** — Run tests, confirm they pass

You don't think about it. Just run `/tdd:build` and tests happen before code.

## Philosophy

**Tests define behavior. Implementation makes tests pass.**

- Tests are written BEFORE code exists
- Tests are the spec, not an afterthought
- Human verification still happens at the end
- You never invoke GSD directly — TDD wraps it

## GSD Under the Hood

TDD commands call GSD internally:

| TDD Command | Calls |
|-------------|-------|
| `/tdd:new-project` | `/gsd:new-project` + test setup |
| `/tdd:init` | scan + test setup (no GSD call) |
| `/tdd:coverage` | scan + write tests (no GSD call) |
| `/tdd:discuss` | `/gsd:discuss-phase` |
| `/tdd:plan` | `/gsd:plan-phase` |
| `/tdd:build` | write tests + `/gsd:execute-phase` |
| `/tdd:verify` | test check + `/gsd:verify-work` |

GSD does the planning and execution. TDD ensures tests come first.

## Installation

Lives in `.claude/commands/tdd/` — separate from GSD.

GSD updates only touch `.claude/commands/gsd/`. Your TDD commands survive updates.
