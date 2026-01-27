# /tlc:quality - Test Quality Scoring

Analyze test quality and identify gaps in coverage.

## Usage

```
/tlc:quality [path]
```

If no path specified, analyzes entire project.

## What This Does

1. Measures test coverage percentage
2. Detects missing edge cases
3. Runs mutation testing (optional)
4. Generates quality score and recommendations

## Process

### Step 1: Run Coverage Analysis

Execute test suite with coverage enabled:

**JavaScript/TypeScript (mocha/nyc):**
```bash
npx nyc --reporter=json mocha
```

**JavaScript/TypeScript (vitest):**
```bash
npx vitest run --coverage --coverage.reporter=json
```

**Python (pytest):**
```bash
pytest --cov=src --cov-report=json
```

Parse coverage report:
```json
{
  "total": {
    "lines": { "pct": 78.5 },
    "branches": { "pct": 65.2 },
    "functions": { "pct": 82.1 },
    "statements": { "pct": 77.8 }
  }
}
```

### Step 2: Identify Uncovered Code

Extract files/lines not covered:

```
Uncovered Code:

src/auth/login.ts
  Lines 45-52: Error handling for network timeout
  Lines 78-85: Rate limiting logic

src/api/users.ts
  Lines 120-135: Bulk delete operation
  Lines 200-210: Export to CSV
```

### Step 3: Edge Case Detection

Analyze existing tests for common edge case patterns:

| Category | Check | Status |
|----------|-------|--------|
| **Null/Undefined** | Tests for null inputs | ⚠️ Missing |
| **Empty** | Tests for empty strings/arrays | ✅ Present |
| **Boundary** | Tests for min/max values | ⚠️ Partial |
| **Type Coercion** | Tests for wrong types | ❌ Missing |
| **Async** | Tests for race conditions | ⚠️ Partial |
| **Error States** | Tests for failure paths | ✅ Present |

### Step 4: Mutation Testing (Optional)

Run mutation testing to verify test effectiveness:

**JavaScript (Stryker):**
```bash
npx stryker run
```

**Python (mutmut):**
```bash
mutmut run
```

Mutation score indicates how many code mutations were caught by tests:
- 90%+ = Excellent
- 70-90% = Good
- 50-70% = Needs improvement
- <50% = Tests are weak

### Step 5: Calculate Quality Score

```
Test Quality Score: 72/100

Breakdown:
├── Coverage (40 pts max)
│   ├── Line coverage: 78% → 31 pts
│   └── Branch coverage: 65% → 26 pts (weighted)
│   └── Subtotal: 29 pts
│
├── Edge Cases (30 pts max)
│   ├── Null handling: ❌ → 0 pts
│   ├── Empty inputs: ✅ → 6 pts
│   ├── Boundaries: ⚠️ → 3 pts
│   ├── Error paths: ✅ → 6 pts
│   └── Subtotal: 15 pts
│
├── Mutation Score (30 pts max)
│   └── 85% mutations caught → 26 pts
│
└── Total: 72/100 (Good)
```

### Step 6: Generate Recommendations

```
Recommendations:

HIGH PRIORITY:
1. Add null input tests for src/auth/login.ts
   - login(null, password) should throw
   - login(email, null) should throw

2. Cover network timeout handling (lines 45-52)
   - Mock fetch to simulate timeout
   - Verify retry logic works

MEDIUM PRIORITY:
3. Add boundary tests for pagination
   - page=0, page=-1, page=999999
   - limit=0, limit=1000

4. Test rate limiting edge cases
   - Exactly at limit
   - One over limit
   - Reset timing

LOW PRIORITY:
5. Add type coercion tests
   - Number passed as string
   - Boolean passed as string
```

### Step 7: Save Report

Create `.planning/QUALITY.md`:

```markdown
# Test Quality Report

Generated: 2024-01-27
Score: 72/100

## Coverage Summary

| Metric | Percentage |
|--------|------------|
| Lines | 78.5% |
| Branches | 65.2% |
| Functions | 82.1% |
| Statements | 77.8% |

## Uncovered Files

| File | Uncovered Lines | Priority |
|------|-----------------|----------|
| src/auth/login.ts | 45-52, 78-85 | High |
| src/api/users.ts | 120-135, 200-210 | Medium |

## Edge Case Analysis

| Category | Status | Files Affected |
|----------|--------|----------------|
| Null inputs | Missing | auth/*, api/* |
| Boundaries | Partial | pagination.ts |
| Error paths | Good | - |

## Mutation Score

85% (26/30 pts)

## Recommendations

1. [HIGH] Add null input tests for auth module
2. [HIGH] Cover network timeout handling
3. [MEDIUM] Boundary tests for pagination
4. [LOW] Type coercion tests

## History

| Date | Score | Change |
|------|-------|--------|
| 2024-01-27 | 72 | Initial |
```

## Example Output

```
> /tlc:quality

Analyzing test quality...

Running coverage... ✓
Analyzing edge cases... ✓
Running mutation tests... ✓ (optional, took 45s)

╭─────────────────────────────────────────╮
│  Test Quality Score: 72/100 (Good)      │
╰─────────────────────────────────────────╯

Coverage:        78% lines, 65% branches
Edge Cases:      15/30 patterns covered
Mutation Score:  85% caught

Top Issues:
  1. ❌ No null input tests (auth module)
  2. ⚠️ Timeout handling untested (lines 45-52)
  3. ⚠️ Pagination boundaries missing

Generate tests for these gaps? (Y/n)
```

## Integration with Dashboard

Quality score appears in `/tlc:server` dashboard:

```
┌─────────────────────────────────────┐
│  Quality: 72/100  [Run Analysis]    │
│  ████████████░░░░░░                 │
│                                     │
│  Coverage: 78%                      │
│  Edge Cases: 50%                    │
│  Mutations: 85%                     │
└─────────────────────────────────────┘
```

## Configuration

In `.tlc.json`:

```json
{
  "quality": {
    "coverageThreshold": 80,
    "runMutationTests": true,
    "mutationTimeout": 60,
    "edgeCasePatterns": [
      "null", "undefined", "empty",
      "boundary", "async", "error"
    ]
  }
}
```

## Notes

- First run may be slow (mutation testing)
- Results cached, re-run with `--fresh` to force
- Use `--no-mutation` to skip slow mutation tests
- Quality score feeds into CI/CD gates (Phase 4)
