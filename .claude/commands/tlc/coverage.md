# /tlc:coverage - Analyze Test Coverage Gaps

Scan existing code, identify what's untested, and offer to write retrospective tests.

## When to Use

- After `/tlc:init` to add tests to existing code
- Anytime you want to improve test coverage
- When joining a project to understand test gaps
- After "vibe coding" a feature without tests

## Process

### 1. Detect Test Framework

Identify the test setup:
- Framework: vitest, jest, pytest, go test, rspec, cargo test
- Test directory: `tests/`, `__tests__/`, `spec/`, etc.
- Test patterns: `*.test.ts`, `*_test.py`, etc.

If no test framework found, suggest running `/tlc:init` first.

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
2) No - I'll run /tlc:build backlog later
```

**If "Yes":**

Write tests one file at a time with verification and commits.

#### For each file in the backlog (sequentially):

**a) Plan tests for this file**

Read the source file and create test plan:
```markdown
## File: src/services/payment.ts

### Exports:
- createCharge(amount, customerId)
- refundCharge(chargeId)
- getPaymentHistory(customerId)

### Test cases:
| Function | Test | Type |
|----------|------|------|
| createCharge | creates charge for valid customer | happy path |
| createCharge | rejects negative amount | edge case |
| createCharge | handles Stripe API error | error |
| refundCharge | refunds existing charge | happy path |
| refundCharge | fails for invalid chargeId | error |
```

**b) Write test file**

Create tests that capture current behavior:
```typescript
import { describe, it, expect } from 'vitest'
import { createCharge, refundCharge } from '../src/services/payment'

describe('createCharge', () => {
  it('creates charge for valid customer', async () => {
    const result = await createCharge(1000, 'cust_123')
    expect(result.id).toBeDefined()
    expect(result.amount).toBe(1000)
  })

  it('rejects negative amount', async () => {
    await expect(createCharge(-100, 'cust_123'))
      .rejects.toThrow()
  })
})
```

**c) Run tests for this file**

```bash
npm test -- tests/services/payment.test.ts
```

Verify:
- ✅ Tests PASS (code already exists)
- ❌ If tests fail, investigate — either test is wrong or found a bug

**d) Commit this test file**

```bash
git add tests/services/payment.test.ts
git commit -m "test: add payment service tests"
```

**e) Update backlog**

Mark item complete in `.planning/TEST-BACKLOG.md`:
```markdown
- [x] src/services/payment.ts - payment processing logic ✅
```

**f) Move to next file**

Repeat a-e for each file in the backlog.

### 7. Report Summary

```
Coverage analysis complete.

Before: 33% (8/24 files)
Backlog created: .planning/TEST-BACKLOG.md
  - Critical: 3 files
  - High priority: 2 files
  - Standard: 11 files

Run /tlc:build backlog to start writing tests.
```

## Usage

```
/tlc:coverage
```

No arguments needed. Scans entire codebase.
