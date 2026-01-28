# /tlc:quality - Analyze Test Quality

Calculate and display test quality score with coverage analysis, edge case detection, and recommendations.

## What This Does

1. Runs coverage analysis
2. Scans test files for edge case patterns
3. Calculates weighted quality score
4. Generates recommendations for improvement
5. Creates QUALITY.md report

## Usage

```
/tlc:quality
```

## Process

### Step 1: Run Coverage

Execute test suite with coverage:

```bash
npm run test:coverage
```

If no coverage script exists, suggest running `/tlc:init` first.

### Step 2: Parse Coverage Data

Read coverage from:
- `coverage/coverage-final.json` (Vitest/Istanbul)
- `coverage-summary.json` (Istanbul summary)

Extract:
- Lines coverage %
- Branches coverage %
- Functions coverage %
- Statements coverage %

### Step 3: Scan Test Files for Edge Cases

Look for these patterns in test content:

| Pattern | Examples |
|---------|----------|
| null-check | `null`, `nil` |
| empty-string | `''`, `""`, `.length === 0` |
| undefined-check | `undefined` |
| boundary | `0`, `-1`, `MAX_`, `MIN_` |
| error-handling | `throw`, `reject`, `error`, `catch` |

### Step 4: Calculate Quality Score

Formula:
```
Score = (Coverage × 0.4) + (Edge Cases × 0.3) + (Mutation × 0.3)
```

Where:
- Coverage = average of lines, branches, functions, statements
- Edge Cases = percentage of categories covered
- Mutation = placeholder for future mutation testing (currently 0)

### Step 5: Generate Recommendations

Prioritize by impact:
1. **HIGH** - Uncovered critical files (auth, payments, security)
2. **HIGH** - Missing null-check edge cases
3. **MEDIUM** - Other missing edge cases
4. **MEDIUM** - Files with >10 uncovered lines
5. **LOW** - Files with <3 uncovered lines

### Step 6: Display Results

```
Quality Score: 72/100
[████████████████░░░░]

Coverage:
  Lines:      80%
  Branches:   70%
  Functions:  85%
  Statements: 78%

Edge Cases:
  ✓ empty-string, undefined-check, error-handling
  ✗ Missing: null-check, boundary

Recommendations:
  ! Add null-check tests
  · Cover 12 uncovered lines in src/auth/login.ts
  · Add boundary tests for pagination

Report saved to: .planning/QUALITY.md

Generate tests for gaps?
1) Yes - run /tlc:edge-cases
2) No - I'll fix manually
```

### Step 7: Create Report

Save `.planning/QUALITY.md`:

```markdown
# Test Quality Report

Generated: 2024-01-15T10:30:00Z

## Score: 72/100

Test quality is **fair**. Several areas need improvement.

## Coverage

| Metric | Value |
|--------|-------|
| Lines | 80% |
| Branches | 70% |
| Functions | 85% |
| Statements | 78% |

## Edge Cases

**Covered:**
- ✓ empty-string
- ✓ undefined-check
- ✓ error-handling

**Missing:**
- ✗ null-check
- ✗ boundary

## Recommendations

| Priority | Type | Action |
|----------|------|--------|
| HIGH | edge-case | Add null-check tests |
| MEDIUM | coverage | Cover 12 lines in src/auth/login.ts |
```

## Score Interpretation

| Score | Rating | Action |
|-------|--------|--------|
| 90-100 | Excellent | Maintain current practices |
| 80-89 | Good | Minor improvements possible |
| 60-79 | Fair | Address missing edge cases |
| 40-59 | Needs Work | Increase coverage, add edge cases |
| 0-39 | Critical | Major testing gaps - prioritize fixes |

## Example Run

```
User: /tlc:quality

Claude: Running test coverage...
✓ 24 tests passed
✓ Coverage generated

Quality Score: 72/100
[████████████████░░░░]

Coverage:
  Lines:      80%
  Branches:   70%
  Functions:  85%
  Statements: 78%

Edge Cases:
  ✓ empty-string, undefined-check, error-handling
  ✗ Missing: null-check, boundary

Top Recommendations:
  ! Add null-check tests to auth module
  · Cover uncovered lines in src/api/users.ts
  · Add boundary tests for pagination

Report: .planning/QUALITY.md

Generate edge case tests now? (Y/n)
```
