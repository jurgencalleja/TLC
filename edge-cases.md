# /tlc:edge-cases - Generate Edge Case Tests

AI-generated edge case tests based on code analysis.

## Usage

```
/tlc:edge-cases [file-or-function]
```

If no target specified, analyzes current phase tasks.

## What This Does

1. Analyzes function signatures and logic
2. Identifies potential edge cases
3. Generates test code for each edge case
4. Optionally runs to verify they fail (Red phase)

## Process

### Step 1: Analyze Target Code

Read the function/file and extract:
- Parameter types and constraints
- Conditional branches
- Loop boundaries
- Error handling paths
- External dependencies

Example function:
```typescript
async function login(email: string, password: string): Promise<User> {
  if (!email || !password) {
    throw new ValidationError('Email and password required');
  }

  const user = await db.findUserByEmail(email);
  if (!user) {
    throw new AuthError('User not found');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid password');
  }

  return user;
}
```

### Step 2: Generate Edge Cases

| Category | Edge Case | Test Description |
|----------|-----------|------------------|
| **Null/Undefined** | `email = null` | Should throw ValidationError |
| **Null/Undefined** | `password = undefined` | Should throw ValidationError |
| **Empty** | `email = ""` | Should throw ValidationError |
| **Empty** | `password = ""` | Should throw ValidationError |
| **Format** | `email = "not-an-email"` | Should throw ValidationError |
| **Format** | `email = "a@b"` | Minimal valid email - should work |
| **Whitespace** | `email = "  user@test.com  "` | Should trim or reject |
| **Case** | `email = "USER@TEST.COM"` | Should be case-insensitive |
| **Special Chars** | `email = "user+tag@test.com"` | Plus addressing valid |
| **Unicode** | `email = "用户@test.com"` | International email |
| **Length** | `password = "a"` | Too short - should reject |
| **Length** | `password = "a".repeat(1000)` | Very long - should handle |
| **SQL Injection** | `email = "'; DROP TABLE users;--"` | Should be safe |
| **XSS** | `email = "<script>alert(1)</script>"` | Should escape |
| **Not Found** | Valid email, user doesn't exist | Should throw AuthError |
| **Wrong Password** | Valid email, wrong password | Should throw AuthError |
| **Timing** | Multiple rapid attempts | Rate limiting check |
| **Async** | DB timeout | Should handle gracefully |

### Step 3: Generate Test Code

```javascript
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('login - edge cases', () => {
  let login, dbStub, bcryptStub;

  beforeEach(() => {
    dbStub = { findUserByEmail: sinon.stub() };
    bcryptStub = { compare: sinon.stub() };
    login = proxyquire('../src/auth/login', {
      './db': dbStub,
      'bcrypt': bcryptStub
    });
  });

  afterEach(() => sinon.restore());

  describe('null/undefined inputs', () => {
    it('throws ValidationError when email is null', async () => {
      await expect(login(null, 'password'))
        .to.be.rejectedWith('Email and password required');
    });

    it('throws ValidationError when email is undefined', async () => {
      await expect(login(undefined, 'password'))
        .to.be.rejectedWith('Email and password required');
    });

    it('throws ValidationError when password is null', async () => {
      await expect(login('user@test.com', null))
        .to.be.rejectedWith('Email and password required');
    });

    it('throws ValidationError when password is undefined', async () => {
      await expect(login('user@test.com', undefined))
        .to.be.rejectedWith('Email and password required');
    });
  });

  describe('empty inputs', () => {
    it('throws ValidationError when email is empty string', async () => {
      await expect(login('', 'password'))
        .to.be.rejectedWith('Email and password required');
    });

    it('throws ValidationError when password is empty string', async () => {
      await expect(login('user@test.com', ''))
        .to.be.rejectedWith('Email and password required');
    });
  });

  describe('email format edge cases', () => {
    it('accepts minimal valid email (a@b)', async () => {
      dbStub.findUserByEmail.resolves({ passwordHash: 'hash' });
      bcryptStub.compare.resolves(true);

      const result = await login('a@b', 'password');
      expect(result).to.exist;
    });

    it('accepts email with plus addressing (user+tag@test.com)', async () => {
      dbStub.findUserByEmail.resolves({ passwordHash: 'hash' });
      bcryptStub.compare.resolves(true);

      await expect(login('user+tag@test.com', 'password'))
        .to.not.be.rejected;
    });

    it('handles email with leading/trailing whitespace', async () => {
      dbStub.findUserByEmail.resolves({ passwordHash: 'hash' });
      bcryptStub.compare.resolves(true);

      // Should either trim or reject consistently
      await login('  user@test.com  ', 'password');
      expect(dbStub.findUserByEmail).to.have.been.calledWith('user@test.com');
    });

    it('handles email case-insensitively', async () => {
      dbStub.findUserByEmail.resolves({ passwordHash: 'hash' });
      bcryptStub.compare.resolves(true);

      await login('USER@TEST.COM', 'password');
      expect(dbStub.findUserByEmail).to.have.been.calledWith('user@test.com');
    });
  });

  describe('security edge cases', () => {
    it('safely handles SQL injection attempt in email', async () => {
      dbStub.findUserByEmail.resolves(null);

      await expect(login("'; DROP TABLE users;--", 'password'))
        .to.be.rejectedWith('User not found');

      // Verify the malicious string was passed as-is, not executed
      expect(dbStub.findUserByEmail).to.have.been.calledWith("'; DROP TABLE users;--");
    });

    it('safely handles XSS attempt in email', async () => {
      dbStub.findUserByEmail.resolves(null);

      await expect(login('<script>alert(1)</script>@test.com', 'password'))
        .to.be.rejectedWith('User not found');
    });
  });

  describe('password edge cases', () => {
    it('rejects very short password', async () => {
      await expect(login('user@test.com', 'a'))
        .to.be.rejectedWith(/too short|minimum/i);
    });

    it('handles very long password', async () => {
      dbStub.findUserByEmail.resolves({ passwordHash: 'hash' });
      bcryptStub.compare.resolves(true);

      const longPassword = 'a'.repeat(1000);
      await expect(login('user@test.com', longPassword))
        .to.not.be.rejected;
    });
  });

  describe('async/error edge cases', () => {
    it('handles database timeout gracefully', async () => {
      dbStub.findUserByEmail.rejects(new Error('Connection timeout'));

      await expect(login('user@test.com', 'password'))
        .to.be.rejectedWith('Connection timeout');
    });

    it('handles database connection error', async () => {
      dbStub.findUserByEmail.rejects(new Error('ECONNREFUSED'));

      await expect(login('user@test.com', 'password'))
        .to.be.rejected;
    });
  });
});
```

