# /tlc:build - Build a Phase (Test-First)

Write failing tests, then implement to make them pass.

## What This Does

1. **Write failing tests** for all tasks in the phase
2. **Verify tests fail** (Red)
3. **Implement code** one task at a time (Green)
4. **Verify tests pass** after each task
5. **Commit** after each passing task

This is the core TLC command. Tests before code, one task at a time.

## Usage

```
/tlc:build <phase_number>
```

## Process

### Step 1: Load Plans

Read all `.planning/phases/{phase}-*-PLAN.md` files for this phase.

### Step 1b: Sync and Claim (Multi-User)

Before starting work, coordinate with teammates:

1. **Pull latest:** `git pull --rebase`
2. **Get user identity:**
   ```bash
   if [ -n "$TLC_USER" ]; then
     user=$TLC_USER
   else
     user=$(git config user.name | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
   fi
   ```
3. **Parse task status:** Read `[>@user]` and `[x@user]` markers from plan
4. **Show availability:**
   ```
   Phase 1 Tasks:
     [x@alice] 1. Create schema (done)
     [ ] 2. Add validation (available)
     [>@bob] 3. Write migrations (bob is working)
     [ ] 4. Integration tests (available)

   Work on task 2? (Y/n)
   ```
5. **Claim selected task:** Update `[ ]` → `[>@{user}]`
6. **Commit claim:** `git commit -m "claim: task 2 (@{user})"`
7. **Push:** Prompt user or auto-push

If no markers exist in PLAN.md, skip this step (single-user mode).

### Step 2: Detect Test Framework

#### Check TLC Config First

If `.tlc.json` exists, use configured frameworks:

```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire"],
    "run": ["mocha"]
  }
}
```

#### Auto-Detection (No Config)

Check what's already set up:
- `.tlc.json` → Use configured framework
- `mocha` in package.json → Mocha (TLC default)
- `.mocharc.*` or `mocha.opts` → Mocha
- `vitest.config.*` → Vitest
- `jest.config.*` → Jest
- `pytest.ini` or `pyproject.toml` with pytest → pytest
- `spec/` directory → RSpec
- None found → Set up mocha stack (TLC default)

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

**Mocha/Chai (TLC Default):**
```javascript
const { expect } = require('chai')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

describe('login', () => {
  let login, dbStub

  beforeEach(() => {
    dbStub = sinon.stub()
    login = proxyquire('../src/auth/login', {
      './db': { findUser: dbStub }
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('returns user object for valid credentials', async () => {
    dbStub.resolves({ id: 1, email: 'user@test.com' })

    const result = await login('user@test.com', 'password123')

    expect(result.user).to.exist
    expect(result.user.email).to.equal('user@test.com')
  })

  it('throws AuthError for invalid password', async () => {
    dbStub.resolves(null)

    try {
      await login('user@test.com', 'wrong')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err.message).to.equal('Invalid credentials')
    }
  })
})
```

**Vitest/Jest (Alternative):**
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

#### 7e. Mark Task Complete (Multi-User)

If using multi-user mode (task had `[>@user]` marker):

1. Update marker: `[>@{user}]` → `[x@{user}]`
2. Commit: `git commit -m "complete: task {N} - {title} (@{user})"`
3. Push to share progress with team

#### 7f. Move to next task
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

### Step 10: E2E Testing (Optional)

After unit tests pass, offer E2E testing:

```
✅ Unit tests passing (11/11)

Run E2E tests?
  [1] Yes - run full E2E suite
  [2] Skip - proceed to verify

Choice [1/2]: _
```

**If user chooses E2E:**

#### 10a. Detect E2E Framework

Check `.tlc.json` or detect from project:

```bash
# Check config
e2eFramework=$(jq -r '.e2e.framework // ""' .tlc.json)

# Or detect
if [ -f "playwright.config.ts" ]; then
  e2eFramework="playwright"
elif [ -f "cypress.config.ts" ]; then
  e2eFramework="cypress"
fi
```

If no E2E framework:
```
No E2E framework detected.

Set up E2E testing?
  [1] Playwright (recommended)
  [2] Cypress
  [3] Skip for now

Choice [1/2/3]: _
```

#### 10b. Generate E2E Tests from Acceptance Criteria

