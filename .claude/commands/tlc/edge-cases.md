# /tlc:edge-cases - Generate Edge Case Tests

Analyze code and generate comprehensive edge case tests to improve test coverage.

## What This Does

1. Analyzes target file/function
2. Identifies parameter types
3. Generates edge cases by category
4. Presents selection interface
5. Writes tests to appropriate file

## Usage

```
/tlc:edge-cases [file_path] [function_name]
```

If no arguments, prompts for target.

## Process

### Step 1: Identify Target

If no path provided, ask:

```
Generate edge cases for:

1) A specific file - enter path
2) A specific function - enter file:function
3) Current phase tests - analyze phase plan

Choice:
```

### Step 2: Parse Target Code

Read and parse the target to extract:
- Function names
- Parameter names
- Parameter types (from TypeScript or inference)
- Async status

### Step 3: Generate Edge Cases

For each parameter type, generate appropriate edge cases:

**String Parameters:**
- `null` - null check
- `undefined` - undefined check
- `''` - empty string
- `'   '` - whitespace only
- Very long string (10,000 chars)

**Number Parameters:**
- `null` / `undefined`
- `0` - zero
- `-1` - negative
- `Number.MAX_SAFE_INTEGER`
- `NaN`
- `Infinity`

**Array Parameters:**
- `null` / `undefined`
- `[]` - empty array
- Single element
- 1000+ elements

**Security (String Inputs):**
- SQL injection: `'; DROP TABLE users; --`
- XSS: `<script>alert('xss')</script>`
- Path traversal: `../../../etc/passwd`
- Template injection: `{{7*7}}`

### Step 4: Display Summary

```
Edge Case Analysis
══════════════════

Functions: 2
Edge Cases: 24

By Category:
  null-check: 4
  undefined-check: 4
  empty-string: 2
  boundary: 8
  security: 6

Functions:
  validateEmail(email) - 12 edge cases
  formatName(first, last) - 12 edge cases

Generate tests? (Y/n)
```

### Step 5: Selection Interface

```
Select edge cases to generate:

null-check:
  [1] handles null email
  [2] handles null first name

boundary:
  [3] handles zero-length input
  [4] handles very long input

security:
  [5] rejects SQL injection
  [6] rejects XSS payload

[A] All - Generate all edge cases
[N] None - Cancel

Selection (comma-separated, e.g., 1,3,5):
```

### Step 6: Generate Test Code

For each selected edge case, generate test:

```typescript
it('handles null email', () => {
  expect(() => validateEmail(null)).toThrow();
});

it('rejects SQL injection', () => {
  expect(() => validateEmail("'; DROP TABLE users; --")).toThrow();
});
```

### Step 7: Write to Test File

Append to existing test file or create new one:

```
Generated tests written to:
  tests/validate.test.ts (8 new tests)

Run tests? (Y/n)
```

### Step 8: Run Tests (Optional)

If user chooses to run:

```bash
npm test -- tests/validate.test.ts
```

Expected: Most edge case tests will FAIL initially (Red phase).
This is correct - you now write code to make them pass.

## Edge Case Categories

| Category | Description | Example Input |
|----------|-------------|---------------|
| null-check | Null value handling | `null` |
| undefined-check | Undefined handling | `undefined` |
| empty-string | Empty string handling | `''` |
| whitespace | Whitespace-only | `'   '` |
| boundary | Edge values | `0`, `-1`, `MAX_INT` |
| large-input | Very large values | 10KB string, 1000 items |
| security | Malicious input | SQL injection, XSS |

## Configuration

In `.tlc.json`:

```json
{
  "edgeCases": {
    "patterns": ["null-check", "boundary", "security"],
    "maxPerFunction": 20,
    "includeSecurity": true
  }
}
```

## Example Session

```
User: /tlc:edge-cases src/auth/validate.ts

Claude: Analyzing src/auth/validate.ts...

Edge Case Analysis
══════════════════

Functions: 1
Edge Cases: 14

Function: validateLogin(email: string, password: string)

By Category:
  null-check: 2
  undefined-check: 2
  empty-string: 2
  whitespace: 2
  security: 6

Generate all 14 tests? (Y/n)

User: y

Claude: Generating tests...

Created: tests/auth/validate.edge-cases.test.ts

  ✓ handles null email
  ✓ handles null password
  ✓ handles undefined email
  ✓ handles undefined password
  ✓ handles empty email
  ✓ handles empty password
  ✓ handles whitespace email
  ✓ handles whitespace password
  ✓ rejects SQL injection in email
  ✓ rejects SQL injection in password
  ✓ rejects XSS in email
  ✓ rejects XSS in password
  ✓ rejects path traversal
  ✓ rejects template injection

Run tests now?
1) Yes - expect failures (Red phase)
2) No - I'll run later

User: 1

Claude: Running tests...

  14 tests, 12 failing, 2 passing

This is expected! The failing tests show gaps in your error handling.
Fix them using /tlc:build or implement manually.
```
