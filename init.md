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
  "testDirectory": "test",
  "e2e": {
    "framework": null,
    "directory": "tests/e2e",
    "command": null
  }
}
```

(E2E framework is configured in Step 11)

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

### 10. Detect Main Branch

Identify the trunk branch for rebasing and merges:

```bash
# Try to detect from git
if git rev-parse --verify main >/dev/null 2>&1; then
  detected="main"
elif git rev-parse --verify master >/dev/null 2>&1; then
  detected="master"
elif git rev-parse --verify develop >/dev/null 2>&1; then
  detected="develop"
else
  detected=$(git rev-parse --abbrev-ref HEAD)
fi
```

Confirm with user:
```
Detected main branch: main

Is this your trunk branch for merges? (Y/n/other):
>

If "other", prompt for branch name.
```

Add to `.tlc.json`:
```json
{
  "git": {
    "mainBranch": "main"
  }
}
```

This branch is used by:
- `/tlc:claim` - rebases from this branch before claiming
- `/tlc:build` - suggests merging back to this branch
- PR reviews - compares against this branch

### 11. Set Up E2E Testing

Check for existing E2E setup:

```bash
# Detect existing E2E
if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
  e2e="playwright"
elif [ -f "cypress.config.ts" ] || [ -f "cypress.config.js" ]; then
  e2e="cypress"
elif [ -d "tests/e2e" ] || [ -d "e2e" ]; then
  e2e="detected"
fi
```

**If no E2E found:**

```
No E2E testing detected.

Set up E2E tests for full user flow verification?
  [1] Yes - Playwright (recommended)
  [2] Yes - Cypress
  [3] No - skip for now

Choice [1/2/3]: _
```

**If Playwright selected:**

```bash
npm init playwright@latest
```

Create `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  baseURL: process.env.BASE_URL || 'http://localhost:5001',
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

Update `.tlc.json`:
```json
{
  "e2e": {
    "framework": "playwright",
    "directory": "tests/e2e",
    "command": "npx playwright test"
  }
}
```

Add to `package.json`:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**If E2E already exists:**

```
Detected E2E framework: playwright
E2E directory: tests/e2e
Existing E2E tests: 5 files

Keeping existing E2E setup.
```

### 12. Report Summary

```
TLC initialized for [project name]

Stack: [detected]
Unit tests: [framework] (existing/newly configured)
Unit test directory: [path]
E2E tests: [framework] (existing/newly configured)
E2E test directory: [path]
Existing tests: [count] unit, [count] E2E
Untested files: [count] identified

Next steps:
- Run /tlc:build backlog to write tests for existing code
- Run /tlc:discuss to plan new features with TLC
- Run /tlc:quick for ad-hoc tasks with tests
```

### Step 13: Offer Dev Server Setup

After initialization, offer remote dev server:

```
───────────────────────────────────────────────────────────────
Dev Server (Optional)
───────────────────────────────────────────────────────────────

Set up a shared dev server for team collaboration?
  • Each branch gets its own preview URL
  • QA and PO can access without local setup
  • Slack notifications for deployments

  [1] Yes, set up dev server
  [2] Skip for now

Choice [1/2]: _
```

**If [1] selected:** Run the dev server setup flow from `/tlc:deploy setup`.

## Usage

```
/tlc:init
```

No arguments needed. Auto-detects everything.
