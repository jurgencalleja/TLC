# /tlc:outdated - Check Outdated Dependencies

Check for outdated dependencies and generate update plan.

## What This Does

1. Detects package manager
2. Lists all outdated packages
3. Categorizes by update type (major/minor/patch)
4. Generates safe update commands
5. Optionally applies updates with test verification

## Usage

```
/tlc:outdated
```

## Process

### Step 1: Detect Package Manager

Check for package files:
- `package.json` → npm
- `requirements.txt` / `pyproject.toml` → pip
- `Gemfile` → bundler
- `go.mod` → go

### Step 2: Check Outdated

**npm:**
```bash
npm outdated --json
```

**pip:**
```bash
pip list --outdated --format json
```

### Step 3: Categorize Updates

Group packages by version bump type:

| Type | Example | Risk |
|------|---------|------|
| Patch | 1.0.0 → 1.0.1 | Bug fixes only |
| Minor | 1.0.0 → 1.1.0 | New features, backwards compatible |
| Major | 1.0.0 → 2.0.0 | Breaking changes possible |

### Step 4: Display Report

```
Dependency Update Report
════════════════════════

Found 8 outdated packages:

⚠️  MAJOR updates (may contain breaking changes):
    react: 17.0.2 → 18.2.0
    typescript: 4.9.5 → 5.0.4

📦 Minor updates (new features):
    axios: 0.27.0 → 0.27.2
    lodash: 4.17.19 → 4.17.21

🔧 Patch updates (bug fixes):
    express: 4.18.1 → 4.18.2
    vitest: 0.34.1 → 0.34.6
    chalk: 5.2.0 → 5.2.1
    prettier: 3.0.0 → 3.0.3

Safe to update:
  npm install axios@0.27.2 lodash@4.17.21 express@4.18.2 vitest@0.34.6 chalk@5.2.1 prettier@3.0.3

Requires review (major version):
  npm install react@18.2.0
  npm install typescript@5.0.4
```

### Step 5: Update Options

```
What would you like to do?

1) Apply safe updates (minor + patch)
2) Apply all updates (including major)
3) Update specific package
4) Just show report - I'll update manually
```

### Step 6: Apply Updates

If user chooses to update:

```bash
npm install <packages>
```

Then verify:
```bash
npm test
```

Report:
```
✅ 6 packages updated
✅ All 47 tests passing

Commit changes?
1) Yes - commit with message "chore: update dependencies"
2) No - I'll commit later
```

## Update Safety

**Safe (auto-apply):**
- Patch updates (1.0.0 → 1.0.1)
- Minor updates (1.0.0 → 1.1.0)

**Review first:**
- Major updates (1.0.0 → 2.0.0)
- Packages with known breaking changes
- Peer dependency conflicts

**Always test after:**
- Run full test suite after updates
- Rollback if tests fail

## Example Session

```
User: /tlc:outdated

Claude: Checking for outdated packages...

Dependency Update Report
════════════════════════

Found 5 outdated packages:

⚠️  MAJOR updates:
    next: 13.4.0 → 14.0.0

📦 Minor updates:
    react-query: 3.39.0 → 3.39.3

🔧 Patch updates:
    eslint: 8.45.0 → 8.45.1
    prettier: 3.0.0 → 3.0.1
    typescript: 5.1.3 → 5.1.6

What would you like to do?

1) Apply safe updates (4 packages)
2) Apply all updates (5 packages)
3) Update specific package
4) Just show report

User: 1

Claude: Applying safe updates...
  ✓ react-query@3.39.3
  ✓ eslint@8.45.1
  ✓ prettier@3.0.1
  ✓ typescript@5.1.6

Running tests...
  ✓ 89 tests passing

Safe updates complete!

Note: next@14.0.0 available (major update)
  Review changelog before updating:
  https://nextjs.org/blog/next-14

Commit? (Y/n)
```

## Configuration

In `.tlc.json`:

```json
{
  "updates": {
    "autoApply": ["patch"],
    "requireReview": ["major"],
    "ignore": ["react"],
    "checkFrequency": "weekly"
  }
}
```

| Setting | Values | Default |
|---------|--------|---------|
| autoApply | patch, minor, major | patch |
| requireReview | patch, minor, major | major |
| ignore | package names | [] |
| checkFrequency | daily, weekly, monthly | weekly |
