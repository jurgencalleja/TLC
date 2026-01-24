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
| `/tdd:discuss` | Capture implementation preferences |
| `/tdd:plan` | Research and create task plans |
| `/tdd:build` | **Write tests → implement → verify tests pass** |
| `/tdd:verify` | Human acceptance testing |

Phase number optional. Defaults to 1.

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
/tdd:coverage             Write tests for existing code (optional)
    ↓
/tdd:discuss              Shape how it gets built
/tdd:plan                 Create task plans
/tdd:build                Write tests → implement → tests pass
/tdd:verify               Human acceptance testing
    ↓
/tdd:complete             Tag release
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
