# /tdd:build - Build a Phase (Test-First)

Write failing tests, then implement to make them pass.

## What This Does

1. **Write failing tests** for all tasks in the phase
2. **Verify tests fail** (Red)
3. **Implement code** one task at a time (Green)
4. **Verify tests pass** after each task
5. **Commit** after each passing task

This is the core TDD command. Tests before code, one task at a time.

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

### Step 3: Plan Tests for Each Task

Before writing any tests, create a test plan for each task in the phase.

For each task in the plan:

1. **Read the task** — understand what behavior is being specified
2. **Identify test cases:**
   - Happy path (expected inputs → expected outputs)
   - Edge cases mentioned in `<action>`
   - Error conditions from `<verify>`
3. **Create test plan entry**

Create `.planning/phases/{phase}-TEST-PLAN.md`:

```markdown
# Phase {N} Test Plan

## Task: {task-id} - {task-title}

### File: tests/{feature}.test.ts

| Test | Type | Expected Result |
|------|------|-----------------|
| user can log in with valid credentials | happy path | returns user object |
| login rejects invalid password | error | throws AuthError |
| login rejects empty email | edge case | throws ValidationError |

### Dependencies to mock:
- database connection
- email service

---

## Task: {task-id-2} - {task-title-2}
...
```

### Step 4: Write Tests One Task at a Time

**For each task in the test plan, sequentially:**

#### 4a. Write test file for this task

Follow the project's test patterns. Test names should describe expected behavior:
```
✓ "user can log in with valid credentials"
✓ "login rejects invalid password with 401"
✗ "test login" (too vague)
```

**Vitest/Jest (TypeScript):**
```typescript
import { describe, it, expect } from 'vitest'
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
from src.auth import login

def test_login_returns_user_for_valid_credentials():
    result = login("user@test.com", "password123")
    assert result["user"]["email"] == "user@test.com"

def test_login_raises_for_invalid_password():
    with pytest.raises(AuthError, match="Invalid credentials"):
        login("user@test.com", "wrong")
```

#### 4b. Run this test file

```bash
npm test -- tests/auth/login.test.ts   # vitest
pytest tests/test_login.py              # pytest
```

Verify:
- ✅ Tests execute (no syntax errors)
- ✅ Tests FAIL (not pass, not skip)
- ❌ If import errors, add mocks/stubs and retry

#### 4c. Commit this test file

```bash
git add tests/auth/login.test.ts
git commit -m "test: add login tests (red) - phase {N}"
```

#### 4d. Move to next task

Repeat 4a-4c for each task in the test plan.

**Critical Rules:**
- Tests must be **syntactically valid** and **runnable**
- Tests must **FAIL** because code doesn't exist yet
- Tests must NOT **ERROR** from import issues — mock if needed
- Do NOT write any implementation code
- Do NOT skip or stub out the actual assertions
- **One task at a time, verify, commit, then next**

### Step 5: Verify All Tests Fail (Red)

Run the full test suite:
```bash
npm test          # or vitest run, pytest, etc.
```

Check output:
- ✅ All new tests executed (no syntax errors)
- ✅ All new tests FAILED (not passed, not skipped)
- ❌ If tests error on imports, add mocks and retry
- ❌ If tests pass, something's wrong — investigate

### Step 6: Create Test Summary

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

### Step 7: Execute Implementation (Green)

Now implement the code to make tests pass. Work through each task sequentially:

**For each task in the plan:**

#### 7a. Read the task
Review the task's:
- Goal and expected behavior
- Acceptance criteria
- Test cases (now written and failing)

#### 7b. Implement the code
Write the minimum code needed to pass the tests:
- Create files specified in the task
- Follow existing project patterns
- Reference the failing tests for exact expected behavior

#### 7c. Run tests for this task
```bash
npm test -- tests/auth/login.test.ts   # specific file
```

- ✅ Tests pass → Continue
- ❌ Tests fail → Fix implementation, retry

#### 7d. Commit this task
```bash
git add src/auth/login.ts tests/auth/login.test.ts
git commit -m "feat: {task-title} - phase {N}"
```

#### 7e. Move to next task
Repeat 7a-7d for each task in the phase.

**Critical Rules:**
- Implement **one task at a time**
- Run tests **after each task**
- Commit **after each passing task**
- Do NOT batch — sequential execution catches issues early

### Step 8: Verify All Tests Pass (Green)

After execution completes, run tests again:
```bash
npm test
```

Check output:
- ✅ All tests PASS → Continue to verify
- ❌ Some tests fail → Report which tasks need fixes

### Step 9: Update Test Summary

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

Implementing task 1/3: User login...
✅ tests/auth/login.test.ts passing
Committed: feat: user login - phase 1

Implementing task 2/3: User registration...
✅ tests/auth/register.test.ts passing
Committed: feat: user registration - phase 1

Implementing task 3/3: Session management...
✅ tests/session/session.test.ts passing
Committed: feat: session management - phase 1

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
