# /tlc:build - Build a Phase (Test-First)

Write failing tests, then implement to make them pass.

## Engineering Standards

**Code like a senior engineer with 15+ years experience.** Every line should reflect:

### Project Structure (NestJS-Style Modules)

**Group by domain entity, not by file type.** Each entity gets its own module folder:

```
src/modules/{entity}/
  ├── interfaces/                 # Types and interfaces (NEVER at module root)
  │   ├── {entity}.interface.ts
  │   └── index.ts
  ├── dto/                        # Request/Response DTOs
  │   ├── create.dto.ts
  │   └── index.ts
  ├── enums/                      # Enums (no magic strings)
  ├── constants/                  # Configuration constants
  ├── guards/                     # Auth/permission middleware
  ├── {entity}.service.ts         # Business logic
  ├── {entity}.controller.ts      # HTTP handlers
  ├── {entity}.repository.ts      # Data access
  ├── {entity}.seed.ts            # Seed data (per-entity, not monolithic)
  ├── {entity}.test.ts            # Tests
  └── index.ts                    # Barrel exports
```

**Server/src root should ONLY contain:**
- `index.ts` - Entry point
- `lib/` - Core shared libraries
- `modules/` - Feature modules
- `shared/` - Cross-cutting utilities
- Config files

**❌ NEVER do this:**
```
src/
  services/          # ❌ All services dumped together
  interfaces/        # ❌ All types dumped together
  controllers/       # ❌ Flat controller folder

server/
  auth.ts            # ❌ Loose file at root (should be modules/auth/)
  helpers.ts         # ❌ Should be in lib/ or shared/
```

**Key rules:**
- Interfaces ALWAYS in `interfaces/` subdirectory, never at module root
- No inline interfaces in service files - import from `interfaces/`
- No magic strings - use `enums/` or `constants/`
- Seeds per-entity, not one giant seeds.ts
- Every module has `index.ts` barrel export

### Code Quality
- **Clean Architecture**: Separate concerns. Domain logic never depends on infrastructure.
- **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion.
- **DRY but not premature**: Extract only after 3+ repetitions. Duplication is better than wrong abstraction.
- **Meaningful names**: Variables, functions, classes should reveal intent. No abbreviations except industry standards.
- **Small functions**: Each function does ONE thing. If you need comments to explain sections, extract them.

### Naming Conventions
- **Functions**: Verb-first (`getUser`, `validateInput`, `sendEmail`). Boolean returns: `is`, `has`, `can`, `should` prefix.
- **Variables**: Noun-based, specific (`userCount` not `count`, `emailList` not `list`).
- **Classes**: Noun, singular (`UserService` not `UsersService`).
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`).
- **Booleans**: Positive form (`isValid` not `isNotInvalid`).
- **Collections**: Plural (`users`, `orderItems`).

### Function Design
- **Guard clauses first**: Handle edge cases at the top, return early.
- **Single level of abstraction**: Don't mix high-level orchestration with low-level details.
- **Max 3 parameters**: Use options object for more. Named parameters > positional.
- **No boolean parameters**: Use enums or separate functions (`enableCache()` not `doThing(true)`).
- **Return early, return often**: Avoid deep nesting with early returns.

```typescript
// ❌ Bad: Deep nesting
function processOrder(order) {
  if (order) {
    if (order.items.length > 0) {
      if (order.status === 'pending') {
        // actual logic buried here
      }
    }
  }
}

// ✅ Good: Guard clauses
function processOrder(order) {
  if (!order) return;
  if (order.items.length === 0) return;
  if (order.status !== 'pending') return;

  // actual logic at top level
}
```

### Defensive Programming
- **Validate at boundaries**: All external input (user, API, file) gets validated immediately.
- **Fail fast**: Throw early with clear error messages. Don't let bad state propagate.
- **Handle edge cases**: null, undefined, empty arrays, empty strings, zero, negative numbers.
- **Type safety**: Use TypeScript strictly. No `any` except when interfacing with untyped libs.
- **Defensive copies**: Return copies of internal state, not references.

### Comments Philosophy
- **Explain WHY, not WHAT**: Code shows what, comments explain why.
- **No commented-out code**: Delete it. Git remembers.
- **TODO format**: `// TODO(username): description - ticket#`
- **JSDoc for public API**: Parameters, returns, throws, examples.
- **No obvious comments**: `// increment i` before `i++` is noise.

