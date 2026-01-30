# Getting Started with TLC

TLC (Test-Led Coding) enforces test-first development with AI coding assistants. Tests define behavior, then code makes tests pass.

## Installation

### Option 1: Global Install (Recommended)

```bash
npm install -g tlc-claude-code
tlc
```

### Option 2: npx (No Install)

```bash
npx tlc-claude-code
```

This installs TLC slash commands to Claude Code's `.claude/commands/` directory.

## Quick Start

### New Project

```bash
# In Claude Code, run:
/tlc:new-project
```

TLC will guide you through:
1. Project name and description
2. Tech stack selection
3. Initial roadmap creation
4. First phase planning

### Existing Project

```bash
/tlc:init
```

TLC will:
1. Detect your tech stack
2. Create `.planning/` directory structure
3. Set up test framework configuration
4. Create initial roadmap

## Project Structure

After initialization, TLC creates:

```
your-project/
├── PROJECT.md              # Project overview
├── .planning/
│   ├── ROADMAP.md          # Phases and milestones
│   ├── BUGS.md             # Bug tracker
│   └── phases/
│       ├── 1-PLAN.md       # Phase 1 tasks
│       └── 1-TESTS.md      # Phase 1 test status
├── .tlc.json               # TLC configuration
└── tlc-start.bat           # Dev server launcher (Windows)
```

## Core Workflow

### 1. Plan

```bash
/tlc:plan 1
```

Creates detailed task breakdown with acceptance criteria and test cases.

### 2. Build (Test-First)

```bash
/tlc:build 1
```

For each task:
1. Write failing tests (Red)
2. Implement code to pass tests (Green)
3. Commit after each task

### 3. Verify

```bash
/tlc:verify 1
```

Human verification that the feature works as expected.

## The TLC Difference

### Traditional AI Coding
```
You describe → Code generated → Manual testing → Bugs found → Debug → Repeat
```

### TLC Approach
```
You describe → Tests written → Code implemented → Tests pass → Done
```

**Benefits:**
- No "does this work?" uncertainty
- Regressions caught immediately
- Clear acceptance criteria
- Documented behavior via tests

## Next Steps

- **Solo developer?** See [Solo Developer Tutorial](solo-developer)
- **Team setup?** See [Team Setup Tutorial](team-setup)
- **All commands?** See [Command Reference](command-reference)
- **Configuration?** See [Configuration Guide](configuration)

## Common Commands

| Command | Description |
|---------|-------------|
| `/tlc` | Smart entry point - knows what's next |
| `/tlc:progress` | Show current status |
| `/tlc:plan` | Plan current/specified phase |
| `/tlc:build` | Build phase (test-first) |
| `/tlc:verify` | Human verification |
| `/tlc:status` | Check test status |

## Getting Help

- `/tlc:help` - Show all commands
- [GitHub Issues](https://github.com/jurgencalleja/TLC/issues) - Report bugs
- [Documentation](https://github.com/jurgencalleja/TLC/tree/main/docs) - Full docs
