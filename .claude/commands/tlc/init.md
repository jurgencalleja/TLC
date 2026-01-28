# /tlc:init - Initialize TLC in Existing Project

Add TLC workflow to an existing codebase. Analyzes what you have, identifies gaps, and offers to write tests for existing code.

## When to Use

- You have existing code without tests
- You have existing code with some tests
- You're joining a project mid-development
- You want to adopt TLC on a "vibe coded" project

This command will:
1. Set up test infrastructure (if missing)
2. **Analyze your existing code** to understand what it does
3. **Identify untested modules** and critical paths
4. **Ask if you want retrospective tests** written for existing code

For brand new projects with no code, use `/tlc:new-project` instead.

## Process

### 1. Scan for Existing Code

Check for source files:
- `src/`, `lib/`, `app/`, `pkg/`, or root-level code files
- `package.json`, `pyproject.toml`, `go.mod`, `Gemfile`, `Cargo.toml`

If no code found, suggest running `/tlc:new-project` instead.

### 2. Detect Stack

| Indicator | Stack |
|-----------|-------|
| `package.json` + React/Next deps | Next.js / React |
| `package.json` (no framework) | Node.js |
| `pyproject.toml` / `requirements.txt` | Python |
| `go.mod` | Go |
| `Gemfile` | Ruby |
| `Cargo.toml` | Rust |

### 3. Scan for Existing Tests

Look for test indicators:

**Directories:**
- `tests/`, `test/`, `__tests__/`, `spec/`

**Files:**
- `*_test.py`, `test_*.py`
- `*.test.ts`, `*.test.js`, `*.spec.ts`, `*.spec.js`
- `*_test.go`
- `*_spec.rb`

**Config files:**
- `vitest.config.*`, `jest.config.*`, `pytest.ini`, `pyproject.toml` [tool.pytest]
- `.rspec`, `spec/spec_helper.rb`

### 4. Set Up Test Framework (if missing)

If no tests found, set up based on detected stack. TLC defaults to mocha for JavaScript/TypeScript:

| Stack | Framework | Setup |
|-------|-----------|-------|
| Next.js / React / Node.js | Mocha + Chai + Sinon | `npm install -D mocha chai sinon proxyquire` |
| Python | pytest | `pip install pytest` or add to pyproject.toml |
| Go | go test | Built-in, no setup needed |
| Ruby | RSpec | `gem install rspec && rspec --init` |
| Rust | cargo test | Built-in, no setup needed |

Create config file and test directory structure.

For JavaScript/TypeScript, create `.mocharc.json`:
```json
{
  "extension": ["js", "ts"],
  "spec": "test/**/*.test.{js,ts}",
  "require": ["ts-node/register"],
  "timeout": 5000
}
```

Create `.tlc.json`:
```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire"],
    "run": ["mocha"]
  },
  "testCommand": "npm test",
  "testDirectory": "test"
}
```

Add test scripts to package.json:
```json
"scripts": {
  "test": "mocha",
  "test:watch": "mocha --watch"
}
```

### 5. If Tests Already Exist

- Skip framework setup
- Note existing test patterns for consistency
- Report: "Found existing test framework: [mocha/jest/vitest/pytest/etc]"
- Report: "Found X existing test files"

**Offer to add TLC default stack:**
```
Detected: jest (47 test files)

Options:
1) Keep jest only - use for all tests
2) Add mocha alongside jest - new tests use mocha, keep existing jest
3) Keep jest as primary - configure in .tlc.json

Which approach? [1/2/3]:
```

If option 2 selected, create multi-framework config:
```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire", "jest"],
    "run": ["mocha", "jest"]
  },
  "commands": {
    "mocha": "npx mocha 'test/**/*.test.js'",
    "jest": "npx jest"
  }
}
```

### 6. Analyze Existing Code Structure

Scan the codebase and generate summary:
- Main directories and their purpose
- Key modules/components identified
- Entry points (main files, API routes, etc.)
- Dependencies and their roles

### 7. Identify Untested Code

Compare source files against test files to identify:
- Modules/components with no corresponding tests
- Key functions that lack test coverage
- Critical paths (auth, payments, data mutations) without tests

Present findings:
```
Code Coverage Analysis:

Tested:
  ✓ src/auth/login.ts (tests/auth/login.test.ts)
  ✓ src/utils/format.ts (tests/utils/format.test.ts)

Untested:
  ✗ src/api/users.ts - CRUD operations, no tests
  ✗ src/services/payment.ts - payment processing, no tests
  ✗ src/components/Dashboard.tsx - main UI, no tests

Critical paths without tests: 2 (auth, payments)
```

### 8. Offer Retrospective Test Writing

Ask the user:

```
Would you like to write tests for existing code?

1) Yes - prioritize critical paths first
2) Yes - write tests for everything
3) No - only use TLC for new features going forward
```

**If option 1 or 2 selected:**

Create `.planning/BACKLOG.md` with test tasks:

