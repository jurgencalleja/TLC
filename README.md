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

## Quick Start

```bash
npx tlc-claude-code        # Install
```

Then in Claude Code:

```
/tlc
```

That's it. One command. It knows what to do next.

Starting fresh? It asks what you're building.
Have existing code? It finds untested files.
Mid-project? It picks up where you left off.

---

## Commands

| Command | What |
|---------|------|
| `/tlc` | **Smart entry point. Knows what's next.** |
| `/tlc:new-project` | Start fresh. Discuss stack, scaffold. |
| `/tlc:init` | Add TLC to existing code. |
| `/tlc:coverage` | Find untested → write tests |
| `/tlc:quick` | One-off task with tests |
| `/tlc:status` | Pass/fail counts |

---

## What Makes This Different

### 1. Tests First, Always

Other workflows: plan → build → "hope it works"

TLC: plan → **write failing tests** → build until tests pass

The tests *are* the spec. No ambiguity.

### 2. Smart Stack Selection

Don't pick tech in a vacuum. TLC asks what you're building, who uses it, what scale — then suggests the right stack.

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
| **TLC** | Tests auto-generated first | Fast, guaranteed coverage |

---

## Install

```bash
npx tlc-claude-code
```

Options:
- `--global` — Available everywhere
- `--local` — This project only

---

## License

MIT
