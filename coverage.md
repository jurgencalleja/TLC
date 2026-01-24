# /tdd:coverage - Analyze Test Coverage Gaps

Scan existing code, identify what's untested, and offer to write retrospective tests.

## When to Use

- After `/tdd:init` to add tests to existing code
- Anytime you want to improve test coverage
- When joining a project to understand test gaps
- After "vibe coding" a feature without tests

## Process

### 1. Detect Test Framework

Identify the test setup:
- Framework: vitest, jest, pytest, go test, rspec, cargo test
- Test directory: `tests/`, `__tests__/`, `spec/`, etc.
- Test patterns: `*.test.ts`, `*_test.py`, etc.

If no test framework found, suggest running `/tdd:init` first.

### 2. Scan Source Files

Identify all source files:
- `src/**/*`, `lib/**/*`, `app/**/*`, `pkg/**/*`
- Exclude: node_modules, vendor, dist, build, .git

Categorize by type:
- **API/Routes**: files handling HTTP endpoints
- **Services**: business logic modules
- **Components**: UI components (React, Vue, etc.)
- **Utils**: helper functions
- **Models**: data structures, schemas
- **Config**: configuration files (skip testing)

### 3. Match Tests to Source

For each source file, look for corresponding test:
- `src/auth/login.ts` → `tests/auth/login.test.ts` or `src/auth/login.test.ts`
- `lib/utils.py` → `tests/test_utils.py` or `tests/utils_test.py`
- `pkg/api/handler.go` → `pkg/api/handler_test.go`

### 4. Identify Critical Paths

Flag high-priority untested code:
- **Auth**: login, logout, session, token, password, oauth
- **Payments**: payment, billing, charge, subscription, stripe, checkout
- **Data mutations**: create, update, delete, save, remove
- **Security**: validate, sanitize, permission, role, access

### 5. Present Coverage Analysis

```
Test Coverage Analysis

Source files: 24
Test files: 8
Coverage: 33% (8/24 files have tests)

Tested:
  ✓ src/utils/format.ts (src/utils/format.test.ts)
  ✓ src/api/health.ts (tests/api/health.test.ts)
  ... [list all]

Untested - Critical:
  ✗ src/services/payment.ts - Stripe integration, checkout flow
  ✗ src/api/auth.ts - login, session management
  ✗ src/middleware/auth.ts - JWT validation

Untested - High Priority:
  ✗ src/api/users.ts - user CRUD operations
  ✗ src/services/email.ts - transactional emails

Untested - Standard:
  ✗ src/utils/helpers.ts - utility functions
  ✗ src/components/Header.tsx - navigation component
  ... [list all]
```

### 6. Offer Retrospective Test Writing

Ask the user:

```
Would you like to write tests for existing code?

1) Yes - critical paths only (fastest)
2) Yes - critical + high priority
3) Yes - everything untested
4) No - just wanted the report
```

**If tests requested:**

Create `.planning/TEST-BACKLOG.md`:

```markdown
# Test Backlog

Generated: [date]
Coverage before: 33% (8/24)

## Critical (auth, payments, security)
- [ ] src/services/payment.ts - Stripe integration
- [ ] src/api/auth.ts - login/logout flows
- [ ] src/middleware/auth.ts - JWT validation

## High Priority (data mutations, core logic)
- [ ] src/api/users.ts - CRUD operations
- [ ] src/services/email.ts - email sending

## Standard (utils, components, helpers)
- [ ] src/utils/helpers.ts
- [ ] src/components/Header.tsx
```

Then ask:
```
Start writing tests now?

1) Yes - begin with first critical item
2) No - I'll run /tdd:build backlog later
```

**If "Yes":**

For each file, write tests that capture current behavior:
1. Read the source file
2. Identify exported functions/classes
3. Write tests for each public interface
4. Run tests to verify they pass (code already exists)
5. Mark item complete in backlog

### 7. Report Summary

```
Coverage analysis complete.

Before: 33% (8/24 files)
Backlog created: .planning/TEST-BACKLOG.md
  - Critical: 3 files
  - High priority: 2 files
  - Standard: 11 files

Run /tdd:build backlog to start writing tests.
```

## Usage

```
/tdd:coverage
```

No arguments needed. Scans entire codebase.
