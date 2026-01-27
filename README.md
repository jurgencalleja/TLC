# TLC

**Test Led Coding. Tests before code. Automatically.**

```bash
npx tlc-claude-code
```

<p align="center">
  <img src="assets/terminal.svg" alt="TLC" width="700">
</p>

---

## The Problem

You tell Claude to build something. It builds it. You test it manually. It's broken. You debug. Repeat.

**That's backwards.**

## The Solution

TLC writes tests *before* code exists. Every feature has a spec. Every spec is executable. When the code works, you know — because the tests pass.

```
You describe → Tests are written → Code is implemented → Tests pass → Done
```

No manual testing. No "does this work?" No vibes.

---

## Getting Started

### New Project

Starting from scratch? TLC guides you through everything.

```
/tlc:new-project
```

1. **Discuss requirements** — What are you building? Who uses it? What scale?
2. **Choose stack** — TLC suggests tech based on your answers, you approve or adjust
3. **Create roadmap** — Break work into phases
4. **Build with tests** — Each phase: write tests first, then implement

### Existing Project

Have code already? TLC adds test coverage without disrupting your workflow.

```
/tlc:init
```

1. **Scan codebase** — TLC detects your stack, test framework, project structure
2. **Find gaps** — Identifies files without tests, prioritizes critical paths
3. **Write tests** — Adds tests one file at a time, starting with highest priority
4. **Continue normally** — New features use test-first approach going forward

### After Setup

Once initialized, just run:

```
/tlc
```

TLC knows where you are and what's next. No phase numbers to remember.

---

## Team Collaboration

TLC supports distributed teams with built-in coordination.

### Task Claiming

Prevent duplicate work when multiple engineers use Claude Code:

```bash
/tlc:claim 2        # Reserve task 2
/tlc:release 2      # Release if blocked
/tlc:who            # See who's working on what
```

Task status tracked in PLAN.md:
```markdown
### Task 1: Create schema [x@alice]     ← completed by alice
### Task 2: Add validation [>@bob]      ← bob is working
### Task 3: Write tests [ ]             ← available
```

### Bug Tracking

QA and engineers can log bugs via CLI or web UI:

```bash
/tlc:bug "Login fails with + symbol in email"
```

Bugs tracked in `.planning/BUGS.md`, committed to git.

### Dev Server

Launch a mini-Replit experience for your team:

```bash
/tlc:server
```

- **Live preview** — Your app embedded in dashboard
- **Real-time logs** — App output, test results, git activity
- **Bug submission** — Web form with screenshot capture
- **Task board** — Who's working on what

Share URL with QA/PO: `http://192.168.1.x:3147`

---

## Test Quality

### Quality Scoring

Measure and improve test quality:

```bash
/tlc:quality
```

- Coverage percentage (lines, branches, functions)
- Edge case detection (null, empty, boundaries)
- Mutation testing score
- Prioritized recommendations

### Edge Case Generation

AI-generated edge case tests:

```bash
/tlc:edge-cases src/auth/login.ts
```

Generates tests for null inputs, boundaries, unicode, security patterns.

### Auto-Fix

Automatic repair of failing tests:

```bash
/tlc:autofix
```

- Analyzes failure reason
- Attempts fix with reasoning
- Retries up to max attempts
- Reports what it couldn't fix

---

## Commands

### Core

| Command | What |
|---------|------|
| `/tlc` | **Smart entry point. Knows what's next.** |
| `/tlc:new-project` | Start fresh. Discuss stack, scaffold. |
| `/tlc:init` | Add TLC to existing codebase. |
| `/tlc:discuss` | Shape implementation approach. |
| `/tlc:plan` | Create task plan. |
| `/tlc:build` | Write tests → implement → verify. |
| `/tlc:verify` | Human acceptance testing. |

### Quality & Testing

| Command | What |
|---------|------|
| `/tlc:status` | Test pass/fail counts. |
| `/tlc:coverage` | Find untested code, write tests. |
| `/tlc:quality` | Test quality scoring and analysis. |
| `/tlc:edge-cases` | Generate edge case tests. |
| `/tlc:autofix` | Auto-fix failing tests. |
| `/tlc:config` | Configure test frameworks. |

### Team Collaboration

| Command | What |
|---------|------|
| `/tlc:claim` | Reserve a task. |
| `/tlc:release` | Release a claimed task. |
| `/tlc:who` | See who's working on what. |
| `/tlc:bug` | Log a bug or feedback. |
| `/tlc:server` | Start dev server with dashboard. |

### CI/CD & Integration

| Command | What |
|---------|------|
| `/tlc:ci` | Generate CI/CD pipelines (GitHub Actions, GitLab, etc.) |
| `/tlc:issues` | Sync with issue trackers (GitHub, Jira, Linear). |
| `/tlc:docs` | Generate API docs, architecture, onboarding guides. |

