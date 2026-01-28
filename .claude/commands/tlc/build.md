# /tlc:build - Build a Phase (Test-First)

Write failing tests, then implement to make them pass.

## What This Does

1. **Write failing tests** for all tasks in the phase
2. **Verify tests fail** (Red)
3. **Implement code** one task at a time (Green)
4. **Verify tests pass** after each task
5. **Commit** after each passing task

This is the core TLC command. Tests before code, one task at a time.

**Overdrive Mode:** When tasks are independent, TLC auto-detects and offers parallel execution with multiple agents.

## Usage

```
/tlc:build <phase_number>
/tlc:build <phase_number> --sequential   # Force sequential mode
```

## Process

### Step 1: Load Plans

Read all `.planning/phases/{phase}-*-PLAN.md` files for this phase.

### Step 1a: Overdrive Detection (Auto-Parallel)

After loading plans, analyze task dependencies to determine if parallel execution is possible.

**Check for dependencies:**
```javascript
// Patterns that indicate dependencies:
// - "depends on task N"
// - "after task N"
// - "requires task N"
// - "blocked by task N"
// - "## Dependencies" section with task relationships
```

**Decision logic:**
1. Parse all tasks from plan
2. Look for dependency markers in task descriptions
3. Check "## Dependencies" section if present
4. Identify independent tasks (no dependencies)

**If 2+ independent tasks found:**
```
🚀 Overdrive Mode Available

Phase 3 has 4 independent tasks that can run in parallel:
  - Task 1: Create user schema
  - Task 2: Add validation helpers
  - Task 3: Write migration scripts
  - Task 4: Create seed data

Recommended: 3 agents (optimal parallelism)

Options:
1) Overdrive mode (parallel agents) [Recommended]
2) Sequential mode (one task at a time)
3) Let me pick which tasks to parallelize
```

**If tasks have dependencies (waterfall):**
```
📋 Sequential Mode

Phase 3 tasks have dependencies:
  Task 2 depends on Task 1
  Task 3 depends on Task 2

Running in sequential order.
```

### Step 1b: Execute Overdrive (if selected)

When overdrive mode is selected, spawn parallel agents:

```
🚀 Launching Overdrive Mode

Spawning 3 agents in parallel...

Agent 1: Task 1 - Create user schema
Agent 2: Task 2 - Add validation helpers
Agent 3: Task 3 - Write migration scripts

[All agents spawned - working in background]
[Task 4 queued for next available agent]
```

**Agent execution rules:**
- Each agent gets one task
- Agents work autonomously (no confirmation prompts)
- Each agent commits after completing their task
- When an agent finishes, it can pick up queued tasks
- All agents follow test-first methodology

**CRITICAL: Spawn all agents in a SINGLE message using multiple Task tool calls.**

```
Task(description="Agent 1: Task 1", prompt="...", subagent_type="gsd-executor", run_in_background=true)
Task(description="Agent 2: Task 2", prompt="...", subagent_type="gsd-executor", run_in_background=true)
Task(description="Agent 3: Task 3", prompt="...", subagent_type="gsd-executor", run_in_background=true)
```

**After all agents complete:**
1. Run full test suite
2. Verify all tasks pass
3. Report results
4. Continue to Step 8 (verification)

### Step 1c: Sync and Claim (Multi-User, Sequential Only)

**Note:** Skip this step if using Overdrive mode - agents handle claiming automatically.

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

### Step 10: Auto-Review (Mandatory)

**This step runs automatically. Do not skip.**

Before completing the phase, run a full code review:

```bash
# Review current branch vs main
git diff --name-status main...HEAD
```

**Checks performed:**

1. **Test Coverage** - Every implementation file has a test file
2. **TDD Compliance** - Commits show test-first pattern (score ≥ 50%)
3. **Security Scan** - No hardcoded secrets, eval(), innerHTML, etc.

**Review output:**

```
───────────────────────────────
🔍 Auto-Review Results

Test Coverage: ✅ 5/5 files covered
TDD Score: 75% ✅
Security: ✅ No issues

Verdict: ✅ APPROVED
───────────────────────────────
```

**If review fails:**

```
───────────────────────────────
🔍 Auto-Review Results

Test Coverage: ❌ 2 files missing tests
├── src/utils.js → needs src/utils.test.js
└── src/helpers.js → needs src/helpers.test.js

TDD Score: 25% ❌ (target: 50%)
Security: ❌ 1 high severity issue
└── Hardcoded password in src/config.js

Verdict: ❌ CHANGES REQUESTED

⚠️ Phase cannot complete until issues are fixed.
───────────────────────────────
```

**Actions on failure:**
1. Add missing test files
2. Fix security issues
3. Re-run `/tlc:build {phase}` to retry

**CRITICAL: Phase is NOT complete until review passes.**

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

Default pytest.ini (Python):
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
```

## Example Run

### Sequential Mode (Tasks with Dependencies)

```
User: /tlc:build 1

Claude: Loading phase 1 plans...
Found: 1-PLAN.md (3 tasks)

📋 Sequential Mode
Task 2 depends on Task 1, Task 3 depends on Task 2.
Running in sequential order.

Checking test framework... Vitest detected.

Writing tests for Task 1: User schema...
Created: tests/db/schema.test.ts (4 tests)
❌ Tests failing (expected)
Committed: test: add schema tests (red)

Implementing Task 1: User schema...
✅ tests/db/schema.test.ts passing
Committed: feat: user schema - phase 1

Writing tests for Task 2: Validation...
[continues sequentially...]

Phase 1 complete. Ready for /tlc:verify 1
```

### Overdrive Mode (Independent Tasks)

```
User: /tlc:build 2

Claude: Loading phase 2 plans...
Found: 2-PLAN.md (4 tasks)

🚀 Overdrive Mode Available

Phase 2 has 4 independent tasks:
  - Task 1: Create API routes
  - Task 2: Add input validation
  - Task 3: Write error handlers
  - Task 4: Add rate limiting

Recommended: 3 agents

Options:
1) Overdrive mode (parallel) [Recommended]
2) Sequential mode
3) Pick tasks to parallelize

User: 1

Claude: 🚀 Launching Overdrive Mode

Spawning 3 agents...
[Agent 1] Task 1: Create API routes - STARTED
[Agent 2] Task 2: Add input validation - STARTED
[Agent 3] Task 3: Write error handlers - STARTED
[Queued] Task 4: Add rate limiting

... agents working in background ...

[Agent 2] ✅ Task 2 complete (3 commits)
[Agent 2] Task 4: Add rate limiting - STARTED
[Agent 1] ✅ Task 1 complete (4 commits)
[Agent 3] ✅ Task 3 complete (2 commits)
[Agent 2] ✅ Task 4 complete (2 commits)

All agents complete. Running full test suite...
✅ 24 tests passing

Phase 2 complete. Ready for /tlc:verify 2
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

**Overdrive mode issues:**
- Agent stuck → Check with `TaskOutput` tool
- Merge conflicts → Agents working on same files (rare if tasks are truly independent)
- One agent failed → Other agents continue; fix failed task manually
- Want sequential instead → Use `--sequential` flag: `/tlc:build 2 --sequential`

## Flags

| Flag | Description |
|------|-------------|
| `--sequential` | Force sequential execution even if tasks are independent |
| `--agents N` | Set max parallel agents (default: 3, max: 10) |

## When Overdrive is NOT Used

Overdrive auto-detects but won't activate when:
- Only 1 task in phase
- All tasks have dependencies (waterfall)
- Tasks modify the same files
- User passes `--sequential`
