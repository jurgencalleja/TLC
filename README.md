# TDD Workflow for Claude Code

Test-Led Development powered by [GSD](https://github.com/glittercowboy/get-shit-done).

**One interface. Tests happen automatically. You don't think about methodology.**

<p align="center">
  <img src="assets/terminal.svg" alt="TDD Installer" width="700">
</p>

## Install

```bash
npx tdd-claude-code
```

GSD is installed automatically if missing.

Options:
```bash
npx tdd-claude-code --global   # available in all projects
npx tdd-claude-code --local    # this project only
```

## Usage

You use `/tdd:*` commands for everything. Never touch `/gsd:*` directly.

```
/tdd:new-project          New project from scratch
       OR
/tdd:init                 Add TDD to existing codebase
/tdd:coverage             Write tests for existing code (optional)
    ↓
/tdd:discuss              Shape how it gets built
/tdd:plan                 Create task plans
/tdd:build                Write tests → implement → tests pass  ← TDD happens here
/tdd:verify               Human acceptance testing
    ↓
/tdd:complete             Tag release
```

## What `/tdd:build` Does

This is where the magic happens:

1. **Red** — Spawns agents to write failing tests for each task
2. **Verify** — Runs tests, confirms they fail (code doesn't exist yet)
3. **Green** — Calls GSD to implement (you walk away)
4. **Verify** — Runs tests, confirms they pass

You run one command. Tests get written before code. Automatically.

## Commands

| Command | What It Does |
|---------|--------------|
| `/tdd:new-project` | Start project with test infrastructure |
| `/tdd:init` | Add TDD to existing codebase |
| `/tdd:coverage` | Analyze gaps, write tests for existing code |
| `/tdd:discuss` | Capture implementation preferences |
| `/tdd:plan` | Create task plans |
| `/tdd:build` | **Write tests → implement → verify** |
| `/tdd:verify` | Human acceptance testing |
| `/tdd:status` | Check test pass/fail |
| `/tdd:progress` | Where am I? |
| `/tdd:quick` | Ad-hoc task with tests |
| `/tdd:complete` | Tag release |
| `/tdd:new-milestone` | Start next version |
| `/tdd:help` | Show all commands |

## For Vibe Coders

No existing codebase? No problem.

`/tdd:new-project` detects your stack and sets up the test framework:

| Stack | Framework |
|-------|-----------|
| Next.js / React | Vitest |
| Node.js | Vitest |
| Python | pytest |
| Go | go test |
| Ruby | RSpec |

You describe what you want. Tests and code get written. You verify it works.

## Why TDD?

**Without TDD:**
```
Plan → Implement → "Does it work?" → Debug → Repeat
```

**With TDD:**
```
Plan → Write tests (spec) → Implement (pass tests) → Verify
```

Tests define expected behavior BEFORE code exists. Implementation has concrete pass/fail targets. Bugs surface immediately, not during manual testing.

Human verification still happens — tests catch logic errors, you catch "not what I meant" issues.

## Safe from GSD Updates

TDD lives in `.claude/commands/tdd/`
GSD lives in `.claude/commands/gsd/`

Running `npx get-shit-done-cc@latest` only touches GSD. Your TDD commands are untouched.

## License

MIT