### Multi-Tool & Deployment

| Command | What |
|---------|------|
| `/tlc:export` | Export rules for Cursor, Copilot, Continue, Cody. |
| `/tlc:deploy` | VPS deployment with branch previews. |

### Utility

| Command | What |
|---------|------|
| `/tlc:quick` | One-off task with tests. |
| `/tlc:complete` | Tag release. |
| `/tlc:new-milestone` | Start next version. |
| `/tlc:progress` | Check current state. |

---

## Test Framework

TLC defaults to the **mocha ecosystem**:

| Library | Purpose |
|---------|---------|
| mocha | Test runner |
| chai | Assertions |
| sinon | Mocks/stubs/spies |
| proxyquire | Module mocking |

### Configuration

Configure frameworks in `.tlc.json`:

```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire"],
    "run": ["mocha"]
  }
}
```

### Multi-Framework Support

Projects can have multiple test frameworks:

```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "jest"],
    "run": ["mocha", "jest"]
  }
}
```

Use `/tlc:config` to manage frameworks.

---

## Handling Untested Code

### External PRs / Other Developers

Someone pushes code without tests? TLC catches it.

```
> /tlc

Found 3 new files without tests:
  - src/api/webhooks.ts (added 2 days ago)
  - src/utils/retry.ts (added 2 days ago)
  - src/services/notify.ts (added yesterday)

Add tests now? (Y/n)
```

### After "Vibe Coding" Sessions

Built something fast without tests? No judgment. Run:

```
/tlc:coverage
```

TLC scans everything, creates a prioritized backlog.

---

## Workflow Examples

### Solo Developer, New Project

```
/tlc:new-project     → Discuss requirements, choose stack
/tlc                 → Build phase 1 (tests first)
/tlc                 → Build phase 2 (tests first)
...
/tlc:complete        → Tag release
```

### Team Project

```
/tlc:server          → Start dev server
/tlc:claim 1         → Claim task 1
/tlc:build           → Build with tests
git push             → Share progress
/tlc:release         → Release when done
```

### QA Workflow

1. Open dashboard: `http://192.168.1.x:3147`
2. Test features in live preview
3. Submit bugs via web form
4. Verify fixes when ready

---

## Architecture

### Planning Files

| File | Purpose |
|------|---------|
| `PROJECT.md` | Project overview, tech stack |
| `.planning/ROADMAP.md` | Phases and progress |
| `.planning/phases/{N}-PLAN.md` | Task plans |
| `.planning/BUGS.md` | Bug tracker |
| `.tlc.json` | TLC configuration |
| `CLAUDE.md` | Instructions for Claude |

### Task Status Markers

```markdown
### Task 1: Create schema [ ]           ← available
### Task 2: Add validation [>@alice]    ← claimed by alice
### Task 3: Write tests [x@bob]         ← completed by bob
```

---

## Agents

TLC uses specialized AI agents for different tasks. Most are invoked automatically.

### Research Agents

| Agent | Purpose |
|-------|---------|
| `tlc-competitor-analyst` | Competitive analysis |
| `tlc-market-researcher` | Market landscape |
| `tlc-tech-researcher` | Framework evaluation |
| `tlc-security-researcher` | Security best practices |

### Build Agents

| Agent | Purpose |
|-------|---------|
| `tlc-planner` | Create test-first plans |
| `tlc-executor` | Execute Red → Green → Refactor |
| `tlc-coverage-analyzer` | Find untested code |
| `tlc-verifier` | Verify phase completion |

---

## Roadmap

TLC v1.0 - Team Collaboration Release:

- [x] **Phase 1:** Core Infrastructure (multi-user, bug tracking, server spec)
- [x] **Phase 2:** Test Quality & Auto-Fix
- [x] **Phase 3:** TLC Dev Server (mini-Replit)
- [x] **Phase 4:** CI/CD Integration
- [x] **Phase 5:** Issue Tracker Integration
- [x] **Phase 6:** Team Documentation
- [x] **Phase 7:** Multi-Tool Support (Cursor, Copilot, Continue, Cody)
- [x] **Phase 8:** VPS Deployment Server (with auth & Slack webhooks)

All command specs implemented. Server code in `server/` directory.

---

## Philosophy

**Tests define behavior. Code makes tests pass.**

- Tests written BEFORE code (for new features)
- Untested code gets flagged (for external contributions)
- Coverage gaps get prioritized (for legacy code)
- Human verification still happens — tests catch logic errors, you catch "not what I meant"

---

## Install

```bash
npx tlc-claude-code
```

Options:
- `--global` — Available in all projects
- `--local` — This project only

---

## License

MIT
