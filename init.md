# /tdd:init - Initialize TDD in Existing Project

Add TDD workflow to an existing codebase. Analyzes what you have, identifies gaps, and offers to write tests for existing code.

## When to Use

- You have existing code without tests
- You have existing code with some tests
- You're joining a project mid-development
- You want to adopt TDD on a "vibe coded" project

This command will:
1. Set up test infrastructure (if missing)
2. **Analyze your existing code** to understand what it does
3. **Identify untested modules** and critical paths
4. **Ask if you want retrospective tests** written for existing code

For brand new projects with no code, use `/tdd:new-project` instead.

## Process

### 1. Scan for Existing Code

Check for source files:
- `src/`, `lib/`, `app/`, `pkg/`, or root-level code files
- `package.json`, `pyproject.toml`, `go.mod`, `Gemfile`, `Cargo.toml`

If no code found, suggest running `/tdd:new-project` instead.

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

If no tests found, set up based on detected stack:

| Stack | Framework | Setup |
|-------|-----------|-------|
| Next.js / React | Vitest | `npm install -D vitest @testing-library/react` |
| Node.js | Vitest | `npm install -D vitest` |
| Python | pytest | `pip install pytest` or add to pyproject.toml |
| Go | go test | Built-in, no setup needed |
| Ruby | RSpec | `gem install rspec && rspec --init` |
| Rust | cargo test | Built-in, no setup needed |

Create config file and test directory structure.

Add test scripts to package.json / pyproject.toml / Makefile:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### 5. If Tests Already Exist

- Skip framework setup
- Note existing test patterns for consistency
- Report: "Found existing test framework: [vitest/jest/pytest/etc]"
- Report: "Found X existing test files"

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
3) No - only use TDD for new features going forward
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
2) Later - I'll run /tdd:build backlog when ready
```

**If "Start now":** Begin writing tests for the first critical path item using Red-Green-Refactor (but code already exists, so focus on capturing current behavior).

### 9. Create or Update PROJECT.md

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

This project uses TDD. All new implementation follows Red -> Green -> Refactor:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass
3. **Refactor**: Clean up while keeping tests green

Tests are written BEFORE implementation, not after.

## Test Framework
- Framework: [detected or installed]
- Run tests: `[test command]`
- Test directory: `[path]`
```

If PROJECT.md exists, append the TDD section only.

### 10. Report Summary

```
TDD initialized for [project name]

Stack: [detected]
Test framework: [framework] (existing/newly configured)
Test directory: [path]
Existing tests: [count] files
Untested files: [count] identified

Next steps:
- Run /tdd:build backlog to write tests for existing code
- Run /tdd:discuss to plan new features with TDD
- Run /tdd:quick for ad-hoc tasks with tests
```

## Usage

```
/tdd:init
```

No arguments needed. Auto-detects everything.