### Error Handling
- **Specific error types**: `UserNotFoundError` not generic `Error`.
- **Actionable messages**: "User 'abc123' not found" not "Not found".
- **Don't swallow errors**: Log or rethrow, never empty catch blocks.
- **Error boundaries**: Catch at appropriate level, not everywhere.
- **User vs developer errors**: Different messages for each audience.

### Logging Standards
- **Structured logging**: JSON format with consistent fields.
- **Log levels**: ERROR (failures), WARN (concerning), INFO (business events), DEBUG (troubleshooting).
- **Context**: Include request ID, user ID, relevant entity IDs.
- **No sensitive data**: Never log passwords, tokens, PII.
- **Performance**: Don't log in tight loops.

### Performance Awareness
- **O(n) thinking**: Know the complexity of your algorithms. Avoid nested loops on large datasets.
- **Lazy loading**: Don't fetch/compute until needed.
- **Caching**: Identify expensive operations and cache appropriately.
- **Database queries**: No N+1. Use joins, batch operations, proper indexes.
- **Measure, don't guess**: Profile before optimizing.

### Security First
- **Never trust input**: Sanitize, escape, parameterize.
- **Least privilege**: Functions/modules only access what they need.
- **No secrets in code**: Environment variables for all credentials.
- **Audit trail**: Log security-relevant actions.
- **Defense in depth**: Multiple layers of validation.

### Testability
- **Dependency injection**: Pass dependencies, don't import singletons.
- **Pure functions**: Same input = same output. No hidden state.
- **Mockable interfaces**: Code to interfaces, not implementations.
- **Test behavior, not implementation**: Tests shouldn't break on refactors.

### When to Break Rules
Senior engineers know when rules don't apply:
- **Performance critical paths**: Sometimes clarity yields to speed.
- **Prototypes**: Quick validation trumps perfect architecture.
- **Legacy integration**: Match existing patterns for consistency.
- **Framework conventions**: Follow framework idioms even if they conflict.

**Document WHY you broke the rule** with a comment.

## What This Does

1. **Write failing tests** for all tasks in the phase
2. **Verify tests fail** (Red)
3. **Implement code** one task at a time (Green)
4. **Verify tests pass** after each task
5. **Commit** after each passing task

This is the core TLC command. Tests before code, one task at a time.

**Overdrive Mode (Opus 4.6):** When tasks are independent, TLC auto-detects and offers parallel execution with multiple agents. Agents are assigned models based on task complexity (opus for heavy, sonnet for standard, haiku for light). Failed agents can be resumed. No arbitrary cap on agent count.

## Usage

```
/tlc:build <phase_number>
/tlc:build <phase_number> --sequential      # Force sequential mode
/tlc:build <phase_number> --model sonnet    # Force all agents to use sonnet
/tlc:build <phase_number> --model haiku     # Force all agents to use haiku (fast/cheap)
/tlc:build <phase_number> --max-turns 30    # Limit agent execution length
/tlc:build <phase_number> --agents 5        # Limit parallel agents to 5
```

## Process

### Step 1: Load Plans

Read all `.planning/phases/{phase}-*-PLAN.md` files for this phase.

### Step 1a: Overdrive Detection (Auto-Parallel, Opus 4.6)

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
5. Estimate task complexity for model assignment (heavy/standard/light)

**If 2+ independent tasks found:**
```
🚀 Overdrive Mode Available (Opus 4.6)

Phase 3 has 4 independent tasks that can run in parallel:
  - Task 1: Create user schema          [opus]   (heavy)
  - Task 2: Add validation helpers      [sonnet] (standard)
  - Task 3: Write migration scripts     [sonnet] (standard)
  - Task 4: Create seed data            [haiku]  (light)

Recommended: 4 agents (one per independent task)

Options:
1) Overdrive mode (parallel agents) [Recommended]
2) Sequential mode (one task at a time)
3) Let me pick which tasks to parallelize
```

