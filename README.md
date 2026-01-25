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

## Handling Untested Code

Code comes from many sources. Not all of it has tests.

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

TLC tracks what's tested. When new untested code appears, it flags it.

### After "Vibe Coding" Sessions

Built something fast without tests? No judgment. Run:

```
/tlc:coverage
```

TLC scans everything, creates a prioritized backlog:

```
Coverage: 67% (24/36 files)

Critical (no tests):
  - src/auth/session.ts      ← security
  - src/payments/charge.ts   ← money

High priority:
  - src/api/users.ts
  - src/api/orders.ts

Add to backlog and start? (Y/n)
```

### Continuous Coverage

TLC integrates with your workflow:

- **Before builds** — `/tlc:status` shows pass/fail counts
- **Before releases** — `/tlc:coverage` ensures nothing slipped through
- **Daily habit** — `/tlc` reminds you of untested code

---

## Commands

| Command | What |
|---------|------|
| `/tlc` | **Smart entry point. Knows what's next.** |
| `/tlc:new-project` | Start fresh. Discuss stack, scaffold. |
| `/tlc:init` | Add TLC to existing codebase. |
| `/tlc:coverage` | Find untested code, write tests. |
| `/tlc:status` | Test pass/fail counts. |
| `/tlc:quick` | One-off task with tests. |

---

## What Makes This Different

### 1. Tests First, Always

Other workflows: plan → build → "hope it works"

TLC: plan → **write failing tests** → build until tests pass

The tests *are* the spec. No ambiguity.

### 2. Catches Coverage Gaps

New code without tests? TLC notices. External PRs? Flagged. Post-hackathon cleanup? Prioritized backlog ready.

### 3. Smart Stack Selection

Don't pick tech in a vacuum. TLC asks what you're building, who uses it, what scale — then suggests the right stack.

```
Building: Internal dashboard
Scale: Small team
Data: Simple CRUD

→ Suggested: Next.js + SQLite + Vercel
→ Why: Fast to build, cheap to host, fits your needs
```

### 4. Works With Your Team

TLC doesn't require everyone to use it. You can:
- Add TLC to a project others contribute to
- Catch untested code from any source
- Gradually improve coverage over time

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

### Team Project, Existing Codebase

```
/tlc:init            → Set up TLC, scan codebase
/tlc:coverage        → Write tests for critical paths
/tlc                 → Continue with test-first for new work
```

### After External Contributions

```
git pull             → Get latest changes
/tlc                 → "Found 2 untested files. Add tests?"
y                    → Tests written for new code
```

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

## See Also

**Using GSD?** Check out [TDD Workflow](https://github.com/jurgencalleja/tdd) — same philosophy, integrates with GSD.

---

## License

MIT
