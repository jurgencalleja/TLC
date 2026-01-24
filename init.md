# /tdd:init - Initialize TDD in Existing Project

Add TDD workflow to an existing codebase.

## When to Use

- You have existing code without tests
- You have existing code with some tests
- You're joining a project mid-development
- You want to adopt TDD on a "vibe coded" project

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

### 7. Create or Update PROJECT.md

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

### 8. Report Summary

```
TDD initialized for [project name]

Stack: [detected]
Test framework: [framework] (existing/newly configured)
Test directory: [path]
Existing tests: [count] files

Next steps:
- Run /tdd:status to check current test coverage
- Run /tdd:discuss to plan new features with TDD
- Run /tdd:quick for ad-hoc tasks with tests
```

## Usage

```
/tdd:init
```

No arguments needed. Auto-detects everything.
