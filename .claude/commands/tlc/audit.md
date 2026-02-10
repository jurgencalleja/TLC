# /tlc:audit - Check Coding Standards Compliance

Run a comprehensive audit of the codebase against TLC coding standards.

## What This Does

1. Checks that standards files exist (CLAUDE.md, CODING-STANDARDS.md)
2. Detects architectural violations:
   - Flat services/, interfaces/, controllers/ folders
   - Inline interfaces in service files
   - Hardcoded URLs and ports
   - Magic strings without constants
   - Flat seed folders
3. Checks code quality:
   - JSDoc coverage on exported functions
   - Import style (no deep relative imports)
4. Generates report to `.planning/AUDIT-REPORT.md`

## Usage

```
/tlc:audit
```

## Process

### Step 1: Load Audit Module

```javascript
const { auditProject, generateReport } = require('./lib/standards/audit-checker');
```

### Step 2: Run All Checks

Run `auditProject(projectPath)` which executes:

| Check | What It Finds | Severity |
|-------|---------------|----------|
| Standards Files | Missing CLAUDE.md or CODING-STANDARDS.md | error |
| Flat Folders | Files in src/services/, src/interfaces/, src/controllers/ | error |
| Inline Interfaces | `interface X {` inside *.service.ts or *.controller.ts files | error |
| Inline Constants | `const X =` hardcoded values inside service/controller files | warning |
| Hardcoded URLs | http:// or https:// URLs in code | error |
| Hardcoded Ports | `const port = 3000` patterns | error |
| Magic Strings | `=== 'active'` comparisons without constants | warning |
| Flat Seeds | Seed files in src/seeds/ instead of src/{entity}/seeds/ | warning |
| Missing JSDoc | Exported functions without `/**` comments | warning |
| Deep Imports | `../../../` style imports (3+ levels) | warning |
| **Oversized Files** | Files exceeding 1000 lines (warn at 500) | error/warning |
| **Overcrowded Folders** | Folders with >15 files directly inside (warn at 8) | error/warning |
| **`any` Type Usage** | `any` type annotations in TypeScript files | error |
| **Missing Return Types** | Exported functions without explicit return type | warning |
| **Missing Parameter Types** | Function parameters without type annotations | error |
| **Weak tsconfig** | `strict: true` not enabled in tsconfig.json | warning |

### Step 3: Generate Report

Create `.planning/AUDIT-REPORT.md` with:

```markdown
# Audit Report

Generated: {timestamp}
Status: {PASSED | FAILED}

## Summary

- Total Issues: {count}
- Standards Files: {✓ | ✗}
- Architecture: {✓ | ✗}
- Code Quality: {✓ | ✗}

## Issues Found

### Flat Folders
- src/services/user.service.ts → Move to src/user/user.service.ts

### Hardcoded URLs
- src/api.ts:15 - http://localhost:3000

...
```

### Step 4: Display Results

```
TLC Audit Results
═══════════════════════════════════════════════════════════════

Status: FAILED (18 issues found)

  STRUCTURE
  Standards Files:      PASSED
  Flat Folders:         3 issues
  Overcrowded Folders:  2 issues (controllers/ has 22 files)
  Oversized Files:      1 issue  (csp.controller.ts: 2,041 lines)

  TYPES & INTERFACES
  Inline Interfaces:    2 issues
  Inline Constants:     3 issues
  any Type Usage:       5 issues
  Missing Return Types: 4 issues
  Missing Param Types:  2 issues
  Weak tsconfig:        PASSED

  CODE QUALITY
  Hardcoded URLs:       4 issues
  Magic Strings:        2 issues
  JSDoc Coverage:       8 issues (42% of exports undocumented)
  Import Style:         PASSED

Report saved to: .planning/AUDIT-REPORT.md

Fix automatically? Run /tlc:cleanup
Fix step-by-step?  Run /tlc:refactor
```

## Example Output

```
> /tlc:audit

Running TLC audit...

Checking standards files... ✓
Checking folder structure... ✗ Found 3 flat folders
Checking inline interfaces... ✗ Found 2 violations
Checking hardcoded config... ✗ Found 4 hardcoded URLs
Checking magic strings... ✗ Found 2 magic strings
Checking JSDoc coverage... ✓
Checking import style... ✓

═══════════════════════════════════════════════════════════════
AUDIT FAILED - 11 issues found
═══════════════════════════════════════════════════════════════

Report: .planning/AUDIT-REPORT.md

Next steps:
  /tlc:cleanup  - Fix all issues automatically
  /tlc:refactor - Fix step-by-step with previews
```

## Exit Codes

- `0` - All checks passed
- `1` - Issues found (report generated)
- `2` - Error running audit
