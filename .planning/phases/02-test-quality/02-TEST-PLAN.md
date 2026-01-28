# Phase 2 Test Plan

## Task 1: Coverage Infrastructure

**Type:** Configuration/tooling (no unit tests - verification is that coverage runs)

**Verification:**
- `npm run test:coverage` executes without error
- `coverage/coverage-final.json` is generated
- Coverage percentages appear in output

---

## Task 2: Quality Scoring Engine

### File: server/lib/quality-scorer.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| parseCoverage extracts line coverage percentage | happy path | returns { lines: 78.5, ... } |
| parseCoverage handles missing coverage file | error | throws CoverageNotFoundError |
| parseCoverage handles malformed JSON | error | throws ParseError |
| detectEdgeCases finds missing null checks | happy path | returns ['null-check'] |
| detectEdgeCases returns empty for complete coverage | happy path | returns [] |
| calculateScore returns 0-100 weighted score | happy path | returns number 0-100 |
| calculateScore weights coverage at 40% | calculation | 80% coverage = 32 pts |
| calculateScore weights edge cases at 30% | calculation | 100% edge cases = 30 pts |
| generateRecommendations prioritizes by impact | happy path | HIGH before MEDIUM before LOW |

### Dependencies to mock:
- fs (for reading coverage files)
- test file parser (for edge case detection)

---

## Task 3: Quality Command

### File: server/lib/quality-command.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| runQualityAnalysis executes coverage command | happy path | spawns test:coverage |
| runQualityAnalysis calls quality scorer | integration | scorer receives coverage data |
| generateReport creates QUALITY.md | happy path | file created with correct format |
| formatOutput displays score breakdown | happy path | output includes all sections |

### Dependencies to mock:
- child_process (for running coverage)
- fs (for writing report)
- quality-scorer module

---

## Task 4: AutoFix Engine

### File: server/lib/autofix-engine.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| parseTestFailures extracts failure details | happy path | returns [{test, error, file, line}] |
| matchErrorPattern recognizes null property access | pattern | returns 'null-check' fix type |
| matchErrorPattern recognizes undefined return | pattern | returns 'return-value' fix type |
| matchErrorPattern recognizes import error | pattern | returns 'missing-import' fix type |
| matchErrorPattern returns null for unknown | edge case | returns null |
| generateFix creates null check code | happy path | returns valid JS code |
| applyFix modifies file correctly | happy path | file updated, backup created |
| applyFix rolls back on test failure | error recovery | original file restored |
| runWithRetry stops after maxAttempts | boundary | max 5 attempts by default |

### Dependencies to mock:
- fs (for file operations)
- child_process (for running tests)

---

## Task 5: AutoFix Command

### File: server/lib/autofix-command.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| runAutofix runs tests first | happy path | spawns test command |
| runAutofix displays failure count | output | shows "4 failing tests" |
| runAutofix shows fix progress | output | shows "1/4", "2/4", etc. |
| runAutofix reports unfixable tests | output | lists with reason |
| runAutofix prompts for commit | interaction | asks user confirmation |

### Dependencies to mock:
- autofix-engine module
- child_process (for git commands)

---

## Task 6: Edge Case Generator

### File: server/lib/edge-case-generator.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| parseFunction extracts signature | happy path | returns {name, params, types} |
| parseFunction handles async functions | variation | isAsync: true |
| generateForString creates null test | pattern | test code for null input |
| generateForString creates empty test | pattern | test code for "" input |
| generateForString creates whitespace test | pattern | test code for "  " input |
| generateForNumber creates zero test | pattern | test code for 0 |
| generateForNumber creates negative test | pattern | test code for -1 |
| generateForNumber creates MAX_INT test | pattern | test code for Number.MAX_SAFE_INTEGER |
| generateForArray creates empty test | pattern | test code for [] |
| generateTestFile produces valid syntax | output | parses without error |

### Dependencies to mock:
- fs (for reading source files)
- TypeScript parser (for extracting types)

---

## Task 7: Edge Cases Command

### File: server/lib/edge-cases-command.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| runEdgeCases targets specified file | happy path | analyzes correct file |
| runEdgeCases displays summary by category | output | shows count per category |
| runEdgeCases writes test file | output | creates .edge-cases.test.js |
| runEdgeCases optionally runs tests | option | spawns test command |

### Dependencies to mock:
- edge-case-generator module
- fs (for writing tests)
- child_process (for running tests)

---

## Task 8: Dashboard Quality Panel

### File: dashboard/src/components/QualityPane.test.tsx

| Test | Type | Expected Result |
|------|------|-----------------|
| renders placeholder when no data | initial state | shows "No quality data" |
| renders score with progress bar | with data | shows "72/100" and bar |
| renders coverage percentage | with data | shows "78% coverage" |
| renders "Run Analysis" button | interaction | button visible |
| button triggers quality analysis | interaction | calls onRunAnalysis prop |

### Dependencies to mock:
- quality data prop

---

## Task 9: Configuration Schema

### File: server/lib/config.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| loadConfig returns defaults when no file | default | quality.coverageThreshold = 80 |
| loadConfig parses custom threshold | custom | respects user value |
| loadConfig validates threshold range | validation | error if < 0 or > 100 |
| loadConfig merges with defaults | partial | missing keys get defaults |

### Dependencies to mock:
- fs (for reading .tlc.json)

---

## Summary

| Task | Test File | Test Count |
|------|-----------|------------|
| 1 | (verification only) | 0 |
| 2 | quality-scorer.test.js | 9 |
| 3 | quality-command.test.js | 4 |
| 4 | autofix-engine.test.js | 9 |
| 5 | autofix-command.test.js | 5 |
| 6 | edge-case-generator.test.js | 10 |
| 7 | edge-cases-command.test.js | 4 |
| 8 | QualityPane.test.tsx | 5 |
| 9 | config.test.js | 4 |
| **Total** | | **50** |