```markdown
# Test Backlog

## Critical (write first)
- [ ] src/services/payment.ts - payment processing logic
- [ ] src/api/auth.ts - authentication flows

## High Priority
- [ ] src/api/users.ts - user CRUD operations
- [ ] src/middleware/validation.ts - input validation

## Standard
- [ ] src/utils/helpers.ts - utility functions
- [ ] src/components/Dashboard.tsx - dashboard rendering
```

Then ask:
```
Start writing tests now, or save backlog for later?

1) Start now - begin with critical paths
2) Later - I'll run /tlc:build backlog when ready
```

**If "Start now":** Begin writing tests for the first critical path item using Red-Green-Refactor (but code already exists, so focus on capturing current behavior).

### 9. Create CLAUDE.md

Create `CLAUDE.md` to enforce TLC workflow over Claude's default behaviors:

```markdown
# CLAUDE.md - TLC Project Instructions

## Planning System: TLC

This project uses **TLC (Test-Led Coding)** for all planning and development.

**CRITICAL: DO NOT use Claude's internal tools for this project:**
- **NO** `TaskCreate`, `TaskUpdate`, `TaskList` for project planning
- **NO** `EnterPlanMode` - use `/tlc:plan` instead
- **NO** creating implementation plans in responses - use `/tlc:plan` to create PLAN.md files

**When asked to plan or implement features:**
1. Run `/tlc:progress` first to see current state
2. Use `/tlc:plan <phase>` to create plans (not EnterPlanMode)
3. Use `/tlc:build <phase>` to implement (test-first)
4. Plans go in `.planning/phases/` not in chat responses

## Git Commits

**DO NOT add `Co-Authored-By` lines to commits.** The user is the author. You are a tool.

## TLC File Locations

| Purpose | Location |
|---------|----------|
| Project overview | `PROJECT.md` |
| Roadmap & phases | `.planning/ROADMAP.md` |
| Phase plans | `.planning/phases/{N}-PLAN.md` |
| Task status | Markers: `[ ]`, `[>@user]`, `[x@user]` |
| Bugs/feedback | `.planning/BUGS.md` |
| Config | `.tlc.json` |

## Quick Commands

| Action | Command |
|--------|---------|
| See status | `/tlc` or `/tlc:progress` |
| Plan a phase | `/tlc:plan` |
| Build (test-first) | `/tlc:build` |
| Verify with human | `/tlc:verify` |
| Log a bug | `/tlc:bug` |

## Test-First Development

All implementation follows **Red → Green → Refactor**:
1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass
3. **Refactor**: Clean up while keeping tests green
```

### 9b. Create Claude Settings for Bash Permissions

**Ask once per project:** Prompt the user to set up bash permissions. This is a one-time setup.

```
TLC works best with pre-approved bash commands.
This avoids confirmation prompts for test runs, git commits, and builds.

Allow TLC to run commands without prompts? (Y/n)
```

If yes, create `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test*)",
      "Bash(npm run test*)",
      "Bash(npx vitest*)",
      "Bash(npx mocha*)",
      "Bash(npx jest*)",
      "Bash(pytest*)",
      "Bash(go test*)",
      "Bash(cargo test*)",
      "Bash(git status*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git pull*)",
      "Bash(git checkout*)",
      "Bash(git branch*)",
      "Bash(git stash*)",
      "Bash(npm install*)",
      "Bash(npm run build*)",
      "Bash(npm run lint*)",
      "Bash(npx tsc*)",
      "Bash(ls *)",
      "Bash(mkdir *)",
      "Bash(rm -rf node_modules*)",
      "Bash(rm -rf dist*)",
      "Bash(rm -rf build*)"
    ],
    "deny": []
  }
}
```

**IMPORTANT:** `git push` is NOT included. Always ask before pushing to remote.

If `.claude/settings.json` already exists, merge the permissions (don't overwrite user's existing config).

### 10. Create or Update PROJECT.md

If PROJECT.md doesn't exist, create it with:

```markdown
# [Project Name]

## Overview
[Inferred from code structure and README if present]

## Tech Stack
- [Detected stack]
- [Key dependencies]

## Project Structure
[Generated from scan]

## Development Methodology: Test-Led Development

This project uses TLC. All new implementation follows Red -> Green -> Refactor:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass
3. **Refactor**: Clean up while keeping tests green

Tests are written BEFORE implementation, not after.

## Test Framework
- Framework: [detected or installed]
- Run tests: `[test command]`
- Test directory: `[path]`
```

If PROJECT.md exists, append the TLC section only.

### 11. Report Summary

```
TLC initialized for [project name]

Stack: [detected]
Test framework: [framework] (existing/newly configured)
Test directory: [path]
Existing tests: [count] files
Untested files: [count] identified

Next steps:
- Run /tlc:build backlog to write tests for existing code
- Run /tlc:discuss to plan new features with TLC
- Run /tlc:quick for ad-hoc tasks with tests
```

## Usage

```
/tlc:init
```

No arguments needed. Auto-detects everything.