### Step 4: Review and Customize

Present generated tests for review:

```
Generated 18 edge case tests for login()

Categories:
  ├── Null/Undefined: 4 tests
  ├── Empty inputs: 2 tests
  ├── Format: 4 tests
  ├── Security: 2 tests
  ├── Boundaries: 2 tests
  └── Async/Error: 4 tests

Preview:
  1. ✓ throws when email is null
  2. ✓ throws when password is undefined
  3. ✓ accepts email with plus addressing
  ...

Actions:
  1) Write all tests to tests/auth/login.edge-cases.test.js
  2) Select specific tests to include
  3) Preview full test code
  4) Cancel

Choice:
```

### Step 5: Write Tests

Save to appropriate test file:

```
Writing edge case tests...

Created: tests/auth/login.edge-cases.test.js (18 tests)

Run tests? (Y/n) y

Running tests...
  ✓ 12 passing
  ✗ 6 failing (expected - edge cases not handled yet)

Failing tests reveal missing handling:
  - No email trimming
  - No case normalization
  - No minimum password length check
  - No rate limiting

These are now documented test cases to implement.
```

## Edge Case Patterns

### Standard Patterns (Always Check)

| Pattern | Examples |
|---------|----------|
| **Null/Undefined** | `null`, `undefined` |
| **Empty** | `""`, `[]`, `{}` |
| **Whitespace** | `"  "`, `"\t"`, `"\n"` |
| **Type Mismatch** | Number as string, object as array |
| **Boundaries** | 0, -1, MAX_INT, empty, single item |
| **Unicode** | Emojis, CJK characters, RTL text |
| **Special Chars** | `<>'"&;/\` |
| **Injection** | SQL, XSS, command injection patterns |

### Domain-Specific Patterns

**Strings:**
- Very long (>1000 chars)
- Single character
- Only whitespace
- Only special characters

**Numbers:**
- Zero, negative, very large
- Decimal precision issues
- NaN, Infinity

**Arrays:**
- Empty, single item, very large
- Nested arrays
- Mixed types

**Dates:**
- Past, future, epoch
- Timezones, DST
- Invalid dates (Feb 30)

**Files:**
- Empty, very large
- Binary vs text
- Missing, permissions

## Configuration

In `.tlc.json`:

```json
{
  "edgeCases": {
    "patterns": ["null", "empty", "boundary", "security", "async"],
    "customPatterns": [
      {
        "name": "currency",
        "values": [0, 0.001, 0.009, 999999.99, -1]
      }
    ],
    "outputDir": "tests/edge-cases",
    "runAfterGenerate": true
  }
}
```

## Notes

- Generated tests may reveal bugs (that's the point!)
- Review tests before committing - some may be invalid
- Use with `/tlc:quality` to track edge case coverage
- Re-run after significant code changes