**Model auto-selection per task complexity:**
| Complexity | Model | When |
|-----------|-------|------|
| Heavy | opus | Architecture, multi-file features, security, auth, database |
| Standard | sonnet | Normal implementation tasks (default) |
| Light | haiku | Config, boilerplate, DTOs, enums, constants, seed data |

Override with `--model sonnet` to force all agents to the same model.

**Router-aware model selection:**
Before assigning models, check `.tlc.json` for `router.providers` and `router.capabilities`. If the project has a router config, respect it:
- Use configured providers for their assigned capabilities (e.g., Gemini for design tasks)
- Fall back to the complexity table above only when no router config exists
- Run `/tlc:llm status` to see current routing

**If tasks have dependencies (waterfall):**
```
📋 Sequential Mode

Phase 3 tasks have dependencies:
  Task 2 depends on Task 1
  Task 3 depends on Task 2

Running in sequential order.
```

### Step 1b: Execute Overdrive (if selected) — Opus 4.6 Multi-Agent

When overdrive mode is selected, spawn parallel agents with per-task model selection:

```
🚀 Launching Overdrive Mode (Opus 4.6)

Spawning 4 agents in parallel...

Agent 1: Task 1 - Create user schema          [opus]
Agent 2: Task 2 - Add validation helpers      [sonnet]
Agent 3: Task 3 - Write migration scripts     [sonnet]
Agent 4: Task 4 - Create seed data            [haiku]

[All agents spawned - working in background]
```

**Agent execution rules:**
- One agent per independent task (no arbitrary cap)
- Model assigned per task complexity (override with `--model`)
- Agents work autonomously (no confirmation prompts)
- Each agent commits after completing their task
- All agents follow test-first methodology
- `max_turns` limits execution length (default: 50, override with `--max-turns`)

**CRITICAL: Spawn all agents in a SINGLE message using multiple Task tool calls.**

```
Task(description="Agent 1: Task 1", prompt="...", subagent_type="general-purpose", model="opus", max_turns=50, run_in_background=true)
Task(description="Agent 2: Task 2", prompt="...", subagent_type="general-purpose", model="sonnet", max_turns=50, run_in_background=true)
Task(description="Agent 3: Task 3", prompt="...", subagent_type="general-purpose", model="sonnet", max_turns=50, run_in_background=true)
Task(description="Agent 4: Task 4", prompt="...", subagent_type="general-purpose", model="haiku", max_turns=50, run_in_background=true)
```

**Live Progress Monitoring (TaskOutput):**

Use `TaskOutput` with `block=false` for non-blocking progress checks:

```
TaskOutput(task_id="AGENT_ID_1", block=false, timeout=5000)
TaskOutput(task_id="AGENT_ID_2", block=false, timeout=5000)
```

Or use the AgentProgressMonitor for formatted status:

```bash
node -e "
const { AgentProgressMonitor } = require('./server/lib/agent-progress-monitor.js');
const monitor = new AgentProgressMonitor('/tmp/claude-1000/-mnt-c-Code-TLC/tasks');
const agents = ['AGENT_ID_1', 'AGENT_ID_2', 'AGENT_ID_3', 'AGENT_ID_4'];
console.log(monitor.formatTable(agents));
"
```