Read acceptance criteria from PLAN.md and generate E2E scenarios:

```
Analyzing phase acceptance criteria...

E2E scenarios for Phase 1:
  1. User can log in with valid credentials
  2. User sees error for invalid password
  3. User session persists after refresh
  4. User can log out

Generate E2E tests? (Y/n)
```

Create `tests/e2e/phase-{N}.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Phase 1: Authentication', () => {
  test('user can log in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('user sees error for invalid password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@test.com');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toContainText('Invalid credentials');
  });

  // ... more tests from acceptance criteria
});
```

#### 10c. Run E2E Tests

```bash
# Playwright
npx playwright test

# Cypress
npx cypress run

# Docker (if configured)
docker-compose --profile test up playwright
```

Output:
```
Running E2E tests...

  ✓ user can log in with valid credentials (1.2s)
  ✓ user sees error for invalid password (0.8s)
  ✓ user session persists after refresh (1.5s)
  ✓ user can log out (0.6s)

✅ 4 E2E tests passing

Phase 1 complete. Ready for /tlc:verify 1
```

#### 10d. E2E Failures

If E2E tests fail:
```
E2E test failed: user can log in with valid credentials

Error: Expected URL '/dashboard', got '/login'
Screenshot: tests/e2e/screenshots/login-failure.png

Options:
  [1] Fix and retry
  [2] Skip E2E (proceed to verify)
  [3] Debug (open headed browser)

Choice [1/2/3]: _
```

## Framework Defaults

### TLC Default: Mocha Stack

For JavaScript/TypeScript projects, TLC defaults to the mocha ecosystem:

| Library | Purpose | Install |
|---------|---------|---------|
| **mocha** | Test runner | `npm install -D mocha` |
| **chai** | Assertions | `npm install -D chai` |
| **sinon** | Mocks/stubs/spies | `npm install -D sinon` |
| **proxyquire** | Module mocking | `npm install -D proxyquire` |

Full setup:
```bash
npm install -D mocha chai sinon proxyquire @types/mocha @types/chai @types/sinon
```

Default `.mocharc.json`:
```json
{
  "extension": ["js", "ts"],
  "spec": "test/**/*.test.{js,ts}",
  "require": ["ts-node/register"],
  "timeout": 5000
}
```

Default `package.json` scripts:
```json
{
  "scripts": {
    "test": "mocha",
    "test:watch": "mocha --watch"
  }
}
```

### Alternative Frameworks

| Stack | Framework | Setup |
|-------|-----------|-------|
| Vite projects | Vitest | `npm install -D vitest` |
| React/Meta ecosystem | Jest | `npm install -D jest` |
| Python | pytest | `pip install pytest` |
| Go | go test | Built-in |
| Ruby | RSpec | `gem install rspec` |

To use an alternative, run `/tlc:config` to configure.

### Multi-Framework Support

Projects can have multiple test frameworks. Configure in `.tlc.json`:

```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "jest"],
    "run": ["mocha", "jest"]
  },
  "commands": {
    "mocha": "npx mocha 'test/**/*.test.js'",
    "jest": "npx jest",
    "all": "npm test"
  }
}
```

When running tests, TLC will execute all frameworks in the `run` array.

### E2E Framework Configuration

Configure E2E testing in `.tlc.json`:

```json
{
  "e2e": {
    "framework": "playwright",
    "baseUrl": "http://localhost:5001",
    "command": "npx playwright test",
    "docker": true
  }
}
```

**Playwright setup** (recommended):
```bash
npm init playwright@latest
```

Creates `playwright.config.ts`:
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

**Cypress setup**:
```bash
npm install -D cypress
npx cypress open
```

**Docker E2E** (already in docker-compose.dev.yml):
```bash
docker-compose --profile test up playwright
```

Default pytest.ini (Python):
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
```

## Example Run

```
User: /tlc:build 1

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

Run E2E tests? [1] Yes [2] Skip: 1

Running E2E tests...
  ✓ user can log in with valid credentials
  ✓ user sees error for invalid password
  ✓ session persists after refresh
✅ 3 E2E tests passing

Phase 1 complete. Ready for /tlc:verify 1
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
- Suggest running `/tlc:build {phase}` again to retry
- Or manually fix and run `/tlc:status` to verify
