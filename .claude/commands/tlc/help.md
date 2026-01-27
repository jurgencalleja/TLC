# /tlc:help - Test-Led Development Commands

## Quick Start

```
/tlc
```

Launches the visual dashboard. Detects where you are, shows what's next.

---

## All Commands

### The Smart One

| Command | What It Does |
|---------|--------------|
| `/tlc` | **Visual dashboard. Context-aware. Knows what to do next.** |

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
| `/tlc:config` | Configure test frameworks |
| `/tlc:bug` | Log a bug or feedback |
| `/tlc:server` | Start dashboard server for QA |

### Multi-User Collaboration

| Command | What It Does |
|---------|--------------|
| `/tlc:claim` | Claim a task (reserve for yourself) |
| `/tlc:release` | Release a claimed task |
| `/tlc:who` | Show who's working on what |

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

Launches a visual terminal dashboard showing:
- Project overview and current phase
- Test status (pass/fail counts)
- Available actions

Navigate with keyboard, select actions directly from the UI.

Falls back to text mode if dashboard unavailable.

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

---

## Agents

TLC includes specialized AI agents that handle research, planning, execution, and verification. Most are invoked automatically by commands.

### Research Agents

| Agent | Invoked By | Purpose |
|-------|------------|---------|
| `tlc-competitor-analyst` | `/tlc:new-project` | Competitive analysis |
| `tlc-market-researcher` | `/tlc:new-project` | Market landscape, user needs |
| `tlc-tech-researcher` | `/tlc:new-project`, `/tlc:plan` | Evaluate tech choices |
| `tlc-oss-reviewer` | `/tlc:new-project` | Learn from open source |
| `tlc-ux-researcher` | `/tlc:new-project` | UX patterns, accessibility |
| `tlc-security-researcher` | `/tlc:plan` | Security best practices |
| `tlc-api-analyst` | `/tlc:plan` | API design, integrations |
| `tlc-architecture-analyst` | `/tlc:new-project` | System architecture |

### Build Agents

| Agent | Invoked By | Purpose |
|-------|------------|---------|
| `tlc-planner` | `/tlc:plan` | Create test-first plans |
| `tlc-executor` | `/tlc:build` | Red → Green → Refactor |
| `tlc-coverage-analyzer` | `/tlc:coverage` | Find untested code |
| `tlc-verifier` | `/tlc:verify` | Goal-backward verification |
| `tlc-integration-checker` | `/tlc:verify` | E2E flow verification |
| `tlc-debugger` | Manual | Systematic debugging |

### Manual Agent Invocation

```
Task(subagent_type="tlc-{agent}", prompt="...")
```

Example:
```
Task(subagent_type="tlc-competitor-analyst", prompt="Analyze CRM market competitors")
```

Agent definitions are in the `agents/` folder.