Display format:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 OVERDRIVE STATUS (Opus 4.6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Agent | Task | Model | Tests | Phase |
|-------|------|-------|-------|-------|
| a1b2c3 | User Schema | opus | 29 ✓ | committed |
| d4e5f6 | Validation | sonnet | 18 ✓ | implementing |
| g7h8i9 | Migrations | sonnet | - | writing-tests |
| j0k1l2 | Seed Data | haiku | 5 ✓ | committed |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Handling Agent Failures (Opus 4.6 Resumption):**

If an agent fails or gets stuck:

```
# Check if agent is stuck (non-blocking)
TaskOutput(task_id="AGENT_ID", block=false, timeout=5000)

# Cancel a stuck agent
TaskStop(task_id="AGENT_ID")

# Resume a failed agent from where it left off (full context preserved)
Task(resume="AGENT_ID", prompt="Continue from where you left off. Fix any errors and complete the task.")
```

**Show status automatically:**
- When receiving agent progress notifications
- When user asks "check on agents"
- After each agent completes

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
4. **File Size** - No file exceeds 1000 lines (warning at 500+)
5. **Folder Size** - No folder exceeds 15 files (warning at 8+)
6. **Strict Typing** - No `any` types in new/changed files
7. **Return Types** - All exported functions have explicit return types
8. **Module Structure** - Files grouped by domain entity, not by type

**Review output:**

```
───────────────────────────────
🔍 Auto-Review Results

Test Coverage: ✅ 5/5 files covered
TDD Score: 75% ✅
Security: ✅ No issues
File Sizes: ✅ All under 1000 lines
Folder Sizes: ✅ All under 15 files
Strict Typing: ✅ No `any` found
Return Types: ✅ All exports typed

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

File Sizes: ⚠️ 1 file over limit
└── src/api/users.controller.ts (1,247 lines) → split by feature

Strict Typing: ❌ 3 `any` types found
├── src/api/users.controller.ts:45 → define interface
├── src/api/users.controller.ts:89 → use `unknown`
└── src/services/email.ts:12 → define `EmailOptions` interface

Return Types: ⚠️ 2 exported functions missing return types
├── src/utils/helpers.ts:getConfig() → add `: AppConfig`
└── src/utils/helpers.ts:parseInput() → add `: ParsedInput`

Verdict: ❌ CHANGES REQUESTED

⚠️ Phase cannot complete until issues are fixed.
───────────────────────────────
```

**Actions on failure:**
1. Add missing test files
2. Fix security issues
3. Split oversized files (>1000 lines) into focused sub-modules
4. Replace `any` types with proper interfaces or `unknown`
5. Add explicit return types to all exported functions
6. Re-run `/tlc:build {phase}` to retry

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

### Overdrive Mode (Independent Tasks, Opus 4.6)

```
User: /tlc:build 2

Claude: Loading phase 2 plans...
Found: 2-PLAN.md (4 tasks)

🚀 Overdrive Mode Available (Opus 4.6)

Phase 2 has 4 independent tasks:
  - Task 1: Create API routes         [sonnet] (standard)
  - Task 2: Add input validation      [sonnet] (standard)
  - Task 3: Write error handlers      [sonnet] (standard)
  - Task 4: Add rate limiting config  [haiku]  (light)

Recommended: 4 agents (one per task)

Options:
1) Overdrive mode (parallel) [Recommended]
2) Sequential mode
3) Pick tasks to parallelize

User: 1

Claude: 🚀 Launching Overdrive Mode (Opus 4.6)

Spawning 4 agents...
[Agent 1] Task 1: Create API routes        [sonnet] - STARTED
[Agent 2] Task 2: Add input validation     [sonnet] - STARTED
[Agent 3] Task 3: Write error handlers     [sonnet] - STARTED
[Agent 4] Task 4: Add rate limiting config [haiku]  - STARTED

... agents working in background ...

[Agent 4] ✅ Task 4 complete (1 commit)   [haiku - fast]
[Agent 2] ✅ Task 2 complete (3 commits)  [sonnet]
[Agent 1] ✅ Task 1 complete (4 commits)  [sonnet]
[Agent 3] ✅ Task 3 complete (2 commits)  [sonnet]

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

**Overdrive mode issues (Opus 4.6):**
- Agent stuck → Check with `TaskOutput(task_id, block=false)`, cancel with `TaskStop(task_id)`
- Agent failed → Resume with `Task(resume=agent_id)` to continue from where it left off
- Merge conflicts → Agents working on same files (rare if tasks are truly independent)
- One agent failed → Other agents continue; resume failed agent or fix manually
- Want sequential instead → Use `--sequential` flag: `/tlc:build 2 --sequential`
- Cost too high → Use `--model haiku` to force all agents to haiku
- Agent running too long → Use `--max-turns 30` to limit execution

## Flags

| Flag | Description |
|------|-------------|
| `--sequential` | Force sequential execution even if tasks are independent |
| `--agents N` | Limit parallel agents to N (default: one per independent task) |
| `--model MODEL` | Force all agents to use a specific model (opus, sonnet, haiku) |
| `--max-turns N` | Limit each agent's execution to N turns (default: 50) |

## When Overdrive is NOT Used

Overdrive auto-detects but won't activate when:
- Only 1 task in phase
- All tasks have dependencies (waterfall)
- Tasks modify the same files
- User passes `--sequential`
