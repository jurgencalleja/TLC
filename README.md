# TDD

**Tests before code. Automatically.**

```bash
npx tdd-claude-code
```

<p align="center">
  <img src="assets/terminal.svg" alt="TDD" width="700">
</p>

---

## The Problem

You tell Claude to build something. It builds it. You test it manually. It's broken. You debug. Repeat.

**That's backwards.**

## The Solution

TDD writes tests *before* code exists. Every feature has a spec. Every spec is executable. When the code works, you know — because the tests pass.

```
You describe → Tests are written → Code is implemented → Tests pass → Done
```

No manual testing. No "does this work?" No vibes.

---

## Quick Start

```bash
npx tdd-claude-code        # Install
```

Then in Claude Code:

```
/tdd:new-project           # New project with tests baked in
/tdd:init                  # Add TDD to existing code
/tdd:coverage              # Find untested code, fix it
```

That's it. Tests happen automatically.

---

## Commands

| Command | What |
|---------|------|
| `/tdd:new-project` | Start fresh. Discuss stack, scaffold, tests ready. |
| `/tdd:init` | Add TDD to existing code. Finds gaps. |
| `/tdd:coverage` | Scan → identify untested → write tests |
| `/tdd:build N` | Write tests → implement → verify |
| `/tdd:quick` | One-off task with tests |
| `/tdd:status` | Pass/fail counts |

---

## What Makes This Different

### 1. Tests First, Always

Other workflows: plan → build → "hope it works"

TDD: plan → **write failing tests** → build until tests pass

The tests *are* the spec. No ambiguity.

### 2. Smart Stack Selection

Don't pick tech in a vacuum. TDD asks what you're building, who uses it, what scale — then suggests the right stack.

```
Building: Internal dashboard
Scale: Small team
Data: Simple CRUD

→ Suggested: Next.js + SQLite + Vercel
→ Why: Fast to build, cheap to host, fits your needs
```

### 3. Parallel Agents

Up to 3 Claude instances working simultaneously. GitHub issues as task queue. Watch them go.

```
┌──────────────────────────────────────────────────────┐
│ Agents                                               │
│ [1] ● Working on #42: Auth flow                      │
│ [2] ● Working on #43: User CRUD                      │
│ [3] ○ Idle                                           │
└──────────────────────────────────────────────────────┘
```

### 4. GitHub Integration

Plans approved → issues created automatically. Tasks complete → issues closed. Full audit trail.

### 5. Live Preview

Docker container spins up. See your app as it's built. Not after.

---

## Dashboard (Coming Soon)

```
┌─────────────────────────────────┬──────────────────────┐
│ Chat                            │ GitHub Issues        │
│                                 │ #42 Auth flow    WIP │
│ Building login endpoint...      │ #43 User CRUD        │
│ ✓ Created tests/auth.test.ts    │ #44 Dashboard        │
│ ✓ Tests failing (expected)      ├──────────────────────┤
│ Implementing...                 │ Agents (2/3)         │
│                                 │ [1] ● #42            │
│                                 │ [2] ● #43            │
│                                 │ [3] ○ Idle           │
├─────────────────────────────────┼──────────────────────┤
│ > add password reset flow       │ Tests: 23/23 ✓       │
└─────────────────────────────────┴──────────────────────┘
```

TUI dashboard. Multiple panes. Real-time updates.

---

## Philosophy

**Tests define behavior. Code makes tests pass.**

- Tests written BEFORE code
- Tests are the spec, not an afterthought
- If it's not tested, it doesn't exist
- Human verification still happens — tests catch logic errors, you catch "not what I meant"

---

## vs Other Approaches

| Approach | Process | Result |
|----------|---------|--------|
| Vibe coding | Build → hope | Works until it doesn't |
| Manual TDD | Write tests yourself | Slow, easy to skip |
| **TDD Workflow** | Tests auto-generated first | Fast, guaranteed coverage |

---

## Install

```bash
npx tdd-claude-code
```

Options:
- `--global` — Available everywhere
- `--local` — This project only

---

## License

MIT
