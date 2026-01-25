# /tlc:help - Test-Led Development Commands

## Quick Start

```
/tlc
```

That's it. Detects where you are, tells you what's next.

---

## All Commands

### The Smart One

| Command | What It Does |
|---------|--------------|
| `/tlc` | **Context-aware entry point. Knows what to do next.** |

### Setup

| Command | What It Does |
|---------|--------------|
| `/tlc:new-project` | Start new project (discusses stack, creates roadmap) |
| `/tlc:init` | Add TLC to existing code |
| `/tlc:import-project` | Import multi-repo microservices architecture |
| `/tlc:coverage` | Find untested code, write tests |

### Build (rarely needed directly)

| Command | What It Does |
|---------|--------------|
| `/tlc:discuss` | Shape implementation approach |
| `/tlc:plan` | Create task plan |
| `/tlc:build` | Write tests → implement → verify |
| `/tlc:verify` | Human acceptance testing |

### Utility

| Command | What It Does |
|---------|--------------|
| `/tlc:status` | Test pass/fail counts |
| `/tlc:quick` | One-off task with tests |
| `/tlc:complete` | Tag release |
| `/tlc:new-milestone` | Start next version |

---

## Workflow

**Simple version:**
```
/tlc                    <- just keep running this
```

**Detailed version:**
```
/tlc:new-project        New project
    ↓
/tlc                    Guides you through each phase:
                        → discuss → plan → build → verify
    ↓
/tlc:complete           Tag release
```

---

## What `/tlc` Does

Checks project state and presents ONE action:

```
> /tlc

Phase 2: User Dashboard
Status: Planned, not built

4 tasks ready. Tests will be written first.

→ Build phase 2? (Y/n)
```

Or if you have untested code:

```
> /tlc

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
npx tlc-claude-code
```

Lives in `.claude/commands/tlc/`
