# /tlc:security - Security Audit

Run security audit on project dependencies and display vulnerabilities.

## What This Does

1. Detects package manager (npm, pip, etc.)
2. Runs security audit command
3. Parses and categorizes vulnerabilities
4. Suggests fixes for each issue
5. Optionally auto-fixes safe updates

## Usage

```
/tlc:security
```

## Process

### Step 1: Detect Package Manager

Check for:
- `package.json` → npm
- `package-lock.json` → npm
- `requirements.txt` / `pyproject.toml` → pip
- `Gemfile` → bundler
- `go.mod` → go
- `Cargo.toml` → cargo

### Step 2: Run Audit

**npm:**
```bash
npm audit --json
```

**pip:**
```bash
pip-audit --format json
```

**bundler:**
```bash
bundle audit --format json
```

### Step 3: Parse Output

Extract for each vulnerability:
- Package name
- Severity (critical, high, moderate, low)
- Description/title
- Fix version (if available)
- Advisory URL

### Step 4: Display Report

```
Security Audit Report
═════════════════════

Found 5 vulnerabilities:
  🔴 Critical: 1
  🟠 High: 2
  🟡 Moderate: 1
  🟢 Low: 1

CRITICAL:
  ⚠️  node-fetch - Remote Code Execution
      Fix: upgrade to 2.6.7+

HIGH:
  ⚠️  lodash - Prototype Pollution
      Fix: upgrade to 4.17.21
  ⚠️  axios - Server-Side Request Forgery
      Fix: upgrade to 0.21.2

MODERATE:
  ⚠  minimist - Prototype Pollution
      Fix: upgrade to 1.2.6

LOW:
  ℹ  debug - Regular Expression DoS
      Fix: upgrade to 2.6.9
```

### Step 5: Generate Fix Plan

```
Fix Plan:

Safe updates (patch/minor):
  npm install lodash@4.17.21 axios@0.21.4 minimist@1.2.6 debug@2.6.9

Major updates (review first):
  npm install node-fetch@3.2.0  ⚠️ Breaking changes possible

Apply safe updates now?
1) Yes - run npm install for safe updates
2) No - I'll review first
3) Fix all - including major updates
```

### Step 6: Apply Fixes (Optional)

If user chooses to fix:

```bash
npm install lodash@4.17.21 axios@0.21.4 ...
```

After install:
```bash
npm test
```

Report:
```
✅ Safe updates applied
✅ Tests still passing

Commit changes?
1) Yes - commit package.json and lock file
2) No - I'll commit later
```

## Severity Levels

| Level | Icon | Meaning |
|-------|------|---------|
| Critical | 🔴 | Actively exploited, fix immediately |
| High | 🟠 | Serious vulnerability, fix soon |
| Moderate | 🟡 | Potential issue, plan to fix |
| Low | 🟢 | Minor issue, fix when convenient |

## Auto-Fix Rules

**Safe to auto-fix:**
- Patch version bumps (1.0.0 → 1.0.1)
- Minor version bumps (1.0.0 → 1.1.0)
- No breaking changes expected

**Requires review:**
- Major version bumps (1.0.0 → 2.0.0)
- Packages with no fix available
- Transitive dependencies

## Example Session

```
User: /tlc:security

Claude: Detecting package manager... npm

Running npm audit...

Security Audit Report
═════════════════════

Found 3 vulnerabilities:
  🟠 High: 2
  🟡 Moderate: 1

HIGH:
  ⚠️  lodash - Prototype Pollution
      Current: 4.17.15
      Fix: upgrade to 4.17.21
  ⚠️  axios - SSRF
      Current: 0.19.0
      Fix: upgrade to 0.21.2

MODERATE:
  ⚠  minimist - Prototype Pollution
      Current: 1.2.0
      Fix: upgrade to 1.2.6

All fixes are safe (patch/minor updates).

Apply fixes now? (Y/n)

User: y

Claude: Installing updates...
  ✓ lodash@4.17.21
  ✓ axios@0.21.4
  ✓ minimist@1.2.6

Running tests to verify...
  ✓ 47 tests passing

Updates applied successfully!

Commit? (Y/n)
```
