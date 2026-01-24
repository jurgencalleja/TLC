# /tdd:build - Build a Phase (Test-First)

Write failing tests, then implement to make them pass.

## What This Does

1. **Write failing tests** for all tasks in the phase
2. **Verify tests fail** (Red)
3. **Call `/gsd:execute-phase`** to implement (Green)
4. **Verify tests pass** after execution

This is the core TDD command. Tests before code, automatically.

## Usage

```
/tdd:build <phase_number>
```

## Process

### Step 1: Load Plans

Read all `.planning/phases/{phase}-*-PLAN.md` files for this phase.

### Step 2: Detect Test Framework

Check what's already set up:
- `vitest.config.*` → Vitest
- `jest.config.*` → Jest
- `pytest.ini` or `pyproject.toml` with pytest → pytest
- `spec/` directory → RSpec
- None found → Set up based on PROJECT.md stack (see framework defaults below)

### Step 3: Write Tests (Spawn Test Writer Agents)

For each plan, spawn an agent with this prompt:

<agent_prompt>
You are a TDD Test Writer. Write failing tests that define expected behavior BEFORE implementation.

## Context

<project>
{PROJECT.md contents}
</project>

<plan>
{Current PLAN.md contents}
</plan>

<test_framework>
{Detected or default framework}
</test_framework>

<existing_tests>
{List any existing test files for patterns, or "None - this is a new project"}
</existing_tests>

## Your Task

For each `<task>` in the plan:

1. **Understand the task** — What behavior is being specified?

2. **Write test file(s)** that cover:
   - Happy path (expected inputs → expected outputs)
   - Edge cases mentioned in `<action>`
   - Error conditions from `<verify>`
   
3. **Make tests runnable NOW** — even though implementation doesn't exist:
   - Import from where the code WILL be (path in `<files>`)
   - Tests should FAIL, not ERROR from missing imports
   - Use mocks/stubs where needed for dependencies

4. **Use clear test names** that describe expected behavior:
   ```
   ✓ "user can log in with valid credentials"
   ✓ "login rejects invalid password with 401"
   ✓ "login returns httpOnly cookie on success"
   ✗ "test login" (too vague)
   ```

## Test File Patterns

**Vitest/Jest (TypeScript):**
```typescript
import { describe, it, expect } from 'vitest'
// Import from where code WILL exist
import { login } from '../src/auth/login'

describe('login', () => {
  it('returns user object for valid credentials', async () => {
    const result = await login('user@test.com', 'password123')
    expect(result.user).toBeDefined()
    expect(result.user.email).toBe('user@test.com')
  })

  it('throws AuthError for invalid password', async () => {
    await expect(login('user@test.com', 'wrong'))
      .rejects.toThrow('Invalid credentials')
  })
})
```

**pytest (Python):**
```python
import pytest
# Import from where code WILL exist
from src.auth import login

def test_login_returns_user_for_valid_credentials():
    result = login("user@test.com", "password123")
    assert result["user"]["email"] == "user@test.com"

def test_login_raises_for_invalid_password():
    with pytest.raises(AuthError, match="Invalid credentials"):
        login("user@test.com", "wrong")
```

## Output

Create test files following the project's structure. Common locations:
- `tests/{feature}.test.ts`
- `src/{feature}/__tests__/{feature}.test.ts`
- `tests/test_{feature}.py`
- `spec/{feature}_spec.rb`

After creating each test file, run it and confirm it FAILS (not errors).

## Critical Rules

- Tests must be **syntactically valid** and **runnable**
- Tests must **FAIL** because code doesn't exist yet
- Tests must NOT **ERROR** from import issues — mock if needed
- Do NOT write any implementation code
- Do NOT skip or stub out the actual assertions
</agent_prompt>

### Step 4: Verify All Tests Fail (Red)

Run the test suite:
```bash
npm test          # or vitest run, pytest, etc.
```

Check output:
- ✅ All new tests executed (no syntax errors)
- ✅ All new tests FAILED (not passed, not skipped)
- ❌ If tests error on imports, add mocks and retry
- ❌ If tests pass, something's wrong — investigate

### Step 5: Create Test Summary

Create `.planning/phases/{phase}-TESTS.md`:

```markdown
# Phase {N} Tests

Generated: {timestamp}
Status: ✅ All tests failing (Red)

## Test Files

| File | Tests | Status |
|------|-------|--------|
| tests/auth.test.ts | 4 | ❌ Failing |
| tests/session.test.ts | 3 | ❌ Failing |

## Test Output

{test runner output showing failures}

## Coverage Map

| Test | Task |
|------|------|
| user can log in with valid credentials | 01-task-1 |
| login rejects invalid password | 01-task-1 |
| session persists across requests | 01-task-2 |
```

### Step 6: Execute Implementation (Green)

Call `/gsd:execute-phase {phase_number}`

GSD's executor implements the code. Tests provide concrete pass/fail targets.

### Step 7: Verify All Tests Pass (Green)

After execution completes, run tests again:
```bash
npm test
```

Check output:
- ✅ All tests PASS → Continue to verify
- ❌ Some tests fail → Report which tasks need fixes

### Step 8: Update Test Summary

Update `.planning/phases/{phase}-TESTS.md`:

```markdown
Status: ✅ All tests passing (Green)

## Final Test Output

{test runner output showing all pass}
```

## Framework Defaults (for new projects)

If no test framework detected, set up based on PROJECT.md:

| Stack in PROJECT.md | Framework | Setup |
|---------------------|-----------|-------|
| Next.js, React, Vite | Vitest | `npm install -D vitest`, create `vitest.config.ts` |
| Node.js, Express | Vitest | `npm install -D vitest`, create `vitest.config.ts` |
| Python, FastAPI, Flask | pytest | `pip install pytest`, create `pytest.ini` |
| Go | go test | Built-in, create `*_test.go` files |
| Ruby, Rails | RSpec | `gem install rspec`, `rspec --init` |

Default Vitest config:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for React
  },
})
```

Default pytest.ini:
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
```

## Example Run

```
User: /tdd:build 1

Claude: Loading phase 1 plans...
Found 2 plans:
- 01-01-PLAN.md: User authentication
- 01-02-PLAN.md: Session management

Checking test framework... Vitest detected.

Writing tests for 01-01-PLAN.md...
Created: tests/auth/login.test.ts (4 tests)
Created: tests/auth/logout.test.ts (2 tests)

Writing tests for 01-02-PLAN.md...
Created: tests/session/session.test.ts (5 tests)

Running tests...
❌ 11 tests failing (expected - no implementation yet)

Created 01-TESTS.md

Executing implementation via GSD...
[GSD execute-phase output]

Running tests again...
✅ 11 tests passing

Phase 1 complete. Ready for /tdd:verify 1
```

## Error Recovery

**Tests error instead of fail:**
- Missing imports → Add mocks for dependencies
- Syntax errors → Fix test code
- Framework issues → Check config

**Tests pass before implementation:**
- Code already exists? Check if reimplementing
- Tests too weak? Strengthen assertions
- Wrong file paths? Check imports

**Some tests fail after implementation:**
- Report specific failures
- Suggest running `/tdd:build {phase}` again to retry
- Or manually fix and run `/tdd:status` to verify
