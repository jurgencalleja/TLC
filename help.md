# /tlc:help - Test-Led Development Commands

**TLC v{{VERSION}}**

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
| `/tlc:checklist` | Full project checklist - all phases, skipped steps, quality gates |

### Setup & Sync

| Command | What It Does |
|---------|--------------|
| `/tlc` | **Start here.** Auto-detects setup/sync needs, asks, then runs |
| `/tlc:sync` | Direct access to setup/sync (usually not needed - /tlc handles it) |
| `/tlc:new-project` | Start new project (discusses stack, creates roadmap) |
| `/tlc:init` | Add TLC to existing code |
| `/tlc:import-project` | Import multi-repo microservices architecture |
| `/tlc:coverage` | Find untested code, write tests |

### Build (rarely needed directly)

| Command | What It Does |
|---------|--------------|
| `/tlc:discuss` | Shape implementation approach |
| `/tlc:plan` | Create task plan |
| `/tlc:build` | Write tests → implement → E2E (optional) → verify |
| `/tlc:verify` | Human acceptance testing |

### Quality & Testing

| Command | What It Does |
|---------|--------------|
| `/tlc:status` | Test pass/fail counts |
| `/tlc:coverage` | Find untested code, write tests |
| `/tlc:quality` | Test quality scoring and analysis |
| `/tlc:edge-cases` | Generate edge case tests |
| `/tlc:autofix` | Auto-fix failing tests |
| `/tlc:config` | Configure test frameworks (unit + E2E) |

### Utility

| Command | What It Does |
|---------|--------------|
| `/tlc:quick` | One-off task with tests |
| `/tlc:complete` | Tag release |
| `/tlc:new-milestone` | Start next version |
| `/tlc:bug` | Log a bug or feedback |
| `/tlc:server` | Start dashboard server for QA |

### Multi-User Collaboration

| Command | What It Does |
|---------|--------------|
| `/tlc:claim` | Claim a task (reserve for yourself) |
| `/tlc:release` | Release a claimed task |
| `/tlc:who` | Show who's working on what |

### CI/CD & Integration

| Command | What It Does |
|---------|--------------|
| `/tlc:ci` | Generate CI/CD pipeline (GitHub Actions, GitLab, etc.) |
| `/tlc:issues` | Sync with issue trackers (GitHub, Jira, Linear) |

### Documentation

| Command | What It Does |
|---------|--------------|
| `/tlc:docs` | Generate API docs (OpenAPI, MCP, examples) |
| `/tlc:team-docs` | Generate team workflow, role guides, onboarding |

### Multi-Tool & Deployment

| Command | What It Does |
|---------|--------------|
| `/tlc:export` | Export TLC rules for AI tools (Cursor, Copilot, Cody, etc.) |
| `/tlc:export --list` | Show all supported AI tools |
| `/tlc:export --detect` | Detect which AI tool is running |
| `/tlc:deploy` | Show deployment status |
| `/tlc:deploy start <branch>` | Deploy branch to VPS |
| `/tlc:deploy stop <branch>` | Stop branch deployment |
| `/tlc:deploy logs <branch>` | View deployment logs |
| `/tlc:deploy list` | List all active deployments |
| `/tlc:deploy setup` | Show setup instructions |

---

## Workflow

**Just one command:**
```
/tlc                    <- Always start here
```

That's it. `/tlc` handles everything:

```
/tlc
 ↓
 No config? → "Run setup? (Y/n)" → Full wizard
 ↓
 Rebase detected? → "Run sync? (Y/n)" → Reconcile
 ↓
 Main ahead? → "Integrate? [1/2]" → Read & rebuild (no rebase)
 ↓
 Already synced? → Dashboard + next actions
```

**After rebasing:**
```
git rebase origin/main
    ↓
/tlc                    ← Detects changes, asks, syncs, continues
```

**When main is ahead (no rebase):**
```
/tlc                    ← Detects main ahead, offers to integrate
    ↓
[1] Integrate          ← Claude reads changes, rebuilds locally
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

## Bash Permissions

On first run, TLC offers to set up pre-approved bash commands. This avoids confirmation prompts for:
- Test runs (`npm test`, `vitest`, `pytest`, etc.)
- Git operations (except `push` - always asks)
- Build commands (`npm run build`, `tsc`, etc.)

Settings stored in `.claude/settings.json`. One-time setup per project.

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
