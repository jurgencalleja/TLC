# /tdd:help - Test-Led Development Commands

## Quick Start

```
/tdd
```

That's it. Detects where you are, tells you what's next.

---

## All Commands

### The Smart One

| Command | What It Does |
|---------|--------------|
| `/tdd` | **Context-aware entry point. Knows what to do next.** |

### Setup

| Command | What It Does |
|---------|--------------|
| `/tdd:new-project` | Start new project (discusses stack, creates roadmap) |
| `/tdd:init` | Add TDD to existing code |
| `/tdd:coverage` | Find untested code, write tests |

### Build (rarely needed directly)

| Command | What It Does |
|---------|--------------|
| `/tdd:discuss` | Shape implementation approach |
| `/tdd:plan` | Create task plan |
| `/tdd:build` | Write tests → implement → verify |
| `/tdd:verify` | Human acceptance testing |

### Utility

| Command | What It Does |
|---------|--------------|
| `/tdd:status` | Test pass/fail counts |
| `/tdd:quick` | One-off task with tests |
| `/tdd:complete` | Tag release |
| `/tdd:new-milestone` | Start next version |

---

## Workflow

**Simple version:**
```
/tdd                    <- just keep running this
```

**Detailed version:**
```
/tdd:new-project        New project
    ↓
/tdd                    Guides you through each phase:
                        → discuss → plan → build → verify
    ↓
/tdd:complete           Tag release
```

---

## What `/tdd` Does

Checks project state and presents ONE action:

```
> /tdd

Phase 2: User Dashboard
Status: Planned, not built

4 tasks ready. Tests will be written first.

→ Build phase 2? (Y/n)
```

Or if you have untested code:

```
> /tdd

Found 3 files without tests:
  - src/utils/format.ts
  - src/api/health.ts
  - src/middleware/auth.ts

Add tests? (Y/n)
```

---

## Philosophy

**Tests define behavior. Code makes tests pass.**

- Tests written BEFORE code
- Tests are the spec, not afterthought
- Human verification still happens
- No phase numbers to remember

---

## Installation

```bash
npx tdd-claude-code
```

Lives in `.claude/commands/tdd/`
